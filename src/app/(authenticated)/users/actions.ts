"use server";

import { revalidatePath } from "next/cache";
import { defaultPermissionsForRole, isFeatureEnabled, normalizePermissions } from "@/lib/auth/permissions";
import { requireSectionEnabled } from "@/lib/auth/session";
import { adminUpdateUserProfile, getUserProfile, isSeededAdminEmail } from "@/lib/data/profiles";
import { formEntries, userUpdateSchema, validationMessage } from "@/lib/domain/schemas";
import type { UserPermissions, UserRole } from "@/lib/domain/types";

type UserFormState = {
  error: string | null;
  success: boolean;
};

export async function updateUserAction(uid: string, formData: FormData): Promise<void> {
  const user = await requireSectionEnabled("users");
  const input = userUpdateSchema.parse(formEntries(formData));
  const targetUser = await getUserProfile(uid);
  const targetRole = targetUser?.data.role || "Guest";
  const targetTitle = targetUser?.data.title ?? "";
  const targetDisplayName = targetUser?.data.display_name ?? "";
  const targetPermissions = normalizePermissions(targetRole, targetUser?.data.permissions, targetUser?.data.email);
  const inputPermissions = normalizePermissions(input.role, input.permissions, targetUser?.data.email);
  const targetIsSeededAdmin = isSeededAdminEmail(targetUser?.data.email);
  const targetIsAdmin = targetIsSeededAdmin || targetUser?.data.role === "Admin";
  const profileChanged = targetDisplayName.trim() !== input.display_name || targetTitle.trim() !== input.title || targetRole !== input.role;
  const permissionsChanged = !samePermissions(targetPermissions, inputPermissions);

  if (profileChanged && !isFeatureEnabled(user, "users", "edit_user_profiles")) {
    throw new Error("You do not have permission to edit user profiles.");
  }

  if (permissionsChanged && !isFeatureEnabled(user, "users", "edit_user_permissions")) {
    throw new Error("You do not have permission to edit user permissions.");
  }

  if (isAdminRoleAssignment(targetRole, input.role) && (!isFeatureEnabled(user, "users", "assign_admin_role") || user.role !== "Admin")) {
    throw new Error("Only Admins with Admin role assignment access can assign the Admin role.");
  }

  if (targetIsSeededAdmin && input.role !== "Admin") {
    throw new Error("This user's Admin role cannot be removed.");
  }

  if (user.role !== "Admin") {
    if (targetIsAdmin) {
      throw new Error("Only Admins can edit Admin users.");
    }
    if (user.uid === uid && input.role !== user.role) {
      throw new Error("Non-Admin users cannot change their own role.");
    }
    if (input.role === "Admin") {
      throw new Error("Only Admins can assign the Admin role.");
    }
  }

  await adminUpdateUserProfile(uid, targetIsSeededAdmin ? {
    ...input,
    role: "Admin",
    permissions: defaultPermissionsForRole("Admin"),
  } : input);
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

function isAdminRoleAssignment(currentRole: UserRole, nextRole: UserRole): boolean {
  return currentRole !== "Admin" && nextRole === "Admin";
}

function samePermissions(left: UserPermissions, right: UserPermissions): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}
