import "server-only";

import { applicationDefault, cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { getServerEnv } from "@/lib/env";

function privateKey(value: string | undefined): string | undefined {
  return value ? value.replace(/\\n/g, "\n") : undefined;
}

function initAdminApp(): App {
  const existing = getApps()[0];
  if (existing) {
    return existing;
  }

  const env = getServerEnv();
  const projectId = env.FIREBASE_PROJECT_ID ?? env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const storageBucket = env.FIREBASE_STORAGE_BUCKET ?? env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  const key = privateKey(env.FIREBASE_PRIVATE_KEY);

  if (projectId && env.FIREBASE_CLIENT_EMAIL && key) {
    return initializeApp({
      credential: cert({ projectId, clientEmail: env.FIREBASE_CLIENT_EMAIL, privateKey: key }),
      projectId,
      storageBucket,
    });
  }

  return initializeApp({
    credential: applicationDefault(),
    projectId,
    storageBucket,
  });
}

export const adminApp = initAdminApp();
export const adminAuth = getAuth(adminApp);
export const db = getFirestore(adminApp);
export const adminStorage = getStorage(adminApp);
