import { beforeEach, describe, expect, it, vi } from "vitest";
import { defaultPermissionsForRole } from "@/lib/auth/permissions";
import type { AuthenticatedUser, CompanyData, FirestoreRecord, PackageData, ParsedPackageData, ProductData, StrainData, UserPermissions } from "@/lib/domain/types";

const firebaseAdminMock = vi.hoisted(() => ({
  adminStorage: {},
  db: {
    batch: vi.fn(),
    collection: vi.fn(),
    doc: vi.fn(),
    getAll: vi.fn(),
  },
}));

vi.mock("server-only", () => ({}));
vi.mock("./firestore", () => ({
  docIdFromTag: (packageTag: string) => packageTag.trim().replaceAll("/", "_"),
  getDocument: vi.fn(),
  listCollection: vi.fn(),
  normalizedText: (value: unknown) => String(value ?? "").trim(),
  now: vi.fn(() => "server-now"),
}));
vi.mock("./sales-settings", () => ({
  buildFieldChanges: vi.fn(() => []),
  buildSettingsActivityData: vi.fn(),
  listProducts: vi.fn(),
  listStrains: vi.fn(),
}));
vi.mock("./crm", () => ({
  findDistributorCompany: vi.fn(),
}));
vi.mock("./package-status", () => ({
  derivedPackageStatus: vi.fn(),
  packageStatusMap: vi.fn(),
}));
vi.mock("@/lib/firebase/admin", () => firebaseAdminMock);

import { getDocument, listCollection } from "./firestore";
import { listProducts, listStrains } from "./sales-settings";
import { derivedPackageStatus, packageStatusMap } from "./package-status";
import { findDistributorCompany } from "./crm";
import { assertPackagesInGroup, consignPackages, findInventoryBatchMetadata, groupInventory, hasPackageConsignmentsForDistributorCompany, mapPackagesToProducts } from "./inventory";

function parsedPackage(overrides: Partial<ParsedPackageData>): ParsedPackageData {
  return {
    package_tag: "pkg-a",
    strain: "",
    source_harvest: "",
    source_packages: "",
    original_source_package_label: "",
    source_processing_jobs: "",
    location: "",
    sublocation: "",
    item: "",
    category: "",
    quantity: 0,
    unit_of_measure: "",
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
    ...overrides,
  };
}

function product(id: string, overrides: Partial<ProductData>): FirestoreRecord<ProductData> {
  const data: ProductData = {
    name: "",
    brand_id: "brand-a",
    strain_ids: [],
    category: "",
    status: "Active",
    unit_base_price_cents: 0,
    case_quantity: 0,
    sku: "",
    upc: "",
    notes: "",
    created_at: null,
    updated_at: null,
    ...overrides,
  };

  return { id, data };
}

function company(id: string, overrides: Partial<CompanyData>): FirestoreRecord<CompanyData> {
  return {
    id,
    data: {
      company_name: "Distributor Company",
      license_number: "LIC-1",
      status: "Active",
      facility_type: "Distributor",
      primary_contact_id: null,
      address: {
        street: "",
        city: "",
        state: "",
        postal_code: "",
      },
      website_url: "",
      social_links: {
        facebook: "",
        instagram: "",
        x: "",
        threads: "",
      },
      created_at: null,
      updated_at: null,
      ...overrides,
    },
  };
}

function existingPackage(overrides: Partial<PackageData>): PackageData {
  return {
    package_tag: "pkg-a",
    product_id: "product-a",
    strain: "",
    source_harvest: "",
    source_packages: "",
    original_source_package_label: "",
    source_processing_jobs: "",
    location: "",
    sublocation: "",
    item: "Existing Item",
    category: "Existing Category",
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
    active: true,
    status: "active",
    last_synced_at: null,
    updated_at: null,
    ...overrides,
  };
}

