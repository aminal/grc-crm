import { describe, expect, it } from "vitest";
import { isAllowedEmailForDomain } from "./domain";

describe("auth domain checks", () => {
  it("allows verified users in the configured domain", () => {
    expect(isAllowedEmailForDomain("sam@greenroomcannabis.com", true, "greenroomcannabis.com")).toBe(true);
    expect(isAllowedEmailForDomain("SAM@GREENROOMCANNABIS.COM", true, "greenroomcannabis.com")).toBe(true);
  });

  it("rejects non-domain, unverified, and missing users", () => {
    expect(isAllowedEmailForDomain("sam@example.com", true, "greenroomcannabis.com")).toBe(false);
    expect(isAllowedEmailForDomain("sam@greenroomcannabis.com", false, "greenroomcannabis.com")).toBe(false);
    expect(isAllowedEmailForDomain(null, true, "greenroomcannabis.com")).toBe(false);
  });
});
