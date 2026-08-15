"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin, requireManagerOrAdmin, requireNonGuest } from "@/lib/auth/session";
import {
  addPackages,
  addPayment,
  approveOrder,
  cancelOrder,
  closeOrder,
  createOrder,
  deleteOrder,
  deletePayment,
  deliverOrder,
  deliveryRejectOrder,
  rejectOrder,
  removePackages,
  reopenOrder,
  unapproveOrder,
  updateInvoiceDiscount,
  updatePackages,
  updatePayment,
} from "@/lib/data/orders";
import {
  addPackagesSchema,
  createInvoiceSchema,
  createOrderSchema,
  deliverySchema,
  discountSchema,
  packagePricesFromForm,
  packageTagsFromForm,
  paymentSchema,
  removePackagesSchema,
} from "@/lib/domain/schemas";

export async function createOrderAction(formData: FormData): Promise<void> {
  const user = await requireNonGuest();
  const input = createOrderSchema.parse({
    company_id: String(formData.get("company_id") ?? ""),
    salesperson_user_id: formData.get("salesperson_user_id"),
    delivery_date_status: formData.get("delivery_date_status"),
    delivery_date: formData.get("delivery_date") ?? "",
    terms: formData.get("terms"),
    terms_notes: formData.get("terms_notes") ?? "",
    package_tags: packageTagsFromForm(formData),
    package_prices: packagePricesFromForm(formData),
  });
  const order = await createOrder(input.company_id, input.package_tags, input.package_prices, user, {
    salesperson_user_id: input.salesperson_user_id,
    delivery_date: input.delivery_date_status === "date" ? input.delivery_date : "",
    delivery_date_tbd: input.delivery_date_status === "tbd",
    terms: input.terms,
    terms_notes: input.terms === "Other" ? input.terms_notes : "",
  });
  revalidatePath("/sales");
  revalidatePath("/inventory");
  redirect(`/sales/${order.id}`);
}

export async function approveOrderAction(orderId: string, formData: FormData): Promise<void> {
  const user = await requireManagerOrAdmin();
  const input = createInvoiceSchema.parse({
    invoice_number: formData.get("invoice_number") ?? "",
    due_date: formData.get("due_date") ?? "",
  });
  await approveOrder(orderId, user, input);
  revalidateOrder(orderId);
  redirect(`/sales/${orderId}`);
}

export async function rejectOrderAction(orderId: string): Promise<void> {
  const user = await requireNonGuest();
  await rejectOrder(orderId, user);
  revalidateOrder(orderId);
  redirect(`/sales/${orderId}`);
}

export async function cancelOrderAction(orderId: string): Promise<void> {
  const user = await requireNonGuest();
  await cancelOrder(orderId, user);
  revalidateOrder(orderId);
  redirect(`/sales/${orderId}`);
}

export async function closeOrderAction(orderId: string): Promise<void> {
  const user = await requireNonGuest();
  await closeOrder(orderId, user);
  revalidateOrder(orderId);
  redirect(`/sales/${orderId}`);
}

export async function reopenOrderAction(orderId: string): Promise<void> {
  const user = await requireNonGuest();
  await reopenOrder(orderId, user);
  revalidateOrder(orderId);
  redirect(`/sales/${orderId}`);
}

export async function deleteOrderAction(orderId: string, formData: FormData): Promise<void> {
  await requireAdmin();
  if (formData.get("confirmation") !== "DELETE") {
    throw new Error("Type DELETE to confirm order deletion.");
  }

  await deleteOrder(orderId);
  revalidateOrder(orderId);
  redirect("/sales?status=cancelled");
}

export async function unapproveOrderAction(orderId: string): Promise<void> {
  const user = await requireManagerOrAdmin();
  await unapproveOrder(orderId, user);
  revalidateOrder(orderId);
  redirect(`/sales/${orderId}`);
}

export async function deliverOrderAction(orderId: string, formData: FormData): Promise<void> {
  const user = await requireManagerOrAdmin();
  const input = deliverySchema.parse({ delivered_at: formData.get("delivered_at") ?? "" });
  await deliverOrder(orderId, user, input.delivered_at);
  revalidateOrder(orderId);
  redirect(`/sales/${orderId}`);
}

export async function deliveryRejectOrderAction(orderId: string): Promise<void> {
  const user = await requireManagerOrAdmin();
  await deliveryRejectOrder(orderId, user);
  revalidateOrder(orderId);
  redirect(`/sales/${orderId}`);
}

export async function addPaymentAction(orderId: string, formData: FormData): Promise<void> {
  const user = await requireManagerOrAdmin();
  const input = paymentSchema.parse({
    amount: formData.get("amount"),
    method: formData.get("method"),
    check_number: formData.get("check_number") ?? "",
    paid_at: formData.get("paid_at"),
  });
  await addPayment(orderId, input, user);
  revalidateOrder(orderId);
  redirect(`/sales/${orderId}`);
}

export async function updatePaymentAction(orderId: string, paymentId: string, formData: FormData): Promise<void> {
  const user = await requireManagerOrAdmin();
  const input = paymentSchema.parse({
    amount: formData.get("amount"),
    method: formData.get("method"),
    check_number: formData.get("check_number") ?? "",
    paid_at: formData.get("paid_at"),
  });
  await updatePayment(orderId, paymentId, input, user);
  revalidateOrder(orderId);
  redirect(`/sales/${orderId}`);
}

export async function deletePaymentAction(orderId: string, paymentId: string): Promise<void> {
  const user = await requireManagerOrAdmin();
  await deletePayment(orderId, paymentId, user);
  revalidateOrder(orderId);
  redirect(`/sales/${orderId}`);
}

export async function updateDiscountAction(orderId: string, formData: FormData): Promise<void> {
  const user = await requireManagerOrAdmin();
  const input = discountSchema.parse({
    discount_type: formData.get("discount_type"),
    discount_value: formData.get("discount_value") ?? "",
  });
  await updateInvoiceDiscount(orderId, input, user);
  revalidateOrder(orderId);
  redirect(`/sales/${orderId}`);
}

export async function addPackagesAction(orderId: string, formData: FormData): Promise<void> {
  const user = await requireNonGuest();
  const input = addPackagesSchema.parse({
    package_tags: packageTagsFromForm(formData),
    package_prices: packagePricesFromForm(formData),
  });
  await addPackages(orderId, input.package_tags, input.package_prices, user);
  revalidateOrder(orderId);
  redirect(`/sales/${orderId}`);
}

export async function updatePackagesAction(orderId: string, formData: FormData): Promise<void> {
  const user = await requireNonGuest();
  const input = addPackagesSchema.parse({
    package_tags: packageTagsFromForm(formData),
    package_prices: packagePricesFromForm(formData),
  });
  await updatePackages(orderId, input.package_tags, input.package_prices, user);
  revalidateOrder(orderId);
  redirect(`/sales/${orderId}`);
}

export async function removePackagesAction(orderId: string, formData: FormData): Promise<void> {
  const user = await requireNonGuest();
  const input = removePackagesSchema.parse({
    package_tags: packageTagsFromForm(formData),
  });
  await removePackages(orderId, input.package_tags, user);
  revalidateOrder(orderId);
  redirect(`/sales/${orderId}`);
}

function revalidateOrder(orderId: string): void {
  revalidatePath("/sales");
  revalidatePath(`/sales/${orderId}`);
  revalidatePath("/inventory");
  revalidatePath("/companies");
}
