import type { FirestoreDate, InvoiceData, InvoiceDiscount, InvoicePayment } from "@/lib/domain/types";

export function invoicePayments(invoice: Pick<InvoiceData, "payments">): InvoicePayment[] {
  return Array.isArray(invoice.payments) ? [...invoice.payments] : [];
}

export function hasInvoicePayments(invoice: Pick<InvoiceData, "payments">): boolean {
  return invoicePayments(invoice).length > 0;
}

export function assertPaymentDoesNotOverpay(invoice: Pick<InvoiceData, "payments" | "total_cents">, amountCents: number, excludedPaymentId?: string): void {
  const otherPaidCents = invoicePayments(invoice).filter((payment) => payment.id !== excludedPaymentId).reduce((sum, payment) => sum + Number(payment.amount_cents ?? 0), 0);
  if (otherPaidCents + amountCents > Number(invoice.total_cents ?? 0)) {
    throw new Error("Payment amount cannot exceed the invoice balance.");
  }
}

export function discountCentsFor(type: "percent" | "amount", value: number, subtotalCents: number): number {
  return type === "percent" ? Math.round((subtotalCents * value) / 100) : Math.round(value);
}

export function assertDiscountWithinSubtotal(discountCents: number, subtotalCents: number): void {
  if (discountCents < 0 || discountCents > subtotalCents) {
    throw new Error("Discount cannot exceed the invoice subtotal.");
  }
}

export function applyDiscountToInvoice(invoice: InvoiceData, discount: InvoiceDiscount | null, timestamp: FirestoreDate): InvoiceData {
  const totalCents = invoice.subtotal_cents - (discount?.cents ?? 0);
  return recalculateInvoice({ ...invoice, discount, total_cents: totalCents }, timestamp);
}

export function recalculateInvoice(invoice: InvoiceData, timestamp: FirestoreDate): InvoiceData {
  const payments = invoicePayments(invoice);
  const paidCents = payments.reduce((sum, payment) => sum + Number(payment.amount_cents ?? 0), 0);
  const totalCents = Number(invoice.total_cents ?? invoice.subtotal_cents ?? 0);
  const balanceCents = Math.max(totalCents - paidCents, 0);
  const status = invoice.status === "void" ? "void" : balanceCents === 0 ? "paid" : paidCents > 0 ? "partial" : "unpaid";

  return {
    ...invoice,
    payments,
    paid_cents: paidCents,
    balance_cents: balanceCents,
    status,
    paid_at: status === "paid" ? invoice.paid_at ?? timestamp : null,
    updated_at: timestamp,
  };
}
