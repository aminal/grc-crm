import { initializeApp, getApps, type FirebaseApp, type FirebaseOptions } from "firebase/app";
import { connectAuthEmulator, getAuth, getRedirectResult, GoogleAuthProvider, type Auth, type UserCredential } from "firebase/auth";
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
export type FirebaseSignInMode = "popup" | "redirect";

googleProvider.setCustomParameters({
  hd: "greenroomcannabis.com",
  prompt: "select_account",
});

export function getFirebaseSignInMode(): FirebaseSignInMode {
  const authEmulatorHost = process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST || process.env.FIREBASE_AUTH_EMULATOR_HOST;
  if (process.env.NODE_ENV !== "production" || authEmulatorHost) {
    return "popup";
  }

  return "redirect";
}

const REDIRECT_SIGN_IN_ATTEMPT_KEY = "firebase-redirect-sign-in-attempt";

export async function completeFirebaseRedirectSignIn(
  firebaseAuth: Auth,
  onIdToken: (idToken: string) => Promise<void>,
  resolveRedirectResult: (auth: Auth) => Promise<UserCredential | null> = getRedirectResult,
  allowCurrentUserFallback = false,
): Promise<boolean> {
  const credential = await resolveRedirectResult(firebaseAuth);
  const user = credential?.user ?? (allowCurrentUserFallback ? await resolveCurrentUser(firebaseAuth) : null);
  if (!user) {
    return false;
  }

  const idToken = await user.getIdToken();
  await onIdToken(idToken);
  return true;
}

export function rememberFirebaseRedirectSignInAttempt(
  storage: Pick<Storage, "setItem"> | null = getSessionStorage(),
): void {
  storage?.setItem(REDIRECT_SIGN_IN_ATTEMPT_KEY, "1");
}

export function consumeFirebaseRedirectSignInAttempt(
  storage: Pick<Storage, "getItem" | "removeItem"> | null = getSessionStorage(),
): boolean {
  if (!storage) {
    return false;
  }

  const hasPendingAttempt = storage.getItem(REDIRECT_SIGN_IN_ATTEMPT_KEY) === "1";
  if (hasPendingAttempt) {
    storage.removeItem(REDIRECT_SIGN_IN_ATTEMPT_KEY);
  }

  return hasPendingAttempt;
}

async function resolveCurrentUser(firebaseAuth: Auth): Promise<Auth["currentUser"]> {
  if (firebaseAuth.currentUser) {
    return firebaseAuth.currentUser;
  }

  await firebaseAuth.authStateReady();
  return firebaseAuth.currentUser;
}

function getSessionStorage(): Storage | null {
  if (typeof window === "undefined") {
    return null;
  }

  return window.sessionStorage;
}

export function connectFirebaseAuthEmulator(): void {
  const host = process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST || process.env.FIREBASE_AUTH_EMULATOR_HOST;
  if (!host || emulatorConnected) {
    return;
  }

  connectAuthEmulator(getFirebaseAuth(), `http://${host}`, { disableWarnings: true });
  emulatorConnected = true;
}
