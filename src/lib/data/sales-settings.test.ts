import { beforeEach, describe, expect, it, vi } from "vitest";

const firestoreMocks = vi.hoisted(() => {
  const batchSet = vi.fn();
  const batchCommit = vi.fn(() => Promise.resolve());

  return {
    batch: vi.fn(() => ({ set: batchSet, commit: batchCommit })),
    batchCommit,
    batchSet,
    doc: vi.fn((path: string) => ({ path })),
    getDocument: vi.fn(),
    listCollection: vi.fn(),
    now: vi.fn(() => "server-now"),
  };
});

vi.mock("server-only", () => ({}));
vi.mock("@/lib/firebase/admin", () => ({
  db: {
    batch: firestoreMocks.batch,
    doc: firestoreMocks.doc,
  },
}));
vi.mock("./firestore", () => ({
  getDocument: firestoreMocks.getDocument,
  listCollection: firestoreMocks.listCollection,
  millis: (value: unknown) => {
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

    if (typeof value === "object" && "toMillis" in value && typeof value.toMillis === "function") {
      return value.toMillis();
    }

    return 0;
  },
  normalizedText: (value: unknown) => String(value ?? "").trim(),
  now: firestoreMocks.now,
}));

import {
  buildFieldChanges,
  buildSettingsActivityData,
  listBrands,
  listStrains,
  productActivityFields,
  strainActivityFields,
} from "./sales-settings";

describe("sales settings data helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("records only changed fields using normalized values", () => {
    expect(buildFieldChanges(
      {
        name: "Existing Brand",
        website: "https://brand.test",
        notes: "",
      },
      {
        name: "  Existing Brand  ",
        website: "https://brand-next.test",
        notes: " Updated notes ",
      },
    )).toEqual([
      {
        field: "website",
        previous_value: "https://brand.test",
        next_value: "https://brand-next.test",
      },
      {
        field: "notes",
        previous_value: "",
        next_value: "Updated notes",
      },
    ]);
  });

  it("builds create diffs from empty prior values", () => {
    expect(buildFieldChanges({}, {
      name: "Brand One",
      website: "",
      notes: "First note",
    })).toEqual([
      {
        field: "name",
        previous_value: "",
        next_value: "Brand One",
      },
      {
        field: "notes",
        previous_value: "",
        next_value: "First note",
      },
    ]);
  });

  it("backfills missing brand acronyms when listing brands", async () => {
    firestoreMocks.listCollection.mockResolvedValueOnce([
      {
        id: "brand-custom",
        data: {
          name: "Custom Acronym Brand",
          acronym: "CABX",
          website: "",
          notes: "",
          created_at: null,
          updated_at: null,
        },
      },
      {
        id: "brand-missing",
        data: {
          name: "Green Room Cannabis",
          website: "",
          notes: "",
          created_at: null,
          updated_at: null,
        },
      },
    ]);

    await expect(listBrands()).resolves.toMatchObject([
      {
        id: "brand-custom",
        data: { name: "Custom Acronym Brand", acronym: "CABX" },
      },
      {
        id: "brand-missing",
        data: { name: "Green Room Cannabis", acronym: "GRC" },
      },
    ]);
    expect(firestoreMocks.batchSet).toHaveBeenCalledWith({ path: "brands/brand-missing" }, { acronym: "GRC" }, { merge: true });
    expect(firestoreMocks.batchCommit).toHaveBeenCalledTimes(1);
  });

  it("serializes product strain IDs in stable order for activity diffs", () => {
    const previous = productActivityFields({
      name: "Gummy",
      brand_id: "brand-1",
      strain_ids: ["strain-b", "strain-a", "strain-b"],
      category: "Edible",
      sku: "SKU-1",
      notes: "",
    });
    const next = productActivityFields({
      name: "Gummy",
      brand_id: "brand-1",
      strain_ids: [" strain-a ", "strain-b"],
      category: "Edible",
      sku: "SKU-1",
      notes: "",
    });

    expect(previous.strain_ids).toBe("[\"strain-a\",\"strain-b\"]");
    expect(buildFieldChanges(previous, next)).toEqual([]);
  });

  it("serializes strain composition for activity diffs", () => {
    const previous = strainActivityFields({
      name: "Blue Dream",
      sativa_percentage: 50,
      notes: "Balanced",
    });
    const next = strainActivityFields({
      name: "Blue Dream",
      sativa_percentage: 60,
      notes: "Balanced",
    });

    expect(previous.sativa_percentage).toBe("50");
    expect(buildFieldChanges(previous, next)).toEqual([
      {
        field: "sativa_percentage",
        previous_value: "50",
        next_value: "60",
      },
    ]);
  });

  it("infers strain composition from legacy type values", () => {
    expect(strainActivityFields({ type: "Sativa" }).sativa_percentage).toBe("100");
    expect(strainActivityFields({ type: "Indica" }).sativa_percentage).toBe("0");
    expect(strainActivityFields({ type: "Hybrid" }).sativa_percentage).toBe("50");
    expect(strainActivityFields({ type: "Indica/Sativa" }).sativa_percentage).toBe("50");
  });

  it("hides soft-deleted strains from active strain lists", async () => {
    firestoreMocks.listCollection.mockResolvedValueOnce([
      {
        id: "strain-deleted",
        data: {
          name: "Deleted Strain",
          type: "Hybrid",
          notes: "Hidden",
          deleted_at: "2026-08-10T12:00:00.000Z",
          created_at: null,
          updated_at: null,
        },
      },
      {
        id: "strain-z",
        data: {
          name: "Zeta Strain",
          type: "Sativa",
          notes: "",
          deleted_at: null,
          created_at: null,
          updated_at: null,
        },
      },
      {
        id: "strain-a",
        data: {
          name: "Alpha Strain",
          type: "Indica",
          notes: "",
          deleted_at: null,
          created_at: null,
          updated_at: null,
        },
      },
    ]);

    await expect(listStrains()).resolves.toMatchObject([
      {
        id: "strain-a",
        data: { name: "Alpha Strain", sativa_percentage: 0, deleted_at: null },
      },
      {
        id: "strain-z",
        data: { name: "Zeta Strain", sativa_percentage: 100, deleted_at: null },
      },
    ]);
    expect(firestoreMocks.listCollection).toHaveBeenCalledWith("strains");
  });

  it("stores actor fallbacks and a normalized reason in activity data", () => {
    expect(buildSettingsActivityData(
      "updated",
      {
        uid: "user-1",
        email: "owner@example.com",
        name: null,
        picture: null,
        google_voice_number: null,
      },
      [{
        field: "name",
        previous_value: "Before",
        next_value: "After",
      }],
      "  corrected duplicate naming  ",
      "2026-08-10T12:00:00.000Z",
    )).toEqual({
      action: "updated",
      reason: "corrected duplicate naming",
      actor_user_id: "user-1",
      actor_email: "owner@example.com",
      actor_name: "owner@example.com",
      actor_picture: "",
      changes: [{
        field: "name",
        previous_value: "Before",
        next_value: "After",
      }],
      created_at: "2026-08-10T12:00:00.000Z",
    });
  });
});
