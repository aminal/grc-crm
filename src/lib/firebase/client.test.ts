import type { Auth, UserCredential } from "firebase/auth";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  completeFirebaseRedirectSignIn,
  consumeFirebaseRedirectSignInAttempt,
  getFirebaseSignInMode,
  rememberFirebaseRedirectSignInAttempt,
} from "@/lib/firebase/client";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("getFirebaseSignInMode", () => {
  it("uses popup sign-in outside production", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST", undefined);
    vi.stubEnv("FIREBASE_AUTH_EMULATOR_HOST", undefined);

    expect(getFirebaseSignInMode()).toBe("popup");
  });

  it("uses redirect sign-in in production without an auth emulator", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST", undefined);
    vi.stubEnv("FIREBASE_AUTH_EMULATOR_HOST", undefined);

    expect(getFirebaseSignInMode()).toBe("redirect");
  });

  it("keeps popup sign-in when an auth emulator host is configured", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST", "127.0.0.1:9099");

    expect(getFirebaseSignInMode()).toBe("popup");
  });
});

describe("rememberFirebaseRedirectSignInAttempt", () => {
  it("records and consumes a pending redirect attempt", () => {
    const storage = {
      value: null as string | null,
      getItem: vi.fn((key: string) => (key === "firebase-redirect-sign-in-attempt" ? storage.value : null)),
      setItem: vi.fn((key: string, value: string) => {
        if (key === "firebase-redirect-sign-in-attempt") {
          storage.value = value;
        }
      }),
      removeItem: vi.fn((key: string) => {
        if (key === "firebase-redirect-sign-in-attempt") {
          storage.value = null;
        }
      }),
    };

    expect(consumeFirebaseRedirectSignInAttempt(storage)).toBe(false);

    rememberFirebaseRedirectSignInAttempt(storage);

    expect(consumeFirebaseRedirectSignInAttempt(storage)).toBe(true);
    expect(consumeFirebaseRedirectSignInAttempt(storage)).toBe(false);
  });
});

describe("completeFirebaseRedirectSignIn", () => {
  function createAuth(currentUser: Auth["currentUser"] = null): {
    auth: Auth;
    authStateReady: ReturnType<typeof vi.fn>;
    state: { currentUser: Auth["currentUser"] };
  } {
    const state = { currentUser };
    const authStateReady = vi.fn().mockResolvedValue(undefined);

    return {
      auth: {
        get currentUser() {
          return state.currentUser;
        },
        authStateReady,
      } as unknown as Auth,
      authStateReady,
      state,
    };
  }

  it("returns false when no redirect result is available and no redirect attempt is pending", async () => {
    const resolveRedirectResult = vi.fn().mockResolvedValue(null);
    const onIdToken = vi.fn();
    const { auth, authStateReady } = createAuth();

    await expect(
      completeFirebaseRedirectSignIn(auth, onIdToken, resolveRedirectResult),
    ).resolves.toBe(false);

    expect(resolveRedirectResult).toHaveBeenCalledOnce();
    expect(authStateReady).not.toHaveBeenCalled();
    expect(onIdToken).not.toHaveBeenCalled();
  });

  it("does not recreate the server session from an already restored Firebase user without a pending redirect attempt", async () => {
    const getIdToken = vi.fn().mockResolvedValue("restored-id-token");
    const onIdToken = vi.fn().mockResolvedValue(undefined);
    const resolveRedirectResult = vi.fn().mockResolvedValue(null);
    const { auth, authStateReady } = createAuth({ getIdToken } as unknown as Auth["currentUser"]);

    await expect(
      completeFirebaseRedirectSignIn(auth, onIdToken, resolveRedirectResult),
    ).resolves.toBe(false);

    expect(resolveRedirectResult).toHaveBeenCalledOnce();
    expect(authStateReady).not.toHaveBeenCalled();
    expect(getIdToken).not.toHaveBeenCalled();
    expect(onIdToken).not.toHaveBeenCalled();
  });

  it("returns false after checking auth state when a redirect attempt is pending but no user is restored", async () => {
    const resolveRedirectResult = vi.fn().mockResolvedValue(null);
    const onIdToken = vi.fn();
    const { auth, authStateReady } = createAuth();

    await expect(
      completeFirebaseRedirectSignIn(auth, onIdToken, resolveRedirectResult, true),
    ).resolves.toBe(false);

    expect(resolveRedirectResult).toHaveBeenCalledOnce();
    expect(authStateReady).toHaveBeenCalledOnce();
    expect(onIdToken).not.toHaveBeenCalled();
  });

  it("creates the server session from the redirect result token", async () => {
    const getIdToken = vi.fn().mockResolvedValue("firebase-id-token");
    const resolveRedirectResult = vi.fn().mockResolvedValue({
      user: { getIdToken },
    } as unknown as UserCredential);
    const onIdToken = vi.fn().mockResolvedValue(undefined);
    const { auth, authStateReady } = createAuth();

    await expect(
      completeFirebaseRedirectSignIn(auth, onIdToken, resolveRedirectResult),
    ).resolves.toBe(true);

    expect(authStateReady).not.toHaveBeenCalled();
    expect(getIdToken).toHaveBeenCalledOnce();
    expect(onIdToken).toHaveBeenCalledWith("firebase-id-token");
  });

  it("creates the server session from a restored Firebase user when the redirect result is empty for a pending redirect attempt", async () => {
    const getIdToken = vi.fn().mockResolvedValue("restored-id-token");
    const restoredUser = { getIdToken } as unknown as Auth["currentUser"];
    const resolveRedirectResult = vi.fn().mockResolvedValue(null);
    const onIdToken = vi.fn().mockResolvedValue(undefined);
    const { auth, authStateReady, state } = createAuth();
    authStateReady.mockImplementation(async () => {
      state.currentUser = restoredUser;
    });

    await expect(
      completeFirebaseRedirectSignIn(auth, onIdToken, resolveRedirectResult, true),
    ).resolves.toBe(true);

    expect(resolveRedirectResult).toHaveBeenCalledOnce();
    expect(authStateReady).toHaveBeenCalledOnce();
    expect(getIdToken).toHaveBeenCalledOnce();
    expect(onIdToken).toHaveBeenCalledWith("restored-id-token");
  });
});
