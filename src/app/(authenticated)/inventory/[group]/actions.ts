"use server";

import { revalidatePath } from "next/cache";
import { requireFeature } from "@/lib/auth/session";
import { assertPackagesInGroup, clearPackagesConsignment, consignPackages, updateInventoryBatchMetadata } from "@/lib/data/inventory";
import { batchMetadataSchema, formEntries, packageConsignmentSchema, packageSelectionSchema, validationMessage } from "@/lib/domain/schemas";

export type PackageConsignmentState = {
  error: string | null;
  success: boolean;
};

export type BatchMetadataState = {
  error: string | null;
  success: boolean;
};

function revalidateConsignment(group: string): void {
  revalidatePath("/inventory");
  revalidatePath(`/inventory/${group}`);
  revalidatePath("/sales/create");
}

function revalidateBatchMetadata(group: string): void {
  revalidatePath("/inventory");
  revalidatePath(`/inventory/${group}`);
}

export async function consignPackagesFormAction(group: string, _: PackageConsignmentState, formData: FormData): Promise<PackageConsignmentState> {
  try {
    const user = await requireFeature("inventory", "manage_consignment");
    const input = packageConsignmentSchema.parse(formEntries(formData));
    await assertPackagesInGroup(decodeURIComponent(group), input.package_ids, user);
    await consignPackages(input.package_ids, input.distributor_id, input.notes, user);
    revalidateConsignment(group);

    return { error: null, success: true };
  } catch (error) {
    return { error: validationMessage(error), success: false };
  }
}

export async function clearPackagesConsignmentFormAction(group: string, _: PackageConsignmentState, formData: FormData): Promise<PackageConsignmentState> {
  try {
    const user = await requireFeature("inventory", "manage_consignment");
    const input = packageSelectionSchema.parse(formEntries(formData));
    await assertPackagesInGroup(decodeURIComponent(group), input.package_ids, user);
    await clearPackagesConsignment(input.package_ids, user);
    revalidateConsignment(group);

    return { error: null, success: true };
  } catch (error) {
    return { error: validationMessage(error), success: false };
  }
}

export async function updateBatchMetadataFormAction(group: string, _: BatchMetadataState, formData: FormData): Promise<BatchMetadataState> {
  try {
    const user = await requireFeature("inventory", "manage_batches");
    const input = batchMetadataSchema.parse(formEntries(formData));
    await updateInventoryBatchMetadata(decodeURIComponent(group), input, user);
    revalidateBatchMetadata(group);

    return { error: null, success: true };
  } catch (error) {
    return { error: validationMessage(error), success: false };
  }
}
