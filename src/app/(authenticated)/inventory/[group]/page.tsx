import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { groupInventory, listPackages } from "@/lib/data/inventory";
import { compactNumber, formatDate, formatInventoryCategory } from "@/lib/domain/format";

export default async function InventoryGroupPage({ params }: { params: Promise<{ group: string }> }): Promise<React.ReactElement> {
  const { group: encodedGroup } = await params;
  const key = decodeURIComponent(encodedGroup);
  const packages = await listPackages(false);
  const group = groupInventory(packages).find((row) => row.key === key);
  if (!group) {
    notFound();
  }

  return (
    <div>
      <PageHeader title={group.item} description={`${group.package_count} packages from ${group.source_packages || "unknown source"}.`} actions={<Link href="/sales/create" className={buttonClasses()}>Create Order</Link>} />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Summary label="Total Quantity" value={`${compactNumber(group.total_quantity)} ${group.mixed_units ? group.units.join(" / ") : group.unit_of_measure}`} />
        <Summary label="Category" value={formatInventoryCategory(group.category) || "—"} />
        <Summary label="Earliest Expiration" value={formatDate(group.expiration_date)} />
        <Summary label="Status" value={group.status} />
      </div>

      <div className="space-y-3">
        {group.packages.map((packageRecord) => (
          <Card key={packageRecord.id}>
            <CardContent>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-mono text-sm font-semibold text-zinc-950 dark:text-white">{packageRecord.data.package_tag}</h2>
                    <StatusBadge status={packageRecord.data.package_status ?? (packageRecord.data.active ? "available" : "inactive")} />
                  </div>
                  <p className="mt-3 text-sm text-zinc-700">{packageRecord.data.item || "Unknown item"} · {packageRecord.data.strain || "No strain"}</p>
                  <p className="text-sm text-zinc-600">{compactNumber(packageRecord.data.quantity)} {packageRecord.data.unit_of_measure} · {formatInventoryCategory(packageRecord.data.category) || "No category"}</p>
                  <p className="text-sm text-zinc-500">Source: {packageRecord.data.source_packages || "—"}</p>
                  <p className="text-sm text-zinc-500">Location: {[packageRecord.data.location, packageRecord.data.sublocation].filter(Boolean).join(" / ") || "—"}</p>
                  <p className="text-sm text-zinc-500">Lab: {packageRecord.data.lab_testing_status || "—"}</p>
                </div>
                <div className="grid gap-2 text-sm text-zinc-600 sm:grid-cols-2 lg:text-right">
                  <p>Packaged {formatDate(packageRecord.data.packaged_date)}</p>
                  <p>Received {formatDate(packageRecord.data.received)}</p>
                  <p>Sell by {formatDate(packageRecord.data.sell_by_date)}</p>
                  <p>Expires {formatDate(packageRecord.data.expiration_date)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }): React.ReactElement {
  return (
    <Card>
      <CardContent>
        <p className="text-sm text-zinc-600">{label}</p>
        <p className="mt-2 text-xl font-semibold capitalize text-zinc-950 dark:text-white">{value}</p>
      </CardContent>
    </Card>
  );
}
