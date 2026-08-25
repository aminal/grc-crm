import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { StrainDialog } from "@/components/strains/strain-dialog";
import { StrainTable, type StrainTableSortKey, type StrainTableStrain } from "@/components/strains/strain-table";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { paginatedTableItems, TablePagination, tablePageFromSearchParam, tableSortDirectionFromSearchParam, tableSortKeyFromSearchParam, tableSortParams, type TableSortDirection } from "@/components/ui/table";
import { TableSearch } from "@/components/ui/table-search";
import { isFeatureEnabled } from "@/lib/auth/permissions";
import { requireSectionEnabled } from "@/lib/auth/session";
import { listStrains } from "@/lib/data/sales-settings";
import type { FirestoreRecord, StrainData } from "@/lib/domain/types";

const strainsHref = "/strains";
const strainSortKeys = ["name", "composition", "status"] as const;

type StrainsSearchParams = {
  q?: string | string[];
  strain?: string | string[];
  page?: string | string[];
  sort?: string | string[];
  dir?: string | string[];
};

function serializeTableStrain(record: FirestoreRecord<StrainData>): StrainTableStrain {
  return {
    id: record.id,
    data: {
      name: record.data.name,
      sativa_percentage: record.data.sativa_percentage,
      status: record.data.status,
    },
  };
}

function firstSearchParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function hrefWithQuery(baseHref: string, query: string, params: Record<string, string> = {}): string {
  const searchParams = new URLSearchParams();
  if (query) {
    searchParams.set("q", query);
  }

  Object.entries(params).forEach(([key, value]) => {
    if (value) {
      searchParams.set(key, value);
    }
  });

  const search = searchParams.toString();
  return search ? `${baseHref}?${search}` : baseHref;
}

function compositionSearchText(sativaPercentage: number): string {
  return `${100 - sativaPercentage}% Indica / ${sativaPercentage}% Sativa`;
}

function filterStrains(strains: FirestoreRecord<StrainData>[], query: string): FirestoreRecord<StrainData>[] {
  const normalized = query.trim().toLowerCase();
  return normalized ? strains.filter((strain) => [
    strain.data.name,
    strain.data.breeder,
    strain.data.genetics,
    compositionSearchText(strain.data.sativa_percentage),
    strain.data.status,
  ].join(" ").toLowerCase().includes(normalized)) : strains;
}

export default async function StrainsPage({ searchParams }: { searchParams: Promise<StrainsSearchParams> }): Promise<React.ReactElement> {
  const user = await requireSectionEnabled("strains");
  const canCreate = isFeatureEnabled(user, "strains", "create_strains");
  const canViewPrivateStrains = isFeatureEnabled(user, "strains", "view_private_strains");

  const params = await searchParams;
  const query = firstSearchParam(params.q).trim();
  const sortKey = tableSortKeyFromSearchParam(params.sort, strainSortKeys);
  const sortDirection = sortKey ? tableSortDirectionFromSearchParam(params.dir) : null;
  const sortParams = tableSortParams(sortKey, sortDirection);
  const strainParam = firstSearchParam(params.strain).trim();
  const showCreateStrainDialog = canCreate && strainParam === "new";

  if (strainParam && strainParam !== "new") {
    redirect(`/strains/${encodeURIComponent(strainParam)}`);
  }

  const strains = await listStrains();
  const visibleStrains = canViewPrivateStrains ? strains : strains.filter((strain) => strain.data.status !== "Hidden");

  const filteredStrains = filterStrains(visibleStrains, query);
  const sortedStrains = sortStrains(filteredStrains, sortKey, sortDirection);
  const currentPage = tablePageFromSearchParam(params.page, sortedStrains.length);
  const paginatedStrains = paginatedTableItems(sortedStrains, currentPage);
  const paginationHref = hrefWithQuery(strainsHref, query, sortParams);
  const pageParams: Record<string, string> = currentPage > 1 ? { ...sortParams, page: String(currentPage) } : sortParams;
  const filteredHref = hrefWithQuery(strainsHref, query, pageParams);
  const createStrainHref = hrefWithQuery(strainsHref, query, { ...pageParams, strain: "new" });
  const serializedStrains = paginatedStrains.map(serializeTableStrain);

  return (
    <div>
      <PageHeader
        title="Strains"
        actions={canCreate ? (
          <Button color="purple" href={createStrainHref}>
            <Plus data-slot="icon" aria-hidden="true" />
            Add Strain
          </Button>
        ) : null}
      />
      <div className="space-y-6">
        <TableSearch query={query} placeholder="Filter strains by name, breeder, genetics, composition, or status" preservedParams={sortParams} />
        {query && filteredStrains.length === 0 ? <EmptyState title="No strains found" /> : (
          <>
            <StrainTable strains={serializedStrains} query={query} sortKey={sortKey} sortDirection={sortDirection} />
            <TablePagination baseHref={paginationHref} currentPage={currentPage} totalItems={sortedStrains.length} />
          </>
        )}
      </div>
      {showCreateStrainDialog ? <StrainDialog mode="create" closeHref={filteredHref} /> : null}
    </div>
  );
}

function sortStrains(strains: FirestoreRecord<StrainData>[], sortKey: StrainTableSortKey | null, sortDirection: TableSortDirection | null): FirestoreRecord<StrainData>[] {
  if (!sortKey || !sortDirection) {
    return strains;
  }

  const direction = sortDirection === "asc" ? 1 : -1;
  return [...strains].sort((a, b) => compareStrains(a, b, sortKey) * direction);
}

function compareStrains(a: FirestoreRecord<StrainData>, b: FirestoreRecord<StrainData>, sortKey: StrainTableSortKey): number {
  switch (sortKey) {
    case "name":
      return compareStrings(a.data.name, b.data.name);
    case "composition":
      return a.data.sativa_percentage - b.data.sativa_percentage;
    case "status":
      return compareStrings(a.data.status, b.data.status);
  }
}

function compareStrings(a: string | null | undefined, b: string | null | undefined): number {
  return (a ?? "").localeCompare(b ?? "", undefined, { numeric: true, sensitivity: "base" });
}
