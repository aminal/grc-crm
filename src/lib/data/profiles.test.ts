import { beforeEach, describe, expect, it, vi } from "vitest";

const firestoreMocks = vi.hoisted(() => {
  const docSet = vi.fn(() => Promise.resolve());
  const docGet = vi.fn();

  return {
    docSet,
    docGet,
    doc: vi.fn(() => ({
      set: docSet,
      get: docGet,
    })),
    now: vi.fn(() => "server-now"),
  };
});

const authMocks = vi.hoisted(() => ({
  updateUser: vi.fn(() => Promise.resolve()),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/firebase/admin", () => ({
  db: {
    doc: firestoreMocks.doc,
  },
  adminAuth: {
    updateUser: authMocks.updateUser,
  },
}));

vi.mock("./firestore", () => ({
  getDocument: firestoreMocks.docGet,
  listCollection: vi.fn(),
  now: firestoreMocks.now,
}));

import { adminUpdateUserProfile, syncProfileFromSignIn } from "./profiles";

describe("profiles data logic", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("assigns Admin role without setting a title for specified admin emails", async () => {
    firestoreMocks.docGet.mockResolvedValueOnce(null);

    const result = await syncProfileFromSignIn(
      "admin-uid",
      "mark.dare@greenroomcannabis.com",
      "Mark Dare",
      "https://picture.url"
    );

    expect(result.role).toBe("Admin");
    expect(result.title).toBeNull();
    expect(firestoreMocks.docSet).toHaveBeenCalledWith(
      expect.objectContaining({
        role: "Admin",
        email: "mark.dare@greenroomcannabis.com",
      }),
      { merge: true }
    );
    expect(firestoreMocks.docSet).toHaveBeenCalledWith(
      expect.not.objectContaining({ title: expect.anything() }),
      { merge: true }
    );
  });

  it("assigns Guest role without setting a title for other users", async () => {
    firestoreMocks.docGet.mockResolvedValueOnce(null);

    const result = await syncProfileFromSignIn(
      "user-uid",
      "other@greenroomcannabis.com",
      "Other User",
      null
    );

    expect(result.role).toBe("Guest");
    expect(result.title).toBeNull();
    expect(firestoreMocks.docSet).toHaveBeenCalledWith(
      expect.objectContaining({
        role: "Guest",
      }),
      { merge: true }
    );
    expect(firestoreMocks.docSet).toHaveBeenCalledWith(
      expect.not.objectContaining({ title: expect.anything() }),
      { merge: true }
    );
  });

  it("preserves existing role and returns existing title if already set", async () => {
    firestoreMocks.docGet.mockResolvedValueOnce({
      data: {
        role: "Employee",
        title: "Sales Rep",
      },
    });

    const result = await syncProfileFromSignIn(
      "user-uid",
      "employee@greenroomcannabis.com",
      "Employee User",
      null
    );

    expect(result.role).toBe("Employee");
    expect(result.title).toBe("Sales Rep");
    expect(firestoreMocks.docSet).toHaveBeenCalledWith(
      expect.objectContaining({
        role: "Employee",
      }),
      { merge: true }
    );
    expect(firestoreMocks.docSet).toHaveBeenCalledWith(
      expect.not.objectContaining({ title: expect.anything() }),
      { merge: true }
    );
  });

  it("forces Admin role for specified admin emails even if they have an existing role, but returns existing title", async () => {
    firestoreMocks.docGet.mockResolvedValueOnce({
      data: {
        role: "Guest",
        title: "CEO",
      },
    });

    const result = await syncProfileFromSignIn(
      "admin-uid",
      "mark.dare@greenroomcannabis.com",
      "Mark Dare",
      null
    );

    expect(result.role).toBe("Admin");
    expect(result.title).toBe("CEO");
    expect(firestoreMocks.docSet).toHaveBeenCalledWith(
      expect.objectContaining({
        role: "Admin",
      }),
      { merge: true }
    );
    expect(firestoreMocks.docSet).toHaveBeenCalledWith(
      expect.not.objectContaining({ title: expect.anything() }),
      { merge: true }
    );
  });

  it("updates auth and profile data when an admin edits a user", async () => {
    await adminUpdateUserProfile("user-uid", {
      display_name: " Updated User ",
      role: "Manager",
      title: " Sales Lead ",
    });

    expect(authMocks.updateUser).toHaveBeenCalledWith("user-uid", { displayName: "Updated User" });
    expect(firestoreMocks.doc).toHaveBeenCalledWith("users/user-uid");
    expect(firestoreMocks.docSet).toHaveBeenCalledWith(
      {
        display_name: "Updated User",
        role: "Manager",
        title: "Sales Lead",
        updated_at: "server-now",
      },
      { merge: true }
    );
  });
});
