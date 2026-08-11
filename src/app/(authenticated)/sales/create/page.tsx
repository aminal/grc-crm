import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Select } from "@/components/ui/field";
import { PackagePicker } from "@/components/sales/package-picker";
import { listCompanies } from "@/lib/data/crm";
import { listPackages } from "@/lib/data/inventory";
import { companyUrlSegment } from "@/lib/domain/company-slug";
import { createOrderAction } from "../actions";

type CreateOrderSearchParams = {
  company_id?: string | string[];
  company_slug?: string | string[];
};

export default async function CreateOrderPage({ searchParams }: { searchParams: Promise<CreateOrderSearchParams> }): Promise<React.ReactElement> {
  const params = await searchParams;
  const [companies, packages] = await Promise.all([listCompanies(), listPackages(false)]);
  const companyId = firstSearchParam(params.company_id);
  const companySlug = firstSearchParam(params.company_slug);
  const selectedCompanyId = companyId || companies.find((company) => companyUrlSegment(company) === companySlug)?.id || "";
  const availablePackages = packages.filter((packageRecord) => packageRecord.data.package_status === "available");
  const packageRows = availablePackages.map((packageRecord) => ({
    package_tag: packageRecord.data.package_tag,
    item: packageRecord.data.item,
    strain: packageRecord.data.strain,
    category: packageRecord.data.category,
    source_packages: packageRecord.data.source_packages || packageRecord.data.original_source_package_label,
    quantity: Number(packageRecord.data.quantity ?? 0),
    unit_of_measure: packageRecord.data.unit_of_measure,
    expiration_date: packageRecord.data.expiration_date || null,
  }));

  return (
    <div>
      <PageHeader title="Create Order" description="Reserve active METRC packages for a company and freeze their snapshots onto a pending order." />

      <form action={createOrderAction} className="grid gap-6 xl:grid-cols-[0.75fr_1.4fr]">
        <Card>
          <CardHeader>
            <h2 className="text-base/7 font-semibold text-zinc-950 sm:text-sm/6 dark:text-white">Customer</h2>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field label="Company">
              <Select name="company_id" defaultValue={selectedCompanyId} required>
                <option value="" disabled>Choose a company</option>
                {companies.map((company) => <option key={company.id} value={company.id}>{company.data.company_name}</option>)}
              </Select>
            </Field>
            <Button>Create Pending Order</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-base/7 font-semibold text-zinc-950 sm:text-sm/6 dark:text-white">Available Packages</h2>
          </CardHeader>
          <CardContent>
            {packageRows.length > 0 ? <PackagePicker packages={packageRows} /> : <p className="rounded-lg border border-dashed border-zinc-950/10 p-8 text-center text-sm text-zinc-600">No available packages. Upload METRC inventory or release reserved packages.</p>}
          </CardContent>
        </Card>
      </form>
    </div>
  );
}

function firstSearchParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}
