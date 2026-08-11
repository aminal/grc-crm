"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import {
  addPackages,
  addPayment,
  approveOrder,
  cancelOrder,
  createOrder,
  deletePayment,
  deliverOrder,
  deliveryRejectOrder,
  payOrder,
  rejectOrder,
  removePackages,
  undeliverOrder,
  unapproveOrder,
  updatePayment,
} from "@/lib/data/orders";
import {
  addPackagesSchema,
  createOrderSchema,
  deliverySchema,
  dueTermsSchema,
  packagePricesFromForm,
  packageTagsFromForm,
  paymentSchema,
  removePackagesSchema,
} from "@/lib/domain/schemas";

export async function createOrderAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const input = createOrderSchema.parse({
    company_id: String(formData.get("company_id") ?? ""),
    package_tags: packageTagsFromForm(formData),
    package_prices: packagePricesFromForm(formData),
  });
  const order = await createOrder(input.company_id, input.package_tags, input.package_prices, user);
  revalidatePath("/sales");
  revalidatePath("/inventory");
  redirect(`/sales/${order.id}`);
}

export async function approveOrderAction(orderId: string, formData: FormData): Promise<void> {
  const user = await requireUser();
  const input = dueTermsSchema.parse({ due_terms: formData.get("due_terms") });
  await approveOrder(orderId, user, input.due_terms);
  revalidateOrder(orderId);
  redirect(`/sales/${orderId}`);
}

export async function rejectOrderAction(orderId: string): Promise<void> {
  const user = await requireUser();
  await rejectOrder(orderId, user);
  revalidateOrder(orderId);
  redirect(`/sales/${orderId}`);
}

export async function cancelOrderAction(orderId: string): Promise<void> {
  const user = await requireUser();
  await cancelOrder(orderId, user);
  revalidateOrder(orderId);
  redirect(`/sales/${orderId}`);
}

export async function unapproveOrderAction(orderId: string): Promise<void> {
  const user = await requireUser();
  await unapproveOrder(orderId, user);
  revalidateOrder(orderId);
  redirect(`/sales/${orderId}`);
}

export async function deliverOrderAction(orderId: string, formData: FormData): Promise<void> {
  const user = await requireUser();
  const input = deliverySchema.parse({ delivered_at: formData.get("delivered_at") ?? "" });
  await deliverOrder(orderId, user, input.delivered_at);
  revalidateOrder(orderId);
  redirect(`/sales/${orderId}`);
}

export async function undeliverOrderAction(orderId: string): Promise<void> {
  const user = await requireUser();
  await undeliverOrder(orderId, user);
  revalidateOrder(orderId);
  redirect(`/sales/${orderId}`);
}

export async function deliveryRejectOrderAction(orderId: string): Promise<void> {
  const user = await requireUser();
  await deliveryRejectOrder(orderId, user);
  revalidateOrder(orderId);
  redirect(`/sales/${orderId}`);
}

export async function payOrderAction(orderId: string): Promise<void> {
  const user = await requireUser();
  await payOrder(orderId, user);
  revalidateOrder(orderId);
  redirect(`/sales/${orderId}`);
}

export async function addPaymentAction(orderId: string, formData: FormData): Promise<void> {
  const user = await requireUser();
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
  const user = await requireUser();
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
  const user = await requireUser();
  await deletePayment(orderId, paymentId, user);
  revalidateOrder(orderId);
  redirect(`/sales/${orderId}`);
}

export async function addPackagesAction(orderId: string, formData: FormData): Promise<void> {
  const user = await requireUser();
  const input = addPackagesSchema.parse({
    package_tags: packageTagsFromForm(formData),
    package_prices: packagePricesFromForm(formData),
  });
  await addPackages(orderId, input.package_tags, input.package_prices, user);
  revalidateOrder(orderId);
  redirect(`/sales/${orderId}`);
}

export async function removePackagesAction(orderId: string, formData: FormData): Promise<void> {
  const user = await requireUser();
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
