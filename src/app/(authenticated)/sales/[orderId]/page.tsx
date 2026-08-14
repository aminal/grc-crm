import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from "@/components/ui/badge";
import { Button, buttonClasses } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, Input, Select } from "@/components/ui/field";
import { PackagePicker } from "@/components/sales/package-picker";
import { PAYMENT_METHODS } from "@/lib/domain/constants";
import { findCompany } from "@/lib/data/crm";
import { listPackages } from "@/lib/data/inventory";
import { availableOrderActions, findOrder, listActivity } from "@/lib/data/orders";
import { listProducts } from "@/lib/data/sales-settings";
import { companyPath } from "@/lib/domain/company-slug";
import { compactNumber, formatDate, formatDateTime, formatMoney, invoiceStatusLabel } from "@/lib/domain/format";
import type { OrderItem, OrderTerms } from "@/lib/domain/types";
import { MetrcPackageIdsDialog } from "./metrc-package-ids-dialog";
import { OrderActionsMenu } from "./order-actions-menu";
import { RecordPaymentDialog } from "./record-payment-dialog";
import { addPackagesAction, deletePaymentAction, removePackagesAction, updatePaymentAction } from "../actions";

export default async function OrderPage({ params }: { params: Promise<{ orderId: string }> }): Promise<React.ReactElement> {
  const { orderId } = await params;
  const [order, activity, packages, products] = await Promise.all([findOrder(orderId), listActivity(orderId), listPackages(false), listProducts()]);
  if (!order) {
    notFound();
  }

  const company = await findCompany(order.data.company_id);
  const companyHref = company ? companyPath(company) : `/companies/${order.data.company_id}`;
  const actions = availableOrderActions(order.data.status);
  const invoice = order.data.invoice?.status === "void" ? null : order.data.invoice;
  const availablePackages = packages.filter((packageRecord) => packageRecord.data.package_status === "available");
  const existingSourcePrices = new Map(order.data.items.map((item) => [item.source_package_key, item.price_cents]));
  const productPrices = new Map(products.map((product) => [product.id, product.data.unit_base_price_cents]));
  const productNames = new Map(products.map((product) => [product.id, product.data.name]));
  const packageGroups = groupOrderItemsByProduct(order.data.items, productNames);
  const addablePackageRows = availablePackages.map((packageRecord) => ({
    package_tag: packageRecord.data.package_tag,
    item: packageRecord.data.item,
    strain: packageRecord.data.strain,
    category: packageRecord.data.category,
    source_packages: packageRecord.data.source_packages || packageRecord.data.original_source_package_label,
    quantity: Number(packageRecord.data.quantity ?? 0),
    unit_of_measure: packageRecord.data.unit_of_measure,
    expiration_date: packageRecord.data.expiration_date || null,
  }));
  const initialPackagePrices = Object.fromEntries(
    availablePackages.flatMap((packageRecord) => {
      const sourcePackage = packageRecord.data.source_packages || packageRecord.data.original_source_package_label;
      const sourcePriceCents = existingSourcePrices.get(sourcePackage);
      const productPriceCents = packageRecord.data.product_id ? productPrices.get(packageRecord.data.product_id) : undefined;
      const packagePriceCents = productPriceCents ? Math.round(productPriceCents * Number(packageRecord.data.quantity ?? 0)) : 0;
      const priceCents = sourcePriceCents || packagePriceCents;
      return priceCents ? [[packageRecord.data.package_tag, (priceCents / 100).toFixed(2)]] : [];
    }),
  );
  const editableItems = order.data.status === "pending";
  const orderTermsLabel = order.data.terms === "Other" && order.data.terms_notes ? order.data.terms_notes : order.data.terms;
  const approvalInvoice = {
    invoiceNumber: `INV-${order.data.order_number}`,
    dueDate: invoiceDueDateForApproval(order.data.terms),
    termsLabel: orderTermsLabel,
    totalLabel: formatMoney(order.data.total_cents),
  };

  return (
    <div>
      <PageHeader
        title={`Order #${order.data.order_number}`}
        description={`${order.data.company_name} · ${order.data.items.length} packages · ${formatMoney(order.data.total_cents)}`}
        actions={<OrderActionsMenu orderId={orderId} actions={actions} approvalInvoice={approvalInvoice} />}
      />

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <StatusBadge status={order.data.status} />
        <span className="text-sm text-zinc-600">Created {formatDateTime(order.data.created_at)}</span>
        <span className="text-sm text-zinc-600">Status changed {formatDateTime(order.data.status_changed_at)}</span>
        {order.data.delivered_at ? <span className="text-sm text-zinc-600">Delivered {formatDateTime(order.data.delivered_at)}</span> : null}
        <span className="text-sm text-zinc-600">Created by {order.data.created_by.name}</span>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.35fr_0.85fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Packages</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {packageGroups.map((group) => (
                <div key={group.key} className="rounded-lg border border-zinc-950/10 bg-zinc-50 p-4 dark:bg-zinc-900">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="font-semibold text-zinc-950 dark:text-white">{group.productName}</p>
                      <p className="mt-1 text-sm text-zinc-500">
                        {group.caseCount} {group.caseCount === 1 ? "case" : "cases"} · {compactNumber(group.quantity)}{group.unitOfMeasure ? ` ${group.unitOfMeasure}` : ""}
                      </p>
                      <p className="mt-1 text-sm text-zinc-500">{group.strains.length > 0 ? group.strains.join(", ") : "No strain"}</p>
                    </div>
                    <div className="sm:text-right">
                      <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Subtotal</p>
                      <p className="mt-1 text-lg font-semibold text-zinc-950 dark:text-white">{formatMoney(group.subtotalCents)}</p>
                      <div className="mt-3 flex sm:justify-end">
                        <MetrcPackageIdsDialog productName={group.productName} packageTags={group.packageTags} />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {editableItems ? (
                <details className="rounded-lg border border-zinc-950/10 bg-zinc-50 p-4 dark:bg-zinc-900">
                  <summary className="cursor-pointer text-sm font-semibold text-zinc-700">Edit packages</summary>
                  <div className="mt-4 grid gap-4 lg:grid-cols-2">
                    <form action={removePackagesAction.bind(null, orderId)} className="space-y-3">
                      <h3 className="font-semibold text-zinc-950">Remove packages</h3>
                      {order.data.items.map((item) => (
                        <label key={item.package_tag} className="flex gap-3 text-sm/6 text-zinc-700 dark:text-zinc-300">
                          <Checkbox name="package_tags" value={item.package_tag} className="mt-0.5" />
                          {item.package_tag}
                        </label>
                      ))}
                      <Button variant="danger">Remove Selected</Button>
                    </form>
                    <form action={addPackagesAction.bind(null, orderId)} className="space-y-3">
                      <h3 className="font-semibold text-zinc-950">Add available packages</h3>
                      {addablePackageRows.length > 0 ? <PackagePicker packages={addablePackageRows} initialPrices={initialPackagePrices} /> : <p className="rounded-lg border border-dashed border-zinc-950/10 p-6 text-sm text-zinc-600">No available packages can be added.</p>}
                      <Button variant="secondary">Add Selected</Button>
                    </form>
                  </div>
                </details>
              ) : null}
            </CardContent>
          </Card>

          {invoice ? (
            <Card>
              <CardHeader>
                <CardTitle>Invoice & Payments</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-5">
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <InvoiceStat label="Invoice" value={invoice.invoice_number} />
                    <InvoiceStat label="Status" value={invoiceStatusLabel(invoice.status)} />
                    <InvoiceStat label="Total" value={formatMoney(invoice.total_cents)} />
                    <InvoiceStat label="Balance" value={formatMoney(invoice.balance_cents)} />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <InvoiceStat label="Terms" value={orderTermsLabel} />
                    <InvoiceStat label="Due Date" value={invoice.due_date ? formatDate(invoice.due_date) : "Set after delivery"} />
                  </div>

                  <div className="space-y-3">
                    {invoice.payments.map((payment) => (
                      <details key={payment.id} className="rounded-lg border border-zinc-950/10 bg-zinc-50 p-4 dark:bg-zinc-900">
                        <summary className="cursor-pointer">
                          <span className="font-semibold text-zinc-950">{formatMoney(payment.amount_cents)}</span>
                          <span className="ml-2 text-sm text-zinc-600">{payment.method_label} · {formatDate(payment.paid_at)}</span>
                        </summary>
                        <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_auto]">
                          <form action={updatePaymentAction.bind(null, orderId, payment.id)} className="grid gap-3 sm:grid-cols-2">
                            <Field label="Amount">
                              <Input name="amount" defaultValue={(payment.amount_cents / 100).toFixed(2)} required />
                            </Field>
                            <Field label="Payment date">
                              <Input name="paid_at" type="date" defaultValue={payment.paid_at} required />
                            </Field>
                            <Field label="Method">
                              <Select name="method" defaultValue={payment.method}>
                                {Object.entries(PAYMENT_METHODS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                              </Select>
                            </Field>
                            <Field label="Check number">
                              <Input name="check_number" defaultValue={payment.check_number} />
                            </Field>
                            <Button variant="secondary">Save Payment</Button>
                          </form>
                          <form action={deletePaymentAction.bind(null, orderId, payment.id)}>
                            <button className={buttonClasses("danger")}>Delete Payment</button>
                          </form>
                        </div>
                      </details>
                    ))}
                  </div>

                  {invoice.status !== "void" && invoice.balance_cents > 0 ? (
                    <div className="flex justify-end">
                      <RecordPaymentDialog orderId={orderId} balanceCents={invoice.balance_cents} defaultPaidAt={new Date().toISOString().slice(0, 10)} />
                    </div>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>Activity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {activity.map((entry) => (
                <div key={entry.id} className="rounded-lg border border-zinc-950/10 bg-zinc-50 p-4 dark:bg-zinc-900">
                  <p className="font-semibold text-zinc-950">{entry.data.action.replaceAll("_", " ")}</p>
                  <p className="mt-1 text-sm text-zinc-600">{formatDateTime(entry.data.created_at)} · {entry.data.actor_name}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Company</CardTitle>
            </CardHeader>
            <CardContent>
              <Link href={companyHref} className="text-base/7 font-semibold text-zinc-950 hover:text-zinc-700 sm:text-sm/6 dark:text-white dark:hover:text-zinc-300">{order.data.company_name}</Link>
              <p className="mt-2 text-sm text-zinc-600">{order.data.company_license_number || "No license number"}</p>
              <p className="text-sm text-zinc-500">{order.data.facility_type}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function invoiceDueDateForApproval(terms: OrderTerms): string {
  return terms === "NET-30" || terms === "NET-60" ? "" : new Date().toISOString().slice(0, 10);
}

function InvoiceStat({ label, value }: { label: string; value: string }): React.ReactElement {
  return (
    <div className="rounded-lg border border-zinc-950/10 bg-zinc-50 p-4 dark:bg-zinc-900">
      <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">{label}</p>
      <p className="mt-2 font-semibold text-zinc-950 dark:text-white">{value}</p>
    </div>
  );
}

type PackageGroup = {
  key: string;
  productName: string;
  caseCount: number;
  quantity: number;
  unitOfMeasure: string;
  subtotalCents: number;
  packageTags: string[];
  strains: string[];
};

type MutablePackageGroup = Omit<PackageGroup, "strains"> & {
  strainSet: Set<string>;
  unitSet: Set<string>;
};

function groupOrderItemsByProduct(items: OrderItem[], productNames: Map<string, string>): PackageGroup[] {
  const groups = new Map<string, MutablePackageGroup>();

  for (const item of items) {
    const productName = (item.product_id ? productNames.get(item.product_id) : "") || item.item || "Unknown Product";
    const key = item.product_id ? `product:${item.product_id}` : `item:${productName.trim().toLowerCase()}`;
    let group = groups.get(key);

    if (!group) {
      group = {
        key,
        productName,
        caseCount: 0,
        quantity: 0,
        unitOfMeasure: "",
        subtotalCents: 0,
        packageTags: [],
        strainSet: new Set<string>(),
        unitSet: new Set<string>(),
      };
      groups.set(key, group);
    }

    const unitOfMeasure = item.unit_of_measure || "";
    group.caseCount += 1;
    group.quantity += Number(item.quantity ?? 0);
    group.subtotalCents += Number(item.price_cents ?? 0);
    group.packageTags.push(item.package_tag);

    if (item.strain) {
      group.strainSet.add(item.strain);
    }

    if (unitOfMeasure) {
      group.unitSet.add(unitOfMeasure);
    }
  }

  return Array.from(groups.values()).map((group) => {
    const units = Array.from(group.unitSet);
    return {
      key: group.key,
      productName: group.productName,
      caseCount: group.caseCount,
      quantity: group.quantity,
      unitOfMeasure: units.length > 1 ? "mixed units" : units[0] ?? "",
      subtotalCents: group.subtotalCents,
      packageTags: group.packageTags,
      strains: Array.from(group.strainSet).sort((a, b) => a.localeCompare(b)),
    };
  });
}

