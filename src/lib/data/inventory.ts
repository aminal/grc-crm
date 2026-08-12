import "server-only";

import { randomUUID } from "node:crypto";
import { basename } from "node:path";
import { adminStorage, db } from "@/lib/firebase/admin";
import type { AuthenticatedUser, FirestoreRecord, InventoryProductGroup, PackageData, ParsedPackageData, ProductData } from "@/lib/domain/types";
import { docIdFromTag, getDocument, listCollection, now } from "./firestore";
import { groupInventory as groupInventoryRecords } from "@/lib/metrc/inventory-grouping";
import { parseMetrcWorkbook } from "@/lib/metrc/metrc-spreadsheet-parser";
import { listProducts } from "./sales-settings";
import { derivedPackageStatus, packageStatusMap } from "./package-status";

export { parseMetrcWorkbook } from "@/lib/metrc/metrc-spreadsheet-parser";

const PACKAGES = "packages";
const MAX_METRC_UPLOAD_BYTES = 20 * 1024 * 1024;

type PackageProductMapping = FirestoreRecord<Pick<ProductData, "name" | "category" | "sku" | "upc">>;
type SyncPackageData = ParsedPackageData & Pick<PackageData, "product_id">;

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

export type MetrcSyncResult = {
  created: number;
  updated: number;
  deactivated: number;
  total_parsed: number;
  totalParsed: number;
  storage_path: string | null;
};

export async function syncPackages(parsedPackages: ParsedPackageData[]): Promise<Omit<MetrcSyncResult, "storage_path">> {
  const [existing, products] = await Promise.all([listCollection<PackageData>(PACKAGES), listProducts()]);
  const existingById = new Map(existing.map((doc) => [doc.id, doc.data]));
  const mappedPackages = mapPackagesToProducts(parsedPackages, products, existingById);
  const seenIds = new Set<string>();
  let created = 0;
  let updated = 0;

  let batch = db.batch();
  let operations = 0;
  const commitIfNeeded = async (): Promise<void> => {
    if (operations < 450) {
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
      last_synced_at: now(),
      updated_at: now(),
      ...(existingPackage ? {} : { created_at: now() }),
    });
    operations += 1;
    await commitIfNeeded();

    if (existingPackage) {
      updated += 1;
    } else {
      created += 1;
    }
  }

  let deactivated = 0;
  for (const doc of existing) {
    if (doc.data.active && !seenIds.has(doc.id)) {
      batch.set(
        db.doc(`${PACKAGES}/${doc.id}`),
        {
          active: false,
          status: "inactive",
          deactivated_at: now(),
          updated_at: now(),
        },
        { merge: true },
      );
      operations += 1;
      deactivated += 1;
      await commitIfNeeded();
    }
  }

  if (operations > 0) {
    await batch.commit();
  }

  return {
    created,
    updated,
    deactivated,
    total_parsed: parsedPackages.length,
    totalParsed: parsedPackages.length,
  };
}

export async function uploadAndSyncMetrcFile(file: File, user: AuthenticatedUser): Promise<MetrcSyncResult> {
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
  const result = await syncPackages(parsed);

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

export function groupInventory(packages: FirestoreRecord<PackageData>[]): InventoryProductGroup[] {
  return groupInventoryRecords(packages);
}
