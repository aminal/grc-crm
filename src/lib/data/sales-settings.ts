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
} from "@/lib/domain/types";
import { getDocument, listCollection, millis, normalizedText, now } from "./firestore";

const ACTIVITY = "activity";
const BRANDS = "brands";
const PRODUCTS = "products";

type BrandInput = Pick<BrandData, "name" | "website" | "notes">;
type ProductInput = Pick<ProductData, "name" | "brand_id" | "category" | "sku" | "notes">;
type SettingsCollection = typeof BRANDS | typeof PRODUCTS;

function brandFields(data: Partial<BrandInput>): BrandInput {
  return {
    name: normalizedText(data.name),
    website: normalizedText(data.website),
    notes: normalizedText(data.notes),
  };
}

function productFields(data: Partial<ProductInput>): ProductInput {
  return {
    name: normalizedText(data.name),
    brand_id: normalizedText(data.brand_id),
    category: normalizedText(data.category),
    sku: normalizedText(data.sku),
    notes: normalizedText(data.notes),
  };
}

function brandWithDefaults(data: Partial<BrandData>): BrandData {
  return {
    ...brandFields(data),
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
    action: data.action === "updated" ? "updated" : "created",
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

export function buildFieldChanges(previous: Record<string, string>, next: Record<string, string>): FieldChange[] {
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
  await requireBrandExists(input.brand_id);

  const data = productFields(input);
  const ref = db.collection(PRODUCTS).doc();
  const batch = db.batch();

  batch.create(ref, {
    ...data,
    created_at: now(),
    updated_at: now(),
  } satisfies ProductData);
  batch.create(
    db.collection(activityCollectionPath(PRODUCTS, ref.id)).doc(),
    buildSettingsActivityData("created", user, buildFieldChanges({}, data), "", now()),
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
    const [productSnapshot, brandSnapshot] = await Promise.all([
      transaction.get(ref),
      transaction.get(db.doc(`${BRANDS}/${normalizedText(input.brand_id)}`)),
    ]);

    if (!productSnapshot.exists) {
      throw new Error("Product not found.");
    }

    if (!brandSnapshot.exists) {
      throw new Error("Brand not found.");
    }

    const current = productWithDefaults(productSnapshot.data() as ProductData);
    const next = productFields(input);
    const changes = buildFieldChanges(productFields(current), next);
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
