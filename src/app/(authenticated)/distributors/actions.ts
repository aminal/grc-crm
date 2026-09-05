"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireFeature } from "@/lib/auth/session";
import { archiveDistributor, createDistributor, updateDistributor } from "@/lib/data/distributors";
import {
  distributorCreateSchema,
  editReasonSchema,
  formEntries,
  validationMessage,
} from "@/lib/domain/schemas";

type DistributorFormState = {
  error: string | null;
  success: boolean;
};

export async function createDistributorAction(formData: FormData): Promise<void> {
  const user = await requireFeature("distributors", "create_distributors");
  const input = distributorCreateSchema.parse(formEntries(formData));
  await createDistributor(input, user);
  revalidatePath("/distributors");
  revalidatePath("/inventory");
}

export async function updateDistributorAction(distributorId: string, formData: FormData): Promise<void> {
  const user = await requireFeature("distributors", "update_distributors");
  const values = formEntries(formData);
  const input = distributorCreateSchema.parse(values);
  const reason = editReasonSchema.parse(values);
  await updateDistributor(distributorId, input, user, reason.reason);
  revalidatePath("/distributors");
  revalidatePath(`/distributors/${encodeURIComponent(distributorId)}`);
  revalidatePath("/inventory");
}

export async function archiveDistributorAction(distributorId: string, formData: FormData): Promise<void> {
  const user = await requireFeature("distributors", "archive_distributors");
  if (formData.get("confirmation") !== "ARCHIVE") {
    throw new Error("Type ARCHIVE to confirm distributor archive.");
  }

  await archiveDistributor(distributorId, user, "Archived from Distributors settings.");
  revalidatePath("/distributors");
  revalidatePath(`/distributors/${encodeURIComponent(distributorId)}`);
  revalidatePath("/inventory");
  redirect("/distributors");
}

export async function createDistributorFormAction(_: DistributorFormState, formData: FormData): Promise<DistributorFormState> {
  try {
    await createDistributorAction(formData);
    return { error: null, success: true };
  } catch (error) {
    return { error: validationMessage(error), success: false };
  }
}

export async function updateDistributorFormAction(distributorId: string, _: DistributorFormState, formData: FormData): Promise<DistributorFormState> {
  try {
    await updateDistributorAction(distributorId, formData);
    return { error: null, success: true };
  } catch (error) {
    return { error: validationMessage(error), success: false };
  }
}
