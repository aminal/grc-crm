import { describe, expect, it } from "vitest";
import type { FirestoreRecord, MetrcSyncStateData, PackageConsignment, PackageData } from "@/lib/domain/types";
import type { PackageStatusInfo } from "@/lib/sales/package-status";
import { assertFinalizableSync, partitionSyncFinalization, stalePackagesForSync, SyncSelectionError, toSyncCandidates } from "./sync-candidates";

function consignment(overrides: Partial<PackageConsignment> = {}): PackageConsignment {
  return {
    distributor_id: "distributor-a",
    distributor_name: "Distributor A",
    notes: "",
    consigned_by: { uid: "user-a", email: "user@a.com", name: "User A", picture: "" },
    consigned_at: null,
    ...overrides,
  };
}

function packageRecord(id: string, overrides: Partial<PackageData> = {}): FirestoreRecord<PackageData> {
  return {
    id,
    data: {
      package_tag: id,
      strain: "Blue Dream",
      source_harvest: "",
      source_packages: "",
      original_source_package_label: "",
      source_processing_jobs: "",
      location: "",
      sublocation: "",
      item: "Flower",
      category: "Flower",
      quantity: 4,
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

describe("assertFinalizableSync", () => {
  function syncState(overrides: Partial<MetrcSyncStateData> = {}): MetrcSyncStateData {
    return {
      sync_id: "sync-1",
      started_at: null,
      started_by: { uid: "user-a", email: "user@a.com", name: "User A", picture: "" },
      finalized_at: null,
      finalized_by: null,
      ...overrides,
    };
  }

  it("accepts the current unfinalized sync", () => {
    expect(() => assertFinalizableSync(syncState(), "sync-1")).not.toThrow();
  });

  it("rejects a sync superseded by a later upload", () => {
    expect(() => assertFinalizableSync(syncState({ sync_id: "sync-2" }), "sync-1")).toThrow(SyncSelectionError);
  });

  it("rejects a fabricated or missing sync reference", () => {
    expect(() => assertFinalizableSync(null, "sync-1")).toThrow(SyncSelectionError);
    expect(() => assertFinalizableSync(syncState(), "")).toThrow(SyncSelectionError);
  });

  it("rejects a sync that was already finalized", () => {
    expect(() => assertFinalizableSync(syncState({ finalized_at: "2026-01-01T00:00:00.000Z" }), "sync-1")).toThrow(SyncSelectionError);
  });
});

describe("stalePackagesForSync", () => {
  it("selects active packages whose last sync id does not match", () => {
    const stale = stalePackagesForSync(
      [
        packageRecord("pkg-current", { last_sync_id: "sync-1" }),
        packageRecord("pkg-stale", { last_sync_id: "sync-0" }),
        packageRecord("pkg-never-synced"),
      ],
      "sync-1",
    );

    expect(stale.map((record) => record.id)).toEqual(["pkg-stale", "pkg-never-synced"]);
  });

  it("excludes consigned and inactive packages", () => {
    const stale = stalePackagesForSync(
      [
        packageRecord("pkg-consigned", { last_sync_id: "sync-0", consignment: consignment() }),
        packageRecord("pkg-inactive", { last_sync_id: "sync-0", active: false, status: "inactive" }),
        packageRecord("pkg-stale", { last_sync_id: "sync-0" }),
      ],
      "sync-1",
    );

    expect(stale.map((record) => record.id)).toEqual(["pkg-stale"]);
  });
});

describe("toSyncCandidates", () => {
  it("marks only available packages as eligible for consignment and excludes sold and pending packages", () => {
    const statusMap: Record<string, PackageStatusInfo> = {
      "pkg-pending": { status: "pending", order_id: "order-1" },
      "pkg-sold": { status: "sold", order_id: "order-2" },
    };

    const candidates = toSyncCandidates(
      [
        packageRecord("pkg-sold", { item: "Gummy" }),
        packageRecord("pkg-pending", { item: "Flower" }),
        packageRecord("pkg-available", { item: "Flower" }),
      ],
      statusMap,
    );

    expect(candidates).toMatchObject([
      { id: "pkg-available", package_status: "available", eligible_for_consignment: true },
    ]);
  });

  it("never routes sold or pending packages into finalization candidates", () => {
    const statusMap: Record<string, PackageStatusInfo> = {
      "pkg-pending": { status: "pending", order_id: "order-1" },
      "pkg-sold": { status: "sold", order_id: "order-2" },
    };

    const candidates = toSyncCandidates(
      [
        packageRecord("pkg-sold"),
        packageRecord("pkg-pending"),
        packageRecord("pkg-available"),
      ],
      statusMap,
    );

    const candidateIds = candidates.map((candidate) => candidate.id);

    expect(candidateIds).not.toContain("pkg-sold");
    expect(candidateIds).not.toContain("pkg-pending");
    expect(candidateIds).toContain("pkg-available");
  });
});

describe("partitionSyncFinalization", () => {
  const candidates = toSyncCandidates(
    [
      packageRecord("pkg-a", { item: "A" }),
      packageRecord("pkg-b", { item: "B" }),
      packageRecord("pkg-pending", { item: "C" }),
      packageRecord("pkg-sold", { item: "D" }),
    ],
    {
      "pkg-pending": { status: "pending", order_id: "order-1" },
      "pkg-sold": { status: "sold", order_id: "order-2" },
    },
  );

  it("routes unselected stale packages to deactivate but never sold or pending packages", () => {
    expect(partitionSyncFinalization(candidates, ["pkg-a"])).toEqual({
      consign: ["pkg-a"],
      deactivate: ["pkg-b"],
    });
  });

  it("deactivates everything when nothing is selected", () => {
    expect(partitionSyncFinalization(candidates, [])).toEqual({
      consign: [],
      deactivate: ["pkg-a", "pkg-b"],
    });
  });

  it("rejects a selection that is no longer stale", () => {
    expect(() => partitionSyncFinalization(candidates, ["pkg-unknown"])).toThrow(SyncSelectionError);
  });
});
