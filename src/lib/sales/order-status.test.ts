import { describe, expect, it } from "vitest";
import { availableOrderActions, canTransition, packageStatusForConsumingOrder } from "./order-status";

describe("order status rules", () => {
  it("allows only the specified lifecycle transitions", () => {
    expect(canTransition("pending", "approved")).toBe(true);
    expect(canTransition("pending", "rejected")).toBe(true);
    expect(canTransition("pending", "cancelled")).toBe(true);
    expect(canTransition("approved", "delivered")).toBe(true);
    expect(canTransition("approved", "delivery_rejected")).toBe(true);
    expect(canTransition("approved", "pending")).toBe(true);
    expect(canTransition("approved", "cancelled")).toBe(true);
    expect(canTransition("delivered", "approved")).toBe(false);
    expect(canTransition("delivered", "paid")).toBe(false);
    expect(canTransition("rejected", "approved")).toBe(false);
    expect(canTransition("rejected", "pending")).toBe(true);
    expect(canTransition("cancelled", "pending")).toBe(true);
    expect(canTransition("paid", "delivered")).toBe(false);
    expect(canTransition("delivery_rejected", "approved")).toBe(false);
  });

  it("returns the valid action set for each status", () => {
    expect(availableOrderActions("pending")).toEqual(["approve", "reject", "cancel"]);
    expect(availableOrderActions("rejected")).toEqual(["unapprove", "close"]);
    expect(availableOrderActions("approved")).toEqual(["deliver", "delivery_reject", "unapprove", "cancel"]);
    expect(availableOrderActions("delivered")).toEqual([]);
    expect(availableOrderActions("cancelled")).toEqual(["mark_pending", "close"]);
    expect(availableOrderActions("paid")).toEqual(["close"]);
    expect(availableOrderActions("delivery_rejected")).toEqual(["close"]);
    expect(availableOrderActions("paid", "closed")).toEqual(["reopen"]);
  });

  it("maps consuming order statuses to derived package statuses", () => {
    expect(packageStatusForConsumingOrder("pending")).toBe("pending");
    expect(packageStatusForConsumingOrder("approved")).toBe("sold");
    expect(packageStatusForConsumingOrder("delivered")).toBe("sold");
    expect(packageStatusForConsumingOrder("paid")).toBe("sold");
    expect(packageStatusForConsumingOrder("rejected")).toBeNull();
    expect(packageStatusForConsumingOrder("cancelled")).toBeNull();
    expect(packageStatusForConsumingOrder("delivery_rejected")).toBeNull();
  });
});
