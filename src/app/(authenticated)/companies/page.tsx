import { CompanySearch } from "@/components/company/company-search";
import { CompanyTable } from "@/components/company/company-table";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { searchCompanies } from "@/lib/data/crm";
import { NewCompanyDialog } from "./new-company-dialog";

type CompaniesSearchParams = {
  q?: string | string[];
};

export default async function CompaniesPage({ searchParams }: { searchParams: Promise<CompaniesSearchParams> }): Promise<React.ReactElement> {
  const params = await searchParams;
  const query = Array.isArray(params.q) ? (params.q[0] ?? "") : (params.q ?? "");
  const companies = await searchCompanies(query);

  return (
    <div>
      <PageHeader title="Companies" description="Manage licensed B2B accounts, social profiles, contacts, and sales activity." actions={<NewCompanyDialog />} />

      <div className="space-y-8">
        <CompanySearch query={query} />

        {companies.length > 0 ? <CompanyTable companies={companies} /> : <EmptyState title="No companies found" description="Create a company or adjust your search." />}
      </div>
    </div>
  );
}
