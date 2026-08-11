"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { uploadAndSyncMetrcFile } from "@/lib/data/inventory";

export async function uploadInventoryAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("Choose a METRC .xlsx file to upload.");
  }

  await uploadAndSyncMetrcFile(file, user);
  revalidatePath("/inventory");
  redirect("/inventory");
}
