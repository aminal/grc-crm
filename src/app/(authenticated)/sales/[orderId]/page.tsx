import { CheckIcon, ClockIcon, XMarkIcon } from '@heroicons/react/20/solid';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PageHeader } from '@/components/layout/page-header';
import { FacilityBadge } from '@/components/company/facility-badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge, StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { Field, Input, Select } from '@/components/ui/field';
import { PAYMENT_METHODS } from '@/lib/domain/constants';
import { canManageRestrictedResources, requireNonGuest } from '@/lib/auth/session';
import { findCompany } from '@/lib/data/crm';
import { listPackages } from '@/lib/data/inventory';
import { availableOrderActions, findOrder, listActivity } from '@/lib/data/orders';
import { listProducts } from '@/lib/data/sales-settings';
import { companyPath } from '@/lib/domain/company-slug';
import {
    compactNumber,
    dateFromFirestore,
    formatDate,
    formatMoney,
    invoiceStatusLabel
} from '@/lib/domain/format';
import type { FirestoreDate, OrderItem, OrderStatus } from '@/lib/domain/types';
import { hasInvoicePayments } from '@/lib/sales/invoice';
import { DiscountDialog } from './discount-dialog';
import { EditPackagesDialog } from './edit-packages-dialog';
import { MetrcPackageIdsDialog } from './metrc-package-ids-dialog';
import { OrderActionsMenu } from './order-actions-menu';
import { RecordPaymentDialog } from './record-payment-dialog';
import { deletePaymentAction, updatePaymentAction } from '../actions';

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
    const canRecordPayment = invoice ? canManage && invoice.status !== 'paid' && invoice.balance_cents > 0 : false;
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
                    <OrderActionsMenu orderId={orderId} orderNumber={order.data.order_number} actions={actions} approvalInvoice={approvalInvoice} canManage={canManage} canDelete={canDeleteOrder} hasInvoice={Boolean(order.data.invoice)} canRecordPayment={canRecordPayment} recordPaymentBalanceCents={invoice?.balance_cents ?? 0} defaultPaidAt={defaultPaidAt} />}
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
                                                {group.caseCount} {group.caseCount === 1 ? 'case' : 'cases'} · {compactNumber(group.quantity)}{group.unitOfMeasure ? ` ${group.unitOfMeasure}` : ''}
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

                    {invoice ? (
                        <Card>
                            <CardHeader className='flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'>
                                <CardTitle>Invoice & Payments</CardTitle>
                                {canEditDiscount || canRecordPayment ? (
                                    <div className='flex flex-wrap gap-2 sm:justify-end'>
                                        {canEditDiscount ? (
                                            <DiscountDialog orderId={orderId} discount={invoice.discount ? {
                                                type: invoice.discount.type,
                                                value: invoice.discount.value
                                            } : null} />
                                        ) : null}
                                        {canRecordPayment ? (
                                            <RecordPaymentDialog orderId={orderId} balanceCents={invoice.balance_cents} defaultPaidAt={defaultPaidAt} />
                                        ) : null}
                                    </div>
                                ) : null}
                            </CardHeader>
                            <CardContent>
                                <div className='space-y-5'>
                                    <div className='grid gap-4 sm:grid-cols-2 xl:grid-cols-4'>
                                        <InvoiceStat label='Invoice' value={invoice.invoice_number} />
                                        <InvoiceStat label='Status' value={invoiceStatusLabel(invoice.status)} />
                                        <InvoiceStat label='Total' value={formatMoney(invoice.total_cents)} />
                                        <InvoiceStat label='Balance' value={formatMoney(invoice.balance_cents)} />
                                    </div>
                                    <div className='grid gap-4 sm:grid-cols-2'>
                                        <InvoiceStat label='Terms' value={orderTermsLabel} />
                                        <InvoiceStat label='Due Date' value={invoice.due_date ? formatDate(invoice.due_date) : 'Set after delivery'} />
                                        {invoice.discount ? (
                                            <InvoiceStat
                                                label='Discount'
                                                value={`${formatMoney(invoice.discount.cents)} (${invoice.discount.type === 'percent' ? `${invoice.discount.value}% off` : `${formatMoney(invoice.discount.value)} off`})`}
                                            />
                                        ) : null}
                                    </div>

                                    <div className='space-y-3'>
                                        {invoice.payments.map((payment) => {
                                            const paymentSummary = (
                                                <>
                                                    <span className='font-semibold text-zinc-950'>{formatMoney(payment.amount_cents)}</span>
                                                    <span className='ml-2 text-sm text-zinc-600'>{payment.method_label} · {formatDate(payment.paid_at)}</span>
                                                </>
                                            );

                                            return canManage ? (
                                                <details key={payment.id} className='rounded-lg border border-zinc-950/10 bg-zinc-50 p-4 dark:bg-zinc-900'>
                                                    <summary className='cursor-pointer'>{paymentSummary}</summary>
                                                    <div className='mt-4 grid gap-4 lg:grid-cols-[1fr_auto]'>
                                                        <form action={updatePaymentAction.bind(null, orderId, payment.id)} className='grid gap-3 sm:grid-cols-2'>
                                                            <Field label='Amount'>
                                                                <Input name='amount' defaultValue={(payment.amount_cents / 100).toFixed(2)} required />
                                                            </Field>
                                                            <Field label='Payment date'>
                                                                <Input name='paid_at' type='date' defaultValue={payment.paid_at} required />
                                                            </Field>
                                                            <Field label='Method'>
                                                                <Select name='method' defaultValue={payment.method}>
                                                                    {Object.entries(PAYMENT_METHODS).map(([key, label]) =>
                                                                        <option key={key} value={key}>{label}</option>)}
                                                                </Select>
                                                            </Field>
                                                            <Field label='Check number'>
                                                                <Input name='check_number' defaultValue={payment.check_number} />
                                                            </Field>
                                                            <Button type='submit' color='emerald'>Save Payment</Button>
                                                        </form>
                                                        <form action={deletePaymentAction.bind(null, orderId, payment.id)}>
                                                            <Button type='submit' color='red'>Delete Payment</Button>
                                                        </form>
                                                    </div>
                                                </details>
                                            ) : (
                                                <div key={payment.id} className='rounded-lg border border-zinc-950/10 bg-zinc-50 p-4 dark:bg-zinc-900'>
                                                    {paymentSummary}
                                                </div>
                                            );
                                        })}
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

                    <Card>
                        <CardHeader>
                            <CardTitle>Activity</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ol>
                                {activity.map((entry, index) => (
                                    <li key={entry.id} className='relative grid grid-cols-[3.5rem_1fr] gap-4 pb-6 last:pb-0'>
                                        {index < activity.length - 1 ?
                                            <span className='absolute bottom-0 left-7 top-16 w-0.5 bg-zinc-300 dark:bg-zinc-800/60' /> : null}
                                        <ActivityTimelineMarker createdAt={entry.data.created_at} />
                                        <div className='pt-2'>
                                            <p className='font-semibold text-zinc-950 dark:text-white'>{formatActivityAction(entry.data.action)}</p>
                                            <p className='mt-1 text-sm text-zinc-600 dark:text-zinc-300'>
                                                {canManage && entry.data.actor_user_id ? (
                                                    <Link href={`/users?user=${encodeURIComponent(entry.data.actor_user_id)}`} className='inline-flex items-center gap-2 font-medium text-zinc-950 hover:text-zinc-700 dark:text-white dark:hover:text-zinc-300'>
                                                        <Avatar name={entry.data.actor_name} picture={entry.data.actor_picture} className='size-6 rounded-lg text-xs' />
                                                        {entry.data.actor_name}
                                                    </Link>
                                                ) : (
                                                    <span className='inline-flex items-center gap-2'>
                                                        <Avatar name={entry.data.actor_name} picture={entry.data.actor_picture} className='size-6 rounded-lg text-xs' />
                                                        {entry.data.actor_name}
                                                    </span>
                                                )}
                                            </p>
                                        </div>
                                    </li>
                                ))}
                            </ol>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}

function formatActivityAction(action: string): string {
    const label = action.replaceAll('_', ' ');
    return label ? `${label.charAt(0).toUpperCase()}${label.slice(1)}` : label;
}

function InvoiceStat({ label, value }: { label: string; value: string }): React.ReactElement {
    return (
        <div className='rounded-lg border border-zinc-950/10 bg-zinc-50 p-4 dark:bg-zinc-900'>
            <p className='text-xs uppercase tracking-[0.2em] text-zinc-500'>{label}</p>
            <p className='mt-2 font-semibold text-zinc-950 dark:text-white'>{value}</p>
        </div>
    );
}

type ProgressBarStepStatus = 'complete' | 'current' | 'upcoming' | 'failed';

type ProgressBarStep = {
    name: string;
    status: ProgressBarStepStatus;
};

const ORDER_PROGRESS_STEPS = ['Order', 'Approved', 'Invoice', 'Delivered', 'Paid'] as const;

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
                        {stepIdx !== steps.length - 1 ? <div aria-hidden='true' className={step.status === 'complete' ? 'h-0.5 w-8 bg-emerald-500 sm:w-20' : 'h-0.5 w-8 bg-purple-600 sm:w-20'} /> : null}
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

function ActivityTimelineMarker({ createdAt }: { createdAt: FirestoreDate }): React.ReactElement {
    const timelineDate = formatActivityTimelineDate(createdAt);

    return (
        <div className='relative flex justify-center'>
            <time dateTime={timelineDate.isoDate} className='relative z-10 flex min-w-14 flex-col items-center rounded-lg bg-zinc-100 text-center shadow-sm dark:bg-zinc-900'>
                <div className='w-full py-1 text-[0.7rem] font-semibold uppercase tracking-widest text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-950/70 rounded-t-lg'>{timelineDate.weekdayLabel}</div>
                <div className='mt-0.5 pt-1 pb-2 text-2xl font-semibold leading-none text-zinc-950 dark:text-white rounded-b-lg'>{timelineDate.dayLabel}</div>
            </time>
        </div>
    );
}

function formatActivityTimelineDate(value: FirestoreDate): {
    weekdayLabel: string;
    dayLabel: string;
    isoDate?: string
} {
    const date = dateFromFirestore(value);

    if (!date) {
        return { weekdayLabel: '—', dayLabel: '—' };
    }

    const weekday = new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(date);
    const day = new Intl.DateTimeFormat('en-US', { day: 'numeric' }).format(date);

    return { weekdayLabel: weekday, dayLabel: day, isoDate: date.toISOString() };
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

