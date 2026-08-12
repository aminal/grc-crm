import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { CompanyTabs } from "@/components/company/company-tabs";
import { buttonClasses } from "@/components/ui/button";
import { listOrdersForCompany } from "@/lib/data/orders";
import { formatCompanySubheading, formatDateTime, formatMoney } from "@/lib/domain/format";
import { loadCompanyRoute } from "../company-route";

export default async function CompanyOrdersPage({ params }: { params: Promise<{ companyId: string }> }): Promise<React.ReactElement> {
  const { companyId: routeSegment } = await params;
  const { company, companyId, companySlug } = await loadCompanyRoute(routeSegment, "/orders");
  const orders = await listOrdersForCompany(companyId);

  return (
    <div>
      <PageHeader title={company.data.company_name} description={formatCompanySubheading(company.data)} actions={<Link href={`/sales/create?company_slug=${encodeURIComponent(companySlug)}`} className={buttonClasses()}>Create Order</Link>} />
      <CompanyTabs companySlug={companySlug} active="orders" />

      <div className="space-y-4">
        {orders.map((order) => (
          <Link key={order.id} href={`/sales/${order.id}`} className="group block overflow-hidden rounded-2xl bg-white shadow-xs transition hover:bg-zinc-50 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-500 dark:bg-zinc-950/40 dark:hover:bg-zinc-950/75">
            <div className="p-5 sm:p-6">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-2xl/8 font-semibold tracking-tight text-zinc-950 group-hover:text-purple-700 sm:text-2xl/7 dark:text-white dark:group-hover:text-purple-400 uppercase">Order #{order.data.order_number}</h2>
                    <StatusBadge status={order.data.status} />
                  </div>
                  <div className="mt-4 flex flex-wrap gap-3 text-sm/6 text-zinc-600 dark:text-zinc-400">
                    <span className="inline-flex items-center rounded-full bg-zinc-100 px-3 py-1 font-medium dark:bg-white/5">{order.data.items.length} packages</span>
                    <span className="inline-flex items-center rounded-full bg-zinc-100 px-3 py-1 font-medium dark:bg-white/5">Created {formatDateTime(order.data.created_at)}</span>
                  </div>
                </div>
                <div className="">
                  <p className="text-base/7 text-zinc-950 sm:text-sm/6 font-medium dark:text-zinc-500 uppercase">Total</p>
                  <p className="mt-1 text-2xl/7 font-semibold text-zinc-950 dark:text-white">{formatMoney(order.data.total_cents)}</p>
                </div>
              </div>
            </div>
          </Link>
        ))}
        {orders.length === 0 ? <Card><CardContent><p className="text-base/6 text-zinc-600 uppercase font-semibold text-center py-12">No orders yet</p></CardContent></Card> : null}
      </div>
    </div>
  );
}
