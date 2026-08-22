"use server";

import { revalidatePath } from "next/cache";
import { requireManagerOrAdmin } from "@/lib/auth/session";
import { adminUpdateUserProfile, getUserProfile, isSeededAdminEmail } from "@/lib/data/profiles";
import { formEntries, userUpdateSchema, validationMessage } from "@/lib/domain/schemas";

type UserFormState = {
  error: string | null;
  success: boolean;
};

export async function updateUserAction(uid: string, formData: FormData): Promise<void> {
  const user = await requireManagerOrAdmin();
  const input = userUpdateSchema.parse(formEntries(formData));
  const targetUser = await getUserProfile(uid);

  if (isSeededAdminEmail(targetUser?.data.email) && input.role !== "Admin") {
    throw new Error("This user's Admin role cannot be removed.");
  }

  if (user.role === "Manager") {
    if (user.uid === uid && input.role !== user.role) {
      throw new Error("Managers cannot change their own role.");
    }
    if (targetUser?.data.role === "Admin") {
      throw new Error("Managers cannot edit Admin users.");
    }
    if (input.role === "Admin") {
      throw new Error("Managers cannot assign the Admin role.");
    }
  }

  await adminUpdateUserProfile(uid, input);
  revalidatePath("/users");
  revalidatePath(`/users/${encodeURIComponent(uid)}`);
}

export async function updateUserFormAction(uid: string, _: UserFormState, formData: FormData): Promise<UserFormState> {
  try {
    await updateUserAction(uid, formData);
    return { error: null, success: true };
  } catch (error) {
    return { error: validationMessage(error), success: false };
  }
}
