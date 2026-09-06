import Link from "next/link";
import { Badge, type BadgeColor } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { activeTableSortDirection, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, tableSortHref, type TableSortDirection } from "@/components/ui/table";
import type { StrainStatus } from "@/lib/domain/types";

export type StrainTableSortKey = "name" | "composition" | "status";

export type StrainTableStrain = {
  id: string;
  data: {
    name: string;
    sativa_percentage: number;
    status: StrainStatus;
  };
};

function formatComposition(sativaPercentage: number): string {
  return `${100 - sativaPercentage}% Indica / ${sativaPercentage}% Sativa`;
}

export function StrainTable({
  strains,
  query = "",
  sortKey = null,
  sortDirection = null,
  baseHref = "/settings/strains",
  rowParams = {},
}: {
  strains: StrainTableStrain[];
  query?: string;
  sortKey?: StrainTableSortKey | null;
  sortDirection?: TableSortDirection | null;
  baseHref?: string;
  rowParams?: Record<string, string>;
}): React.ReactElement {
  if (strains.length === 0) {
    return <EmptyState title="No strains yet" description="Create a strain before adding products to the sales catalog." />;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead sortHref={strainSortHref(baseHref, "name", query, sortKey, sortDirection)} sortDirection={activeTableSortDirection("name", sortKey, sortDirection)}>Name</TableHead>
          <TableHead sortHref={strainSortHref(baseHref, "composition", query, sortKey, sortDirection)} sortDirection={activeTableSortDirection("composition", sortKey, sortDirection)}>Composition</TableHead>
          <TableHead sortHref={strainSortHref(baseHref, "status", query, sortKey, sortDirection)} sortDirection={activeTableSortDirection("status", sortKey, sortDirection)}>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {strains.map((strain) => {
          const href = strainHref(baseHref, strain.id, query, rowParams);
          const label = `View ${strain.data.name}`;

          return (
            <TableRow key={strain.id} className="group cursor-pointer">
              <TableCell>
                <Link href={href} className="font-semibold text-zinc-950 group-hover:text-zinc-700 dark:text-white dark:group-hover:text-zinc-300">
                  <span className="absolute inset-0" />
                  {strain.data.name}
                </Link>
              </TableCell>
              <TableCell className="max-w-sm truncate">
                <Link href={href} aria-hidden tabIndex={-1} className="absolute inset-0 z-10">
                  <span className="sr-only">{label}</span>
                </Link>
                {formatComposition(strain.data.sativa_percentage)}
              </TableCell>
              <TableCell>
                <Link href={href} aria-hidden tabIndex={-1} className="absolute inset-0 z-10">
                  <span className="sr-only">{label}</span>
                </Link>
                <StrainStatusBadge status={strain.data.status} />
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

function StrainStatusBadge({ status }: { status: StrainStatus }): React.ReactElement {
  const statusColors = {
    Active: "emerald",
    Hidden: "purple",
    "Coming Soon": "sky",
    Sunsetting: "amber",
    Archived: "zinc",
  } satisfies Record<StrainStatus, BadgeColor>;

  return <Badge color={statusColors[status]}>{status}</Badge>;
}

function strainHref(baseHref: string, strainId: string, query: string, params: Record<string, string>): string {
  const searchParams = new URLSearchParams();
  if (query) {
    searchParams.set("q", query);
  }

  Object.entries(params).forEach(([key, value]) => {
    if (value) {
      searchParams.set(key, value);
    }
  });

  searchParams.set("strain", strainId);
  return `${baseHref}?${searchParams.toString()}`;
}

function strainSortHref(baseHref: string, column: StrainTableSortKey, query: string, sortKey: StrainTableSortKey | null, sortDirection: TableSortDirection | null): string {
  return tableSortHref(baseHref, column, { q: query }, sortKey, sortDirection);
}
