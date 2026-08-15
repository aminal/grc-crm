"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireManagerOrAdmin } from "@/lib/auth/session";
import { archiveProduct, createProduct, updateProduct } from "@/lib/data/sales-settings";
import {
  editReasonSchema,
  formEntries,
  productCreateSchema,
  validationMessage,
} from "@/lib/domain/schemas";

type ProductFormState = {
  error: string | null;
  success: boolean;
};

export async function createProductAction(formData: FormData): Promise<void> {
  const user = await requireManagerOrAdmin();
  const input = productCreateSchema.parse(formEntries(formData));
  await createProduct(input, user);
  revalidatePath("/products");
}

export async function updateProductAction(productId: string, formData: FormData): Promise<void> {
  const user = await requireManagerOrAdmin();
  const values = formEntries(formData);
  const input = productCreateSchema.parse(values);
  const reason = editReasonSchema.parse(values);
  await updateProduct(productId, input, user, reason.reason);
  revalidatePath("/products");
}

export async function archiveProductAction(productId: string, formData: FormData): Promise<void> {
  const user = await requireManagerOrAdmin();
  if (formData.get("confirmation") !== "ARCHIVE") {
    throw new Error("Type ARCHIVE to confirm product archive.");
  }

  await archiveProduct(productId, user, "Archived from Products settings.");
  revalidatePath("/products");
  redirect("/products");
}

export async function createProductFormAction(_: ProductFormState, formData: FormData): Promise<ProductFormState> {
  try {
    await createProductAction(formData);
    return { error: null, success: true };
  } catch (error) {
    return { error: validationMessage(error), success: false };
  }
}

export async function updateProductFormAction(productId: string, _: ProductFormState, formData: FormData): Promise<ProductFormState> {
  try {
    await updateProductAction(productId, formData);
    return { error: null, success: true };
  } catch (error) {
    return { error: validationMessage(error), success: false };
  }
}
