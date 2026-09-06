"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireFeature } from "@/lib/auth/session";
import { archiveBrand, createBrand, updateBrand } from "@/lib/data/sales-settings";
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
  const user = await requireFeature("brands", "create_brands");
  const input = brandCreateSchema.parse(formEntries(formData));
  await createBrand(input, user);
  revalidatePath("/settings/brands");
}

export async function updateBrandAction(brandId: string, formData: FormData): Promise<void> {
  const user = await requireFeature("brands", "update_brands");
  const values = formEntries(formData);
  const input = brandCreateSchema.parse(values);
  const reason = editReasonSchema.parse(values);
  await updateBrand(brandId, input, user, reason.reason);
  revalidatePath("/settings/brands");
  revalidatePath(`/brands/${encodeURIComponent(brandId)}`);
}

export async function archiveBrandAction(brandId: string, formData: FormData): Promise<void> {
  const user = await requireFeature("brands", "archive_brands");
  if (formData.get("confirmation") !== "ARCHIVE") {
    throw new Error("Type ARCHIVE to confirm brand archive.");
  }

  await archiveBrand(brandId, user, "Archived from Brands settings.");
  revalidatePath("/settings/brands");
  revalidatePath(`/brands/${encodeURIComponent(brandId)}`);
  revalidatePath("/settings/products");
  redirect("/settings/brands");
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
