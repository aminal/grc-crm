import "server-only";

import { db } from "@/lib/firebase/admin";
import type {
  AuthenticatedUser,
  BrandData,
  FieldChange,
  FirestoreRecord,
  ProductData,
  SettingsActivityAction,
  SettingsActivityData,
  StrainData,
} from "@/lib/domain/types";
import { getDocument, listCollection, millis, normalizedText, now } from "./firestore";

const ACTIVITY = "activity";
const BRANDS = "brands";
const PRODUCTS = "products";
const STRAINS = "strains";

type BrandInput = Pick<BrandData, "name" | "website" | "notes">;
type StrainInput = Pick<StrainData, "name" | "breeder" | "genetics" | "sativa_percentage" | "notes">;
type StrainActivityFields = Omit<StrainInput, "sativa_percentage"> & { sativa_percentage: string };
type ProductInput = Pick<ProductData, "name" | "brand_id" | "strain_ids" | "category" | "unit_base_price_cents" | "case_quantity" | "sku" | "upc" | "notes">;
type ProductActivityFields = Omit<ProductInput, "strain_ids" | "unit_base_price_cents" | "case_quantity"> & { strain_ids: string; unit_base_price_cents: string; case_quantity: string };
type SettingsCollection = typeof BRANDS | typeof PRODUCTS | typeof STRAINS;

function brandFields(data: Partial<BrandInput>): BrandInput {
  return {
    name: normalizedText(data.name),
    website: normalizedText(data.website),
    notes: normalizedText(data.notes),
  };
}

