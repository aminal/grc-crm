"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireManagerOrAdmin } from "@/lib/auth/session";
import { archiveStrain, createStrain, updateStrain } from "@/lib/data/sales-settings";
import {
  editReasonSchema,
  formEntries,
  strainCreateSchema,
  strainUpdateSchema,
  validationMessage,
} from "@/lib/domain/schemas";

type StrainFormState = {
  error: string | null;
  success: boolean;
};

export async function createStrainAction(formData: FormData): Promise<void> {
  const user = await requireManagerOrAdmin();
  const input = strainCreateSchema.parse(formEntries(formData));
  await createStrain(input, user);
  revalidatePath("/strains");
}

export async function updateStrainAction(strainId: string, formData: FormData): Promise<void> {
  const user = await requireManagerOrAdmin();
  const values = formEntries(formData);
  const input = strainUpdateSchema.parse(values);
  const reason = editReasonSchema.parse(values);
  await updateStrain(strainId, input, user, reason.reason);
  revalidatePath("/strains");
}

export async function archiveStrainAction(strainId: string, formData: FormData): Promise<void> {
  const user = await requireManagerOrAdmin();
  if (formData.get("confirmation") !== "ARCHIVE") {
    throw new Error("Type ARCHIVE to confirm strain archive.");
  }

  await archiveStrain(strainId, user, "Archived from Strains settings.");
  revalidatePath("/strains");
  revalidatePath("/products");
  redirect("/strains");
}

export async function createStrainFormAction(_: StrainFormState, formData: FormData): Promise<StrainFormState> {
  try {
    await createStrainAction(formData);
    return { error: null, success: true };
  } catch (error) {
    return { error: validationMessage(error), success: false };
  }
}

export async function updateStrainFormAction(strainId: string, _: StrainFormState, formData: FormData): Promise<StrainFormState> {
  try {
    await updateStrainAction(strainId, formData);
    return { error: null, success: true };
  } catch (error) {
    return { error: validationMessage(error), success: false };
  }
}
