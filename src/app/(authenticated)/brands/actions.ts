"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { createBrand, updateBrand } from "@/lib/data/sales-settings";
import {
  brandCreateSchema,
  editReasonSchema,
  formEntries,
  validationMessage,
} from "@/lib/domain/schemas";

type BrandFormState = {
  error: string | null;
  success: boolean;
};

export async function createBrandAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const input = brandCreateSchema.parse(formEntries(formData));
  await createBrand(input, user);
  revalidatePath("/brands");
}

export async function updateBrandAction(brandId: string, formData: FormData): Promise<void> {
  const user = await requireUser();
  const values = formEntries(formData);
  const input = brandCreateSchema.parse(values);
  const reason = editReasonSchema.parse(values);
  await updateBrand(brandId, input, user, reason.reason);
  revalidatePath("/brands");
}

export async function createBrandFormAction(_: BrandFormState, formData: FormData): Promise<BrandFormState> {
  try {
    await createBrandAction(formData);
    return { error: null, success: true };
  } catch (error) {
    return { error: validationMessage(error), success: false };
  }
}

export async function updateBrandFormAction(brandId: string, _: BrandFormState, formData: FormData): Promise<BrandFormState> {
  try {
    await updateBrandAction(brandId, formData);
    return { error: null, success: true };
  } catch (error) {
    return { error: validationMessage(error), success: false };
  }
}
