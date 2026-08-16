import { Plus } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { StrainDialog } from "@/components/strains/strain-dialog";
import { StrainTable, type StrainTableSortKey, type StrainTableStrain } from "@/components/strains/strain-table";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { paginatedTableItems, TablePagination, tablePageFromSearchParam, tableSortDirectionFromSearchParam, tableSortKeyFromSearchParam, tableSortParams, type TableSortDirection } from "@/components/ui/table";
import { TableSearch } from "@/components/ui/table-search";
import { canManageRestrictedResources, requireNonGuest } from "@/lib/auth/session";
import { findStrain, listStrains } from "@/lib/data/sales-settings";
import type { FirestoreRecord, StrainData } from "@/lib/domain/types";

const strainsHref = "/strains";
const strainSortKeys = ["name", "composition"] as const;

type StrainsSearchParams = {
  q?: string | string[];
  strain?: string | string[];
  page?: string | string[];
  sort?: string | string[];
  dir?: string | string[];
};

type StrainDialogStrain = {
  id: string;
  data: Pick<StrainData, "name" | "breeder" | "genetics" | "sativa_percentage" | "notes">;
};

function serializeStrain(record: FirestoreRecord<StrainData>): StrainDialogStrain {
  return {
    id: record.id,
    data: {
      name: record.data.name,
      breeder: record.data.breeder,
      genetics: record.data.genetics,
      sativa_percentage: record.data.sativa_percentage,
      notes: record.data.notes,
    },
  };
}

function serializeTableStrain(record: FirestoreRecord<StrainData>): StrainTableStrain {
  return {
    id: record.id,
    data: {
      name: record.data.name,
      sativa_percentage: record.data.sativa_percentage,
    },
  };
}

function strainIsArchived(strain: FirestoreRecord<StrainData>): boolean {
  const archived = strain.data.archived_at ?? strain.data.deleted_at;
  return archived !== null && archived !== undefined;
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
  ].join(" ").toLowerCase().includes(normalized)) : strains;
}

export default async function StrainsPage({ searchParams }: { searchParams: Promise<StrainsSearchParams> }): Promise<React.ReactElement> {
  const user = await requireNonGuest();
  const canManage = canManageRestrictedResources(user);

  const params = await searchParams;
  const query = firstSearchParam(params.q).trim();
  const sortKey = tableSortKeyFromSearchParam(params.sort, strainSortKeys);
  const sortDirection = sortKey ? tableSortDirectionFromSearchParam(params.dir) : null;
  const sortParams = tableSortParams(sortKey, sortDirection);
  const strainParam = firstSearchParam(params.strain).trim();
  const showCreateStrainDialog = canManage && strainParam === "new";
  const showEditStrainDialog = canManage && strainParam !== "" && strainParam !== "new";

  let strains: FirestoreRecord<StrainData>[] = [];
  let selectedStrain: FirestoreRecord<StrainData> | null = null;

  if (showEditStrainDialog) {
    [strains, selectedStrain] = await Promise.all([
      listStrains(),
      findStrain(strainParam),
    ]);
  } else {
    strains = await listStrains();
  }

  if (selectedStrain && strainIsArchived(selectedStrain)) {
    selectedStrain = null;
  }

  const filteredStrains = filterStrains(strains, query);
  const sortedStrains = sortStrains(filteredStrains, sortKey, sortDirection);
  const currentPage = tablePageFromSearchParam(params.page, sortedStrains.length);
  const paginatedStrains = paginatedTableItems(sortedStrains, currentPage);
  const paginationHref = hrefWithQuery(strainsHref, query, sortParams);
  const pageParams: Record<string, string> = currentPage > 1 ? { ...sortParams, page: String(currentPage) } : sortParams;
  const filteredHref = hrefWithQuery(strainsHref, query, pageParams);
  const createStrainHref = hrefWithQuery(strainsHref, query, { ...pageParams, strain: "new" });
  const serializedStrains = paginatedStrains.map(serializeTableStrain);
  const serializedStrain = selectedStrain ? serializeStrain(selectedStrain) : null;

  return (
    <div>
      <PageHeader
        title="Strains"
        actions={canManage ? (
          <Button color="purple" href={createStrainHref}>
            <Plus data-slot="icon" aria-hidden="true" />
            Add Strain
          </Button>
        ) : null}
      />
      <div className="space-y-6">
        <TableSearch query={query} placeholder="Filter strains by name, breeder, genetics, or composition" preservedParams={sortParams} />
        {query && filteredStrains.length === 0 ? <EmptyState title="No strains found" /> : (
          <>
            <StrainTable strains={serializedStrains} selectedStrainId={selectedStrain?.id} hrefBase={filteredHref} canManage={canManage} query={query} sortKey={sortKey} sortDirection={sortDirection} />
            <TablePagination baseHref={paginationHref} currentPage={currentPage} totalItems={sortedStrains.length} />
          </>
        )}
      </div>
      {showCreateStrainDialog ? <StrainDialog mode="create" closeHref={filteredHref} /> : null}
      {showEditStrainDialog && serializedStrain ? <StrainDialog mode="edit" strain={serializedStrain} closeHref={filteredHref} /> : null}
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
  }
}

function compareStrings(a: string | null | undefined, b: string | null | undefined): number {
  return (a ?? "").localeCompare(b ?? "", undefined, { numeric: true, sensitivity: "base" });
}
