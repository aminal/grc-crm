import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { Button, buttonClasses } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, Input, Select } from "@/components/ui/field";
import { PackagePicker } from "@/components/sales/package-picker";
import { DUE_TERMS, PAYMENT_METHODS } from "@/lib/domain/constants";
import { findCompany } from "@/lib/data/crm";
import { listPackages } from "@/lib/data/inventory";
import { availableOrderActions, findOrder, listActivity } from "@/lib/data/orders";
import { companyPath } from "@/lib/domain/company-slug";
import { compactNumber, formatDate, formatDateTime, formatMoney, invoiceStatusLabel } from "@/lib/domain/format";
import {
  addPackagesAction,
  addPaymentAction,
  approveOrderAction,
  cancelOrderAction,
  deletePaymentAction,
  deliverOrderAction,
  deliveryRejectOrderAction,
  payOrderAction,
  rejectOrderAction,
  removePackagesAction,
  undeliverOrderAction,
  unapproveOrderAction,
  updatePaymentAction,
} from "../actions";

export default async function OrderPage({ params }: { params: Promise<{ orderId: string }> }): Promise<React.ReactElement> {
  const { orderId } = await params;
  const [order, activity, packages] = await Promise.all([findOrder(orderId), listActivity(orderId), listPackages(false)]);
  if (!order) {
    notFound();
  }

  const company = await findCompany(order.data.company_id);
  const companyHref = company ? companyPath(company) : `/companies/${order.data.company_id}`;
  const actions = availableOrderActions(order.data.status);
  const invoice = order.data.invoice;
  const availablePackages = packages.filter((packageRecord) => packageRecord.data.package_status === "available");
  const existingSourcePrices = new Map(order.data.items.map((item) => [item.source_package_key, item.price_cents]));
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
    addablePackageRows.flatMap((packageRecord) => {
      const priceCents = existingSourcePrices.get(packageRecord.source_packages);
      return priceCents ? [[packageRecord.package_tag, (priceCents / 100).toFixed(2)]] : [];
    }),
  );
  const editableItems = order.data.status === "pending";

  return (
    <div>
      <PageHeader
        title={`Order #${order.data.order_number}`}
        description={`${order.data.company_name} · ${order.data.items.length} packages · ${formatMoney(order.data.total_cents)}`}
        actions={<Link href="/sales" className={buttonClasses("secondary")}>Back to Sales</Link>}
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
              <h2 className="text-base/7 font-semibold text-zinc-950 sm:text-sm/6 dark:text-white">Packages</h2>
            </CardHeader>
            <CardContent className="space-y-3">
              {order.data.items.map((item) => (
                <div key={item.package_tag} className="rounded-lg border border-zinc-950/10 bg-zinc-50 p-4 dark:bg-zinc-900">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="font-semibold text-zinc-950">{item.item || "Unknown Item"}</p>
                      <p className="font-mono text-xs text-zinc-600">{item.package_tag}</p>
                      <p className="mt-1 text-sm text-zinc-500">{item.strain || "No strain"} · {compactNumber(item.quantity)} {item.unit_of_measure} · Expires {formatDate(item.expiration_date)}</p>
                    </div>
                    <p className="text-lg font-semibold text-zinc-950 dark:text-white">{formatMoney(item.price_cents)}</p>
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

          <Card>
            <CardHeader>
              <h2 className="text-base/7 font-semibold text-zinc-950 sm:text-sm/6 dark:text-white">Invoice & Payments</h2>
            </CardHeader>
            <CardContent>
              {invoice ? (
                <div className="space-y-5">
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <InvoiceStat label="Invoice" value={invoice.invoice_number} />
                    <InvoiceStat label="Status" value={invoiceStatusLabel(invoice.status)} />
                    <InvoiceStat label="Total" value={formatMoney(invoice.total_cents)} />
                    <InvoiceStat label="Balance" value={formatMoney(invoice.balance_cents)} />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <InvoiceStat label="Terms" value={invoice.due_terms_label} />
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
                    <form action={addPaymentAction.bind(null, orderId)} className="grid gap-4 rounded-lg border border-zinc-950/10 bg-zinc-50 p-4 dark:bg-zinc-900 sm:grid-cols-2">
                      <Field label="Amount">
                        <Input name="amount" defaultValue={(invoice.balance_cents / 100).toFixed(2)} required />
                      </Field>
                      <Field label="Payment date">
                        <Input name="paid_at" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required />
                      </Field>
                      <Field label="Method">
                        <Select name="method" defaultValue="ach">
                          {Object.entries(PAYMENT_METHODS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                        </Select>
                      </Field>
                      <Field label="Check number">
                        <Input name="check_number" />
                      </Field>
                      <div className="sm:col-span-2">
                        <Button>Add Payment</Button>
                      </div>
                    </form>
                  ) : null}
                </div>
              ) : (
                <p className="text-sm text-zinc-600">Approve the order to create an invoice.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="text-base/7 font-semibold text-zinc-950 sm:text-sm/6 dark:text-white">Activity</h2>
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
              <h2 className="text-base/7 font-semibold text-zinc-950 sm:text-sm/6 dark:text-white">Order Actions</h2>
            </CardHeader>
            <CardContent className="space-y-3">
              {actions.includes("approve") ? (
                <form action={approveOrderAction.bind(null, orderId)} className="space-y-3 rounded-lg border border-zinc-950/10 bg-zinc-50 p-4 dark:bg-zinc-900">
                  <Field label="Invoice terms">
                    <Select name="due_terms" defaultValue="net_30_after_delivery">
                      {Object.entries(DUE_TERMS).map(([key, value]) => <option key={key} value={key}>{value.label}</option>)}
                    </Select>
                  </Field>
                  <Button>Approve & Invoice</Button>
                </form>
              ) : null}
              {actions.includes("reject") ? <ActionForm action={rejectOrderAction.bind(null, orderId)} label="Reject Order" variant="danger" /> : null}
              {actions.includes("cancel") ? <ActionForm action={cancelOrderAction.bind(null, orderId)} label="Cancel Order" variant="danger" /> : null}
              {actions.includes("unapprove") ? <ActionForm action={unapproveOrderAction.bind(null, orderId)} label="Move Back to Pending" variant="secondary" /> : null}
              {actions.includes("deliver") ? (
                <form action={deliverOrderAction.bind(null, orderId)} className="space-y-3 rounded-lg border border-zinc-950/10 bg-zinc-50 p-4 dark:bg-zinc-900">
                  <Field label="Delivered at">
                    <Input name="delivered_at" type="datetime-local" defaultValue={new Date().toISOString().slice(0, 16)} />
                  </Field>
                  <Button>Mark Delivered</Button>
                </form>
              ) : null}
              {actions.includes("undeliver") ? <ActionForm action={undeliverOrderAction.bind(null, orderId)} label="Move Back to Approved" variant="secondary" /> : null}
              {actions.includes("delivery_reject") ? <ActionForm action={deliveryRejectOrderAction.bind(null, orderId)} label="Delivery Rejected" variant="danger" /> : null}
              {actions.includes("pay") ? <ActionForm action={payOrderAction.bind(null, orderId)} label="Mark Paid" variant="primary" /> : null}
              {actions.length === 0 ? <p className="text-sm text-zinc-600">No actions are available for this status.</p> : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="text-base/7 font-semibold text-zinc-950 sm:text-sm/6 dark:text-white">Company</h2>
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

function InvoiceStat({ label, value }: { label: string; value: string }): React.ReactElement {
  return (
    <div className="rounded-lg border border-zinc-950/10 bg-zinc-50 p-4 dark:bg-zinc-900">
      <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">{label}</p>
      <p className="mt-2 font-semibold text-zinc-950 dark:text-white">{value}</p>
    </div>
  );
}

function ActionForm({ action, label, variant }: { action: () => void | Promise<void>; label: string; variant: "primary" | "secondary" | "danger" }): React.ReactElement {
  return (
    <form action={action}>
      <button className={buttonClasses(variant, "w-full")}>{label}</button>
    </form>
  );
}
