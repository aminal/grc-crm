import { describe, expect, it } from "vitest";
import { companySlugBase, uniqueCompanySlug } from "./company-slug";

describe("companySlugBase", () => {
  it("combines a normalized company name and city", () => {
    expect(companySlugBase("Green Room & Co.", "North Adams")).toBe("green-room-and-co-north-adams");
  });

  it("falls back to company when the name and city are empty", () => {
    expect(companySlugBase("", "")).toBe("company");
  });
});

describe("uniqueCompanySlug", () => {
  it("returns the base slug when it has not been used", () => {
    expect(uniqueCompanySlug("green-room-boston", ["other-company-boston"])).toBe("green-room-boston");
  });

  it("appends the next available numeric suffix for duplicates", () => {
    expect(uniqueCompanySlug("green-room-boston", ["green-room-boston", "green-room-boston-2"])).toBe("green-room-boston-3");
  });
});
