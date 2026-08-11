import { notFound, redirect } from "next/navigation";
import { findCompanyBySlug } from "@/lib/data/crm";
import { companyUrlSegment } from "@/lib/domain/company-slug";
import type { CompanyData, FirestoreRecord } from "@/lib/domain/types";

type CompanyRoute = {
  company: FirestoreRecord<CompanyData>;
  companyId: string;
  companySlug: string;
};

export async function loadCompanyRoute(routeSlug: string, suffix = ""): Promise<CompanyRoute> {
  const company = await findCompanyBySlug(routeSlug);
  if (!company) {
    notFound();
  }

  const companySlug = companyUrlSegment(company);
  if (routeSlug !== companySlug) {
    redirect(`/companies/${companySlug}${suffix}`);
  }

  return { company, companyId: company.id, companySlug };
}