function strainIdsFromInput(value: unknown): string[] {
  const values = Array.isArray(value) ? value : [];
  return [...new Set(values.map(normalizedText).filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function nonnegativeInteger(value: unknown): number {
  const numeric = typeof value === "number" ? value : typeof value === "string" && value.trim() !== "" ? Number(value) : 0;
  return Number.isFinite(numeric) ? Math.max(0, Math.trunc(numeric)) : 0;
}

function normalizeSativaPercentage(value: unknown, legacyType: unknown): number {
  const numeric = typeof value === "number" ? value : typeof value === "string" && value.trim() !== "" ? Number(value) : Number.NaN;
  if (Number.isFinite(numeric)) {
    return Math.min(100, Math.max(0, Math.trunc(numeric)));
  }

  const type = normalizedText(legacyType).toLowerCase();
  const hasSativa = type.includes("sativa");
  const hasIndica = type.includes("indica");
  if (hasSativa && !hasIndica) {
    return 100;
  }

  if (hasIndica && !hasSativa) {
    return 0;
  }

  return 50;
}

function strainFields(data: Partial<StrainInput> & { type?: unknown }): StrainInput {
  return {
    name: normalizedText(data.name),
    breeder: normalizedText(data.breeder),
    genetics: normalizedText(data.genetics),
    sativa_percentage: normalizeSativaPercentage(data.sativa_percentage, data.type),
    notes: normalizedText(data.notes),
  };
}

export function strainActivityFields(data: Partial<StrainInput> & { type?: unknown }): StrainActivityFields {
  const fields = strainFields(data);
  return {
    ...fields,
    sativa_percentage: String(fields.sativa_percentage),
  };
}

function productFields(data: Partial<ProductInput>): ProductInput {
  return {
    name: normalizedText(data.name),
    brand_id: normalizedText(data.brand_id),
    strain_ids: strainIdsFromInput(data.strain_ids),
    category: normalizedText(data.category),
    unit_base_price_cents: nonnegativeInteger(data.unit_base_price_cents),
    case_quantity: nonnegativeInteger(data.case_quantity),
    sku: normalizedText(data.sku),
    upc: normalizedText(data.upc),
    notes: normalizedText(data.notes),
  };
}

export function productActivityFields(data: Partial<ProductInput>): ProductActivityFields {
  const fields = productFields(data);
  return {
    ...fields,
    strain_ids: JSON.stringify(fields.strain_ids),
    unit_base_price_cents: fields.unit_base_price_cents > 0 ? (fields.unit_base_price_cents / 100).toFixed(2) : "",
    case_quantity: fields.case_quantity > 0 ? String(fields.case_quantity) : "",
  };
}

function brandWithDefaults(data: Partial<BrandData>): BrandData {
  return {
    ...brandFields(data),
    created_at: data.created_at ?? null,
    updated_at: data.updated_at ?? null,
  };
}

function strainWithDefaults(data: Partial<StrainData>): StrainData {
  return {
    ...strainFields(data),
    type: normalizedText(data.type),
    deleted_at: data.deleted_at ?? null,
    created_at: data.created_at ?? null,
    updated_at: data.updated_at ?? null,
  };
}

function productWithDefaults(data: Partial<ProductData>): ProductData {
  return {
    ...productFields(data),
    created_at: data.created_at ?? null,
    updated_at: data.updated_at ?? null,
  };
}

function activityWithDefaults(data: Partial<SettingsActivityData>): SettingsActivityData {
  return {
    action: data.action === "updated" || data.action === "deleted" ? data.action : "created",
    reason: normalizedText(data.reason),
    actor_user_id: normalizedText(data.actor_user_id),
    actor_email: normalizedText(data.actor_email),
    actor_name: normalizedText(data.actor_name),
    actor_picture: normalizedText(data.actor_picture),
    changes: Array.isArray(data.changes)
      ? data.changes.map((change) => ({
          field: normalizedText(change?.field),
          previous_value: normalizedText(change?.previous_value),
          next_value: normalizedText(change?.next_value),
        }))
      : [],
    created_at: data.created_at ?? null,
  };
}

function activityCollectionPath(collection: SettingsCollection, documentId: string): string {
  return `${collection}/${documentId}/${ACTIVITY}`;
}

export function buildFieldChanges(previous: Record<string, unknown>, next: Record<string, unknown>): FieldChange[] {
  const fields = [...new Set([...Object.keys(next), ...Object.keys(previous)])];

  return fields.flatMap((field) => {
    const previousValue = normalizedText(previous[field]);
    const nextValue = normalizedText(next[field]);
    if (previousValue === nextValue) {
      return [];
    }

    return [{
      field,
      previous_value: previousValue,
      next_value: nextValue,
    }];
  });
}

export function buildSettingsActivityData(
  action: SettingsActivityAction,
  user: AuthenticatedUser,
  changes: FieldChange[],
  reason: string,
  createdAt: SettingsActivityData["created_at"],
): SettingsActivityData {
  return {
    action,
    reason: normalizedText(reason),
    actor_user_id: user.uid,
    actor_email: user.email,
    actor_name: user.name ?? user.email,
    actor_picture: user.picture ?? "",
    changes,
    created_at: createdAt,
  };
}

async function listSettingsActivity(collection: SettingsCollection, documentId: string): Promise<FirestoreRecord<SettingsActivityData>[]> {
  const entries = await listCollection<SettingsActivityData>(activityCollectionPath(collection, documentId));
  return entries
    .map((entry) => ({
      id: entry.id,
      data: activityWithDefaults(entry.data),
    }))
    .sort((a, b) => millis(b.data.created_at) - millis(a.data.created_at));
}

async function requireBrandExists(brandId: string): Promise<void> {
  const brand = await findBrand(brandId);
  if (!brand) {
    throw new Error("Brand not found.");
  }
}

function isStrainDeleted(strain: StrainData): boolean {
  return strain.deleted_at !== null && strain.deleted_at !== undefined;
}

function validateStrains(strains: FirestoreRecord<StrainData>[], strainIds: string[], existingStrainIds: string[]): void {
  const existing = new Set(existingStrainIds);
  const strainById = new Map(strains.map((strain) => [strain.id, strain.data]));

  for (const strainId of strainIds) {
    const strain = strainById.get(strainId);
    if (!strain) {
      throw new Error("Strain not found.");
    }

    if (isStrainDeleted(strain) && !existing.has(strainId)) {
      throw new Error("Strain not found.");
    }
  }
}

async function requireStrainsAvailable(strainIds: string[], existingStrainIds: string[] = []): Promise<void> {
  if (strainIds.length === 0) {
    throw new Error("Choose at least one strain.");
  }

  const strains = await Promise.all(strainIds.map(findStrain));
  validateStrains(strains.filter((strain): strain is FirestoreRecord<StrainData> => strain !== null), strainIds, existingStrainIds);
}

export async function listBrands(): Promise<FirestoreRecord<BrandData>[]> {
  const brands = await listCollection<BrandData>(BRANDS);
  return brands
    .map((brand) => ({
      id: brand.id,
      data: brandWithDefaults(brand.data),
    }))
    .sort((a, b) => a.data.name.localeCompare(b.data.name));
}

export async function findBrand(brandId: string): Promise<FirestoreRecord<BrandData> | null> {
  const brand = await getDocument<BrandData>(`${BRANDS}/${brandId}`);
  if (!brand) {
    return null;
  }

  return {
    id: brand.id,
    data: brandWithDefaults(brand.data),
  };
}

export async function createBrand(input: BrandInput, user: AuthenticatedUser): Promise<FirestoreRecord<BrandData>> {
  const data = brandFields(input);
  const ref = db.collection(BRANDS).doc();
  const batch = db.batch();

  batch.create(ref, {
    ...data,
    created_at: now(),
    updated_at: now(),
  } satisfies BrandData);
  batch.create(
    db.collection(activityCollectionPath(BRANDS, ref.id)).doc(),
    buildSettingsActivityData("created", user, buildFieldChanges({}, data), "", now()),
  );
  await batch.commit();

  const created = await ref.get();
  return {
    id: ref.id,
    data: brandWithDefaults(created.data() as BrandData),
  };
}

export async function updateBrand(brandId: string, input: BrandInput, user: AuthenticatedUser, reason: string): Promise<void> {
  const ref = db.doc(`${BRANDS}/${brandId}`);

  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists) {
      throw new Error("Brand not found.");
    }

    const current = brandWithDefaults(snapshot.data() as BrandData);
    const next = brandFields(input);
    const changes = buildFieldChanges(brandFields(current), next);
    if (changes.length === 0) {
      throw new Error("No brand changes to save.");
    }

    transaction.set(ref, { ...next, updated_at: now() }, { merge: true });
    transaction.create(
      db.collection(activityCollectionPath(BRANDS, brandId)).doc(),
      buildSettingsActivityData("updated", user, changes, reason, now()),
    );
  });
}

