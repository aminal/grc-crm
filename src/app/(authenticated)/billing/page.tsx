import Link from 'next/link';
import { PageHeader } from '@/components/layout/page-header';
import { Badge } from '@/components/ui/badge';
import { TableSearch } from '@/components/ui/table-search';
import { activeTableSortDirection, paginatedTableItems, Table, TableBody, TableCell, TableHead, TableHeader, TablePagination, TableRow, tablePageFromSearchParam, tableSortDirectionFromSearchParam, tableSortHref, tableSortKeyFromSearchParam, tableSortParams, type TableSortDirection } from '@/components/ui/table';
import { requireNonGuest } from '@/lib/auth/session';
import { listOrders } from '@/lib/data/orders';
import { dateFromFirestore, formatDate, formatMoney, invoiceStatusLabel } from '@/lib/domain/format';
import type { FirestoreRecord, InvoiceData, OrderData } from '@/lib/domain/types';

const billingSortKeys = ['invoice', 'status', 'issued', 'due', 'total', 'balance'] as const;

type BillingTableSortKey = typeof billingSortKeys[number];
type BadgeColor = NonNullable<React.ComponentProps<typeof Badge>['color']>;

type BillingSearchParams = {
    q?: string | string[];
    page?: string | string[];
    sort?: string | string[];
    dir?: string | string[];
};

type InvoiceRow = {
    order: FirestoreRecord<OrderData>;
    invoice: InvoiceData;
};

function firstSearchParam(value: string | string[] | undefined): string {
    return Array.isArray(value) ? (value[0] ?? '') : (value ?? '');
}

function billingHref(query: string, params: Record<string, string> = {}): string {
    const searchParams = new URLSearchParams();
    if (query) {
        searchParams.set('q', query);
    }

    Object.entries(params).forEach(([key, value]) => {
        if (value) {
            searchParams.set(key, value);
        }
    });

    const search = searchParams.toString();
    return search ? `/billing?${search}` : '/billing';
}

function invoiceRowsFromOrders(orders: FirestoreRecord<OrderData>[]): InvoiceRow[] {
    return orders
        .flatMap((order) => order.data.invoice ? [{ order, invoice: order.data.invoice }] : [])
        .sort((a, b) => invoiceTimestamp(b) - invoiceTimestamp(a));
}

function filterInvoices(invoices: InvoiceRow[], query: string): InvoiceRow[] {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
        return invoices;
    }

    return invoices.filter((row) => {
        const { order, invoice } = row;
        const orderNumber = invoice.order_number ?? order.data.order_number;

        return [
            invoice.invoice_number,
            `order ${orderNumber}`,
            `#${orderNumber}`,
            invoice.company_name,
            invoiceStatusLabel(invoice.status),
            invoice.status,
            invoice.due_date ? formatDate(invoice.due_date) : '',
            formatDate(invoice.issued_at ?? invoice.created_at),
            formatMoney(invoice.total_cents),
            formatMoney(invoice.paid_cents),
            formatMoney(invoice.balance_cents),
            ...invoice.payments.flatMap((payment) => [payment.method_label, payment.check_number, payment.paid_at, formatMoney(payment.amount_cents)]),
        ].join(' ').toLowerCase().includes(normalized);
    });
}

