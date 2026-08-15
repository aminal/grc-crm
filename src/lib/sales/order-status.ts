import type { OrderState, OrderStatus } from "@/lib/domain/types";

export const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ["approved", "rejected", "cancelled"],
  approved: ["delivered", "delivery_rejected", "pending"],
  delivered: [],
  rejected: ["pending"],
  cancelled: ["pending"],
  paid: [],
  delivery_rejected: [],
};

export const RELEASING_ORDER_STATUSES = new Set<OrderStatus>(["rejected", "cancelled", "delivery_rejected"]);
export const CONSUMING_ORDER_STATUSES = new Set<OrderStatus>(["pending", "approved", "delivered", "paid"]);
export const CLOSABLE_ORDER_STATUSES = new Set<OrderStatus>(["rejected", "delivery_rejected", "cancelled", "paid"]);

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return ORDER_TRANSITIONS[from]?.includes(to) ?? false;
}

export function availableOrderActions(status: OrderStatus, state: OrderState = "open"): string[] {
  if (state === "closed") {
    return ["reopen"];
  }

  const actions = statusActions(status);
  return CLOSABLE_ORDER_STATUSES.has(status) ? [...actions, "close"] : actions;
}

function statusActions(status: OrderStatus): string[] {
  switch (status) {
    case "pending":
      return ["approve", "reject", "cancel"];
    case "rejected":
      return ["unapprove"];
    case "approved":
      return ["deliver", "delivery_reject", "unapprove"];
    case "delivered":
      return [];
    case "cancelled":
      return ["mark_pending"];
    default:
      return [];
  }
}

export function packageStatusForConsumingOrder(status: OrderStatus): "pending" | "sold" | null {
  if (status === "pending") {
    return "pending";
  }

  if (status === "approved" || status === "delivered" || status === "paid") {
    return "sold";
  }

  return null;
}
