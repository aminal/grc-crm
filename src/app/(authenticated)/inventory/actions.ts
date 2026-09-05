"use server";

import { revalidatePath } from "next/cache";
import { requireFeature } from "@/lib/auth/session";
import { finalizeMetrcSync, uploadAndSyncMetrcFile, type MetrcSyncAnalysis } from "@/lib/data/inventory";
import { formEntries, syncConsignmentSchema, validationMessage } from "@/lib/domain/schemas";

export type InventorySyncState = {
  error: string | null;
  analysis: MetrcSyncAnalysis | null;
  completed: boolean;
};

export async function analyzeInventoryUploadFormAction(_: InventorySyncState, formData: FormData): Promise<InventorySyncState> {
  try {
    const user = await requireFeature("inventory", "upload_metrc");
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      throw new Error("Choose a METRC .xlsx file to upload.");
    }

    const analysis = await uploadAndSyncMetrcFile(file, user);
    revalidatePath("/inventory");
    revalidatePath("/sales/create");

    if (analysis.stale_packages.length === 0) {
      return { error: null, analysis: null, completed: true };
    }

    return { error: null, analysis, completed: false };
  } catch (error) {
    return { error: validationMessage(error), analysis: null, completed: false };
  }
}

export async function finalizeInventorySyncFormAction(state: InventorySyncState, formData: FormData): Promise<InventorySyncState> {
  try {
    const user = await requireFeature("inventory", "upload_metrc");
    const input = syncConsignmentSchema.parse(formEntries(formData));
    await finalizeMetrcSync(
      {
        sync_id: input.sync_id,
        distributor_id: input.distributor_id,
        package_ids: input.package_ids,
      },
      user,
    );
    revalidatePath("/inventory");
    revalidatePath("/sales/create");

    return { error: null, analysis: null, completed: true };
  } catch (error) {
    return { error: validationMessage(error), analysis: state.analysis, completed: false };
  }
}
