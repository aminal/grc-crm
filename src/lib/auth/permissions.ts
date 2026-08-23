import type {
  AppSection,
  AuthenticatedUser,
  SectionAccessLevel,
  SectionFeature,
  SectionFeatureMap,
  SectionPermissionConfig,
  SectionPermissions,
  StoredUserPermissions,
  UserPermissions,
  UserRole,
} from "@/lib/domain/types";

export const APP_SECTIONS = [
  "dashboard",
  "sales",
  "billing",
  "inventory",
  "companies",
  "brands",
  "strains",
  "products",
  "users",
] as const satisfies readonly AppSection[];

export const SECTION_ACCESS_LEVELS = ["none", "read", "write"] as const satisfies readonly SectionAccessLevel[];

export const SECTION_LABELS = {
  dashboard: "Dashboard",
  sales: "Sales",
  billing: "Billing",
  inventory: "Inventory",
  companies: "Companies",
  brands: "Brands",
  strains: "Strains",
  products: "Products",
  users: "Users",
} as const satisfies Record<AppSection, string>;

export const SECTION_HREFS = {
  dashboard: "/dashboard",
  sales: "/sales",
  billing: "/billing",
  inventory: "/inventory",
  companies: "/companies",
  brands: "/brands",
  strains: "/strains",
  products: "/products",
  users: "/users",
} as const satisfies Record<AppSection, string>;

export const SECTION_FEATURES = {
  dashboard: [
    { key: "view_metrics", label: "Metrics" },
    { key: "view_recent_orders", label: "Recent orders" },
    { key: "view_recent_companies", label: "Recent companies" },
    { key: "view_inventory_groups", label: "Inventory groups" },
    { key: "view_sales_status", label: "Sales status" },
  ],
  sales: [
    { key: "create_orders", label: "Create orders" },
    { key: "manage_order_status", label: "Manage order status" },
    { key: "manage_order_packages", label: "Manage order packages" },
    { key: "confirm_delivery", label: "Confirm delivery" },
    { key: "delete_orders", label: "Delete orders" },
  ],
  billing: [
    { key: "approve_invoices", label: "Approve invoices" },
    { key: "unapprove_invoices", label: "Unapprove invoices" },
    { key: "manage_payments", label: "Manage payments" },
    { key: "manage_discounts", label: "Manage discounts" },
  ],
  inventory: [
    { key: "upload_metrc", label: "Upload METRC" },
  ],
  companies: [
    { key: "manage_companies", label: "Manage companies" },
    { key: "manage_contacts", label: "Manage contacts" },
    { key: "manage_interactions", label: "Manage interactions" },
    { key: "delete_companies", label: "Delete companies" },
  ],
  brands: [
    { key: "create_brands", label: "Create brands" },
    { key: "update_brands", label: "Update brands" },
    { key: "archive_brands", label: "Archive brands" },
  ],
  strains: [
    { key: "create_strains", label: "Create strains" },
    { key: "update_strains", label: "Update strains" },
    { key: "archive_strains", label: "Archive strains" },
  ],
  products: [
    { key: "create_products", label: "Create products" },
    { key: "update_products", label: "Update products" },
    { key: "archive_products", label: "Archive products" },
  ],
  users: [
    { key: "edit_user_profiles", label: "Edit user profiles" },
    { key: "edit_user_permissions", label: "Edit user permissions" },
    { key: "assign_admin_role", label: "Assign Admin role" },
  ],
} as const satisfies { [Section in AppSection]: readonly { key: SectionFeatureMap[Section]; label: string }[] };

export const FEATURE_LABELS = Object.fromEntries(
  APP_SECTIONS.map((section) => [
    section,
    Object.fromEntries(SECTION_FEATURES[section].map((feature) => [feature.key, feature.label])),
  ]),
) as { [Section in AppSection]: Record<SectionFeatureMap[Section], string> };

export const SEEDED_ADMIN_EMAILS = ["mark.dare@greenroomcannabis.com", "jeana.dare@greenroomcannabis.com"] as const;

const SECTION_ACCESS_RANK = {
  none: 0,
  read: 1,
  write: 2,
} as const satisfies Record<SectionAccessLevel, number>;

function allFeatureKeys<Section extends AppSection>(section: Section): SectionFeatureMap[Section][] {
  return SECTION_FEATURES[section].map((feature) => feature.key) as SectionFeatureMap[Section][];
}

function sectionConfig<Section extends AppSection>(section: Section, enabled: boolean, enabledFeatures: readonly SectionFeatureMap[Section][] = []): SectionPermissionConfig<Section> {
  const featureSet = new Set<SectionFeatureMap[Section]>(enabledFeatures);
  return {
    enabled: section === "dashboard" ? true : enabled,
    features: Object.fromEntries(
      allFeatureKeys(section).map((feature) => [feature, featureSet.has(feature)]),
    ) as Record<SectionFeatureMap[Section], boolean>,
  };
}

