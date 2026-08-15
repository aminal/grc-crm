import { describe, expect, it } from "vitest";
import { companySchema, createOrderSchema, discountSchema, packagePricesFromForm, packageTagsFromForm, paymentSchema, productCreateSchema } from "./schemas";

describe("domain schemas", () => {
  it("stores company social profiles as handles", () => {
    const parsed = companySchema.parse({
      company_name: "Jane's Shop",
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
    expect(companySchema.parse({ company_name: "Jane's Shop", facility_type: "Dispensary", address_city: "Albany", address_state: "ny", social_instagram: "@janes_shop", social_x: "@janes_x", social_threads: "@janes_threads" })).toMatchObject({
      address_state: "NY",
      social_instagram: "janes_shop",
      social_x: "janes_x",
      social_threads: "janes_threads",
    });
  });

  it("requires check number for check payments", () => {
    expect(() => paymentSchema.parse({ amount: "10.00", method: "check", paid_at: "2026-08-10", check_number: "" })).toThrow();
    expect(paymentSchema.parse({ amount: "10.00", method: "check", paid_at: "2026-08-10", check_number: "123" }).amount).toBe(1000);
  });

  it("parses product pricing and case quantity", () => {
    const parsed = productCreateSchema.parse({
      name: "Product",
      brand_id: "brand-1",
      strain_ids: ["strain-1"],
      unit_base_price_cents: "12.34",
      case_quantity: "24",
    });

    expect(parsed.unit_base_price_cents).toBe(1234);
    expect(parsed.case_quantity).toBe(24);
    expect(productCreateSchema.parse({ name: "Product", brand_id: "brand-1", strain_ids: ["strain-1"] })).toMatchObject({
      unit_base_price_cents: 0,
      case_quantity: 0,
    });
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
});
