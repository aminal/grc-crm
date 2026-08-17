import type { Auth, UserCredential } from "firebase/auth";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  completeFirebaseCurrentUserSignIn,
  completeFirebaseRedirectSignIn,
  consumeFirebaseRedirectSignInAttempt,
  getFirebaseSignInMode,
  rememberFirebaseRedirectSignInAttempt,
} from "@/lib/firebase/client";

afterEach(() => {
  vi.unstubAllEnvs();
});

function createStorage(initialValue: string | null = null): {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
  getItemMock: ReturnType<typeof vi.fn>;
  setItemMock: ReturnType<typeof vi.fn>;
  removeItemMock: ReturnType<typeof vi.fn>;
  state: { value: string | null };
} {
  const state = { value: initialValue };
  const getItemMock = vi.fn((key: string) => (key === "firebase-redirect-sign-in-attempt" ? state.value : null));
  const setItemMock = vi.fn((key: string, value: string) => {
    if (key === "firebase-redirect-sign-in-attempt") {
      state.value = value;
    }
  });
  const removeItemMock = vi.fn((key: string) => {
    if (key === "firebase-redirect-sign-in-attempt") {
      state.value = null;
    }
  });

  return {
    state,
    getItem: (key: string) => getItemMock(key),
    setItem: (key: string, value: string) => {
      setItemMock(key, value);
    },
    removeItem: (key: string) => {
      removeItemMock(key);
    },
    getItemMock,
    setItemMock,
    removeItemMock,
  };
}

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
  it("records a pending redirect attempt in session and local storage and consumes it once", () => {
    const sessionStorage = createStorage();
    const localStorage = createStorage();

    expect(consumeFirebaseRedirectSignInAttempt(sessionStorage, localStorage)).toBe(false);

    rememberFirebaseRedirectSignInAttempt(sessionStorage, localStorage, () => 1_000);

    expect(sessionStorage.setItemMock).toHaveBeenCalledWith("firebase-redirect-sign-in-attempt", "1000");
    expect(localStorage.setItemMock).toHaveBeenCalledWith("firebase-redirect-sign-in-attempt", "1000");
    expect(consumeFirebaseRedirectSignInAttempt(sessionStorage, localStorage, () => 1_500)).toBe(true);
    expect(sessionStorage.removeItemMock).toHaveBeenCalledWith("firebase-redirect-sign-in-attempt");
    expect(localStorage.removeItemMock).toHaveBeenCalledWith("firebase-redirect-sign-in-attempt");
    expect(consumeFirebaseRedirectSignInAttempt(sessionStorage, localStorage, () => 1_500)).toBe(false);
  });

  it("falls back to local storage when the session-storage marker is missing", () => {
    const sessionStorage = createStorage();
    const localStorage = createStorage("1000");

    expect(consumeFirebaseRedirectSignInAttempt(sessionStorage, localStorage, () => 1_500)).toBe(true);
    expect(sessionStorage.removeItemMock).toHaveBeenCalledWith("firebase-redirect-sign-in-attempt");
    expect(localStorage.removeItemMock).toHaveBeenCalledWith("firebase-redirect-sign-in-attempt");
  });

  it("ignores stale redirect-attempt markers", () => {
    const sessionStorage = createStorage();
    const localStorage = createStorage("1000");

    expect(consumeFirebaseRedirectSignInAttempt(sessionStorage, localStorage, () => 700_001)).toBe(false);
    expect(localStorage.removeItemMock).toHaveBeenCalledWith("firebase-redirect-sign-in-attempt");
  });
});

describe("completeFirebaseCurrentUserSignIn", () => {
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

  it("returns false when no Firebase user is restored", async () => {
    const onIdToken = vi.fn();
    const { auth, authStateReady } = createAuth();

    await expect(completeFirebaseCurrentUserSignIn(auth, onIdToken)).resolves.toBe(false);

    expect(authStateReady).toHaveBeenCalledOnce();
    expect(onIdToken).not.toHaveBeenCalled();
  });

  it("creates the server session from an already restored Firebase user", async () => {
    const getIdToken = vi.fn().mockResolvedValue("restored-id-token");
    const onIdToken = vi.fn().mockResolvedValue(undefined);
    const { auth, authStateReady } = createAuth({ getIdToken } as unknown as Auth["currentUser"]);

    await expect(completeFirebaseCurrentUserSignIn(auth, onIdToken)).resolves.toBe(true);

    expect(authStateReady).not.toHaveBeenCalled();
    expect(getIdToken).toHaveBeenCalledOnce();
    expect(onIdToken).toHaveBeenCalledWith("restored-id-token");
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
