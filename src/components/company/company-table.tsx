import Link from "next/link";
import { activeTableSortDirection, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, tableSortHref, type TableSortDirection } from "@/components/ui/table";
import { CompanyStatusBadge, FacilityBadge } from "@/components/company/facility-badge";
import { companyPath } from "@/lib/domain/company-slug";
import type { CompanyData, FirestoreRecord } from "@/lib/domain/types";

export type CompanyTableSortKey = "company" | "status" | "location" | "facility";

type CompanyTableProps = {
  companies: FirestoreRecord<CompanyData>[];
  query: string;
  sortKey: CompanyTableSortKey | null;
  sortDirection: TableSortDirection | null;
};

export function CompanyTable({ companies, query, sortKey, sortDirection }: CompanyTableProps): React.ReactElement {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead sortHref={companySortHref("company", query, sortKey, sortDirection)} sortDirection={activeTableSortDirection("company", sortKey, sortDirection)}>Company</TableHead>
          <TableHead sortHref={companySortHref("status", query, sortKey, sortDirection)} sortDirection={activeTableSortDirection("status", sortKey, sortDirection)}>Status</TableHead>
          <TableHead sortHref={companySortHref("location", query, sortKey, sortDirection)} sortDirection={activeTableSortDirection("location", sortKey, sortDirection)}>Location</TableHead>
          <TableHead sortHref={companySortHref("facility", query, sortKey, sortDirection)} sortDirection={activeTableSortDirection("facility", sortKey, sortDirection)}>Facility</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {companies.map((company) => {
          const href = companyPath(company);
          const label = `View ${company.data.company_name}`;

          return (
            <TableRow key={company.id} className="group cursor-pointer">
              <TableCell>
                <Link href={href} className="flex flex-col items-start gap-1">
                  <span className="absolute inset-0" />
                  <span className="text-base/5 font-semibold text-zinc-950 group-hover:text-zinc-700 dark:text-white dark:group-hover:text-zinc-300">{company.data.company_name}</span>
                  <span className="text-xs/5 font-medium text-zinc-500 dark:text-zinc-400">{company.data.license_number || "—"}</span>
                </Link>
              </TableCell>
              <TableCell>
                <Link href={href} aria-hidden tabIndex={-1} className="absolute inset-0 z-10">
                  <span className="sr-only">{label}</span>
                </Link>
                <CompanyStatusBadge status={company.data.status} />
              </TableCell>
              <TableCell>
                <Link href={href} aria-hidden tabIndex={-1} className="absolute inset-0 z-10">
                  <span className="sr-only">{label}</span>
                </Link>
                {[company.data.address.city, company.data.address.state].filter(Boolean).join(", ") || "—"}
              </TableCell>
              <TableCell>
                <Link href={href} aria-hidden tabIndex={-1} className="absolute inset-0 z-10">
                  <span className="sr-only">{label}</span>
                </Link>
                <FacilityBadge facilityType={company.data.facility_type} />
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

function companySortHref(column: CompanyTableSortKey, query: string, sortKey: CompanyTableSortKey | null, sortDirection: TableSortDirection | null): string {
  return tableSortHref("/companies", column, { q: query }, sortKey, sortDirection);
}
