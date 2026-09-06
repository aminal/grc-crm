import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CompanyData, FirestoreRecord } from "@/lib/domain/types";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/firebase/admin", () => ({
  db: {},
}));
vi.mock("./firestore", () => ({
  getDocument: vi.fn(),
  listCollection: vi.fn(),
  millis: vi.fn(),
  now: vi.fn(() => "server-now"),
}));
vi.mock("./profiles", () => ({
  userDirectory: vi.fn(),
}));

import { getDocument, listCollection } from "./firestore";
import { findDistributorCompany, listDistributorCompanies } from "./crm";

function company(id: string, overrides: Partial<CompanyData>): FirestoreRecord<CompanyData> {
  return {
    id,
    data: {
      company_name: "Test Company",
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

describe("company-backed distributor lookup", () => {
  beforeEach(() => {
    vi.mocked(getDocument).mockReset();
    vi.mocked(listCollection).mockReset();
  });

  it("lists only active Distributor companies sorted by company name", async () => {
    vi.mocked(listCollection).mockResolvedValue([
      company("inactive-distributor", { company_name: "Inactive Distributor", status: "Inactive" }),
      company("processor", { company_name: "Active Processor", facility_type: "Processor" }),
      company("z-distributor", { company_name: "Zen Distribution" }),
      company("a-distributor", { company_name: "Alpha Distribution" }),
    ]);

    await expect(listDistributorCompanies()).resolves.toEqual([
      company("a-distributor", { company_name: "Alpha Distribution" }),
      company("z-distributor", { company_name: "Zen Distribution" }),
    ]);
  });

  it("returns an active Distributor company by ID", async () => {
    const distributor = company("distributor", { company_name: "Distributor Company" });
    vi.mocked(getDocument).mockResolvedValue(distributor);

    await expect(findDistributorCompany("distributor")).resolves.toBe(distributor);
    expect(getDocument).toHaveBeenCalledWith("companies/distributor");
  });

  it("returns null for missing companies", async () => {
    vi.mocked(getDocument).mockResolvedValue(null);

    await expect(findDistributorCompany("missing")).resolves.toBeNull();
  });

  it("returns null for companies that are not active Distributors", async () => {
    vi.mocked(getDocument)
      .mockResolvedValueOnce(company("processor", { facility_type: "Processor" }))
      .mockResolvedValueOnce(company("inactive-distributor", { status: "Inactive" }));

    await expect(findDistributorCompany("processor")).resolves.toBeNull();
    await expect(findDistributorCompany("inactive-distributor")).resolves.toBeNull();
  });
});
