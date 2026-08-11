import { describe, expect, it } from "vitest";
import type { FirestoreRecord, PackageData } from "@/lib/domain/types";
import { filterInventoryGroups, groupInventory, sortInventoryGroups } from "./inventory-grouping";

function packageRecord(id: string, overrides: Partial<PackageData>): FirestoreRecord<PackageData> {
  return {
    id,
    data: {
      package_tag: id,
      strain: "",
      source_harvest: "",
      source_packages: "",
      original_source_package_label: "",
      source_processing_jobs: "",
      location: "",
      sublocation: "",
      item: "Flower",
      category: "Flower",
      quantity: 1,
      unit_of_measure: "g",
      production_batch_number: "",
      source_production_batch: "",
      lab_testing_status: "Passed",
      finished_goods: "",
      administrative_hold: "",
      administrative_recall: "",
      packaged_date: "",
      received: "",
      expiration_date: "",
      sell_by_date: "",
      lab_test_expiration: "",
      active: true,
      status: "active",
      last_synced_at: null,
      updated_at: null,
      ...overrides,
    },
  };
}

describe("inventory grouping", () => {
  it("groups by item and source package", () => {
    const groups = groupInventory([
      packageRecord("pkg-a", { item: "Flower", source_packages: "source-1" }),
      packageRecord("pkg-b", { item: "Flower", source_packages: "source-1" }),
      packageRecord("pkg-c", { item: "Flower", source_packages: "source-2" }),
    ]);

    expect(groups).toHaveLength(2);
    expect(groups.find((group) => group.source_packages === "source-1")?.package_count).toBe(2);
    expect(groups.find((group) => group.source_packages === "source-2")?.package_count).toBe(1);
  });

  it("collapses missing source packages per item", () => {
    const groups = groupInventory([
      packageRecord("pkg-a", { item: "Flower", source_packages: "" }),
      packageRecord("pkg-b", { item: "Flower", source_packages: "" }),
      packageRecord("pkg-c", { item: "Pre-Roll", source_packages: "" }),
    ]);

    expect(groups).toHaveLength(2);
    expect(groups.find((group) => group.item === "Flower")?.package_count).toBe(2);
  });

  it("detects mixed units, dominant unit, earliest expiration, and rollup status", () => {
    const groups = groupInventory([
      packageRecord("pkg-a", { source_packages: "source-1", quantity: 2, unit_of_measure: "g", expiration_date: "2026-09-01", package_status: "available" }),
      packageRecord("pkg-b", { source_packages: "source-1", quantity: 3, unit_of_measure: "g", expiration_date: "2026-08-01", package_status: "pending" }),
      packageRecord("pkg-c", { source_packages: "source-1", quantity: 1, unit_of_measure: "oz", expiration_date: "2026-10-01", package_status: "sold" }),
      packageRecord("pkg-d", { source_packages: "source-1", quantity: 1, unit_of_measure: "g", expiration_date: "", package_status: "inactive" }),
    ]);

    expect(groups[0].total_quantity).toBe(7);
    expect(groups[0].unit_of_measure).toBe("g");
    expect(groups[0].mixed_units).toBe(true);
    expect(groups[0].expiration_date).toBe("2026-08-01");
    expect(groups[0].status).toBe("sold");
  });

  it("rolls up inactive groups separately from sold order consumption", () => {
    const groups = groupInventory([
      packageRecord("pkg-a", { source_packages: "source-1", package_status: "inactive" }),
      packageRecord("pkg-b", { source_packages: "source-1", package_status: "inactive" }),
    ]);

    expect(groups[0].status).toBe("inactive");
  });

  it("sorts undated groups last in both expiration directions", () => {
    const groups = groupInventory([
      packageRecord("pkg-a", { item: "Undated", expiration_date: "" }),
      packageRecord("pkg-b", { item: "Dated", expiration_date: "2026-08-01" }),
    ]);

    expect(sortInventoryGroups(groups, "expiration_date", "asc").at(-1)?.item).toBe("Undated");
    expect(sortInventoryGroups(groups, "expiration_date", "desc").at(-1)?.item).toBe("Undated");
  });

  it("filters whole groups without changing group counts", () => {
    const groups = groupInventory([
      packageRecord("pkg-a", { item: "Flower", source_packages: "source-1" }),
      packageRecord("pkg-b", { item: "Flower", source_packages: "source-1" }),
      packageRecord("pkg-c", { item: "Pre-Roll", source_packages: "source-2" }),
    ]);
    const filtered = filterInventoryGroups(groups, "source-1");

    expect(filtered).toHaveLength(1);
    expect(filtered[0].package_count).toBe(2);
  });
});
