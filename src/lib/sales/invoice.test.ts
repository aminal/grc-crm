import { describe, expect, it } from "vitest";
import type { InvoiceData, InvoicePayment } from "@/lib/domain/types";
import { assertPaymentDoesNotOverpay, hasInvoicePayments, recalculateInvoice } from "./invoice";

const timestamp = new Date("2026-08-10T12:00:00.000Z");

function payment(id: string, amount_cents: number): InvoicePayment {
  return {
    id,
    method: "ach",
    method_label: "ACH",
    amount_cents,
    paid_at: "2026-08-10",
    check_number: "",
  };
}

function invoice(payments: InvoicePayment[] = []): InvoiceData {
  return {
    id: "invoice-1501",
    invoice_number: "INV-1501",
    order_id: "order-1501",
    order_number: 1501,
    company_id: "company-1",
    company_name: "Company",
    status: "unpaid",
    due_date: null,
    delivery_confirmed_at: null,
    delivered_at: null,
    subtotal_cents: 1000,
    total_cents: 1000,
    paid_cents: 0,
    balance_cents: 1000,
    payments,
    paid_at: null,
    created_by: { uid: "user-1", email: "user@greenroomcannabis.com", name: "User", picture: "" },
    created_at: timestamp,
    updated_at: timestamp,
  };
}

describe("invoice rules", () => {
  it("rejects overpayments when adding or editing payments", () => {
    const base = invoice([payment("payment-1", 600)]);

    expect(() => assertPaymentDoesNotOverpay(base, 500)).toThrow("Payment amount cannot exceed the invoice balance.");
    expect(() => assertPaymentDoesNotOverpay(base, 400)).not.toThrow();
    expect(() => assertPaymentDoesNotOverpay(base, 1000, "payment-1")).not.toThrow();
  });

  it("recalculates invoice totals and clears paid_at when a paid invoice reopens", () => {
    const fullyPaid = recalculateInvoice(invoice([payment("payment-1", 1000)]), timestamp);
    expect(fullyPaid).toMatchObject({ status: "paid", paid_cents: 1000, balance_cents: 0, paid_at: timestamp });

    const reopened = recalculateInvoice({ ...fullyPaid, payments: [payment("payment-1", 400)] }, timestamp);
    expect(reopened).toMatchObject({ status: "partial", paid_cents: 400, balance_cents: 600, paid_at: null });
  });

  it("detects existing payments for status actions that must be blocked", () => {
    expect(hasInvoicePayments(invoice())).toBe(false);
    expect(hasInvoicePayments(invoice([payment("payment-1", 100)]))).toBe(true);
  });
});