function permissionsFromSections(configs: { [Section in AppSection]: SectionPermissionConfig<Section> }): UserPermissions {
  return configs;
}

function fullSection<Section extends AppSection>(section: Section): SectionPermissionConfig<Section> {
  return sectionConfig(section, true, allFeatureKeys(section));
}

function emptySection<Section extends AppSection>(section: Section, enabled = false): SectionPermissionConfig<Section> {
  return sectionConfig(section, enabled, []);
}

const DEFAULT_ROLE_PERMISSIONS = {
  Admin: permissionsFromSections({
    dashboard: fullSection("dashboard"),
    sales: fullSection("sales"),
    billing: fullSection("billing"),
    inventory: fullSection("inventory"),
    companies: fullSection("companies"),
    brands: fullSection("brands"),
    strains: fullSection("strains"),
    products: fullSection("products"),
    users: fullSection("users"),
  }),
  Manager: permissionsFromSections({
    dashboard: fullSection("dashboard"),
    sales: fullSection("sales"),
    billing: fullSection("billing"),
    inventory: fullSection("inventory"),
    companies: fullSection("companies"),
    brands: fullSection("brands"),
    strains: fullSection("strains"),
    products: fullSection("products"),
    users: sectionConfig("users", true, ["edit_user_profiles", "edit_user_permissions"]),
  }),
  Employee: permissionsFromSections({
    dashboard: fullSection("dashboard"),
    sales: sectionConfig("sales", true, ["create_orders", "manage_order_status", "manage_order_packages", "confirm_delivery"]),
    billing: emptySection("billing", true),
    inventory: emptySection("inventory", true),
    companies: sectionConfig("companies", true, ["manage_companies", "manage_contacts", "manage_interactions"]),
    brands: emptySection("brands", true),
    strains: emptySection("strains", true),
    products: emptySection("products", true),
    users: emptySection("users"),
  }),
  Guest: permissionsFromSections({
    dashboard: emptySection("dashboard", true),
    sales: emptySection("sales"),
    billing: emptySection("billing"),
    inventory: emptySection("inventory"),
    companies: emptySection("companies"),
    brands: emptySection("brands"),
    strains: emptySection("strains"),
    products: emptySection("products"),
    users: emptySection("users"),
  }),
} as const satisfies Record<UserRole, UserPermissions>;

function isSectionAccessLevel(value: unknown): value is SectionAccessLevel {
  return typeof value === "string" && SECTION_ACCESS_LEVELS.includes(value as SectionAccessLevel);
}

function isStoredSectionConfig(value: unknown): value is { enabled?: unknown; features?: Record<string, unknown> } {
  return typeof value === "object" && value !== null && !Array.isArray(value) && ("enabled" in value || "features" in value);
}

function cloneSectionConfig<Section extends AppSection>(section: Section, config: SectionPermissionConfig<Section>): SectionPermissionConfig<Section> {
  return sectionConfig(
    section,
    config.enabled,
    allFeatureKeys(section).filter((feature) => config.features[feature] === true),
  );
}

function clonePermissions(permissions: UserPermissions): UserPermissions {
  return permissionsFromSections({
    dashboard: cloneSectionConfig("dashboard", permissions.dashboard),
    sales: cloneSectionConfig("sales", permissions.sales),
    billing: cloneSectionConfig("billing", permissions.billing),
    inventory: cloneSectionConfig("inventory", permissions.inventory),
    companies: cloneSectionConfig("companies", permissions.companies),
    brands: cloneSectionConfig("brands", permissions.brands),
    strains: cloneSectionConfig("strains", permissions.strains),
    products: cloneSectionConfig("products", permissions.products),
    users: cloneSectionConfig("users", permissions.users),
  });
}

function featuresFromLegacyAccess<Section extends AppSection>(role: UserRole, section: Section, access: SectionAccessLevel): SectionPermissionConfig<Section> {
  if (access === "none") {
    return emptySection(section, section === "dashboard");
  }

  if (access === "read") {
    if (section === "dashboard") {
      return role === "Guest" ? emptySection(section, true) : cloneSectionConfig(section, DEFAULT_ROLE_PERMISSIONS[role][section]);
    }
    return emptySection(section, true);
  }

  return cloneSectionConfig(section, {
    ...DEFAULT_ROLE_PERMISSIONS[role][section],
    enabled: true,
  });
}

function normalizeSection<Section extends AppSection>(
  role: UserRole,
  section: Section,
  storedAccess: unknown,
  defaultConfig: SectionPermissionConfig<Section>,
): SectionPermissionConfig<Section> {
  if (isSectionAccessLevel(storedAccess)) {
    return featuresFromLegacyAccess(role, section, storedAccess);
  }

  if (!isStoredSectionConfig(storedAccess)) {
    return cloneSectionConfig(section, defaultConfig);
  }

  const enabled = section === "dashboard" ? true : typeof storedAccess.enabled === "boolean" ? storedAccess.enabled : defaultConfig.enabled;
  const storedFeatures = storedAccess.features;

  return {
    enabled,
    features: Object.fromEntries(
      allFeatureKeys(section).map((feature) => {
        const storedFeature = storedFeatures?.[feature];
        return [feature, typeof storedFeature === "boolean" ? storedFeature : defaultConfig.features[feature] === true];
      }),
    ) as Record<SectionFeatureMap[Section], boolean>,
  };
}

