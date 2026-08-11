import { describe, expect, it } from "vitest";
import { companySchema, createOrderSchema, packagePricesFromForm, packageTagsFromForm, paymentSchema, profileSchema } from "./schemas";

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

  it("normalizes and clears profile phone numbers", () => {
    const parsed = profileSchema.parse({ display_name: "Jane", google_voice_number: "(555) 123-4567" });
    expect(parsed.google_voice_number).toBe("+15551234567");
    expect(profileSchema.parse({ display_name: "Jane", google_voice_number: "" }).google_voice_number).toBe("");
  });

  it("requires check number for check payments", () => {
    expect(() => paymentSchema.parse({ amount: "10.00", method: "check", paid_at: "2026-08-10", check_number: "" })).toThrow();
    expect(paymentSchema.parse({ amount: "10.00", method: "check", paid_at: "2026-08-10", check_number: "123" }).amount).toBe(1000);
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
      package_tags: packageTagsFromForm(formData),
      package_prices: packagePricesFromForm(formData),
    });

    expect(parsed.package_tags).toEqual(["tag-a", "tag-b"]);
    expect(parsed.package_prices).toEqual({ "tag-a": 1250, "tag-b": 1300 });
  });
});
