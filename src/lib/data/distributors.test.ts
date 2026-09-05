import { beforeEach, describe, expect, it, vi } from "vitest";

const firestoreMocks = vi.hoisted(() => ({
  getDocument: vi.fn(),
  listCollection: vi.fn(),
  now: vi.fn(() => "server-now"),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/firebase/admin", () => ({
  db: {},
}));
vi.mock("./firestore", () => ({
  getDocument: firestoreMocks.getDocument,
  listCollection: firestoreMocks.listCollection,
  millis: (value: unknown) => {
    if (typeof value !== "string") {
      return 0;
    }

    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  },
  normalizedText: (value: unknown) => String(value ?? "").trim(),
  now: firestoreMocks.now,
}));

import { buildFieldChanges } from "./sales-settings";
import {
  distributorActivityFields,
  distributorFields,
  distributorWithDefaults,
  listDistributorActivity,
  listDistributors,
} from "./distributors";

describe("distributor data helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("trims fields and assembles a nested address from flat input", () => {
    expect(distributorFields({
      name: "  Coastal Distribution  ",
      license_number: " LIC-1234 ",
      contact_name: " Dana Reed ",
      email: " dana@coastal.test ",
      phone: " 555-0100 ",
      address_street: " 100 Harbor Way ",
      address_city: " Portland ",
      address_state: " me ",
      address_postal_code: " 04101 ",
      notes: "  Weekly pickups  ",
    })).toEqual({
      name: "Coastal Distribution",
      license_number: "LIC-1234",
      contact_name: "Dana Reed",
      email: "dana@coastal.test",
      phone: "555-0100",
      address: {
        street: "100 Harbor Way",
        city: "Portland",
        state: "ME",
        postal_code: "04101",
      },
      notes: "Weekly pickups",
    });
  });

  it("fills defaults for sparse stored documents", () => {
    expect(distributorWithDefaults({ name: "Inland Supply" })).toEqual({
      name: "Inland Supply",
      license_number: "",
      contact_name: "",
      email: "",
      phone: "",
      address: {
        street: "",
        city: "",
        state: "",
        postal_code: "",
      },
      notes: "",
      archived_at: null,
      created_at: null,
      updated_at: null,
    });
  });

  it("flattens the address for activity diffs and records only changed fields", () => {
    const current = distributorActivityFields({
      name: "Coastal Distribution",
      license_number: "LIC-1234",
      contact_name: "Dana Reed",
      email: "dana@coastal.test",
      phone: "555-0100",
      address: {
        street: "100 Harbor Way",
        city: "Portland",
        state: "ME",
        postal_code: "04101",
      },
      notes: "",
    });
    const next = distributorActivityFields({
      name: "Coastal Distribution",
      license_number: "LIC-1234",
      contact_name: "Casey Lane",
      email: "dana@coastal.test",
      phone: "555-0100",
      address_street: "100 Harbor Way",
      address_city: "Portland",
      address_state: "me",
      address_postal_code: "",
      notes: "Weekly pickups",
    });

    expect(current.address_city).toBe("Portland");
    expect(buildFieldChanges(current, next)).toEqual([
      {
        field: "contact_name",
        previous_value: "Dana Reed",
        next_value: "Casey Lane",
      },
      {
        field: "address_postal_code",
        previous_value: "04101",
        next_value: "",
      },
      {
        field: "notes",
        previous_value: "",
        next_value: "Weekly pickups",
      },
    ]);
  });

  it("hides archived distributors and sorts the rest by name", async () => {
    firestoreMocks.listCollection.mockResolvedValueOnce([
      {
        id: "distributor-archived",
        data: { name: "Archived Distribution", archived_at: "2026-08-10T12:00:00.000Z" },
      },
      {
        id: "distributor-z",
        data: { name: "Zephyr Logistics" },
      },
      {
        id: "distributor-a",
        data: { name: "Anchor Freight" },
      },
    ]);

    await expect(listDistributors()).resolves.toMatchObject([
      { id: "distributor-a", data: { name: "Anchor Freight", archived_at: null } },
      { id: "distributor-z", data: { name: "Zephyr Logistics", archived_at: null } },
    ]);
    expect(firestoreMocks.listCollection).toHaveBeenCalledWith("distributors");
  });

  it("keeps archived distributors when explicitly requested", async () => {
    firestoreMocks.listCollection.mockResolvedValueOnce([
      {
        id: "distributor-archived",
        data: { name: "Archived Distribution", archived_at: "2026-08-10T12:00:00.000Z" },
      },
    ]);

    await expect(listDistributors({ includeArchived: true })).resolves.toMatchObject([
      { id: "distributor-archived", data: { name: "Archived Distribution" } },
    ]);
  });

  it("returns distributor activity newest first with normalized entries", async () => {
    firestoreMocks.listCollection.mockResolvedValueOnce([
      {
        id: "activity-old",
        data: {
          action: "created",
          actor_user_id: " user-1 ",
          created_at: "2026-08-01T12:00:00.000Z",
        },
      },
      {
        id: "activity-new",
        data: {
          action: "updated",
          reason: "  fixed license  ",
          changes: [{ field: " name ", previous_value: " Before ", next_value: " After " }],
          created_at: "2026-08-09T12:00:00.000Z",
        },
      },
    ]);

    await expect(listDistributorActivity("distributor-a")).resolves.toEqual([
      {
        id: "activity-new",
        data: {
          action: "updated",
          reason: "fixed license",
          actor_user_id: "",
          actor_email: "",
          actor_name: "",
          actor_picture: "",
          changes: [{ field: "name", previous_value: "Before", next_value: "After" }],
          created_at: "2026-08-09T12:00:00.000Z",
        },
      },
      {
        id: "activity-old",
        data: {
          action: "created",
          reason: "",
          actor_user_id: "user-1",
          actor_email: "",
          actor_name: "",
          actor_picture: "",
          changes: [],
          created_at: "2026-08-01T12:00:00.000Z",
        },
      },
    ]);
    expect(firestoreMocks.listCollection).toHaveBeenCalledWith("distributors/distributor-a/activity");
  });
});
