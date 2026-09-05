import "server-only";

import { randomUUID } from "node:crypto";
import { basename } from "node:path";
import type { DocumentData, DocumentReference } from "firebase-admin/firestore";
import { adminStorage, db } from "@/lib/firebase/admin";
import type {
  ActorSnapshot,
  AuthenticatedUser,
  DistributorData,
  FirestoreRecord,
  InventoryBatchMetadataData,
  InventoryProductGroup,
  MetrcSyncStateData,
  PackageConsignment,
  PackageData,
  ParsedPackageData,
  ProductData,
  SettingsActivityAction,
  StrainData,
} from "@/lib/domain/types";
import { isFeatureEnabled } from "@/lib/auth/permissions";
import { docIdFromTag, getDocument, listCollection, normalizedText, now } from "./firestore";
import { groupInventory as groupInventoryRecords } from "@/lib/metrc/inventory-grouping";
import { parseMetrcWorkbook } from "@/lib/metrc/metrc-spreadsheet-parser";
import { assertFinalizableSync, partitionSyncFinalization, stalePackagesForSync, toSyncCandidates, type SyncCandidatePackage } from "@/lib/metrc/sync-candidates";
import { findDistributor } from "./distributors";
import { buildFieldChanges, buildSettingsActivityData, listProducts, listStrains } from "./sales-settings";
import { derivedPackageStatus, packageStatusMap } from "./package-status";

export { parseMetrcWorkbook } from "@/lib/metrc/metrc-spreadsheet-parser";
export type { SyncCandidatePackage } from "@/lib/metrc/sync-candidates";

const ACTIVITY = "activity";
const PACKAGES = "packages";
const INVENTORY_BATCHES = "inventory_batches";
const CURRENT_SYNC_PATH = "metrc_syncs/current";
const MAX_METRC_UPLOAD_BYTES = 20 * 1024 * 1024;
const MAX_BATCH_OPERATIONS = 450;
const SYNC_CLEARED_CONSIGNMENT_REASON = "Package returned in a METRC sync.";

type PackageProductMapping = FirestoreRecord<Pick<ProductData, "name" | "category" | "sku" | "upc">>;
type SyncPackageData = ParsedPackageData & Pick<PackageData, "product_id">;
type InventoryBatchMetadataInput = Pick<
  InventoryBatchMetadataData,
  | "batch_number"
  | "sku"
  | "thc_percentage"
  | "cbd_percentage"
  | "coa_url"
>;
type InventoryBatchMetadataFields = Pick<
  InventoryBatchMetadataData,
  | "batch_number"
  | "sku"
  | "thc_percentage"
  | "cbd_percentage"
  | "coa_url"
  | "item"
  | "source_packages"
  | "product_id"
>;

function inventoryBatchMetadataWithDefaults(data: Partial<InventoryBatchMetadataData>): InventoryBatchMetadataData {
  return {
    batch_number: normalizedText(data.batch_number),
    sku: normalizedText(data.sku),
    thc_percentage: normalizedText(data.thc_percentage),
    cbd_percentage: normalizedText(data.cbd_percentage),
    coa_url: normalizedText(data.coa_url),
    item: normalizedText(data.item),
    source_packages: normalizedText(data.source_packages),
    product_id: normalizedText(data.product_id) || undefined,
    created_by: data.created_by,
    updated_by: data.updated_by,
    created_at: data.created_at ?? null,
    updated_at: data.updated_at ?? null,
  };
}

function inventoryBatchMetadataFields(input: InventoryBatchMetadataInput, group: InventoryProductGroup): InventoryBatchMetadataFields {
  return {
    batch_number: normalizedText(input.batch_number),
    sku: normalizedText(input.sku),
    thc_percentage: normalizedText(input.thc_percentage),
    cbd_percentage: normalizedText(input.cbd_percentage),
    coa_url: normalizedText(input.coa_url),
    item: group.item,
    source_packages: group.source_packages,
    product_id: group.product_id,
  };
}

