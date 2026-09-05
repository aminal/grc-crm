import { describe, expect, it } from "vitest";
import { COMPANY_STATUSES, PRODUCT_STATUSES, STRAIN_STATUSES } from "./constants";
import { APP_SECTIONS, SECTION_FEATURES } from "@/lib/auth/permissions";
import { batchMetadataSchema, companySchema, createOrderSchema, discountSchema, distributorCreateSchema, packagePricesFromForm, packageTagsFromForm, paymentSchema, productCreateSchema, strainCreateSchema, syncConsignmentSchema, userUpdateSchema } from "./schemas";

describe("domain schemas", () => {
  it("stores company social profiles as handles", () => {
    const parsed = companySchema.parse({
      company_name: "Jane's Shop",
      status: "Lead",
      facility_type: "Dispensary",
      address_city: "Albany",
      address_state: "NY",
      social_instagram: "https://www.instagram.com/janes_shop/?igsh=test",
      social_x: "https://x.com/janes_x?ref=test",
      social_threads: "https://www.threads.net/@janes_threads/post/test",
    });

    expect(parsed.social_instagram).toBe("janes_shop");
    expect(parsed.social_x).toBe("janes_x");
    expect(parsed.social_threads).toBe("janes_threads");
    expect(companySchema.parse({ company_name: "Jane's Shop", status: "Lead", facility_type: "Dispensary", address_city: "Albany", address_state: "ny", social_instagram: "@janes_shop", social_x: "@janes_x", social_threads: "@janes_threads" })).toMatchObject({
      address_state: "NY",
      social_instagram: "janes_shop",
      social_x: "janes_x",
      social_threads: "janes_threads",
    });
  });

  it("accepts only valid company statuses", () => {
    const baseCompany = {
      company_name: "Jane's Shop",
      facility_type: "Dispensary",
      address_city: "Albany",
      address_state: "NY",
    };

    for (const status of COMPANY_STATUSES) {
      expect(companySchema.parse({ ...baseCompany, status }).status).toBe(status);
    }

    expect(() => companySchema.parse({ ...baseCompany, status: "Customer" })).toThrow();
    expect(() => companySchema.parse(baseCompany)).toThrow();
  });

  it("parses strain status", () => {
    const baseStrain = {
      name: "Blue Dream",
      sativa_percentage: "50",
    };

    expect(strainCreateSchema.parse(baseStrain).status).toBe("Active");
    expect(STRAIN_STATUSES[STRAIN_STATUSES.length - 1]).toBe("Hidden");
    for (const status of STRAIN_STATUSES) {
      expect(strainCreateSchema.parse({ ...baseStrain, status }).status).toBe(status);
    }
    expect(() => strainCreateSchema.parse({ ...baseStrain, status: "Discontinued" })).toThrow();
  });

  it("requires check number for check payments", () => {
    expect(() => paymentSchema.parse({ amount: "10.00", method: "check", paid_at: "2026-08-10", check_number: "" })).toThrow();
    expect(paymentSchema.parse({ amount: "10.00", method: "check", paid_at: "2026-08-10", check_number: "123" }).amount).toBe(1000);
  });

  it("parses product pricing, case quantity, and status", () => {
    const parsed = productCreateSchema.parse({
      name: "Product",
      brand_id: "brand-1",
      strain_ids: ["strain-1"],
      status: "Hidden",
      unit_base_price_cents: "12.34",
      case_quantity: "24",
    });

    expect(parsed.status).toBe("Hidden");
    expect(PRODUCT_STATUSES[PRODUCT_STATUSES.length - 1]).toBe("Hidden");
    expect(parsed.unit_base_price_cents).toBe(1234);
    expect(parsed.case_quantity).toBe(24);
    expect(productCreateSchema.parse({ name: "Product", brand_id: "brand-1", strain_ids: ["strain-1"] })).toMatchObject({
      status: "Active",
      unit_base_price_cents: 0,
      case_quantity: 0,
    });
    for (const status of PRODUCT_STATUSES) {
      expect(productCreateSchema.parse({ name: "Product", brand_id: "brand-1", strain_ids: ["strain-1"], status }).status).toBe(status);
    }
    expect(() => productCreateSchema.parse({ name: "Product", brand_id: "brand-1", strain_ids: ["strain-1"], status: "Discontinued" })).toThrow();
  });

  it("accepts a name-only distributor and normalizes the optional state", () => {
    expect(distributorCreateSchema.parse({ name: " North Star Logistics " })).toMatchObject({
      name: "North Star Logistics",
      license_number: "",
      contact_name: "",
      email: "",
      phone: "",
      address_street: "",
      address_city: "",
      address_state: "",
      address_postal_code: "",
      notes: "",
    });
    expect(distributorCreateSchema.parse({ name: "North Star", address_state: "" }).address_state).toBe("");
    expect(distributorCreateSchema.parse({ name: "North Star", address_state: " ny " }).address_state).toBe("NY");
    expect(() => distributorCreateSchema.parse({ name: "North Star", address_state: "ZZ" })).toThrow();
  });

  it("rejects invalid distributor email and phone values", () => {
    expect(() => distributorCreateSchema.parse({ name: "North Star", email: "not-an-email" })).toThrow();
    expect(() => distributorCreateSchema.parse({ name: "North Star", phone: "12" })).toThrow();
    expect(distributorCreateSchema.parse({ name: "North Star", email: "ops@example.com", phone: "(518) 555-0134" })).toMatchObject({
      email: "ops@example.com",
      phone: "(518) 555-0134",
    });
  });

  it("requires a distributor only when sync packages are selected", () => {
    expect(syncConsignmentSchema.parse({ sync_id: "sync-1" })).toMatchObject({
      sync_id: "sync-1",
      distributor_id: "",
      package_ids: [],
    });
    expect(syncConsignmentSchema.parse({ sync_id: "sync-1", package_ids: ["pkg-a", " pkg-b ", "pkg-a"], distributor_id: "dist-1" })).toMatchObject({
      distributor_id: "dist-1",
      package_ids: ["pkg-a", "pkg-b"],
    });
    expect(() => syncConsignmentSchema.parse({ sync_id: "sync-1", package_ids: ["pkg-a"] })).toThrow();
    expect(() => syncConsignmentSchema.parse({ sync_id: "", package_ids: [] })).toThrow();
  });

  it("validates batch metadata fields", () => {
    expect(batchMetadataSchema.parse({
      batch_number: " batch-1 ",
      sku: " sku-1 ",
      thc_percentage: " 24.5 ",
      cbd_percentage: " 0.12 ",
      coa_url: " https://test-results.invalid/coa.pdf ",
    })).toEqual({
      batch_number: "batch-1",
      sku: "sku-1",
      thc_percentage: "24.5",
      cbd_percentage: "0.12",
      coa_url: "https://test-results.invalid/coa.pdf",
    });
    expect(batchMetadataSchema.parse({ coa_url: "" })).toEqual({
      batch_number: "",
      sku: "",
      thc_percentage: "",
      cbd_percentage: "",
      coa_url: "",
    });
    expect(() => batchMetadataSchema.parse({ thc_percentage: "101" })).toThrow();
    expect(() => batchMetadataSchema.parse({ cbd_percentage: "abc" })).toThrow();
    expect(() => batchMetadataSchema.parse({ coa_url: "https://" })).toThrow();
    expect(() => batchMetadataSchema.parse({ coa_url: "ftp://test-results.invalid/coa.pdf" })).toThrow();
  });

  it("treats zero discounts as no discount", () => {
    expect(discountSchema.parse({ discount_type: "percent", discount_value: "0" })).toEqual({ type: null, value: 0 });
    expect(discountSchema.parse({ discount_type: "amount", discount_value: "0.00" })).toEqual({ type: null, value: 0 });
  });

  it("extracts order package tags and prices from form data", () => {
    const formData = new FormData();
    formData.append("company_id", "company-1");
    formData.append("package_tags", "tag-a");
    formData.append("package_tags", "tag-b");
    formData.append("package_prices[tag-a]", "12.50");
    formData.append("package_prices[tag-b]", "13");

    const parsed = createOrderSchema.parse({
      company_id: String(formData.get("company_id")),
      salesperson_user_id: "user-1",
      delivery_date_status: "tbd",
      delivery_date: "",
      terms: "NET-30",
      terms_notes: "",
      package_tags: packageTagsFromForm(formData),
      package_prices: packagePricesFromForm(formData),
    });

    expect(parsed.package_tags).toEqual(["tag-a", "tag-b"]);
    expect(parsed.package_prices).toEqual({ "tag-a": 1250, "tag-b": 1300 });
  });

  it("parses user section and feature permissions from form fields", () => {
    const parsed = userUpdateSchema.parse({
      display_name: " User ",
      role: "Manager",
      title: " Lead ",
      section_sales_enabled: "on",
      feature_sales_create_orders: "on",
      feature_sales_manage_order_status: "true",
      feature_users_edit_user_profiles: "1",
    });

    expect(parsed).toMatchObject({
      display_name: "User",
      role: "Manager",
      title: "Lead",
      permissions: {
        dashboard: { enabled: true },
        sales: {
          enabled: true,
          features: {
            create_orders: true,
            manage_order_status: true,
            manage_order_packages: false,
          },
        },
        users: {
          enabled: false,
          features: {
            edit_user_profiles: true,
            edit_user_permissions: false,
          },
        },
      },
    });
    expect(APP_SECTIONS.every((section) => SECTION_FEATURES[section].every((feature) => typeof (parsed.permissions[section].features as Record<string, boolean | undefined>)[feature.key] === "boolean"))).toBe(true);
  });
});
