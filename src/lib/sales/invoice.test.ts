import { describe, expect, it } from "vitest";
import type { InvoiceData, InvoiceDiscount, InvoicePayment } from "@/lib/domain/types";
import {
  applyDiscountToInvoice,
  assertDiscountWithinSubtotal,
  assertPaymentDoesNotOverpay,
  discountCentsFor,
  hasInvoicePayments,
  recalculateInvoice,
} from "./invoice";

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

  it("computes discount cents for percent and amount discounts", () => {
    expect(discountCentsFor("percent", 10, 1000)).toBe(100);
    expect(discountCentsFor("percent", 33, 1000)).toBe(330);
    expect(discountCentsFor("amount", 250, 1000)).toBe(250);
  });

  it("asserts discount does not exceed the invoice subtotal", () => {
    expect(() => assertDiscountWithinSubtotal(1000, 1000)).not.toThrow();
    expect(() => assertDiscountWithinSubtotal(1001, 1000)).toThrow("Discount cannot exceed the invoice subtotal.");
    expect(() => assertDiscountWithinSubtotal(-1, 1000)).toThrow("Discount cannot exceed the invoice subtotal.");
  });

  it("applies a percent discount to the invoice total and balance", () => {
    const discount: InvoiceDiscount = {
      type: "percent",
      value: 10,
      cents: 100,
      applied_by: { uid: "user-1", email: "user@greenroomcannabis.com", name: "User", picture: "" },
      applied_at: timestamp,
    };

    const result = applyDiscountToInvoice(invoice(), discount, timestamp);
    expect(result).toMatchObject({ discount, total_cents: 900, balance_cents: 900, status: "unpaid" });
  });

  it("applies a fixed-amount discount and recomputes status when it settles the balance", () => {
    const discount: InvoiceDiscount = {
      type: "amount",
      value: 1000,
      cents: 1000,
      applied_by: { uid: "user-1", email: "user@greenroomcannabis.com", name: "User", picture: "" },
      applied_at: timestamp,
    };

    const result = applyDiscountToInvoice(invoice(), discount, timestamp);
    expect(result).toMatchObject({ discount, total_cents: 0, balance_cents: 0, status: "paid" });
  });

  it("clears a discount back to null and restores the full subtotal as the total", () => {
    const discount: InvoiceDiscount = {
      type: "percent",
      value: 10,
      cents: 100,
      applied_by: { uid: "user-1", email: "user@greenroomcannabis.com", name: "User", picture: "" },
      applied_at: timestamp,
    };

    const discounted = applyDiscountToInvoice(invoice(), discount, timestamp);
    const cleared = applyDiscountToInvoice(discounted, null, timestamp);
    expect(cleared).toMatchObject({ discount: null, total_cents: 1000, balance_cents: 1000, status: "unpaid" });
  });
});
