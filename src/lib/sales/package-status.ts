import type { FirestoreRecord, OrderData } from "@/lib/domain/types";
import { packageStatusForConsumingOrder, RELEASING_ORDER_STATUSES } from "@/lib/sales/order-status";

export type DerivedPackageStatus = "available" | "pending" | "sold" | "inactive";
export type PackageStatusInfo = {
  status: DerivedPackageStatus;
  order_id?: string;
  order_number?: number;
  company_name?: string;
};

function millis(value: unknown): number {
  if (!value) {
    return 0;
  }

  if (value instanceof Date) {
    return value.getTime();
  }

  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  if (typeof value === "object" && value !== null && "toMillis" in value && typeof value.toMillis === "function") {
    return value.toMillis() as number;
  }

  if (typeof value === "object" && value !== null && "toDate" in value && typeof value.toDate === "function") {
    return (value.toDate() as Date).getTime();
  }

  return 0;
}

export function buildPackageStatusMap(orders: FirestoreRecord<OrderData>[]): Record<string, PackageStatusInfo> {
  const statusMap: Record<string, PackageStatusInfo> = {};
  const consumingOrders = orders
    .filter((order) => !RELEASING_ORDER_STATUSES.has(order.data.status))
    .sort((a, b) => millis(a.data.created_at) - millis(b.data.created_at));

  for (const order of consumingOrders) {
    const status = packageStatusForConsumingOrder(order.data.status);
    if (!status) {
      continue;
    }

    for (const item of order.data.items ?? []) {
      const existing = statusMap[item.package_tag];
      if (existing?.status === "sold" && status === "pending") {
        continue;
      }

      statusMap[item.package_tag] = {
        status,
        order_id: order.id,
        order_number: order.data.order_number,
        company_name: order.data.company_name,
      };
    }
  }

  return statusMap;
}