function productMappingKey(value: unknown): string {
  return String(value ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function productKeys(product: PackageProductMapping): string[] {
  return [product.data.name, product.data.sku, product.data.upc].map(productMappingKey).filter(Boolean);
}

function productLookup(products: PackageProductMapping[]): Map<string, PackageProductMapping | null> {
  const lookup = new Map<string, PackageProductMapping | null>();

  for (const product of products) {
    for (const key of productKeys(product)) {
      if (!lookup.has(key)) {
        lookup.set(key, product);
      } else if (lookup.get(key)?.id !== product.id) {
        lookup.set(key, null);
      }
    }
  }

  return lookup;
}

function productMappingError(kind: "ambiguous" | "unmapped", values: Set<string>): Error {
  const items = [...values].sort((a, b) => a.localeCompare(b)).slice(0, 10).join(", ");
  if (kind === "ambiguous") {
    return new Error(`Ambiguous Product mapping for METRC item(s): ${items}. Product names, SKUs, and UPCs must be unique.`);
  }

  return new Error(`Could not map METRC item(s) to Products: ${items}. Create matching Products or set Product name, SKU, or UPC to match the METRC Item/Product values.`);
}

export function mapPackagesToProducts(parsedPackages: ParsedPackageData[], products: PackageProductMapping[], existingById = new Map<string, PackageData>()): SyncPackageData[] {
  const productsByKey = productLookup(products);
  const productsById = new Map(products.map((product) => [product.id, product]));
  const ambiguous = new Set<string>();
  const unmapped = new Set<string>();
  const mapped: SyncPackageData[] = [];

  for (const parsedPackage of parsedPackages) {
    const existingPackage = existingById.get(docIdFromTag(parsedPackage.package_tag));
    const existingProduct = existingPackage?.product_id ? productsById.get(existingPackage.product_id) : undefined;
    const hasUploadedItem = parsedPackage.item.trim() !== "";
    const item = parsedPackage.item || existingPackage?.item || "";
    const category = parsedPackage.category || existingPackage?.category || "";
    const itemKey = productMappingKey(item);
    const productFromItem = itemKey ? productsByKey.get(itemKey) : undefined;
    const product = productFromItem === null && !hasUploadedItem ? existingProduct : productFromItem === undefined ? existingProduct : productFromItem;
    const itemLabel = item || parsedPackage.package_tag;

    if (product === null) {
      ambiguous.add(itemLabel);
      continue;
    }

    if (!product) {
      if (hasUploadedItem && itemKey) {
        unmapped.add(itemLabel);
        continue;
      }

      mapped.push({
        ...parsedPackage,
        item,
        category,
      });
      continue;
    }

    mapped.push({
      ...parsedPackage,
      product_id: product.id,
      item: item || product.data.name,
      category: category || product.data.category,
    });
  }

  if (ambiguous.size > 0) {
    throw productMappingError("ambiguous", ambiguous);
  }

  if (unmapped.size > 0) {
    throw productMappingError("unmapped", unmapped);
  }

  return mapped;
}

export type MetrcSyncAnalysis = {
  sync_id: string;
  created: number;
  updated: number;
  total_parsed: number;
  storage_path: string | null;
  consignment_cleared: number;
  stale_packages: SyncCandidatePackage[];
};

export type MetrcSyncFinalizeInput = {
  sync_id: string;
  distributor_id: string;
  package_ids: string[];
};

async function startCurrentSync(syncId: string, user: AuthenticatedUser): Promise<void> {
  await db.doc(CURRENT_SYNC_PATH).set({
    sync_id: syncId,
    started_at: now(),
    started_by: actorSnapshot(user),
    finalized_at: null,
    finalized_by: null,
  });
}

async function consumeCurrentSync(syncId: string, user: AuthenticatedUser): Promise<void> {
  const ref = db.doc(CURRENT_SYNC_PATH);

  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    assertFinalizableSync(snapshot.exists ? (snapshot.data() as MetrcSyncStateData) : null, syncId);
    transaction.set(ref, { finalized_at: now(), finalized_by: actorSnapshot(user) }, { merge: true });
  });
}