export default async function BillingPage({ searchParams }: {
    searchParams: Promise<BillingSearchParams>
}): Promise<React.ReactElement> {
    await requireNonGuest();

    const params = await searchParams;
    const query = firstSearchParam(params.q).trim();
    const sortKey = tableSortKeyFromSearchParam(params.sort, billingSortKeys);
    const sortDirection = sortKey ? tableSortDirectionFromSearchParam(params.dir) : null;
    const sortParams = tableSortParams(sortKey, sortDirection);
    const invoiceRows = sortInvoices(filterInvoices(invoiceRowsFromOrders(await listOrders()), query), sortKey, sortDirection);
    const currentPage = tablePageFromSearchParam(params.page, invoiceRows.length);
    const paginatedInvoiceRows = paginatedTableItems(invoiceRows, currentPage);
    const paginationHref = billingHref(query, sortParams);

    return (
        <div>
            <PageHeader title='Billing' />

            <div className='space-y-6'>
                <TableSearch query={query} placeholder='Filter invoices by invoice, order, company, status, or payment' preservedParams={sortParams} />
                {invoiceRows.length > 0 ? (
                    <>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead sortHref={billingSortHref('invoice', query, sortKey, sortDirection)} sortDirection={activeTableSortDirection('invoice', sortKey, sortDirection)}>Invoice</TableHead>
                                    <TableHead sortHref={billingSortHref('status', query, sortKey, sortDirection)} sortDirection={activeTableSortDirection('status', sortKey, sortDirection)}>Status</TableHead>
                                    <TableHead className='hidden sm:table-cell' sortHref={billingSortHref('issued', query, sortKey, sortDirection)} sortDirection={activeTableSortDirection('issued', sortKey, sortDirection)}>Issued</TableHead>
                                    <TableHead className='hidden md:table-cell' sortHref={billingSortHref('due', query, sortKey, sortDirection)} sortDirection={activeTableSortDirection('due', sortKey, sortDirection)}>Due</TableHead>
                                    <TableHead className='text-right' sortHref={billingSortHref('total', query, sortKey, sortDirection)} sortDirection={activeTableSortDirection('total', sortKey, sortDirection)}>Total</TableHead>
                                    <TableHead className='text-right' sortHref={billingSortHref('balance', query, sortKey, sortDirection)} sortDirection={activeTableSortDirection('balance', sortKey, sortDirection)}>Balance</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {paginatedInvoiceRows.map((row) => {
                                    const { order, invoice } = row;
                                    const href = `/sales/${order.id}`;
                                    const orderNumber = invoice.order_number ?? order.data.order_number;
                                    const label = `View order ${orderNumber}`;

                                    return (
                                        <TableRow key={`${order.id}-${invoice.id}`} className='group cursor-pointer'>
                                            <TableCell>
                                                <Link href={href} className='flex flex-col items-start gap-1 text-zinc-950 group-hover:text-purple-700 dark:text-white dark:group-hover:text-purple-400'>
                                                    <div className='font-semibold text-lg'>{invoice.invoice_number}</div>
                                                    <div className='font-medium text-zinc-500 dark:text-zinc-400'>{invoice.company_name}</div>
                                                    <div className='text-sm font-medium text-zinc-400 dark:text-zinc-500'>Order #{orderNumber}</div>
                                                </Link>
                                            </TableCell>
                                            <TableCell>
                                                <Link href={href} aria-hidden tabIndex={-1} className='absolute inset-0 z-10'>
                                                    <span className='sr-only'>{label}</span>
                                                </Link>
                                                <InvoiceStatusBadge status={invoice.status} />
                                            </TableCell>
                                            <TableCell className='hidden sm:table-cell'>
                                                <Link href={href} aria-hidden tabIndex={-1} className='absolute inset-0 z-10'>
                                                    <span className='sr-only'>{label}</span>
                                                </Link>
                                                <span className='font-medium text-zinc-500 dark:text-zinc-300'>{formatDate(invoice.issued_at ?? invoice.created_at)}</span>
                                            </TableCell>
                                            <TableCell className='hidden md:table-cell'>
                                                <Link href={href} aria-hidden tabIndex={-1} className='absolute inset-0 z-10'>
                                                    <span className='sr-only'>{label}</span>
                                                </Link>
                                                <span className='font-medium text-zinc-500 dark:text-zinc-300'>{invoice.due_date ? formatDate(invoice.due_date) : 'Set after delivery'}</span>
                                            </TableCell>
                                            <TableCell className='text-right font-medium text-zinc-950 dark:text-white'>
                                                <Link href={href} aria-hidden tabIndex={-1} className='absolute inset-0 z-10'>
                                                    <span className='sr-only'>{label}</span>
                                                </Link>
                                                {formatMoney(invoice.total_cents)}
                                            </TableCell>
                                            <TableCell className='text-right font-medium text-zinc-950 dark:text-white'>
                                                <Link href={href} aria-hidden tabIndex={-1} className='absolute inset-0 z-10'>
                                                    <span className='sr-only'>{label}</span>
                                                </Link>
                                                {formatMoney(invoice.balance_cents)}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                        <TablePagination baseHref={paginationHref} currentPage={currentPage} totalItems={invoiceRows.length} />
                    </>
                ) : (
                    <p className='py-12 text-sm/6 text-center font-semibold uppercase text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-950/20 rounded-xl'>No matching invoices</p>
                )}
            </div>
        </div>
    );
}

function InvoiceStatusBadge({ status }: { status: InvoiceData['status'] }): React.ReactElement {
    const colors = {
        unpaid: 'amber',
        partial: 'sky',
        paid: 'emerald',
        void: 'zinc',
    } satisfies Record<InvoiceData['status'], BadgeColor>;

    return <Badge color={colors[status]}>{invoiceStatusLabel(status)}</Badge>;
}

function sortInvoices(invoices: InvoiceRow[], sortKey: BillingTableSortKey | null, sortDirection: TableSortDirection | null): InvoiceRow[] {
    if (!sortKey || !sortDirection) {
        return invoices;
    }

    const direction = sortDirection === 'asc' ? 1 : -1;
    return [...invoices].sort((a, b) => compareInvoices(a, b, sortKey) * direction);
}

function compareInvoices(a: InvoiceRow, b: InvoiceRow, sortKey: BillingTableSortKey): number {
    switch (sortKey) {
        case 'invoice':
            return compareStrings(a.invoice.invoice_number, b.invoice.invoice_number);
        case 'status':
            return compareStrings(invoiceStatusLabel(a.invoice.status), invoiceStatusLabel(b.invoice.status));
        case 'issued':
            return invoiceTimestamp(a) - invoiceTimestamp(b);
        case 'due':
            return invoiceDueTimestamp(a) - invoiceDueTimestamp(b);
        case 'total':
            return a.invoice.total_cents - b.invoice.total_cents;
        case 'balance':
            return a.invoice.balance_cents - b.invoice.balance_cents;
    }
}

function invoiceTimestamp(row: InvoiceRow): number {
    return dateFromFirestore(row.invoice.issued_at ?? row.invoice.created_at)?.getTime() ?? 0;
}

function invoiceDueTimestamp(row: InvoiceRow): number {
    return dateFromFirestore(row.invoice.due_date)?.getTime() ?? 0;
}

function compareStrings(a: string | null | undefined, b: string | null | undefined): number {
    return (a ?? '').localeCompare(b ?? '', undefined, { numeric: true, sensitivity: 'base' });
}

function billingSortHref(column: BillingTableSortKey, query: string, sortKey: BillingTableSortKey | null, sortDirection: TableSortDirection | null): string {
    return tableSortHref('/billing', column, { q: query }, sortKey, sortDirection);
}