export function isSeededAdminEmail(email: string | null | undefined): boolean {
  return typeof email === "string" && SEEDED_ADMIN_EMAILS.includes(email.trim().toLowerCase() as (typeof SEEDED_ADMIN_EMAILS)[number]);
}

export function defaultPermissionsForRole(role: UserRole): UserPermissions {
  return clonePermissions(DEFAULT_ROLE_PERMISSIONS[role]);
}

export function normalizePermissions(
  role: UserRole,
  storedPermissions?: StoredUserPermissions | Partial<SectionPermissions> | Partial<UserPermissions> | null,
  email?: string | null,
): UserPermissions {
  if (isSeededAdminEmail(email)) {
    return defaultPermissionsForRole("Admin");
  }

  const defaults = defaultPermissionsForRole(role);
  const stored = storedPermissions as StoredUserPermissions | null | undefined;

  return permissionsFromSections({
    dashboard: normalizeSection(role, "dashboard", stored?.dashboard, defaults.dashboard),
    sales: normalizeSection(role, "sales", stored?.sales, defaults.sales),
    billing: normalizeSection(role, "billing", stored?.billing, defaults.billing),
    inventory: normalizeSection(role, "inventory", stored?.inventory, defaults.inventory),
    companies: normalizeSection(role, "companies", stored?.companies, defaults.companies),
    brands: normalizeSection(role, "brands", stored?.brands, defaults.brands),
    strains: normalizeSection(role, "strains", stored?.strains, defaults.strains),
    products: normalizeSection(role, "products", stored?.products, defaults.products),
    users: normalizeSection(role, "users", stored?.users, defaults.users),
  });
}

export function isSectionEnabled(
  user: Pick<AuthenticatedUser, "role"> & { email?: string | null; permissions?: StoredUserPermissions | Partial<SectionPermissions> | Partial<UserPermissions> | null },
  section: AppSection,
): boolean {
  const permissions = normalizePermissions(user.role, user.permissions, user.email);
  return permissions[section].enabled;
}

export function isFeatureEnabled<Section extends AppSection>(
  user: Pick<AuthenticatedUser, "role"> & { email?: string | null; permissions?: StoredUserPermissions | Partial<SectionPermissions> | Partial<UserPermissions> | null },
  section: Section,
  feature: SectionFeature<Section>,
): boolean {
  const permissions = normalizePermissions(user.role, user.permissions, user.email);
  return permissions[section].enabled && permissions[section].features[feature] === true;
}

export function enabledSectionsForUser(
  user: Pick<AuthenticatedUser, "role"> & { email?: string | null; permissions?: StoredUserPermissions | Partial<SectionPermissions> | Partial<UserPermissions> | null },
): AppSection[] {
  const permissions = normalizePermissions(user.role, user.permissions, user.email);
  return APP_SECTIONS.filter((section) => permissions[section].enabled);
}

export function defaultAuthorizedPath(
  user: Pick<AuthenticatedUser, "role"> & { email?: string | null; permissions?: StoredUserPermissions | Partial<SectionPermissions> | Partial<UserPermissions> | null },
): string {
  const section = enabledSectionsForUser(user)[0] ?? "dashboard";
  return SECTION_HREFS[section];
}

export function hasSectionAccess(
  user: Pick<AuthenticatedUser, "role"> & { email?: string | null; permissions?: StoredUserPermissions | Partial<SectionPermissions> | Partial<UserPermissions> | null },
  section: AppSection,
  minimumAccess: SectionAccessLevel,
): boolean {
  const permissions = normalizePermissions(user.role, user.permissions, user.email);
  const sectionConfig = permissions[section];
  const effectiveAccess: SectionAccessLevel = sectionConfig.enabled
    ? Object.values(sectionConfig.features).some(Boolean) ? "write" : "read"
    : "none";

  return SECTION_ACCESS_RANK[effectiveAccess] >= SECTION_ACCESS_RANK[minimumAccess];
}

export function canReadSection(
  user: Pick<AuthenticatedUser, "role"> & { email?: string | null; permissions?: StoredUserPermissions | Partial<SectionPermissions> | Partial<UserPermissions> | null },
  section: AppSection,
): boolean {
  return isSectionEnabled(user, section);
}

export function canWriteSection(
  user: Pick<AuthenticatedUser, "role"> & { email?: string | null; permissions?: StoredUserPermissions | Partial<SectionPermissions> | Partial<UserPermissions> | null },
  section: AppSection,
): boolean {
  return hasSectionAccess(user, section, "write");
}