export async function syncPackages(parsedPackages: ParsedPackageData[], user: AuthenticatedUser, syncId: string = randomUUID()): Promise<Omit<MetrcSyncAnalysis, "storage_path">> {
  const [existing, products, statusMap] = await Promise.all([listCollection<PackageData>(PACKAGES), listProducts(), packageStatusMap()]);
  const existingById = new Map(existing.map((doc) => [doc.id, doc.data]));
  const mappedPackages = mapPackagesToProducts(parsedPackages, products, existingById);
  await startCurrentSync(syncId, user);
  const seenIds = new Set<string>();
  let created = 0;
  let updated = 0;
  let consignmentCleared = 0;

  let batch = db.batch();
  let operations = 0;
  const commitIfNeeded = async (): Promise<void> => {
    if (operations < MAX_BATCH_OPERATIONS) {
      return;
    }

    await batch.commit();
    batch = db.batch();
    operations = 0;
  };

  for (const packageData of mappedPackages) {
    const docId = docIdFromTag(packageData.package_tag);
    seenIds.add(docId);
    const existingPackage = existingById.get(docId);

    batch.set(db.doc(`${PACKAGES}/${docId}`), {
      ...packageData,
      quantity: Number(packageData.quantity ?? 0),
      active: true,
      status: "active",
      consignment: null,
      last_sync_id: syncId,
      last_synced_at: now(),
      updated_at: now(),
      ...(existingPackage ? {} : { created_at: now() }),
    });
    operations += 1;

    if (existingPackage?.consignment) {
      writePackageConsignmentActivity(batch, docId, "deleted", existingPackage.consignment, null, user, SYNC_CLEARED_CONSIGNMENT_REASON);
      operations += 1;
      consignmentCleared += 1;
    }

    await commitIfNeeded();

    if (existingPackage) {
      updated += 1;
    } else {
      created += 1;
    }
  }

  if (operations > 0) {
    await batch.commit();
  }

  const syncedPackages = existing.map((doc) => (seenIds.has(doc.id)
    ? { id: doc.id, data: { ...doc.data, active: true, consignment: null, last_sync_id: syncId } }
    : doc));

  return {
    sync_id: syncId,
    created,
    updated,
    total_parsed: parsedPackages.length,
    consignment_cleared: consignmentCleared,
    stale_packages: toSyncCandidates(stalePackagesForSync(syncedPackages, syncId), statusMap),
  };
}

async function deactivatePackages(packageIds: string[]): Promise<number> {
  if (packageIds.length === 0) {
    return 0;
  }

  let batch = db.batch();
  let operations = 0;

  for (const packageId of packageIds) {
    batch.set(
      db.doc(`${PACKAGES}/${packageId}`),
      {
        active: false,
        status: "inactive",
        deactivated_at: now(),
        updated_at: now(),
      },
      { merge: true },
    );
    operations += 1;

    if (operations >= MAX_BATCH_OPERATIONS) {
      await batch.commit();
      batch = db.batch();
      operations = 0;
    }
  }

  if (operations > 0) {
    await batch.commit();
  }

  return packageIds.length;
}

export async function finalizeMetrcSync(input: MetrcSyncFinalizeInput, user: AuthenticatedUser): Promise<{ consigned: number; deactivated: number }> {
  const syncId = input.sync_id.trim();
  await consumeCurrentSync(syncId, user);

  const [packages, statusMap] = await Promise.all([listCollection<PackageData>(PACKAGES), packageStatusMap()]);
  const candidates = toSyncCandidates(stalePackagesForSync(packages, syncId), statusMap);
  const { consign, deactivate } = partitionSyncFinalization(candidates, input.package_ids);
  const consigned = consign.length > 0 ? await consignPackages(consign, input.distributor_id, "", user) : 0;
  const deactivated = await deactivatePackages(deactivate);

  return { consigned, deactivated };
}

