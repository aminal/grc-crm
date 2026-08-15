import { describe, expect, it } from "vitest";
import type { FirestoreRecord, OrderData, OrderStatus } from "@/lib/domain/types";
import { buildPackageStatusMap } from "./package-status";

function order(id: string, status: OrderStatus, packageTags: string[]): FirestoreRecord<OrderData> {
  return {
    id,
    data: {
      order_number: Number(id.replace(/\D/g, "")) || 1,
      company_id: "company-1",
      company_name: "Company",
      facility_type: "Dispensary",
      salesperson: { uid: "user-1", email: "user@greenroomcannabis.com", name: "User", picture: "" },
      delivery_date: "",
      delivery_date_tbd: true,
      terms: "NET-30",
      terms_notes: "",
      status,
      state: "open",
      items: packageTags.map((packageTag) => ({
        package_id: packageTag,
        package_tag: packageTag,
        strain: "",
        source_harvest: "",
        source_packages: "source-1",
        original_source_package_label: "",
        source_processing_jobs: "",
        location: "",
        sublocation: "",
        item: "Flower",
        category: "Flower",
        quantity: 1,
        unit_of_measure: "Each",
        production_batch_number: "",
        source_production_batch: "",
        lab_testing_status: "",
        finished_goods: "",
        administrative_hold: "",
        administrative_recall: "",
        packaged_date: "",
        received: "",
        expiration_date: "",
        sell_by_date: "",
        lab_test_expiration: "",
        source_package_key: "source-1",
        price_cents: 100,
      })),
      total_cents: packageTags.length * 100,
      created_by: { uid: "user-1", email: "user@greenroomcannabis.com", name: "User", picture: "" },
      created_at: `2026-08-${String(Number(id.replace(/\D/g, "")) || 1).padStart(2, "0")}`,
      updated_at: null,
      status_changed_at: null,
    },
  };
}

describe("package status map", () => {
  it("maps consuming statuses and ignores releasing statuses", () => {
    const map = buildPackageStatusMap([
      order("order-1", "pending", ["pkg-pending"]),
      order("order-2", "approved", ["pkg-approved"]),
      order("order-3", "delivered", ["pkg-delivered"]),
      order("order-4", "paid", ["pkg-paid"]),
      order("order-5", "rejected", ["pkg-released"]),
      order("order-6", "cancelled", ["pkg-cancelled"]),
      order("order-7", "delivery_rejected", ["pkg-delivery-rejected"]),
    ]);

    expect(map["pkg-pending"].status).toBe("pending");
    expect(map["pkg-approved"].status).toBe("sold");
    expect(map["pkg-delivered"].status).toBe("sold");
    expect(map["pkg-paid"].status).toBe("sold");
    expect(map["pkg-released"]).toBeUndefined();
    expect(map["pkg-cancelled"]).toBeUndefined();
    expect(map["pkg-delivery-rejected"]).toBeUndefined();
  });

  it("lets consuming orders win over releasing orders for shared tags", () => {
    const map = buildPackageStatusMap([
      order("order-1", "cancelled", ["pkg-shared"]),
      order("order-2", "pending", ["pkg-shared"]),
    ]);

    expect(map["pkg-shared"]).toMatchObject({ status: "pending", order_id: "order-2" });
  });

  it("keeps sold ahead of pending for duplicate consuming tags", () => {
    const map = buildPackageStatusMap([
      order("order-1", "approved", ["pkg-shared"]),
      order("order-2", "pending", ["pkg-shared"]),
    ]);

    expect(map["pkg-shared"]).toMatchObject({ status: "sold", order_id: "order-1" });
  });
});
