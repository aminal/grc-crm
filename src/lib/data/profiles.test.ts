import { beforeEach, describe, expect, it, vi } from "vitest";
import type { UserPermissions } from "@/lib/domain/types";
import { defaultPermissionsForRole } from "@/lib/auth/permissions";

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
    expect(result.permissions).toEqual(defaultPermissionsForRole("Admin"));
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
    expect(result.permissions).toEqual(defaultPermissionsForRole("Guest"));
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
        permissions: {
          sales: "read",
          inventory: "none",
        },
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
    expect(result.permissions.sales.enabled).toBe(true);
    expect(result.permissions.sales.features.create_orders).toBe(false);
    expect(result.permissions.inventory.enabled).toBe(false);
    expect(result.permissions.companies.enabled).toBe(true);
    expect(result.permissions.companies.features.manage_companies).toBe(true);
    expect(firestoreMocks.docSet).toHaveBeenCalledWith(
      expect.objectContaining({
        role: "Employee",
        permissions: expect.objectContaining({
          sales: expect.objectContaining({
            enabled: true,
            features: expect.objectContaining({
              create_orders: false,
            }),
          }),
          inventory: expect.objectContaining({
            enabled: false,
          }),
        }),
      }),
      { merge: true }
    );
    expect(firestoreMocks.docSet).toHaveBeenCalledWith(
      expect.not.objectContaining({ title: expect.anything() }),
      { merge: true }
    );
  });

  it("preserves stored nested permissions during sign-in sync", async () => {
    const permissions: UserPermissions = {
      ...defaultPermissionsForRole("Manager"),
      sales: {
        enabled: true,
        features: {
          ...defaultPermissionsForRole("Manager").sales.features,
          create_orders: false,
        },
      },
      inventory: {
        enabled: false,
        features: {
          upload_metrc: true,
        },
      },
    };

    firestoreMocks.docGet.mockResolvedValueOnce({
      data: {
        role: "Manager",
        permissions,
      },
    });

    const result = await syncProfileFromSignIn(
      "manager-uid",
      "manager@greenroomcannabis.com",
      "Manager User",
      null
    );

    expect(result.permissions.sales.features.create_orders).toBe(false);
    expect(result.permissions.inventory.enabled).toBe(false);
    expect(result.permissions.inventory.features.upload_metrc).toBe(true);
    expect(firestoreMocks.docSet).toHaveBeenCalledWith(
      expect.objectContaining({
        permissions: expect.objectContaining({
          sales: expect.objectContaining({
            features: expect.objectContaining({
              create_orders: false,
            }),
          }),
          inventory: expect.objectContaining({
            enabled: false,
            features: expect.objectContaining({
              upload_metrc: true,
            }),
          }),
        }),
      }),
      { merge: true }
    );
  });

  it("forces Admin role for specified admin emails even if they have an existing role, but returns existing title", async () => {
    firestoreMocks.docGet.mockResolvedValueOnce({
      data: {
        role: "Guest",
        title: "CEO",
        permissions: {
          sales: "none",
          users: "none",
        },
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
    expect(result.permissions).toEqual(defaultPermissionsForRole("Admin"));
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
    const permissions: UserPermissions = {
      ...defaultPermissionsForRole("Manager"),
      users: {
        enabled: true,
        features: {
          edit_user_profiles: false,
          edit_user_permissions: false,
          assign_admin_role: false,
        },
      },
    };

    await adminUpdateUserProfile("user-uid", {
      display_name: " Updated User ",
      role: "Manager",
      title: " Sales Lead ",
      permissions,
    });

    expect(authMocks.updateUser).toHaveBeenCalledWith("user-uid", { displayName: "Updated User" });
    expect(firestoreMocks.doc).toHaveBeenCalledWith("users/user-uid");
    expect(firestoreMocks.docSet).toHaveBeenCalledWith(
      {
        display_name: "Updated User",
        role: "Manager",
        title: "Sales Lead",
        permissions,
        updated_at: "server-now",
      },
      { merge: true }
    );
  });
});
