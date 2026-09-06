"use server";

import { revalidatePath } from "next/cache";
import { requireFeature } from "@/lib/auth/session";
import { createProduct, updateProduct } from "@/lib/data/sales-settings";
import {
  editReasonSchema,
  formEntries,
  productCreateSchema,
  validationMessage,
} from "@/lib/domain/schemas";
import type { ProductStatus } from "@/lib/domain/types";

type ProductFormState = {
  error: string | null;
  success: boolean;
  status: ProductStatus | null;
};

export async function createProductAction(formData: FormData): Promise<ProductStatus> {
  const user = await requireFeature("products", "create_products");
  const input = productCreateSchema.parse(formEntries(formData));
  await createProduct(input, user);
  revalidatePath("/settings/products");
  return input.status;
}

export async function updateProductAction(productId: string, formData: FormData): Promise<ProductStatus> {
  const user = await requireFeature("products", "update_products");
  const values = formEntries(formData);
  const input = productCreateSchema.parse(values);
  const reason = editReasonSchema.parse(values);
  await updateProduct(productId, input, user, reason.reason);
  revalidatePath("/settings/products");
  revalidatePath(`/products/${encodeURIComponent(productId)}`);
  revalidatePath(`/products/${encodeURIComponent(productId)}/edit`);
  return input.status;
}

export async function createProductFormAction(_: ProductFormState, formData: FormData): Promise<ProductFormState> {
  try {
    const status = await createProductAction(formData);
    return { error: null, success: true, status };
  } catch (error) {
    return { error: validationMessage(error), success: false, status: null };
  }
}

export async function updateProductFormAction(productId: string, _: ProductFormState, formData: FormData): Promise<ProductFormState> {
  try {
    const status = await updateProductAction(productId, formData);
    return { error: null, success: true, status };
  } catch (error) {
    return { error: validationMessage(error), success: false, status: null };
  }
}