describe("company-backed package consignment", () => {
  beforeEach(() => {
    firebaseAdminMock.db.batch.mockReset();
    firebaseAdminMock.db.collection.mockReset();
    firebaseAdminMock.db.doc.mockReset();
    firebaseAdminMock.db.getAll.mockReset();
    vi.mocked(findDistributorCompany).mockReset();
  });

  it("detects package consignments by distributor company ID", async () => {
    const get = vi.fn().mockResolvedValue({ empty: false });
    const limit = vi.fn(() => ({ get }));
    const where = vi.fn(() => ({ limit }));
    firebaseAdminMock.db.collection.mockReturnValue({ where });

    await expect(hasPackageConsignmentsForDistributorCompany(" company-1 ")).resolves.toBe(true);
    expect(firebaseAdminMock.db.collection).toHaveBeenCalledWith("packages");
    expect(where).toHaveBeenCalledWith("consignment.distributor_id", "==", "company-1");
    expect(limit).toHaveBeenCalledWith(1);
  });

  it("writes distributor company snapshots when consigning packages", async () => {
    const batch = {
      commit: vi.fn(),
      create: vi.fn(),
      set: vi.fn(),
    };
    const packageRef = { path: "packages/pkg-a" };
    const activityDoc = { path: "packages/pkg-a/activity/activity-1" };
    firebaseAdminMock.db.batch.mockReturnValue(batch);
    firebaseAdminMock.db.collection.mockReturnValue({ doc: vi.fn(() => activityDoc) });
    firebaseAdminMock.db.doc.mockImplementation((path: string) => ({ path }));
    firebaseAdminMock.db.getAll.mockResolvedValue([
      {
        id: "pkg-a",
        exists: true,
        ref: packageRef,
        data: () => existingPackage({ package_tag: "TAG-A" }),
      },
    ]);
    vi.mocked(findDistributorCompany).mockResolvedValue(company("company-1", { company_name: "Company Distributor" }));

    await expect(consignPackages(["pkg-a"], "company-1", " Transfer ", userWithPermissions(() => undefined))).resolves.toBe(1);
    expect(findDistributorCompany).toHaveBeenCalledWith("company-1");
    expect(batch.set).toHaveBeenCalledWith(
      packageRef,
      {
        consignment: {
          distributor_id: "company-1",
          distributor_name: "Company Distributor",
          notes: "Transfer",
          consigned_by: {
            uid: "user-1",
            email: "consignment.manager@greenroomcannabis.com",
            name: "Consignment Manager",
            picture: "",
          },
          consigned_at: "server-now",
        },
        updated_at: "server-now",
      },
      { merge: true },
    );
  });
});

describe("inventory product mapping", () => {
  it("maps uploaded packages to different products by item name and SKU", () => {
    const mapped = mapPackagesToProducts(
      [
        parsedPackage({ package_tag: "pkg-a", item: "Blue Dream 3.5g", category: "METRC Flower" }),
        parsedPackage({ package_tag: "pkg-b", item: "sku-200" }),
      ],
      [
        product("product-a", { name: "Blue Dream 3.5g", category: "Flower", sku: "BD35" }),
        product("product-b", { name: "Gummy", category: "Edible", sku: "SKU-200" }),
      ],
    );

    expect(mapped).toMatchObject([
      { package_tag: "pkg-a", product_id: "product-a", item: "Blue Dream 3.5g", category: "METRC Flower" },
      { package_tag: "pkg-b", product_id: "product-b", item: "sku-200", category: "Edible" },
    ]);
  });

  it("preserves existing product mapping for tag-only rows", () => {
    const mapped = mapPackagesToProducts(
      [parsedPackage({ package_tag: "pkg-a" })],
      [product("product-a", { name: "Catalog Item", category: "Catalog Category" })],
      new Map([["pkg-a", existingPackage({})]]),
    );

    expect(mapped[0]).toMatchObject({
      package_tag: "pkg-a",
      product_id: "product-a",
      item: "Existing Item",
      category: "Existing Category",
    });
  });

  it("maps tag-only rows by existing package item", () => {
    const mapped = mapPackagesToProducts(
      [parsedPackage({ package_tag: "pkg-a" })],
      [product("product-a", { name: "Existing Item", category: "Catalog Category" })],
      new Map([["pkg-a", existingPackage({ product_id: undefined })]]),
    );

    expect(mapped[0]).toMatchObject({
      package_tag: "pkg-a",
      product_id: "product-a",
      item: "Existing Item",
      category: "Existing Category",
    });
  });

  it("allows new tag-only rows to sync without product data", () => {
    const mapped = mapPackagesToProducts(
      [parsedPackage({ package_tag: "pkg-new" })],
      [product("product-a", { name: "Catalog Item", category: "Catalog Category" })],
    );

    expect(mapped[0]).toMatchObject({
      package_tag: "pkg-new",
      item: "",
      category: "",
    });
    expect(mapped[0].product_id).toBeUndefined();
  });

  it("fails when a package item cannot be mapped to a product", () => {
    expect(() => mapPackagesToProducts(
      [parsedPackage({ package_tag: "pkg-a", item: "Unknown Item" })],
      [product("product-a", { name: "Known Item", category: "Flower" })],
    )).toThrow("Could not map METRC item(s) to Products: Unknown Item");
  });
});

