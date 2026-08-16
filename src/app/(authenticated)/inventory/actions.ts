"use server";

import { revalidatePath } from "next/cache";
import { requireManagerOrAdmin } from "@/lib/auth/session";
import { uploadAndSyncMetrcFile } from "@/lib/data/inventory";
import { validationMessage } from "@/lib/domain/schemas";

type InventoryUploadFormState = {
  error: string | null;
  success: boolean;
};

export async function uploadInventoryAction(formData: FormData): Promise<void> {
  const user = await requireManagerOrAdmin();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("Choose a METRC .xlsx file to upload.");
  }

  await uploadAndSyncMetrcFile(file, user);
  revalidatePath("/inventory");
}

export async function uploadInventoryFormAction(_: InventoryUploadFormState, formData: FormData): Promise<InventoryUploadFormState> {
  try {
    await uploadInventoryAction(formData);
    return { error: null, success: true };
  } catch (error) {
    return { error: validationMessage(error), success: false };
  }
}
