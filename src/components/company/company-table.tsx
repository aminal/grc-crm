import Link from "next/link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FacilityBadge } from "@/components/company/facility-badge";
import { companyPath } from "@/lib/domain/company-slug";
import type { CompanyData, FirestoreRecord } from "@/lib/domain/types";

export function CompanyTable({ companies }: { companies: FirestoreRecord<CompanyData>[] }): React.ReactElement {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Company</TableHead>
          <TableHead>License</TableHead>
          <TableHead>Location</TableHead>
          <TableHead>Facility</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {companies.map((company) => {
          const href = companyPath(company);
          const label = `View ${company.data.company_name}`;

          return (
            <TableRow key={company.id} className="group cursor-pointer">
              <TableCell>
                <Link href={href} className="font-semibold text-zinc-950 group-hover:text-zinc-700 dark:text-white dark:group-hover:text-zinc-300">
                  <span className="absolute inset-0" />
                  {company.data.company_name}
                </Link>
              </TableCell>
              <TableCell>
                <Link href={href} aria-hidden tabIndex={-1} className="absolute inset-0 z-10">
                  <span className="sr-only">{label}</span>
                </Link>
                {company.data.license_number || "—"}
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
