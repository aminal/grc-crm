import "server-only";

import { db } from "@/lib/firebase/admin";
import type {
  Address,
  AuthenticatedUser,
  DistributorData,
  FirestoreRecord,
  SettingsActivityData,
} from "@/lib/domain/types";
import { getDocument, listCollection, millis, normalizedText, now } from "./firestore";
import { buildFieldChanges, buildSettingsActivityData } from "./sales-settings";

const ACTIVITY = "activity";
const DISTRIBUTORS = "distributors";

export type DistributorInput = {
  name: string;
  license_number: string;
  contact_name: string;
  email: string;
  phone: string;
  address_street: string;
  address_city: string;
  address_state: string;
  address_postal_code: string;
  notes: string;
};

export type DistributorFields = Pick<DistributorData, "name" | "license_number" | "contact_name" | "email" | "phone" | "address" | "notes">;

type DistributorActivityFields = Omit<DistributorFields, "address"> & {
  address_street: string;
  address_city: string;
  address_state: string;
  address_postal_code: string;
};

type DistributorSource = Partial<DistributorInput> & { address?: Partial<Address> | null };
type ListDistributorsOptions = { includeArchived?: boolean };

function isArchived(data: Pick<DistributorData, "archived_at">): boolean {
  return data.archived_at !== null && data.archived_at !== undefined;
}

function addressFields(data: DistributorSource): Address {
  const address = data.address ?? {};

  return {
    street: normalizedText(data.address_street ?? address.street),
    city: normalizedText(data.address_city ?? address.city),
    state: normalizedText(data.address_state ?? address.state).toUpperCase(),
    postal_code: normalizedText(data.address_postal_code ?? address.postal_code),
  };
}

export function distributorFields(data: DistributorSource): DistributorFields {
  return {
    name: normalizedText(data.name),
    license_number: normalizedText(data.license_number),
    contact_name: normalizedText(data.contact_name),
    email: normalizedText(data.email),
    phone: normalizedText(data.phone),
    address: addressFields(data),
    notes: normalizedText(data.notes),
  };
}

export function distributorActivityFields(data: DistributorSource): DistributorActivityFields {
  const fields = distributorFields(data);

  return {
    name: fields.name,
    license_number: fields.license_number,
    contact_name: fields.contact_name,
    email: fields.email,
    phone: fields.phone,
    address_street: fields.address.street,
    address_city: fields.address.city,
    address_state: fields.address.state,
    address_postal_code: fields.address.postal_code,
    notes: fields.notes,
  };
}

export function distributorWithDefaults(data: Partial<DistributorData>): DistributorData {
  return {
    ...distributorFields(data),
    archived_at: data.archived_at ?? null,
    created_at: data.created_at ?? null,
    updated_at: data.updated_at ?? null,
  };
}

function activityWithDefaults(data: Partial<SettingsActivityData>): SettingsActivityData {
  return {
    action: data.action === "updated" || data.action === "archived" || data.action === "deleted" ? data.action : "created",
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

function activityCollectionPath(distributorId: string): string {
  return `${DISTRIBUTORS}/${distributorId}/${ACTIVITY}`;
}

export async function listDistributors(options: ListDistributorsOptions = {}): Promise<FirestoreRecord<DistributorData>[]> {
  const distributors = await listCollection<DistributorData>(DISTRIBUTORS);

  return distributors
    .map((distributor) => ({
      id: distributor.id,
      data: distributorWithDefaults(distributor.data),
    }))
    .filter((distributor) => options.includeArchived || !isArchived(distributor.data))
    .sort((a, b) => a.data.name.localeCompare(b.data.name));
}

export async function findDistributor(distributorId: string): Promise<FirestoreRecord<DistributorData> | null> {
  const distributor = await getDocument<DistributorData>(`${DISTRIBUTORS}/${distributorId}`);
  if (!distributor) {
    return null;
  }

  return {
    id: distributor.id,
    data: distributorWithDefaults(distributor.data),
  };
}

export async function createDistributor(input: DistributorInput, user: AuthenticatedUser): Promise<FirestoreRecord<DistributorData>> {
  const data = distributorFields(input);
  const ref = db.collection(DISTRIBUTORS).doc();
  const batch = db.batch();

  batch.create(ref, {
    ...data,
    archived_at: null,
    created_at: now(),
    updated_at: now(),
  } satisfies DistributorData);
  batch.create(
    db.collection(activityCollectionPath(ref.id)).doc(),
    buildSettingsActivityData("created", user, buildFieldChanges({}, distributorActivityFields(data)), "", now()),
  );
  await batch.commit();

  const created = await ref.get();
  return {
    id: ref.id,
    data: distributorWithDefaults(created.data() as DistributorData),
  };
}

export async function updateDistributor(distributorId: string, input: DistributorInput, user: AuthenticatedUser, reason: string): Promise<void> {
  const ref = db.doc(`${DISTRIBUTORS}/${distributorId}`);

  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists) {
      throw new Error("Distributor not found.");
    }

    const current = distributorWithDefaults(snapshot.data() as DistributorData);
    if (isArchived(current)) {
      throw new Error("Distributor not found.");
    }

    const next = distributorFields(input);
    const changes = buildFieldChanges(distributorActivityFields(current), distributorActivityFields(next));
    if (changes.length === 0) {
      throw new Error("No distributor changes to save.");
    }

    transaction.set(ref, { ...next, updated_at: now() }, { merge: true });
    transaction.create(
      db.collection(activityCollectionPath(distributorId)).doc(),
      buildSettingsActivityData("updated", user, changes, reason, now()),
    );
  });
}

export async function archiveDistributor(distributorId: string, user: AuthenticatedUser, reason: string): Promise<void> {
  const ref = db.doc(`${DISTRIBUTORS}/${distributorId}`);

  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists) {
      throw new Error("Distributor not found.");
    }

    const current = distributorWithDefaults(snapshot.data() as DistributorData);
    if (isArchived(current)) {
      throw new Error("Distributor not found.");
    }

    transaction.set(ref, { archived_at: now(), updated_at: now() }, { merge: true });
    transaction.create(
      db.collection(activityCollectionPath(distributorId)).doc(),
      buildSettingsActivityData("archived", user, buildFieldChanges(distributorActivityFields(current), {}), reason, now()),
    );
  });
}

export async function listDistributorActivity(distributorId: string): Promise<FirestoreRecord<SettingsActivityData>[]> {
  const entries = await listCollection<SettingsActivityData>(activityCollectionPath(distributorId));

  return entries
    .map((entry) => ({
      id: entry.id,
      data: activityWithDefaults(entry.data),
    }))
    .sort((a, b) => millis(b.data.created_at) - millis(a.data.created_at));
}
