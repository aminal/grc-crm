"use server";

import { revalidatePath } from "next/cache";
import { requireFeature } from "@/lib/auth/session";
import { createStrain, updateStrain } from "@/lib/data/sales-settings";
import {
  editReasonSchema,
  formEntries,
  strainCreateSchema,
  strainUpdateSchema,
  validationMessage,
} from "@/lib/domain/schemas";
import type { StrainStatus } from "@/lib/domain/types";

type StrainFormState = {
  error: string | null;
  success: boolean;
  status: StrainStatus | null;
};

export async function createStrainAction(formData: FormData): Promise<StrainStatus> {
  const user = await requireFeature("strains", "create_strains");
  const input = strainCreateSchema.parse(formEntries(formData));
  await createStrain(input, user);
  revalidatePath("/settings/strains");
  revalidatePath("/settings/products");
  return input.status;
}

export async function updateStrainAction(strainId: string, formData: FormData): Promise<StrainStatus> {
  const user = await requireFeature("strains", "update_strains");
  const values = formEntries(formData);
  const input = strainUpdateSchema.parse(values);
  const reason = editReasonSchema.parse(values);
  await updateStrain(strainId, input, user, reason.reason);
  revalidatePath("/settings/strains");
  revalidatePath(`/strains/${encodeURIComponent(strainId)}`);
  revalidatePath(`/strains/${encodeURIComponent(strainId)}/edit`);
  revalidatePath("/settings/products");
  return input.status;
}

export async function createStrainFormAction(_: StrainFormState, formData: FormData): Promise<StrainFormState> {
  try {
    const status = await createStrainAction(formData);
    return { error: null, success: true, status };
  } catch (error) {
    return { error: validationMessage(error), success: false, status: null };
  }
}

export async function updateStrainFormAction(strainId: string, _: StrainFormState, formData: FormData): Promise<StrainFormState> {
  try {
    const status = await updateStrainAction(strainId, formData);
    return { error: null, success: true, status };
  } catch (error) {
    return { error: validationMessage(error), success: false, status: null };
  }
}
