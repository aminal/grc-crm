import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { CompanyTabs } from "@/components/company/company-tabs";
import { buttonClasses } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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

      <div className="mt-4">
        {orders.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Packages</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => {
                const href = `/sales/${order.id}`;
                const label = `View order #${order.data.order_number}`;

                return (
                  <TableRow key={order.id} className="group cursor-pointer">
                    <TableCell>
                      <Link href={href} className="font-semibold uppercase text-zinc-950 group-hover:text-purple-700 dark:text-white dark:group-hover:text-purple-400">
                        <span className="absolute inset-0" />
                        Order #{order.data.order_number}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link href={href} aria-hidden tabIndex={-1} className="absolute inset-0 z-10">
                        <span className="sr-only">{label}</span>
                      </Link>
                      <StatusBadge status={order.data.status} />
                    </TableCell>
                    <TableCell>
                      <Link href={href} aria-hidden tabIndex={-1} className="absolute inset-0 z-10">
                        <span className="sr-only">{label}</span>
                      </Link>
                      {order.data.items.length} packages
                    </TableCell>
                    <TableCell>
                      <Link href={href} aria-hidden tabIndex={-1} className="absolute inset-0 z-10">
                        <span className="sr-only">{label}</span>
                      </Link>
                      {formatDateTime(order.data.created_at)}
                    </TableCell>
                    <TableCell className="text-right font-medium text-zinc-950 dark:text-white">
                      <Link href={href} aria-hidden tabIndex={-1} className="absolute inset-0 z-10">
                        <span className="sr-only">{label}</span>
                      </Link>
                      {formatMoney(order.data.total_cents)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        ) : (
          <Card><CardContent><p className="text-base/6 text-zinc-600 uppercase font-semibold text-center py-12">No orders yet</p></CardContent></Card>
        )}
      </div>
    </div>
  );
}
