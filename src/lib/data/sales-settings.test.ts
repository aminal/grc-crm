import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/firebase/admin", () => ({
  db: {},
}));

import { buildFieldChanges, buildSettingsActivityData } from "./sales-settings";

describe("sales settings data helpers", () => {
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
