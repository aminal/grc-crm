import { Plus } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { StatusBadge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { InventoryControls } from "@/components/inventory/inventory-controls";
import { groupInventory, listPackages } from "@/lib/data/inventory";
import { compactNumber, formatDate } from "@/lib/domain/format";
import { filterInventoryGroups, inventoryCounts, sortInventoryGroups, type InventorySortField } from "@/lib/metrc/inventory-grouping";
import { MetrcUploadDialog } from "./metrc-upload-dialog";

export default async function InventoryPage({ searchParams }: { searchParams: Promise<{ q?: string; show_sold?: string; sort?: string; direction?: string }> }): Promise<React.ReactElement> {
  const params = await searchParams;
  const query = (params.q ?? "").toLowerCase().trim();
  const showSold = params.show_sold === "1";
  const sort = isInventorySortField(params.sort) ? params.sort : "expiration_date";
  const direction = params.direction === "desc" ? "desc" : "asc";
  const packages = await listPackages(false);
  const visiblePackages = showSold ? packages : packages.filter((packageRecord) => packageRecord.data.package_status === "available");
  const groups = sortInventoryGroups(filterInventoryGroups(groupInventory(visiblePackages), query), sort, direction);
  const counts = inventoryCounts(groups);

  return (
    <div>
      <PageHeader
        title="Inventory"
        description="Upload METRC active-package exports, track package status, and drill into product/source groups."
        actions={(
          <>
            <MetrcUploadDialog />
            <Link href="/sales/create" className={buttonClasses()}>
              <Plus data-slot="icon" aria-hidden="true" />
              New Order
            </Link>
          </>
        )}
      />

      <div className="grid gap-10 xl:grid-cols-[0.85fr_1.4fr]">
        <div>
          <h2 className="text-base/7 font-semibold text-zinc-950 sm:text-sm/6 dark:text-white">Filters</h2>
          <hr className="mt-6 w-full border-t border-zinc-950/10 dark:border-white/10" />
          <div className="mt-6">
            <InventoryControls query={query} sort={sort} direction={direction} showSold={showSold} countText={`${counts.products} products · ${counts.packages} active packages`} />
          </div>
        </div>

        <div>
          <ul>
            {groups.map((group, index) => (
              <li key={group.key}>
                <hr className={index === 0 ? "w-full border-t border-zinc-950/10 dark:border-white/10" : "w-full border-t border-zinc-950/5 dark:border-white/5"} />
                <Link href={`/inventory/${encodeURIComponent(group.key)}`} className="flex flex-col gap-4 py-6 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h2 className="text-base/7 font-semibold text-zinc-950 sm:text-sm/6 dark:text-white">{group.item}</h2>
                    <p className="mt-1 text-sm text-zinc-600">{group.source_packages || "No source package"}</p>
                    <p className="mt-2 text-sm text-zinc-500">{group.package_count} packages · {compactNumber(group.total_quantity)} {group.mixed_units ? group.units.join(" / ") : group.unit_of_measure}</p>
                    <p className="mt-1 text-sm text-zinc-500">{[group.category, group.strains.join(" / "), group.lab_statuses.join(" / ")].filter(Boolean).join(" · ") || "No category, strain, or lab status"}</p>
                    <p className="mt-1 text-sm text-zinc-500">Expires {formatDate(group.expiration_date)}</p>
                  </div>
                  <StatusBadge status={group.status} />
                </Link>
              </li>
            ))}
          </ul>
          {groups.length === 0 ? <p className="border-t border-zinc-950/10 py-8 text-sm/6 text-zinc-500 dark:border-white/10 dark:text-zinc-400">No inventory packages matched your filters.</p> : null}
        </div>
      </div>
    </div>
  );
}

function isInventorySortField(value: string | undefined): value is InventorySortField {
  return value === "expiration_date" || value === "item" || value === "package_count" || value === "quantity";
}
