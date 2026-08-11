import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { adminAuth } from "@/lib/firebase/admin";
import { SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from "@/lib/domain/constants";
import { getAllowedEmailDomain } from "@/lib/env";
import { isAllowedEmailForDomain } from "@/lib/auth/domain";
import type { AuthenticatedUser } from "@/lib/domain/types";
import { getUserProfile, syncProfileFromSignIn } from "@/lib/data/profiles";

export function isAllowedEmail(email: string | null | undefined, emailVerified: boolean | null | undefined): boolean {
  return isAllowedEmailForDomain(email, emailVerified, getAllowedEmailDomain());
}

export async function createSessionCookie(idToken: string): Promise<string> {
  return adminAuth.createSessionCookie(idToken, {
    expiresIn: SESSION_MAX_AGE_SECONDS * 1000,
  });
}

export async function setSessionCookie(sessionCookie: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, sessionCookie, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export async function getCurrentUser(): Promise<AuthenticatedUser | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!sessionCookie) {
    return null;
  }

  try {
    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
    const email = typeof decoded.email === "string" ? decoded.email : "";
    const emailVerified = decoded.email_verified === true;

    if (!isAllowedEmail(email, emailVerified)) {
      return null;
    }

    const profile = await getUserProfile(decoded.uid);
    const displayName = profile?.data.display_name?.trim() || (typeof decoded.name === "string" ? decoded.name : "");
    const picture = profile?.data.picture?.trim() || (typeof decoded.picture === "string" ? decoded.picture : "");
    const googleVoiceNumber = profile?.data.google_voice_number?.trim() || "";

    return {
      uid: decoded.uid,
      email,
      name: displayName || null,
      picture: picture || null,
      google_voice_number: googleVoiceNumber || null,
    };
  } catch {
    return null;
  }
}

export async function requireUser(): Promise<AuthenticatedUser> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  return user;
}

export async function syncVerifiedUserFromIdToken(idToken: string): Promise<AuthenticatedUser> {
  const decoded = await adminAuth.verifyIdToken(idToken);
  const email = typeof decoded.email === "string" ? decoded.email : "";
  const emailVerified = decoded.email_verified === true;

  if (!isAllowedEmail(email, emailVerified)) {
    throw new Error(`Access is restricted to @${getAllowedEmailDomain()} accounts.`);
  }

  const name = typeof decoded.name === "string" ? decoded.name : "";
  const picture = typeof decoded.picture === "string" ? decoded.picture : "";
  const profile = await syncProfileFromSignIn(decoded.uid, email, name || null, picture || null);

  return {
    uid: decoded.uid,
    email,
    name: profile.name,
    picture: picture || null,
    google_voice_number: profile.google_voice_number,
  };
}
