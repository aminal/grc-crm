"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { updateUserProfile } from "@/lib/data/profiles";
import { formEntries, profileSchema } from "@/lib/domain/schemas";

export async function updateProfileAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const input = profileSchema.parse(formEntries(formData));
  await updateUserProfile(user, input);
  revalidatePath("/", "layout");
  redirect("/profile?saved=1");
}
