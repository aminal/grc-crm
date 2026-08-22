import { CheckIcon, ClockIcon, MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/20/solid';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PageHeader } from '@/components/layout/page-header';
import { FacilityBadge } from '@/components/company/facility-badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge, StatusBadge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { canManageRestrictedResources, requireNonGuest } from '@/lib/auth/session';
import { findCompany } from '@/lib/data/crm';
import { listPackages } from '@/lib/data/inventory';
import { availableOrderActions, findOrder, listActivity } from '@/lib/data/orders';
import { listProducts } from '@/lib/data/sales-settings';
import { companyPath } from '@/lib/domain/company-slug';
import { compactNumber, formatDate, formatDateTime, formatMoney, invoiceStatusLabel } from '@/lib/domain/format';
import type { OrderItem, OrderStatus } from '@/lib/domain/types';
import { hasInvoicePayments } from '@/lib/sales/invoice';
import { DiscountDialog } from './discount-dialog';
import { EditPackagesDialog } from './edit-packages-dialog';
import { MetrcPackageIdsDialog } from './metrc-package-ids-dialog';
import { OrderActionsMenu } from './order-actions-menu';
import { EditPaymentsDialog, RecordPaymentDialog } from './record-payment-dialog';

export default async function OrderPage({ params }: {
    params: Promise<{ orderId: string }>
}): Promise<React.ReactElement> {
    const user = await requireNonGuest();
    const canManage = canManageRestrictedResources(user);

    const { orderId } = await params;
    const [order, activity, packages, products] = await Promise.all([findOrder(orderId), listActivity(orderId), listPackages(false), listProducts()]);
    if (!order) {
        notFound();
    }

    const company = await findCompany(order.data.company_id);
    const companyHref = company ? companyPath(company) : `/companies/${order.data.company_id}`;
    const companyLicenseNumber = company?.data.license_number.trim() ?? '';
    const orderState = order.data.state ?? 'open';
    const actions = availableOrderActions(order.data.status, orderState);
    const invoice = order.data.invoice?.status === 'void' ? null : order.data.invoice;
    const canDeleteOrder = user.role === 'Admin' && order.data.status === 'cancelled';
    const canEditDiscount = invoice ? canManage && (order.data.status === 'approved' || order.data.status === 'delivered') && !hasInvoicePayments(invoice) : false;
    const canRecordPayment = invoice ? canManage && orderState !== 'closed' && invoice.status !== 'paid' && invoice.balance_cents > 0 : false;
    const defaultPaidAt = new Date().toISOString().slice(0, 10);
    const availablePackages = packages.filter((packageRecord) => packageRecord.data.package_status === 'available');
    const existingSourcePrices = new Map(order.data.items.map((item) => [item.source_package_key, {
        priceCents: item.price_cents,
        quantity: Number(item.quantity ?? 0)
    }]));
    const productPrices = new Map(products.map((product) => [product.id, product.data.unit_base_price_cents]));
    const productNames = new Map(products.map((product) => [product.id, product.data.name]));
    const packageGroups = groupOrderItemsByProduct(order.data.items, productNames);
    const orderPackageRows = order.data.items.map((item) => ({
        package_tag: item.package_tag,
        item: item.item,
        strain: item.strain,
        category: item.category,
        source_packages: item.source_packages || item.original_source_package_label,
        quantity: Number(item.quantity ?? 0),
        unit_of_measure: item.unit_of_measure,
        expiration_date: item.expiration_date || null,
        unit_base_price_cents: item.product_id ? (productPrices.get(item.product_id) ?? 0) : 0,
    }));
    const initialSelectedTags = orderPackageRows.map((packageRecord) => packageRecord.package_tag);
    const selectedTagSet = new Set(initialSelectedTags);
    const addablePackageRows = availablePackages.map((packageRecord) => ({
        package_tag: packageRecord.data.package_tag,
        item: packageRecord.data.item,
        strain: packageRecord.data.strain,
        category: packageRecord.data.category,
        source_packages: packageRecord.data.source_packages || packageRecord.data.original_source_package_label,
        quantity: Number(packageRecord.data.quantity ?? 0),
        unit_of_measure: packageRecord.data.unit_of_measure,
        expiration_date: packageRecord.data.expiration_date || null,
        unit_base_price_cents: packageRecord.data.product_id ? (productPrices.get(packageRecord.data.product_id) ?? 0) : 0,
    }));
    const editPackageRows = [
        ...orderPackageRows,
        ...addablePackageRows.filter((packageRecord) => !selectedTagSet.has(packageRecord.package_tag)),
    ];
    const availablePackagePrices = availablePackages.flatMap((packageRecord): [string, string][] => {
        const sourcePackage = packageRecord.data.source_packages || packageRecord.data.original_source_package_label;
        const existingSource = existingSourcePrices.get(sourcePackage);
        const productPriceCents = packageRecord.data.product_id ? productPrices.get(packageRecord.data.product_id) : undefined;
        const quantity = Number(packageRecord.data.quantity ?? 0);
        let priceCents = 0;
        if (existingSource && existingSource.quantity > 0 && quantity > 0) {
            const unitCents = Math.round(existingSource.priceCents / existingSource.quantity);
            priceCents = unitCents * quantity;
        } else if (productPriceCents) {
            priceCents = Math.round(productPriceCents * quantity);
        }
        return priceCents ? [[packageRecord.data.package_tag, (priceCents / 100).toFixed(2)]] : [];
    });
    const orderPackagePrices = order.data.items.map((item): [string, string] => [item.package_tag, (Number(item.price_cents ?? 0) / 100).toFixed(2)]);
    const initialPackagePrices = Object.fromEntries([...availablePackagePrices, ...orderPackagePrices]);
    const editableItems = order.data.status === 'pending';
    const orderTermsLabel = order.data.terms === 'Other' && order.data.terms_notes ? order.data.terms_notes : order.data.terms;
    const invoiceDiscountLabel = invoice?.discount ? `${formatMoney(invoice.discount.cents)} (${invoice.discount.type === 'percent' ? `${invoice.discount.value}% off` : `${formatMoney(invoice.discount.value)} off`})` : null;
    const invoicePaidInFull = invoice ? invoice.status === 'paid' || invoice.balance_cents <= 0 : false;
    const invoicePayments = invoice ? invoice.payments.map((payment) => ({
        id: payment.id,
        method: payment.method,
        method_label: payment.method_label,
        amount_cents: payment.amount_cents,
        paid_at: payment.paid_at,
        check_number: payment.check_number,
    })) : [];
    const canEditPayments = canManage && orderState !== 'closed' && invoicePayments.length > 0;
    const approvalInvoice = {
        invoiceNumber: `INV-${order.data.order_number}`,
        terms: order.data.terms,
        termsNotes: order.data.terms_notes,
        totalLabel: formatMoney(order.data.total_cents),
    };
    const showClosedBadge = order.data.status === 'paid' && orderState === 'closed';

    return (
        <div>
            <PageHeader
                title={`Order #${order.data.order_number}`}
                description={order.data.company_name}
                actions={
                    <OrderActionsMenu orderId={orderId} orderNumber={order.data.order_number} actions={actions} approvalInvoice={approvalInvoice} canManage={canManage} canDelete={canDeleteOrder} hasInvoice={Boolean(invoice)} canRecordPayment={canRecordPayment} recordPaymentBalanceCents={invoice?.balance_cents ?? 0} defaultPaidAt={defaultPaidAt} />}
            >
                <div className='flex flex-wrap gap-2'>
                    <StatusBadge status={order.data.status} />
                    {showClosedBadge ? <Badge color='zinc'>Closed</Badge> : null}
                </div>
            </PageHeader>

            <div className='relative sm:-mt-4 mb-4 flex justify-center'>
                <OrderProgressBar status={order.data.status} />
            </div>

            <div className='grid gap-6 xl:grid-cols-[1.44fr_0.76fr]'>
                <div className='space-y-6'>
                    {!invoice ? (
                        <Card>
                            <CardHeader className='flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'>
                                <div>
                                    <CardTitle>Packages</CardTitle>
                                    <p className='mt-1 text-sm text-zinc-500 dark:text-zinc-400'>{order.data.items.length} package{order.data.items.length !== 1 ? 's' : ''} for {formatMoney(order.data.total_cents)}</p>
                                </div>
                                {editableItems ?
                                    <EditPackagesDialog orderId={orderId} packages={editPackageRows} initialSelectedTags={initialSelectedTags} initialPackagePrices={initialPackagePrices} /> : null}
                            </CardHeader>
                            <CardContent className='space-y-3'>
                                {packageGroups.map((group) => (
                                    <div key={group.key} className='rounded-lg border border-zinc-950/10 bg-zinc-50 p-4 dark:bg-zinc-900'>
                                        <div className='flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'>
                                            <div>
                                                <p className='font-semibold text-zinc-950 dark:text-white'>{group.productName}</p>
                                                <p className='mt-1 text-sm text-zinc-500'>
                                                    {group.caseCount} {group.caseCount === 1 ? 'case2' : 'cases2'} · {compactNumber(group.quantity)}{group.unitOfMeasure ? ` ${group.unitOfMeasure}` : ''}
                                                </p>
                                                <p className='mt-1 text-sm text-zinc-500'>{group.strains.length > 0 ? group.strains.join(', ') : 'No strain'}</p>
                                            </div>
                                            <div className='sm:text-right'>
                                                <p className='text-xs uppercase tracking-[0.2em] text-zinc-500'>Subtotal</p>
                                                <p className='mt-1 text-lg font-semibold text-zinc-950 dark:text-white'>{formatMoney(group.subtotalCents)}</p>
                                                <div className='mt-3 flex sm:justify-end'>
                                                    <MetrcPackageIdsDialog productName={group.productName} packageTags={group.packageTags} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    ) : null}

                    {invoice ? (
                        <Card>
                            <CardHeader className='flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'>
                                <CardTitle>Invoice & Payments</CardTitle>
                                {canEditDiscount ? (
                                    <div className='flex flex-wrap gap-2 sm:justify-end'>
                                        <DiscountDialog orderId={orderId} discount={invoice.discount ? {
                                            type: invoice.discount.type,
                                            value: invoice.discount.value
                                        } : null} />
                                    </div>
                                ) : null}
                            </CardHeader>
                            <CardContent>
                                <div className='space-y-6'>
                                    <div className='rounded-xl bg-zinc-50 p-5 dark:bg-zinc-950/60'>
                                        <div className='grid gap-4 sm:grid-cols-2 xl:grid-cols-4'>
                                            <InvoiceMetaItem label='Invoice' value={invoice.invoice_number} />
                                            <InvoiceMetaItem label='Status' value={invoiceStatusLabel(invoice.status)} />
                                            <InvoiceMetaItem label='Terms' value={orderTermsLabel} />
                                            <InvoiceMetaItem label='Due Date' value={invoice.due_date ? formatDate(invoice.due_date) : 'Set after delivery'} />
                                        </div>
                                    </div>

                                    <div className='overflow-hidden rounded-xl'>
                                        <div className='hidden grid-cols-[minmax(0,1fr)_8rem_8rem] gap-4 bg-zinc-50 px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500 sm:grid dark:bg-zinc-900'>
                                            <div>Item</div>
                                            <div className='text-right'>QTY</div>
                                            <div className='text-right'>Subtotal</div>
                                        </div>
                                        <div className='divide-y divide-zinc-950/5 dark:divide-zinc-900'>
                                            {packageGroups.map((group) =>
                                                <InvoiceLineItemRow key={group.key} group={group} />)}
                                        </div>
                                    </div>

                                    <div className='flex justify-end'>
                                        <div className='w-full space-y-4 sm:max-w-md'>
                                            <div className='rounded-xl bg-zinc-50 p-5 dark:bg-zinc-900'>
                                                <div className='space-y-3'>
                                                    <InvoiceTotalRow label='Subtotal' value={formatMoney(invoice.subtotal_cents)} />
                                                    {invoiceDiscountLabel ?
                                                        <InvoiceTotalRow label='Discount' value={invoiceDiscountLabel} /> : null}
                                                    <InvoiceTotalRow label='Tax' value={formatMoney(0)} />
                                                    <InvoiceTotalRow label='Total' value={formatMoney(invoice.total_cents)} strong />
                                                </div>
                                                {canRecordPayment ? (
                                                    <div className='mt-4 flex justify-end'>
                                                        <RecordPaymentDialog orderId={orderId} balanceCents={invoice.balance_cents} defaultPaidAt={defaultPaidAt} />
                                                    </div>
                                                ) : null}
                                            </div>
                                            {invoicePayments.length > 0 ? (
                                                <div className='rounded-xl bg-zinc-50 p-5 dark:bg-zinc-900'>
                                                    <p className='text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500'>Payments
                                                        Made</p>
                                                    <div className='mt-3 space-y-3'>
                                                        {invoicePayments.map((payment) => (
                                                            <div key={payment.id} className='flex items-center justify-between gap-3 text-sm text-zinc-600 dark:text-zinc-300'>
                                                                <div className='flex flex-1 flex-wrap items-center gap-2'>
                                                                    <Badge color={paymentMethodBadgeColor(payment.method)}>{payment.method_label}</Badge>
                                                                    <span>{formatDate(payment.paid_at)}{payment.check_number ? ` · Check #${payment.check_number}` : ''}</span>
                                                                </div>
                                                                <div className='font-medium text-zinc-950 dark:text-white py-2.5'>{formatMoney(payment.amount_cents)}</div>
                                                                <div>{canEditPayments ?
                                                                    <EditPaymentsDialog orderId={orderId} payments={[payment]} /> : null}</div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                    {invoice.balance_cents > 0 ? (
                                                        <div className='mt-4 border-t-2 border-zinc-950/50 pt-3'>
                                                            <div className='flex items-center justify-between gap-4 text-lg font-semibold text-zinc-950 dark:text-white'>
                                                                <span>Balance Due</span>
                                                                <span className='text-right'>{formatMoney(invoice.balance_cents)}</span>
                                                            </div>
                                                        </div>
                                                    ) : null}
                                                </div>
                                            ) : null}
                                            {invoicePaidInFull ? (
                                                <div className='mt-4 rounded-lg bg-emerald-500 px-4 py-3 text-white'>
                                                    <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
                                                        <div>
                                                            <p className='text-xs font-semibold uppercase tracking-[0.2em] text-white/80'>Paid
                                                                in full
                                                                · {formatDate(invoice.payments[invoice.payments.length - 1].paid_at)}</p>
                                                            <p className='mt-1 text-lg font-semibold uppercase'>{formatMoney(invoice.paid_cents)} paid</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : null}
                                        </div>
                                    </div>

                                </div>
                            </CardContent>
                        </Card>
                    ) : null}
                </div>

                <div className='space-y-6'>
                    <Card>
                        <CardHeader>
                            <CardTitle>Company</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Link href={companyHref} className='text-base/7 font-semibold text-zinc-950 hover:text-zinc-700 sm:text-2xl/6 dark:text-white dark:hover:text-zinc-300'>{order.data.company_name}</Link>
                            <p className='mt-2 text-lg text-zinc-400'>{companyLicenseNumber || 'No license number'}</p>
                            <div className='mt-3'>
                                <FacilityBadge facilityType={order.data.facility_type} />
                            </div>
                        </CardContent>
                    </Card>

                    <div className='rounded-xl bg-zinc-50 p-5 dark:bg-zinc-950/20'>
                        <p className='text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500 pb-2'>Activity Log</p>
                        <ol className='mt-3 space-y-4 pl-2'>
                            {activity.map((entry, index) => (
                                <li key={entry.id} className='grid grid-cols-[1rem_1fr] gap-3 text-sm'>
                                    <div className='relative flex items-center justify-center'>
                                        {index > 0 ?
                                            <span className='absolute top-0 bottom-1/2 left-1/2 w-px -translate-x-1/2 bg-zinc-300 dark:bg-purple-800/80' /> : null}
                                        {index < activity.length - 1 ?
                                            <span className='absolute left-1/2 top-1/2 -bottom-4 w-px -translate-x-1/2 bg-zinc-300 dark:bg-purple-800/80' /> : null}
                                        <span className='relative z-10 size-2 rounded-full bg-zinc-400 ring-4 ring-zinc-50 dark:bg-purple-600 dark:ring-purple-950/40' />
                                    </div>
                                    <div className='min-w-0 flex-1'>
                                        <div className='flex items-center gap-3'>
                                            {canManage && entry.data.actor_user_id ? (
                                                <Link href={`/users/${encodeURIComponent(entry.data.actor_user_id)}`} className='shrink-0' aria-label={entry.data.actor_name}>
                                                    <Avatar name={entry.data.actor_name} picture={entry.data.actor_picture} className='size-8 rounded-md text-sm' />
                                                </Link>
                                            ) : (
                                                <Avatar name={entry.data.actor_name} picture={entry.data.actor_picture} className='size-6 rounded-md text-sm' />
                                            )}
                                            <div className='flex flex-col gap-1'>
                                                <p className='text-sm font-semibold text-zinc-950 dark:text-white'>{formatActivityAction(entry.data.action)}</p>
                                                <p className='text-xs uppercase font-medium text-zinc-600 dark:text-zinc-400'>{formatDateTime(entry.data.created_at)}</p>
                                            </div>
                                        </div>
                                    </div>
                                </li>
                            ))}
                        </ol>
                    </div>
                </div>
            </div>
        </div>
    );
}

function formatActivityAction(action: string): string {
    const label = action.replaceAll('_', ' ');
    return label ? `${label.charAt(0).toUpperCase()}${label.slice(1)}` : label;
}

function paymentMethodBadgeColor(method: string): 'blue' | 'emerald' | 'orange' | 'zinc' {
    if (method === 'ach') {
        return 'blue';
    }

    if (method === 'cash') {
        return 'emerald';
    }

    if (method === 'check') {
        return 'orange';
    }

    return 'zinc';
}

function InvoiceMetaItem({ label, value }: { label: string; value: string }): React.ReactElement {
    return (
        <div>
            <p className='text-xs uppercase tracking-[0.2em] text-zinc-500'>{label}</p>
            <p className='mt-2 font-semibold text-zinc-950 dark:text-white'>{value}</p>
        </div>
    );
}

function InvoiceLineItemRow({ group }: { group: PackageGroup }): React.ReactElement {
    return (
        <div className='grid gap-3 bg-white px-4 py-4 sm:grid-cols-[minmax(0,1fr)_8rem_8rem] sm:gap-4 dark:bg-zinc-950/40'>
            <div>
                <div>
                    <MetrcPackageIdsDialog
                        productName={group.productName}
                        packageTags={group.packageTags}
                        triggerClassName='inline-block max-w-full cursor-pointer whitespace-normal break-words text-left text-lg font-medium text-purple-500 transition hover:text-purple-700 dark:text-white dark:hover:text-emerald-300'
                    >
                        {group.productName}
                        <MagnifyingGlassIcon aria-hidden='true' className='ml-1.5 scale-x-[-1] inline size-4 align-[-0.125em]' />
                    </MetrcPackageIdsDialog>
                </div>
                <p className='mt-1 text-sm text-zinc-500'>{group.caseCount} {group.caseCount === 1 ? 'case' : 'cases'}</p>
                <p className='mt-1 text-sm text-zinc-500'>{group.strains.length > 0 ? group.strains.join(', ') : 'No strain'}</p>
            </div>
            <div className='flex items-center justify-between gap-4 sm:block sm:text-right'>
                <p className='text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500 sm:hidden'>Quantity</p>
                <p className='font-medium text-zinc-950 dark:text-white'>{compactNumber(group.quantity)}{group.unitOfMeasure ? ` ${group.unitOfMeasure === 'ea' ? group.quantity !== 1 ? 'units' : 'unit' : ''}` : ''}</p>
            </div>
            <div className='flex items-center justify-between gap-4 sm:block sm:text-right'>
                <p className='text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500 sm:hidden'>Subtotal</p>
                <p className='font-semibold text-zinc-950 dark:text-white'>{formatMoney(group.subtotalCents)}</p>
            </div>
        </div>
    );
}

function InvoiceTotalRow({ label, value, strong = false }: {
    label: string;
    value: string;
    strong?: boolean
}): React.ReactElement {
    return (
        <div className={strong ? 'flex items-center justify-between gap-4 border-t border-zinc-950/10 pt-3 text-lg font-semibold text-zinc-950 dark:border-white/10 dark:text-white' : 'flex items-center justify-between gap-4 text-sm text-zinc-600 dark:text-zinc-300'}>
            <span>{label}</span>
            <span className='text-right'>{value}</span>
        </div>
    );
}

type ProgressBarStepStatus = 'complete' | 'current' | 'upcoming' | 'failed';

type ProgressBarStep = {
    name: string;
    status: ProgressBarStepStatus;
};

const ORDER_PROGRESS_STEPS = ['Ordered', 'Approved', 'Invoiced', 'Delivered', 'Paid'] as const;

function OrderProgressBar({ status }: { status: OrderStatus }): React.ReactElement {
    return <ProgressBar steps={orderProgressStepsForStatus(status)} />;
}

function ProgressBar({ steps }: { steps: ProgressBarStep[] }): React.ReactElement {
    return (
        <nav aria-label='Progress'>
            <ol role='list' className='mb-8 flex items-center'>
                {steps.map((step, stepIdx) => (
                    <li key={step.name} className='flex items-center'>
                        <div className='relative flex size-8 shrink-0 items-center justify-center'>
                            {step.status === 'complete' ? (
                                <div className='flex size-8 items-center justify-center rounded-full bg-emerald-500'>
                                    <CheckIcon aria-hidden='true' className='z-50 size-5 text-white' />
                                    <span className='sr-only'>{step.name}</span>
                                </div>
                            ) : step.status === 'current' ? (
                                <div aria-current='step' className='flex size-8 items-center justify-center rounded-full border-2 border-purple-700 bg-purple-500'>
                                    <ClockIcon aria-hidden='true' className='size-5 text-white' />
                                    <span className='sr-only'>{step.name}</span>
                                </div>
                            ) : step.status === 'failed' ? (
                                <div aria-current='step' className='flex size-8 items-center justify-center rounded-full bg-red-500/75'>
                                    <XMarkIcon aria-hidden='true' className='size-5 text-white' />
                                    <span className='sr-only'>{step.name}</span>
                                </div>
                            ) : (
                                <div className='flex size-8 items-center justify-center rounded-full border-2 border-purple-600 bg-purple-600'>
                                    <span aria-hidden='true' className='size-2.5 rounded-full bg-transparent' />
                                    <span className='sr-only'>{step.name}</span>
                                </div>
                            )}
                            <div className='absolute left-1/2 top-8 -translate-x-1/2 whitespace-nowrap pt-2 text-center uppercase text-[0.625rem] font-bold tracking-widest'>{step.name}</div>
                        </div>
                        {stepIdx !== steps.length - 1 ?
                            <div aria-hidden='true' className={step.status === 'complete' ? 'h-0.5 w-8 bg-emerald-500 sm:w-20' : 'h-0.5 w-8 bg-purple-600 sm:w-20'} /> : null}
                    </li>
                ))}
            </ol>
        </nav>
    );
}

function orderProgressStepsForStatus(status: OrderStatus): ProgressBarStep[] {
    if (status === 'cancelled') {
        return failedOrderProgressSteps(0, 'Cancelled');
    }

    if (status === 'rejected') {
        return failedOrderProgressSteps(0, 'Rejected');
    }

    if (status === 'delivery_rejected') {
        return failedOrderProgressSteps(2, 'Rejected');
    }

    const currentIndex = orderProgressIndexForStatus(status);

    return ORDER_PROGRESS_STEPS.map((name, index) => ({
        name,
        status: index < currentIndex ? 'complete' : index === currentIndex ? 'current' : 'upcoming',
    }));
}

function failedOrderProgressSteps(completedThroughIndex: number, failureName: string): ProgressBarStep[] {
    const steps: ProgressBarStep[] = ORDER_PROGRESS_STEPS.slice(0, completedThroughIndex + 1).map((name) => ({
        name,
        status: 'complete',
    }));

    steps.push({ name: failureName, status: 'failed' });

    return steps;
}

function orderProgressIndexForStatus(status: OrderStatus): number {
    switch (status) {
        case 'pending':
            return 1;
        case 'approved':
            return 3;
        case 'delivered':
            return 4;
        case 'paid':
            return ORDER_PROGRESS_STEPS.length;
        default:
            return 0;
    }
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

type MutablePackageGroup = Omit<PackageGroup, 'strains'> & {
    strainSet: Set<string>;
    unitSet: Set<string>;
};

function groupOrderItemsByProduct(items: OrderItem[], productNames: Map<string, string>): PackageGroup[] {
    const groups = new Map<string, MutablePackageGroup>();

    for (const item of items) {
        const productName = (item.product_id ? productNames.get(item.product_id) : '') || item.item || 'Unknown Product';
        const key = item.product_id ? `product:${item.product_id}` : `item:${productName.trim().toLowerCase()}`;
        let group = groups.get(key);

        if (!group) {
            group = {
                key,
                productName,
                caseCount: 0,
                quantity: 0,
                unitOfMeasure: '',
                subtotalCents: 0,
                packageTags: [],
                strainSet: new Set<string>(),
                unitSet: new Set<string>(),
            };
            groups.set(key, group);
        }

        const unitOfMeasure = item.unit_of_measure || '';
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
            unitOfMeasure: units.length > 1 ? 'mixed units' : units[0] ?? '',
            subtotalCents: group.subtotalCents,
            packageTags: group.packageTags,
            strains: Array.from(group.strainSet).sort((a, b) => a.localeCompare(b)),
        };
    });
}