export async function uploadAndSyncMetrcFile(file: File, user: AuthenticatedUser): Promise<MetrcSyncAnalysis> {
  if (!file.name.toLowerCase().endsWith(".xlsx")) {
    throw new Error("Upload a METRC .xlsx export.");
  }

  if (file.size > MAX_METRC_UPLOAD_BYTES) {
    throw new Error("METRC uploads must be 20 MB or smaller.");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const safeName = basename(file.name).replace(/[^a-z0-9._-]/gi, "-");
  const nowDate = new Date();
  const yyyy = String(nowDate.getUTCFullYear());
  const mm = String(nowDate.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(nowDate.getUTCDate()).padStart(2, "0");
  const storagePath = `metrc-uploads/${yyyy}/${mm}/${dd}/active-packages-${randomUUID()}-${safeName}`;
  let archivedPath: string | null = storagePath;

  try {
    const bucket = adminStorage.bucket();
    await bucket.file(storagePath).save(buffer, {
      contentType: file.type || "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      metadata: {
        metadata: {
          uploaded_by_uid: user.uid,
          uploaded_by_email: user.email,
        },
      },
    });
  } catch {
    archivedPath = null;
  }

  const parsed = parseMetrcWorkbook(buffer);
  const result = await syncPackages(parsed, user, randomUUID());

  return {
    ...result,
    storage_path: archivedPath,
  };
}

export async function listPackages(includeInactive = false): Promise<FirestoreRecord<PackageData>[]> {
  const packages = await listCollection<PackageData>(PACKAGES);
  const statusMap = await packageStatusMap();

  return packages
    .filter((doc) => includeInactive || doc.data.active)
    .map((doc) => {
      const derived = derivedPackageStatus(doc.data, statusMap);
      return {
        id: doc.id,
        data: {
          ...doc.data,
          package_status: derived.status,
          sold_order_id: derived.order_id,
        },
      };
    })
    .sort((a, b) => `${a.data.item} ${a.data.package_tag}`.localeCompare(`${b.data.item} ${b.data.package_tag}`));
}

export function privateProductIds(products: FirestoreRecord<ProductData>[], strains: FirestoreRecord<StrainData>[]): Set<string> {
  const privateStrainIds = new Set(strains.filter((strain) => strain.data.status === "Hidden").map((strain) => strain.id));

  return new Set(
    products
      .filter((product) => product.data.status === "Hidden" || product.data.strain_ids.some((strainId) => privateStrainIds.has(strainId)))
      .map((product) => product.id),
  );
}

export async function listVisiblePackages(
  user: Pick<AuthenticatedUser, "role" | "email" | "permissions">,
  includeInactive = false,
): Promise<FirestoreRecord<PackageData>[]> {
  const packages = await listPackages(includeInactive);
  if (isFeatureEnabled(user, "strains", "view_private_strains")) {
    return packages;
  }

  const [products, strains] = await Promise.all([listProducts(), listStrains()]);
  const hiddenProductIds = privateProductIds(products, strains);

  return packages.filter((packageRecord) => !packageRecord.data.product_id || !hiddenProductIds.has(packageRecord.data.product_id));
}

export async function activePackagesByTag(): Promise<Record<string, FirestoreRecord<PackageData>>> {
  const packages = await listPackages(false);
  const map: Record<string, FirestoreRecord<PackageData>> = {};

  for (const packageRecord of packages) {
    if (packageRecord.data.active) {
      map[packageRecord.data.package_tag] = packageRecord;
    }
  }

  return map;
}

export async function findPackage(packageId: string): Promise<FirestoreRecord<PackageData> | null> {
  const doc = await getDocument<PackageData>(`${PACKAGES}/${packageId}`);
  if (!doc) {
    return null;
  }

  const statusMap = await packageStatusMap();
  const derived = derivedPackageStatus(doc.data, statusMap);
  return {
    id: doc.id,
    data: {
      ...doc.data,
      package_status: derived.status,
      sold_order_id: derived.order_id,
    },
  };
}

type ActivityWriter = {
  create(ref: DocumentReference, data: DocumentData): unknown;
};

function actorSnapshot(user: AuthenticatedUser): ActorSnapshot {
  return {
    uid: user.uid,
    email: user.email,
    name: user.name ?? user.email,
    picture: user.picture ?? "",
  };
}

function consignmentActivityFields(consignment: PackageConsignment | null | undefined): Record<string, string> {
  return {
    distributor: consignment?.distributor_name ?? "",
    consignment_notes: consignment?.notes ?? "",
  };
}

export function writePackageConsignmentActivity(
  writer: ActivityWriter,
  packageId: string,
  action: SettingsActivityAction,
  previous: PackageConsignment | null | undefined,
  next: PackageConsignment | null | undefined,
  user: AuthenticatedUser,
  reason = "",
): void {
  writer.create(
    db.collection(`${PACKAGES}/${packageId}/${ACTIVITY}`).doc(),
    buildSettingsActivityData(action, user, buildFieldChanges(consignmentActivityFields(previous), consignmentActivityFields(next)), reason, now()),
  );
}

async function requireAvailableDistributor(distributorId: string): Promise<FirestoreRecord<DistributorData>> {
  const distributor = await findDistributor(distributorId.trim());
  if (!distributor || distributor.data.archived_at) {
    throw new Error("Distributor not found.");
  }

  return distributor;
}

function buildConsignment(distributor: FirestoreRecord<DistributorData>, notes: string, user: AuthenticatedUser): PackageConsignment {
  return {
    distributor_id: distributor.id,
    distributor_name: distributor.data.name,
    notes: notes.trim(),
    consigned_by: actorSnapshot(user),
    consigned_at: now(),
  };
}

export async function consignPackages(packageIds: string[], distributorId: string, notes: string, user: AuthenticatedUser): Promise<number> {
  const ids = [...new Set(packageIds.map((packageId) => packageId.trim()).filter(Boolean))];
  if (ids.length === 0) {
    return 0;
  }

  const distributor = await requireAvailableDistributor(distributorId);
  const snapshots = await db.getAll(...ids.map((packageId) => db.doc(`${PACKAGES}/${packageId}`)));

  let batch = db.batch();
  let operations = 0;
  const commitIfNeeded = async (): Promise<void> => {
    if (operations < MAX_BATCH_OPERATIONS) {
      return;
    }

    await batch.commit();
    batch = db.batch();
    operations = 0;
  };

  for (const snapshot of snapshots) {
    if (!snapshot.exists) {
      throw new Error("Package not found.");
    }

    const current = snapshot.data() as PackageData;
    if (!current.active) {
      throw new Error(`Package ${current.package_tag} is inactive and cannot be marked as consignment.`);
    }

    const consignment = buildConsignment(distributor, notes, user);
    batch.set(snapshot.ref, { consignment, updated_at: now() }, { merge: true });
    writePackageConsignmentActivity(batch, snapshot.id, current.consignment ? "updated" : "created", current.consignment, consignment, user);
    operations += 2;
    await commitIfNeeded();
  }

  if (operations > 0) {
    await batch.commit();
  }

  return ids.length;
}

export async function clearPackagesConsignment(packageIds: string[], user: AuthenticatedUser): Promise<number> {
  const ids = [...new Set(packageIds.map((packageId) => packageId.trim()).filter(Boolean))];
  if (ids.length === 0) {
    return 0;
  }

  const snapshots = await db.getAll(...ids.map((packageId) => db.doc(`${PACKAGES}/${packageId}`)));

  let batch = db.batch();
  let operations = 0;
  let cleared = 0;
  const commitIfNeeded = async (): Promise<void> => {
    if (operations < MAX_BATCH_OPERATIONS) {
      return;
    }

    await batch.commit();
    batch = db.batch();
    operations = 0;
  };

  for (const snapshot of snapshots) {
    if (!snapshot.exists) {
      throw new Error("Package not found.");
    }

    const current = snapshot.data() as PackageData;
    if (!current.consignment) {
      continue;
    }

    batch.set(snapshot.ref, { consignment: null, updated_at: now() }, { merge: true });
    writePackageConsignmentActivity(batch, snapshot.id, "deleted", current.consignment, null, user);
    operations += 2;
    cleared += 1;
    await commitIfNeeded();
  }

  if (operations > 0) {
    await batch.commit();
  }

  if (cleared === 0) {
    throw new Error("None of the selected packages are marked as consignment.");
  }

  return cleared;
}

function inventoryGroupKey(value: string): string {
  const key = normalizedText(value).toLowerCase();
  if (!/^[a-f0-9]{40}$/.test(key)) {
    throw new Error("Inventory group not found.");
  }

  return key;
}

async function requireVisibleInventoryGroup(
  groupKey: string,
  user: Pick<AuthenticatedUser, "role" | "email" | "permissions">,
): Promise<InventoryProductGroup> {
  const key = inventoryGroupKey(groupKey);
  const group = groupInventory(await listVisiblePackages(user)).find((row) => row.key === key);
  if (!group) {
    throw new Error("Inventory group not found.");
  }

  return group;
}

export async function findInventoryBatchMetadata(groupKey: string): Promise<FirestoreRecord<InventoryBatchMetadataData> | null> {
  const key = inventoryGroupKey(groupKey);
  const metadata = await getDocument<InventoryBatchMetadataData>(`${INVENTORY_BATCHES}/${key}`);
  if (!metadata) {
    return null;
  }

  return {
    id: metadata.id,
    data: inventoryBatchMetadataWithDefaults(metadata.data),
  };
}

export async function updateInventoryBatchMetadata(groupKey: string, input: InventoryBatchMetadataInput, user: AuthenticatedUser): Promise<void> {
  const key = inventoryGroupKey(groupKey);
  const group = await requireVisibleInventoryGroup(key, user);
  const ref = db.doc(`${INVENTORY_BATCHES}/${key}`);
  const actor = actorSnapshot(user);

  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    const timestamp = now();
    transaction.set(
      ref,
      {
        ...inventoryBatchMetadataFields(input, group),
        updated_by: actor,
        updated_at: timestamp,
        ...(snapshot.exists ? {} : { created_by: actor, created_at: timestamp }),
      } satisfies Partial<InventoryBatchMetadataData>,
      { merge: true },
    );
  });
}

export async function assertPackagesInGroup(
  groupKey: string,
  packageIds: string[],
  user: Pick<AuthenticatedUser, "role" | "email" | "permissions">,
): Promise<void> {
  const group = await requireVisibleInventoryGroup(groupKey, user);
  const groupPackageIds = new Set(group.packages.map((packageRecord) => packageRecord.id));
  if (packageIds.some((packageId) => !groupPackageIds.has(packageId))) {
    throw new Error("Selected packages must belong to this inventory group.");
  }
}

export function groupInventory(packages: FirestoreRecord<PackageData>[]): InventoryProductGroup[] {
  return groupInventoryRecords(packages);
}
