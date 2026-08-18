import { initializeApp, getApps, type FirebaseApp, type FirebaseOptions } from "firebase/app";
import { connectAuthEmulator, getAuth, getRedirectResult, GoogleAuthProvider, type Auth, type UserCredential } from "firebase/auth";
import { getClientEnv } from "@/lib/env";

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let emulatorConnected = false;

type RedirectAttemptReadableStorage = Pick<Storage, "getItem" | "removeItem">;
type RedirectAttemptWritableStorage = Pick<Storage, "setItem">;

const REDIRECT_SIGN_IN_ATTEMPT_KEY = "firebase-redirect-sign-in-attempt";
const REDIRECT_SIGN_IN_ATTEMPT_TTL_MS = 10 * 60 * 1000;

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

export async function completeFirebaseCurrentUserSignIn(
  firebaseAuth: Auth,
  onIdToken: (idToken: string) => Promise<void>,
): Promise<boolean> {
  const user = await resolveCurrentUser(firebaseAuth);
  if (!user) {
    return false;
  }

  const idToken = await user.getIdToken();
  await onIdToken(idToken);
  return true;
}

export function rememberFirebaseRedirectSignInAttempt(
  sessionStorage: RedirectAttemptWritableStorage | null = getSessionStorage(),
  localStorage: RedirectAttemptWritableStorage | null = getLocalStorage(),
  now: () => number = Date.now,
): void {
  const timestamp = String(now());

  sessionStorage?.setItem(REDIRECT_SIGN_IN_ATTEMPT_KEY, timestamp);
  localStorage?.setItem(REDIRECT_SIGN_IN_ATTEMPT_KEY, timestamp);
}

export function hasFreshFirebaseRedirectSignInAttempt(
  sessionStorage: RedirectAttemptReadableStorage | null = getSessionStorage(),
  localStorage: RedirectAttemptReadableStorage | null = getLocalStorage(),
  now: () => number = Date.now,
): boolean {
  const attempts = [
    sessionStorage?.getItem(REDIRECT_SIGN_IN_ATTEMPT_KEY),
    localStorage?.getItem(REDIRECT_SIGN_IN_ATTEMPT_KEY),
  ].filter((attempt): attempt is string => Boolean(attempt));
  if (attempts.length === 0) {
    return false;
  }

  const hasFreshAttempt = attempts.some((attempt) => isFreshRedirectSignInAttempt(attempt, now));
  if (!hasFreshAttempt) {
    clearFirebaseRedirectSignInAttempt(sessionStorage, localStorage);
  }

  return hasFreshAttempt;
}

export function consumeFirebaseRedirectSignInAttempt(
  sessionStorage: RedirectAttemptReadableStorage | null = getSessionStorage(),
  localStorage: RedirectAttemptReadableStorage | null = getLocalStorage(),
  now: () => number = Date.now,
): boolean {
  const hasFreshAttempt = hasFreshFirebaseRedirectSignInAttempt(sessionStorage, localStorage, now);
  if (hasFreshAttempt) {
    clearFirebaseRedirectSignInAttempt(sessionStorage, localStorage);
  }

  return hasFreshAttempt;
}

async function resolveCurrentUser(firebaseAuth: Auth): Promise<Auth["currentUser"]> {
  if (firebaseAuth.currentUser) {
    return firebaseAuth.currentUser;
  }

  await firebaseAuth.authStateReady();
  return firebaseAuth.currentUser;
}

function isFreshRedirectSignInAttempt(value: string, now: () => number): boolean {
  const timestamp = Number(value);
  return Number.isFinite(timestamp) && now() - timestamp <= REDIRECT_SIGN_IN_ATTEMPT_TTL_MS;
}

export function clearFirebaseRedirectSignInAttempt(
  sessionStorage: RedirectAttemptReadableStorage | null = getSessionStorage(),
  localStorage: RedirectAttemptReadableStorage | null = getLocalStorage(),
): void {
  sessionStorage?.removeItem(REDIRECT_SIGN_IN_ATTEMPT_KEY);
  localStorage?.removeItem(REDIRECT_SIGN_IN_ATTEMPT_KEY);
}

function getSessionStorage(): Storage | null {
  if (typeof window === "undefined") {
    return null;
  }

  return window.sessionStorage;
}

function getLocalStorage(): Storage | null {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage;
}

export function connectFirebaseAuthEmulator(): void {
  const host = process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST || process.env.FIREBASE_AUTH_EMULATOR_HOST;
  if (!host || emulatorConnected) {
    return;
  }

  connectAuthEmulator(getFirebaseAuth(), `http://${host}`, { disableWarnings: true });
  emulatorConnected = true;
}
