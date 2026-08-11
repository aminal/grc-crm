import { initializeApp, getApps, type FirebaseApp, type FirebaseOptions } from "firebase/app";
import { connectAuthEmulator, getAuth, GoogleAuthProvider, type Auth } from "firebase/auth";
import { getClientEnv } from "@/lib/env";

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let emulatorConnected = false;

function firebaseConfig(): FirebaseOptions {
  const env = getClientEnv();
  return {
    apiKey: env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };
}

export function getFirebaseApp(): FirebaseApp {
  app = app ?? getApps()[0] ?? initializeApp(firebaseConfig());
  return app;
}

export function getFirebaseAuth(): Auth {
  auth = auth ?? getAuth(getFirebaseApp());
  return auth;
}

export const googleProvider = new GoogleAuthProvider();

googleProvider.setCustomParameters({
  hd: "greenroomcannabis.com",
  prompt: "select_account",
});

export function connectFirebaseAuthEmulator(): void {
  const host = process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST || process.env.FIREBASE_AUTH_EMULATOR_HOST;
  if (!host || emulatorConnected) {
    return;
  }

  connectAuthEmulator(getFirebaseAuth(), `http://${host}`, { disableWarnings: true });
  emulatorConnected = true;
}
