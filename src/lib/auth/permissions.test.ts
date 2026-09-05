import { describe, expect, it } from "vitest";
import type { AppSection, SectionAccessLevel, SectionFeatureMap, UserPermissions, UserRole } from "@/lib/domain/types";
import {
  APP_SECTIONS,
  canReadSection,
  canWriteSection,
  defaultAuthorizedPath,
  defaultPermissionsForRole,
  enabledSectionsForUser,
  hasSectionAccess,
  isFeatureEnabled,
  isSectionEnabled,
  normalizePermissions,
  SECTION_FEATURES,
} from "./permissions";

function expectSection(permissions: UserPermissions, section: AppSection, enabled: boolean) {
  expect(permissions[section].enabled).toBe(enabled);
}

function expectFeatures<Section extends AppSection>(
  permissions: UserPermissions,
  section: Section,
  expected: Partial<Record<SectionFeatureMap[Section], boolean>>,
) {
  const actualFeatures = permissions[section].features as Record<string, boolean | undefined>;
  const expectedFeatures = expected as Record<string, boolean | undefined>;

  for (const feature of SECTION_FEATURES[section]) {
    expect(actualFeatures[feature.key]).toBe(expectedFeatures[feature.key] ?? false);
  }
}

function expectLegacyAccess(user: { role: UserRole; permissions: UserPermissions }, expected: Partial<Record<AppSection, SectionAccessLevel>>) {
  for (const section of APP_SECTIONS) {
    const access = expected[section] ?? "none";
    expect(hasSectionAccess(user, section, "read")).toBe(access === "read" || access === "write");
    expect(hasSectionAccess(user, section, "write")).toBe(access === "write");
  }
}

describe("section permissions", () => {
  it("builds nested role default permissions that preserve existing access", () => {
    const admin = defaultPermissionsForRole("Admin");
    const manager = defaultPermissionsForRole("Manager");
    const employee = defaultPermissionsForRole("Employee");
    const guest = defaultPermissionsForRole("Guest");

    for (const section of APP_SECTIONS) {
      expectSection(admin, section, true);
      expectFeatures(admin, section, Object.fromEntries(SECTION_FEATURES[section].map((feature) => [feature.key, true])) as Partial<Record<SectionFeatureMap[typeof section], boolean>>);
    }

    expectSection(manager, "users", true);
    expectFeatures(manager, "strains", {
      create_strains: true,
      update_strains: true,
      view_private_strains: true,
    });
    expectFeatures(manager, "users", {
      edit_user_profiles: true,
      edit_user_permissions: true,
      assign_admin_role: false,
    });

    expectLegacyAccess({ role: "Employee", permissions: employee }, {
      dashboard: "write",
      sales: "write",
      billing: "read",
      inventory: "read",
      companies: "write",
      brands: "read",
      strains: "read",
      products: "read",
      distributors: "read",
    });
    expectFeatures(employee, "sales", {
      create_orders: true,
      manage_order_status: true,
      manage_order_packages: true,
      confirm_delivery: true,
      delete_orders: false,
    });
    expectFeatures(employee, "companies", {
      manage_companies: true,
      manage_contacts: true,
      manage_interactions: true,
      delete_companies: false,
    });
    expectFeatures(employee, "strains", {
      view_private_strains: false,
    });
    expectLegacyAccess({ role: "Guest", permissions: guest }, {
      dashboard: "read",
    });
  });

  it("fills missing or invalid stored permissions from role defaults", () => {
    const permissions = normalizePermissions("Employee", {
      sales: { enabled: true, features: { create_orders: false } },
      billing: "invalid",
      inventory: { enabled: false },
    });

    expect(permissions.sales.enabled).toBe(true);
    expect(permissions.sales.features.create_orders).toBe(false);
    expect(permissions.sales.features.manage_order_status).toBe(true);
    expect(permissions.billing.enabled).toBe(true);
    expect(permissions.billing.features.manage_payments).toBe(false);
    expect(permissions.inventory.enabled).toBe(false);
    expect(permissions.companies.features.manage_contacts).toBe(true);
    expect(permissions.users.enabled).toBe(false);
  });

  it("normalizes legacy none, read, and write access levels", () => {
    const employee = normalizePermissions("Employee", {
      dashboard: "none",
      sales: "write",
      billing: "read",
      inventory: "none",
      companies: "write",
    });

    expect(employee.dashboard.enabled).toBe(true);
    expectFeatures(employee, "dashboard", {});
    expect(employee.sales.enabled).toBe(true);
    expect(employee.sales.features.create_orders).toBe(true);
    expect(employee.sales.features.delete_orders).toBe(false);
    expect(employee.billing.enabled).toBe(true);
    expectFeatures(employee, "billing", {});
    expect(employee.inventory.enabled).toBe(false);
    expect(employee.companies.features.manage_companies).toBe(true);
    expect(employee.companies.features.delete_companies).toBe(false);
  });

  it("forces seeded admins to full access even with restrictive stored permissions", () => {
    const permissions = normalizePermissions("Guest", {
      dashboard: { enabled: false, features: { view_metrics: false } },
      sales: "none",
      users: { enabled: false, features: { assign_admin_role: false } },
    }, " Mark.Dare@GreenRoomCannabis.com ");

    for (const section of APP_SECTIONS) {
      const features = permissions[section].features as Record<string, boolean | undefined>;
      expect(permissions[section].enabled).toBe(true);
      for (const feature of SECTION_FEATURES[section]) {
        expect(features[feature.key]).toBe(true);
      }
    }
  });

  it("requires both section access and feature access for effective feature permissions", () => {
    const user = {
      role: "Employee" as UserRole,
      email: "employee@greenroomcannabis.com",
      permissions: normalizePermissions("Employee", {
        sales: { enabled: false, features: { create_orders: true } },
        billing: { enabled: true, features: { manage_payments: true } },
      }),
    };

    expect(isSectionEnabled(user, "sales")).toBe(false);
    expect(isFeatureEnabled(user, "sales", "create_orders")).toBe(false);
    expect(isSectionEnabled(user, "billing")).toBe(true);
    expect(isFeatureEnabled(user, "billing", "manage_payments")).toBe(true);
    expect(canReadSection(user, "billing")).toBe(true);
    expect(canWriteSection(user, "billing")).toBe(true);
    expect(canReadSection(user, "sales")).toBe(false);
    expect(canWriteSection(user, "sales")).toBe(false);
  });

  it("returns enabled sections and the default authorized dashboard route", () => {
    const user = {
      role: "Guest" as UserRole,
      email: "guest@greenroomcannabis.com",
      permissions: normalizePermissions("Guest", {
        dashboard: { enabled: false, features: { view_metrics: false } },
        sales: "none",
      }),
    };

    expect(enabledSectionsForUser(user)).toEqual(["dashboard"]);
    expect(defaultAuthorizedPath(user)).toBe("/dashboard");
  });
});
