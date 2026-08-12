import { describe, expect, it, vi } from "vitest";
import type { FirestoreRecord, PackageData, ParsedPackageData, ProductData } from "@/lib/domain/types";

vi.mock("server-only", () => ({}));
vi.mock("./firestore", () => ({
  docIdFromTag: (packageTag: string) => packageTag.trim().replaceAll("/", "_"),
  getDocument: vi.fn(),
  listCollection: vi.fn(),
  now: vi.fn(() => "server-now"),
}));
vi.mock("./sales-settings", () => ({
  listProducts: vi.fn(),
}));
vi.mock("./package-status", () => ({
  derivedPackageStatus: vi.fn(),
  packageStatusMap: vi.fn(),
}));
vi.mock("@/lib/firebase/admin", () => ({
  adminStorage: {},
  db: {},
}));

import { mapPackagesToProducts } from "./inventory";

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
