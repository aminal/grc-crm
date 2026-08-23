import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { isFeatureEnabled, isSectionEnabled } from "@/lib/auth/permissions";
import { requireSectionEnabled } from "@/lib/auth/session";
import { listCompanies } from "@/lib/data/crm";
import { groupInventory, listPackages } from "@/lib/data/inventory";
import { listOrders } from "@/lib/data/orders";
import { companyPath } from "@/lib/domain/company-slug";
import { compactNumber, dateFromFirestore, formatDateTime, formatMoney } from "@/lib/domain/format";

export default async function DashboardPage(): Promise<React.ReactElement> {
  const user = await requireSectionEnabled("dashboard");

  const canViewCompanies = isSectionEnabled(user, "companies");
  const canViewInventory = isSectionEnabled(user, "inventory");
  const canViewSales = isSectionEnabled(user, "sales");
  const canViewBilling = isSectionEnabled(user, "billing");
  const canViewMetrics = isFeatureEnabled(user, "dashboard", "view_metrics");
  const canViewRecentOrders = isFeatureEnabled(user, "dashboard", "view_recent_orders") && canViewSales;
  const canViewRecentCompanies = isFeatureEnabled(user, "dashboard", "view_recent_companies") && canViewCompanies;
  const canViewInventoryGroups = isFeatureEnabled(user, "dashboard", "view_inventory_groups") && canViewInventory;
  const canViewSalesStatus = isFeatureEnabled(user, "dashboard", "view_sales_status") && canViewSales;
  const canCreateOrder = isFeatureEnabled(user, "sales", "create_orders");
  const shouldFetchCompanies = canViewRecentCompanies || (canViewMetrics && canViewCompanies);
  const shouldFetchPackages = canViewInventoryGroups || (canViewMetrics && canViewInventory);
  const shouldFetchOrders = canViewRecentOrders || canViewSalesStatus || (canViewMetrics && canViewBilling);

  const [companies, packages, orders] = await Promise.all([
    shouldFetchCompanies ? listCompanies() : Promise.resolve([]),
    shouldFetchPackages ? listPackages(false) : Promise.resolve([]),
    shouldFetchOrders ? listOrders() : Promise.resolve([]),
  ]);

  const inventoryGroups = canViewInventoryGroups ? groupInventory(packages) : [];
  const openOrders = canViewSalesStatus ? orders.filter((order) => !["paid", "cancelled", "rejected", "delivery_rejected"].includes(order.data.status)) : [];
  const receivablesCents = canViewMetrics && canViewBilling ? orders.reduce((sum, order) => sum + Number(order.data.invoice?.balance_cents ?? 0), 0) : 0;
  const availablePackages = canViewMetrics && canViewInventory ? packages.filter((row) => row.data.package_status === "available") : [];
  const recentCompanies = canViewRecentCompanies
    ? [...companies].sort((a, b) => (dateFromFirestore(b.data.created_at)?.getTime() ?? 0) - (dateFromFirestore(a.data.created_at)?.getTime() ?? 0))
    : [];
  const hasMetric = canViewMetrics && (canViewCompanies || canViewInventory || canViewBilling);
  const hasDashboardContent = hasMetric || canViewRecentOrders || canViewRecentCompanies || canViewInventoryGroups || canViewSalesStatus || canCreateOrder;

  if (!hasDashboardContent) {
    return <div />;
  }

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Operational snapshot for CRM accounts, METRC inventory, active sales orders, and invoice balances."
        actions={canCreateOrder ? <Button color="purple" href="/sales/create">Create Order</Button> : null}
      />

      {hasMetric ? (
        <div className="grid gap-8 sm:grid-cols-2 xl:grid-cols-4">
          {canViewCompanies ? <Metric title="Companies" value={companies.length.toString()} /> : null}
          {canViewInventory ? <Metric title="Active Packages" value={packages.length.toString()} /> : null}
          {canViewInventory ? <Metric title="Available Units" value={compactNumber(availablePackages.reduce((sum, row) => sum + Number(row.data.quantity ?? 0), 0))} /> : null}
          {canViewBilling ? <Metric title="Receivables" value={formatMoney(receivablesCents)} /> : null}
        </div>
      ) : null}

      {canViewRecentOrders ? (
        <section className="mt-14">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-base/7 font-semibold text-zinc-950 sm:text-sm/6 dark:text-white">Recent Orders</h2>
            <Link href="/sales" className="text-sm/6 font-semibold text-zinc-950 hover:text-zinc-700 dark:text-white dark:hover:text-zinc-300">View all</Link>
          </div>
          {orders.length > 0 ? (
            <Table className="mt-4">
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.slice(0, 8).map((order) => (
                  <TableRow key={order.id}>
                    <TableCell>
                      <Link href={`/sales/${order.id}`} className="font-semibold text-zinc-950 hover:text-zinc-700 dark:text-white dark:hover:text-zinc-300">Order #{order.data.order_number}</Link>
                      <p className="text-sm/6 text-zinc-500">{order.data.items.length} packages · {formatDateTime(order.data.created_at)}</p>
                    </TableCell>
                    <TableCell>{order.data.company_name}</TableCell>
                    <TableCell><StatusBadge status={order.data.status} /></TableCell>
                    <TableCell className="text-right font-medium text-zinc-950 dark:text-white">{formatMoney(order.data.total_cents)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="mt-4 border-t border-zinc-950/10 py-8 text-base/6 uppercase font-semibold text-zinc-500 dark:border-white/10 dark:text-zinc-400">No orders yet.</p>
          )}
        </section>
      ) : null}

      {canViewRecentCompanies || canViewInventoryGroups ? (
        <div className="mt-14 grid gap-10 xl:grid-cols-2">
          {canViewRecentCompanies ? (
            <DashboardList title="Recent Companies" href="/companies" actionLabel="View all">
              {recentCompanies.length > 0 ? recentCompanies.slice(0, 8).map((company) => (
                <Link key={company.id} href={companyPath(company)} className="block border-t border-zinc-950/5 py-4 hover:bg-zinc-950/2.5 dark:border-white/5 dark:hover:bg-white/2.5">
                  <p className="font-semibold text-zinc-950 dark:text-white">{company.data.company_name}</p>
                  <p className="text-sm/6 text-zinc-500 dark:text-zinc-400">{company.data.license_number || "No license number"} · {formatDateTime(company.data.created_at)}</p>
                </Link>
              )) : <p className="border-t border-zinc-950/5 py-8 text-base/6 uppercase font-semibold text-zinc-500 dark:border-white/5 dark:text-zinc-400">No companies yet.</p>}
            </DashboardList>
          ) : null}

          {canViewInventoryGroups ? (
            <DashboardList title="Inventory Groups" href="/inventory" actionLabel="Manage">
              {inventoryGroups.length > 0 ? inventoryGroups.slice(0, 8).map((group) => (
                <Link key={group.key} href={`/inventory/${encodeURIComponent(group.key)}`} className="block border-t border-zinc-950/5 py-4 hover:bg-zinc-950/2.5 dark:border-white/5 dark:hover:bg-white/2.5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-zinc-950 dark:text-white">{group.item}</p>
                      <p className="text-sm/6 text-zinc-500 dark:text-zinc-400">{group.package_count} packages · {compactNumber(group.total_quantity)} {group.unit_of_measure}</p>
                    </div>
                    <StatusBadge status={group.status} />
                  </div>
                </Link>
              )) : <p className="border-t border-zinc-950/5 py-8 text-sm/6 text-zinc-500 dark:border-white/5 dark:text-zinc-400">Upload a METRC export to populate inventory.</p>}
            </DashboardList>
          ) : null}
        </div>
      ) : null}

      {canViewSalesStatus ? (
        <div className="mt-14 grid gap-8 sm:grid-cols-2 xl:grid-cols-3">
          <Metric title="Open Orders" value={openOrders.length.toString()} />
          <Metric title="Pending Orders" value={orders.filter((order) => order.data.status === "pending").length.toString()} />
          <Metric title="Delivered Unpaid" value={orders.filter((order) => order.data.status === "delivered").length.toString()} />
        </div>
      ) : null}
    </div>
  );
}

function Metric({ title, value }: { title: string; value: string }): React.ReactElement {
  return (
    <div>
      <div className="border-t border-zinc-950/10 dark:border-white/10" />
      <div className="mt-6 text-lg/6 font-medium text-zinc-950 sm:text-sm/6 dark:text-white">{title}</div>
      <div className="mt-3 text-3xl/8 font-semibold text-zinc-950 sm:text-2xl/8 dark:text-white">{value}</div>
    </div>
  );
}

function DashboardList({ title, href, actionLabel, children }: { title: string; href: string; actionLabel: string; children: React.ReactNode }): React.ReactElement {
  return (
    <section>
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-base/7 font-semibold text-zinc-950 sm:text-sm/6 dark:text-white">{title}</h2>
        <Link href={href} className="text-sm/6 font-semibold text-zinc-950 hover:text-zinc-700 dark:text-white dark:hover:text-zinc-300">{actionLabel}</Link>
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}
