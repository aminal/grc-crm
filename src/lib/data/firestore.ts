import "server-only";

import { FieldValue, type DocumentData, type Query, type QueryDocumentSnapshot, type Timestamp } from "firebase-admin/firestore";
import { db } from "@/lib/firebase/admin";
import type { FirestoreRecord } from "@/lib/domain/types";

export function now(): FieldValue {
  return FieldValue.serverTimestamp();
}

export function docIdFromTag(packageTag: string): string {
  return packageTag.trim().replaceAll("/", "_");
}

export function dataOf<T extends DocumentData>(snapshot: QueryDocumentSnapshot): FirestoreRecord<T> {
  return {
    id: snapshot.id,
    data: snapshot.data() as T,
  };
}

export async function listCollection<T extends DocumentData>(path: string): Promise<FirestoreRecord<T>[]> {
  const snapshot = await db.collection(path).get();
  return snapshot.docs.map((doc) => dataOf<T>(doc));
}

export async function listQuery<T extends DocumentData>(query: Query): Promise<FirestoreRecord<T>[]> {
  const snapshot = await query.get();
  return snapshot.docs.map((doc) => dataOf<T>(doc));
}

export async function getDocument<T extends DocumentData>(path: string): Promise<FirestoreRecord<T> | null> {
  const snapshot = await db.doc(path).get();
  if (!snapshot.exists) {
    return null;
  }

  return {
    id: snapshot.id,
    data: snapshot.data() as T,
  };
}

export function millis(value: unknown): number {
  if (!value) {
    return 0;
  }

  if (value instanceof Date) {
    return value.getTime();
  }

  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  if (typeof value === "object" && "toMillis" in value && typeof value.toMillis === "function") {
    return (value as Timestamp).toMillis();
  }

  if (typeof value === "object" && "toDate" in value && typeof value.toDate === "function") {
    return value.toDate().getTime();
  }

  return 0;
}

export function normalizedText(value: unknown): string {
  return String(value ?? "").trim();
}