export async function listBrandActivity(brandId: string): Promise<FirestoreRecord<SettingsActivityData>[]> {
  return listSettingsActivity(BRANDS, brandId);
}

export async function listStrains(): Promise<FirestoreRecord<StrainData>[]> {
  const strains = await listCollection<StrainData>(STRAINS);
  return strains
    .map((strain) => ({
      id: strain.id,
      data: strainWithDefaults(strain.data),
    }))
    .filter((strain) => !isStrainDeleted(strain.data))
    .sort((a, b) => a.data.name.localeCompare(b.data.name));
}

export async function findStrain(strainId: string): Promise<FirestoreRecord<StrainData> | null> {
  const strain = await getDocument<StrainData>(`${STRAINS}/${strainId}`);
  if (!strain) {
    return null;
  }

  return {
    id: strain.id,
    data: strainWithDefaults(strain.data),
  };
}

export async function createStrain(input: StrainInput, user: AuthenticatedUser): Promise<FirestoreRecord<StrainData>> {
  const data = strainFields(input);
  const ref = db.collection(STRAINS).doc();
  const batch = db.batch();

  batch.create(ref, {
    ...data,
    deleted_at: null,
    created_at: now(),
    updated_at: now(),
  } satisfies StrainData);
  batch.create(
    db.collection(activityCollectionPath(STRAINS, ref.id)).doc(),
    buildSettingsActivityData("created", user, buildFieldChanges({}, strainActivityFields(data)), "", now()),
  );
  await batch.commit();

  const created = await ref.get();
  return {
    id: ref.id,
    data: strainWithDefaults(created.data() as StrainData),
  };
}

export async function updateStrain(strainId: string, input: StrainInput, user: AuthenticatedUser, reason: string): Promise<void> {
  const ref = db.doc(`${STRAINS}/${strainId}`);

  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists) {
      throw new Error("Strain not found.");
    }

    const current = strainWithDefaults(snapshot.data() as StrainData);
    if (isStrainDeleted(current)) {
      throw new Error("Strain not found.");
    }

    const next = strainFields(input);
    const changes = buildFieldChanges(strainActivityFields(current), strainActivityFields(next));
    if (changes.length === 0) {
      throw new Error("No strain changes to save.");
    }

    transaction.set(ref, { ...next, updated_at: now() }, { merge: true });
    transaction.create(
      db.collection(activityCollectionPath(STRAINS, strainId)).doc(),
      buildSettingsActivityData("updated", user, changes, reason, now()),
    );
  });
}

