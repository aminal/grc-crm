import type { Auth, UserCredential } from "firebase/auth";
import { afterEach, describe, expect, it, vi } from "vitest";
import { completeFirebaseRedirectSignIn, getFirebaseSignInMode } from "@/lib/firebase/client";

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

describe("completeFirebaseRedirectSignIn", () => {
  it("returns false when no redirect result is available", async () => {
    const resolveRedirectResult = vi.fn().mockResolvedValue(null);
    const onIdToken = vi.fn();

    await expect(
      completeFirebaseRedirectSignIn({} as Auth, onIdToken, resolveRedirectResult),
    ).resolves.toBe(false);

    expect(resolveRedirectResult).toHaveBeenCalledOnce();
    expect(onIdToken).not.toHaveBeenCalled();
  });

  it("creates the server session from the redirect result token", async () => {
    const getIdToken = vi.fn().mockResolvedValue("firebase-id-token");
    const resolveRedirectResult = vi.fn().mockResolvedValue({
      user: { getIdToken },
    } as unknown as UserCredential);
    const onIdToken = vi.fn().mockResolvedValue(undefined);

    await expect(
      completeFirebaseRedirectSignIn({} as Auth, onIdToken, resolveRedirectResult),
    ).resolves.toBe(true);

    expect(getIdToken).toHaveBeenCalledOnce();
    expect(onIdToken).toHaveBeenCalledWith("firebase-id-token");
  });
});