describe("inventory batch metadata", () => {
  const groupKey = "a".repeat(40);

  beforeEach(() => {
    vi.mocked(getDocument).mockReset();
  });

  it("loads stored metadata by inventory group key", async () => {
    vi.mocked(getDocument).mockResolvedValue({
      id: groupKey,
      data: {
        batch_number: " batch-1 ",
        sku: " sku-1 ",
        thc_percentage: " 24.5 ",
        cbd_percentage: " 0.12 ",
        coa_url: " https://test-results.invalid/coa.pdf ",
        item: "Flower",
        source_packages: "source-1",
        created_at: null,
        updated_at: null,
      },
    });

    await expect(findInventoryBatchMetadata(groupKey)).resolves.toMatchObject({
      id: groupKey,
      data: {
        batch_number: "batch-1",
        sku: "sku-1",
        thc_percentage: "24.5",
        cbd_percentage: "0.12",
        coa_url: "https://test-results.invalid/coa.pdf",
        item: "Flower",
        source_packages: "source-1",
      },
    });
    expect(getDocument).toHaveBeenCalledWith(`inventory_batches/${groupKey}`);
  });

  it("rejects malformed inventory group keys", async () => {
    await expect(findInventoryBatchMetadata("bad/key")).rejects.toThrow("Inventory group not found.");
    expect(getDocument).not.toHaveBeenCalled();
  });
});

function strain(id: string, status: StrainData["status"]): FirestoreRecord<StrainData> {
  return {
    id,
    data: {
      name: id,
      breeder: "",
      genetics: "",
      sativa_percentage: 0,
      status,
      notes: "",
      deleted_at: null,
      created_at: null,
      updated_at: null,
    },
  };
}

function packageRecord(id: string, overrides: Partial<PackageData>): FirestoreRecord<PackageData> {
  return { id, data: existingPackage({ package_tag: id, ...overrides }) };
}

function userWithPermissions(mutate: (permissions: UserPermissions) => void): AuthenticatedUser {
  const permissions = defaultPermissionsForRole("Manager");
  mutate(permissions);

  return {
    uid: "user-1",
    email: "consignment.manager@greenroomcannabis.com",
    name: "Consignment Manager",
    picture: null,
    role: "Manager",
    title: null,
    permissions,
  };
}

describe("assertPackagesInGroup visibility", () => {
  const hiddenStrainPackage = packageRecord("pkg-hidden", { product_id: "product-hidden", item: "Secret Item", source_packages: "src-1" });
  const visiblePackage = packageRecord("pkg-visible", { product_id: "product-visible", item: "Public Item", source_packages: "src-2" });
  const products = [
    product("product-hidden", { name: "Secret Item", strain_ids: ["strain-hidden"] }),
    product("product-visible", { name: "Public Item", strain_ids: ["strain-public"] }),
  ];
  const strains = [strain("strain-hidden", "Hidden"), strain("strain-public", "Active")];

  beforeEach(() => {
    vi.mocked(listCollection).mockResolvedValue([hiddenStrainPackage, visiblePackage]);
    vi.mocked(packageStatusMap).mockResolvedValue({});
    vi.mocked(derivedPackageStatus).mockReturnValue({ status: "available" });
    vi.mocked(listProducts).mockResolvedValue(products);
    vi.mocked(listStrains).mockResolvedValue(strains);
  });

  function groupKeyFor(packageId: string): string {
    const group = groupInventory([hiddenStrainPackage, visiblePackage]).find((row) => row.packages.some((row2) => row2.id === packageId));
    if (!group) {
      throw new Error("Group not found in fixture.");
    }

    return group.key;
  }

  it("rejects packages hidden from a consignment manager without private strain access", async () => {
    const user = userWithPermissions((permissions) => {
      permissions.strains.features.view_private_strains = false;
      permissions.inventory.features.manage_consignment = true;
    });

    await expect(assertPackagesInGroup(groupKeyFor("pkg-hidden"), ["pkg-hidden"], user)).rejects.toThrow("Inventory group not found.");
  });

  it("rejects hidden packages submitted with a visible group key", async () => {
    const user = userWithPermissions((permissions) => {
      permissions.strains.features.view_private_strains = false;
      permissions.inventory.features.manage_consignment = true;
    });

    await expect(assertPackagesInGroup(groupKeyFor("pkg-visible"), ["pkg-visible", "pkg-hidden"], user)).rejects.toThrow("Selected packages must belong to this inventory group.");
  });

  it("allows hidden packages for a user with private strain access", async () => {
    const user = userWithPermissions((permissions) => {
      permissions.strains.features.view_private_strains = true;
      permissions.inventory.features.manage_consignment = true;
    });

    await expect(assertPackagesInGroup(groupKeyFor("pkg-hidden"), ["pkg-hidden"], user)).resolves.toBeUndefined();
  });
});
