import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronRight, Plus } from "lucide-react";
import { StrainDialog } from "@/components/strains/strain-dialog";
import { StrainDetailsCard, StrainHeaderCard } from "@/components/strains/strain-header-card";
import { StrainTable, type StrainTableSortKey, type StrainTableStrain } from "@/components/strains/strain-table";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { paginatedTableItems, TablePagination, tablePageFromSearchParam, tableSortDirectionFromSearchParam, tableSortKeyFromSearchParam, tableSortParams, type TableSortDirection } from "@/components/ui/table";
import { TableSearch } from "@/components/ui/table-search";
import { isFeatureEnabled } from "@/lib/auth/permissions";
import { requireSectionEnabled } from "@/lib/auth/session";
import { listStrains } from "@/lib/data/sales-settings";
import type { FirestoreRecord, StrainData } from "@/lib/domain/types";
import { SettingsShell } from "../settings-shell";

const strainsHref = "/settings/strains";
const strainSortKeys = ["name", "composition", "status"] as const;

type StrainsSearchParams = {
  q?: string | string[];
  strain?: string | string[];
  edit?: string | string[];
  page?: string | string[];
  sort?: string | string[];
  dir?: string | string[];
};

type StrainDialogStrain = {
  id: string;
  data: Pick<StrainData, "name" | "breeder" | "genetics" | "sativa_percentage" | "status" | "notes">;
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

function serializeDialogStrain(record: FirestoreRecord<StrainData>): StrainDialogStrain {
  return {
    id: record.id,
    data: {
      name: record.data.name,
      breeder: record.data.breeder,
      genetics: record.data.genetics,
      sativa_percentage: record.data.sativa_percentage,
      status: record.data.status,
      notes: record.data.notes,
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

export default async function SettingsStrainsPage({ searchParams }: { searchParams: Promise<StrainsSearchParams> }): Promise<React.ReactElement> {
  const user = await requireSectionEnabled("strains");
  const canCreate = isFeatureEnabled(user, "strains", "create_strains");
  const canEdit = isFeatureEnabled(user, "strains", "update_strains");
  const canViewPrivateStrains = isFeatureEnabled(user, "strains", "view_private_strains");

  const params = await searchParams;
  const query = firstSearchParam(params.q).trim();
  const sortKey = tableSortKeyFromSearchParam(params.sort, strainSortKeys);
  const sortDirection = sortKey ? tableSortDirectionFromSearchParam(params.dir) : null;
  const sortParams = tableSortParams(sortKey, sortDirection);
  const strainParam = firstSearchParam(params.strain).trim();
  const selectedStrainId = strainParam && strainParam !== "new" ? strainParam : "";
  const showCreateStrainDialog = canCreate && strainParam === "new";

  const strains = await listStrains();
  const visibleStrains = canViewPrivateStrains ? strains : strains.filter((strain) => strain.data.status !== "Hidden");
  const selectedStrain = selectedStrainId ? visibleStrains.find((strain) => strain.id === selectedStrainId) ?? null : null;

  if (selectedStrainId && !selectedStrain) {
    notFound();
  }

  const filteredStrains = filterStrains(visibleStrains, query);
  const sortedStrains = sortStrains(filteredStrains, sortKey, sortDirection);
  const currentPage = tablePageFromSearchParam(params.page, sortedStrains.length);
  const paginatedStrains = paginatedTableItems(sortedStrains, currentPage);
  const paginationHref = hrefWithQuery(strainsHref, query, sortParams);
  const pageParams: Record<string, string> = currentPage > 1 ? { ...sortParams, page: String(currentPage) } : sortParams;
  const filteredHref = hrefWithQuery(strainsHref, query, pageParams);
  const createStrainHref = hrefWithQuery(strainsHref, query, { ...pageParams, strain: "new" });
  const selectedStrainHref = selectedStrain ? hrefWithQuery(strainsHref, query, { ...pageParams, strain: selectedStrain.id }) : filteredHref;
  const editStrainHref = selectedStrain && canEdit ? hrefWithQuery(strainsHref, query, { ...pageParams, strain: selectedStrain.id, edit: "1" }) : null;
  const showEditStrainDialog = selectedStrain !== null && firstSearchParam(params.edit) !== "";
  const serializedStrains = paginatedStrains.map(serializeTableStrain);

  if (showEditStrainDialog && !canEdit) {
    redirect(selectedStrainHref);
  }

  return (
    <SettingsShell current="strains">
      <div className="space-y-8">
        {selectedStrain ? (
          <section className="space-y-6" aria-labelledby="selected-strain-heading">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-2xl/7 font-medium text-zinc-700 uppercase dark:text-white">
                <Link href={filteredHref}>Strains</Link>
              </h2>
              <ChevronRight data-slot="icon" aria-hidden="true" className="size-8" />
              <h2 id="selected-strain-heading" className="text-2xl/7 font-medium text-zinc-700 uppercase dark:text-white">
                View Strain
              </h2>
              <div className="flex flex-1 items-center justify-end">
                <Button href={editStrainHref || undefined} color="purple" className="uppercase text-md!">Edit Strain</Button>
              </div>
            </div>
            <StrainHeaderCard strain={selectedStrain} />
            <StrainDetailsCard strain={selectedStrain} />
          </section>
        ) : (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <h2 className="text-2xl/7 -mt-0.5 font-medium text-zinc-700 uppercase dark:text-white">
                Strains
              </h2>
              {canCreate ? (
                <Button color="purple" href={createStrainHref}>
                  <Plus data-slot="icon" aria-hidden="true" />
                  Add Strain
                </Button>
              ) : null}
            </div>
            <TableSearch query={query} placeholder="Filter strains by name, breeder, genetics, composition, or status" preservedParams={sortParams} />
            {query && filteredStrains.length === 0 ? <EmptyState title="No strains found" /> : (
              <>
                <StrainTable strains={serializedStrains} query={query} sortKey={sortKey} sortDirection={sortDirection} baseHref={strainsHref} rowParams={pageParams} />
                <TablePagination baseHref={paginationHref} currentPage={currentPage} totalItems={sortedStrains.length} />
              </>
            )}
          </div>
        )}
      </div>
      {showCreateStrainDialog ? <StrainDialog mode="create" closeHref={filteredHref} /> : null}
      {selectedStrain && showEditStrainDialog ? <StrainDialog mode="edit" strain={serializeDialogStrain(selectedStrain)} closeHref={selectedStrainHref} /> : null}
    </SettingsShell>
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
