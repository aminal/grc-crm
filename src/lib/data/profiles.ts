import "server-only";

import { adminAuth, db } from "@/lib/firebase/admin";
import type { AuthenticatedUser, FirestoreRecord, UserProfileData } from "@/lib/domain/types";
import { getDocument, listCollection, now } from "./firestore";

const USERS = "users";

function userProfileLabel(profile: FirestoreRecord<UserProfileData>): string {
  return profile.data.display_name?.trim() || profile.data.email?.trim() || profile.id;
}

export async function getUserProfile(uid: string): Promise<FirestoreRecord<UserProfileData> | null> {
  return getDocument<UserProfileData>(`${USERS}/${uid}`);
}

export async function syncProfileFromSignIn(uid: string, email: string, name: string | null, picture: string | null): Promise<{ name: string | null; google_voice_number: string | null }> {
  const existing = await getUserProfile(uid);
  const data = existing?.data ?? {};
  const storedName = data.display_name?.trim() ?? "";
  const claimName = name?.trim() ?? "";
  const claimPicture = picture?.trim() ?? "";
  const displayName = storedName || claimName;
  const googleVoiceNumber = data.google_voice_number?.trim() ?? "";

  const payload: Partial<UserProfileData> = {
    email,
    updated_at: now(),
  };

  if (!storedName && claimName) {
    payload.display_name = claimName;
  }

  if (claimPicture) {
    payload.picture = claimPicture;
  }

  await db.doc(`${USERS}/${uid}`).set(payload, { merge: true });

  return {
    name: displayName || null,
    google_voice_number: googleVoiceNumber || null,
  };
}

export async function updateUserProfile(user: AuthenticatedUser, fields: { display_name: string; google_voice_number: string }): Promise<void> {
  const displayName = fields.display_name.trim();
  await Promise.all([
    adminAuth.updateUser(user.uid, { displayName }),
    db.doc(`${USERS}/${user.uid}`).set(
      {
        email: user.email,
        display_name: displayName,
        google_voice_number: fields.google_voice_number.trim(),
        updated_at: now(),
      } satisfies Partial<UserProfileData>,
      { merge: true },
    ),
  ]);
}

export async function listUsers(): Promise<FirestoreRecord<UserProfileData>[]> {
  const profiles = await listCollection<UserProfileData>(USERS);
  return profiles.sort((a, b) => userProfileLabel(a).localeCompare(userProfileLabel(b)));
}

export async function userDirectory(): Promise<Record<string, { name: string | null; picture: string | null }>> {
  const directory: Record<string, { name: string | null; picture: string | null }> = {};
  const profiles = await listUsers();

  for (const profile of profiles) {
    const name = profile.data.display_name?.trim() ?? "";
    const picture = profile.data.picture?.trim() ?? "";
    if (name || picture) {
      directory[profile.id] = {
        name: name || null,
        picture: picture || null,
      };
    }
  }

  return directory;
}