export async function deleteStrain(strainId: string, user: AuthenticatedUser, reason: string): Promise<void> {
  const ref = db.doc(`${STRAINS}/${strainId}`);

  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists) {
      throw new Error("Strain not found.");
    }

    const current = strainWithDefaults(snapshot.data() as StrainData);
    if (isStrainDeleted(current)) {
      throw new Error("Strain not found.");
    }

    transaction.set(ref, { deleted_at: now(), updated_at: now() }, { merge: true });
    transaction.create(
      db.collection(activityCollectionPath(STRAINS, strainId)).doc(),
      buildSettingsActivityData("deleted", user, buildFieldChanges(strainActivityFields(current), {}), reason, now()),
    );
  });
}

export async function listStrainActivity(strainId: string): Promise<FirestoreRecord<SettingsActivityData>[]> {
  return listSettingsActivity(STRAINS, strainId);
}

export async function listProducts(): Promise<FirestoreRecord<ProductData>[]> {
  const products = await listCollection<ProductData>(PRODUCTS);
  return products
    .map((product) => ({
      id: product.id,
      data: productWithDefaults(product.data),
    }))
    .sort((a, b) => a.data.name.localeCompare(b.data.name));
}

export async function findProduct(productId: string): Promise<FirestoreRecord<ProductData> | null> {
  const product = await getDocument<ProductData>(`${PRODUCTS}/${productId}`);
  if (!product) {
    return null;
  }

  return {
    id: product.id,
    data: productWithDefaults(product.data),
  };
}

export async function createProduct(input: ProductInput, user: AuthenticatedUser): Promise<FirestoreRecord<ProductData>> {
  const data = productFields(input);
  await Promise.all([
    requireBrandExists(data.brand_id),
    requireStrainsAvailable(data.strain_ids),
  ]);

  const ref = db.collection(PRODUCTS).doc();
  const batch = db.batch();

  batch.create(ref, {
    ...data,
    created_at: now(),
    updated_at: now(),
  } satisfies ProductData);
  batch.create(
    db.collection(activityCollectionPath(PRODUCTS, ref.id)).doc(),
    buildSettingsActivityData("created", user, buildFieldChanges({}, productActivityFields(data)), "", now()),
  );
  await batch.commit();

  const created = await ref.get();
  return {
    id: ref.id,
    data: productWithDefaults(created.data() as ProductData),
  };
}

export async function updateProduct(productId: string, input: ProductInput, user: AuthenticatedUser, reason: string): Promise<void> {
  const ref = db.doc(`${PRODUCTS}/${productId}`);

  await db.runTransaction(async (transaction) => {
    const next = productFields(input);
    const [productSnapshot, brandSnapshot] = await Promise.all([
      transaction.get(ref),
      transaction.get(db.doc(`${BRANDS}/${next.brand_id}`)),
    ]);

    if (!productSnapshot.exists) {
      throw new Error("Product not found.");
    }

    if (!brandSnapshot.exists) {
      throw new Error("Brand not found.");
    }

    const current = productWithDefaults(productSnapshot.data() as ProductData);
    if (next.strain_ids.length === 0) {
      throw new Error("Choose at least one strain.");
    }

    const strainSnapshots = await Promise.all(next.strain_ids.map((strainId) => transaction.get(db.doc(`${STRAINS}/${strainId}`))));
    validateStrains(
      strainSnapshots
        .filter((snapshot) => snapshot.exists)
        .map((snapshot) => ({ id: snapshot.id, data: strainWithDefaults(snapshot.data() as StrainData) })),
      next.strain_ids,
      current.strain_ids,
    );

    const changes = buildFieldChanges(productActivityFields(current), productActivityFields(next));
    if (changes.length === 0) {
      throw new Error("No product changes to save.");
    }

    transaction.set(ref, { ...next, updated_at: now() }, { merge: true });
    transaction.create(
      db.collection(activityCollectionPath(PRODUCTS, productId)).doc(),
      buildSettingsActivityData("updated", user, changes, reason, now()),
    );
  });
}

export async function listProductActivity(productId: string): Promise<FirestoreRecord<SettingsActivityData>[]> {
  return listSettingsActivity(PRODUCTS, productId);
}
