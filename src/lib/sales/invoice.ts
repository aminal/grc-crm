import type { FirestoreDate, InvoiceData, InvoicePayment } from "@/lib/domain/types";

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
