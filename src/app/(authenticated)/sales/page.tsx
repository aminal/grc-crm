import { Check, ChevronDown, Plus } from 'lucide-react';
import Link from 'next/link';
import { PageHeader } from '@/components/layout/page-header';
import { StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dropdown, DropdownButton, DropdownItem, DropdownLabel, DropdownMenu } from '@/components/ui/dropdown';
import { TableSearch } from '@/components/ui/table-search';
import { activeTableSortDirection, paginatedTableItems, Table, TableBody, TableCell, TableHead, TableHeader, TablePagination, TableRow, tablePageFromSearchParam, tableSortDirectionFromSearchParam, tableSortHref, tableSortKeyFromSearchParam, tableSortParams, type TableSortDirection } from '@/components/ui/table';
import { dateFromFirestore, formatDate, formatMoney, orderStatusLabel } from '@/lib/domain/format';
import { requireNonGuest } from '@/lib/auth/session';
import { listOrders } from '@/lib/data/orders';
import type { FirestoreRecord, OrderData } from '@/lib/domain/types';
import { cn } from '@/lib/utils';

const salesTabs = [
    { key: 'all', label: 'All' },
    { key: 'pending', label: 'Pending' },
    { key: 'approved', label: 'Approved' },
    { key: 'delivered', label: 'Delivered' },
    { key: 'paid', label: 'Paid' },
    { key: 'rejected', label: 'Rejected' },
    { key: 'cancelled', label: 'Cancelled' },
] as const;

const salesSortKeys = ['order', 'status', 'created', 'packages', 'total'] as const;

const mobileSalesTabButtonClasses = 'relative isolate inline-flex items-baseline justify-center gap-x-2 rounded-lg border text-base/6 font-semibold px-[calc(--spacing(3.5)-1px)] py-[calc(--spacing(2.5)-1px)] sm:px-[calc(--spacing(3)-1px)] sm:py-[calc(--spacing(1.5)-1px)] sm:text-sm/6 focus:not-data-focus:outline-hidden data-focus:outline-2 data-focus:outline-offset-2 data-focus:outline-blue-500 data-disabled:opacity-50 *:data-[slot=icon]:-mx-0.5 *:data-[slot=icon]:my-0.5 *:data-[slot=icon]:size-5 *:data-[slot=icon]:shrink-0 *:data-[slot=icon]:self-center *:data-[slot=icon]:text-(--btn-icon) sm:*:data-[slot=icon]:my-1 sm:*:data-[slot=icon]:size-4 forced-colors:[--btn-icon:ButtonText] forced-colors:data-hover:[--btn-icon:ButtonText] border-transparent text-zinc-950 data-active:bg-zinc-950/5 data-hover:bg-zinc-950/5 dark:text-white dark:data-active:bg-white/10 dark:data-hover:bg-white/10 [--btn-icon:var(--color-zinc-500)] data-active:[--btn-icon:var(--color-zinc-700)] data-hover:[--btn-icon:var(--color-zinc-700)] dark:[--btn-icon:var(--color-zinc-500)] dark:data-active:[--btn-icon:var(--color-zinc-400)] dark:data-hover:[--btn-icon:var(--color-zinc-400)] w-full justify-between bg-purple-100 text-purple-700 data-hover:bg-purple-100 hover:bg-purple-100 dark:bg-purple-500/15 dark:text-purple-300 dark:data-hover:bg-purple-500/20 dark:hover:bg-purple-500/20';

type SalesTableSortKey = typeof salesSortKeys[number];

type SalesSearchParams = {
    q?: string | string[];
    status?: string | string[];
    page?: string | string[];
    sort?: string | string[];
    dir?: string | string[];
};

function firstSearchParam(value: string | string[] | undefined): string {
    return Array.isArray(value) ? (value[0] ?? '') : (value ?? '');
}

function salesHref(status: string, query: string, params: Record<string, string> = {}): string {
    const searchParams = new URLSearchParams();
    if (status !== 'all') {
        searchParams.set('status', status);
    }
    if (query) {
        searchParams.set('q', query);
    }

    Object.entries(params).forEach(([key, value]) => {
        if (value) {
            searchParams.set(key, value);
        }
    });

    const search = searchParams.toString();
    return search ? `/sales?${search}` : '/sales';
}

function matchesStatus(order: FirestoreRecord<OrderData>, status: string): boolean {
    return status === 'all' || order.data.status === status || (status === 'rejected' && order.data.status === 'delivery_rejected');
}

function filterOrders(orders: FirestoreRecord<OrderData>[], query: string): FirestoreRecord<OrderData>[] {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
        return orders;
    }

    return orders.filter((order) => [
        `order ${order.data.order_number}`,
        `#${order.data.order_number}`,
        order.data.company_name,
        order.data.facility_type,
        order.data.salesperson.name,
        order.data.salesperson.email,
        orderStatusLabel(order.data.status),
        order.data.status,
        order.data.terms,
        order.data.delivery_date,
        order.data.invoice?.invoice_number,
        formatDate(order.data.created_at),
        formatMoney(order.data.total_cents),
        ...order.data.items.flatMap((item) => [item.item, item.category, item.strain, item.package_tag, item.source_packages]),
    ].join(' ').toLowerCase().includes(normalized));
}

export default async function SalesPage({ searchParams }: {
    searchParams: Promise<SalesSearchParams>
}): Promise<React.ReactElement> {
    await requireNonGuest();

    const params = await searchParams;
    const query = firstSearchParam(params.q).trim();
    const status = firstSearchParam(params.status) || 'all';
    const sortKey = tableSortKeyFromSearchParam(params.sort, salesSortKeys);
    const sortDirection = sortKey ? tableSortDirectionFromSearchParam(params.dir) : null;
    const sortParams = tableSortParams(sortKey, sortDirection);
    const statusOrders = (await listOrders()).filter((order) => matchesStatus(order, status));
    const orders = sortOrders(filterOrders(statusOrders, query), sortKey, sortDirection);
    const currentPage = tablePageFromSearchParam(params.page, orders.length);
    const paginatedOrders = paginatedTableItems(orders, currentPage);
    const paginationHref = salesHref(status, query, sortParams);
    const preservedParams = status === 'all' ? sortParams : { status, ...sortParams };
    const activeSalesTab = salesTabs.find((tab) => tab.key === status) ?? salesTabs[0];

    return (
        <div>
            <PageHeader title='Sales' actions={
                <Button color='purple' href='/sales/create'>
                    <Plus data-slot='icon' aria-hidden='true' />
                    New Order
                </Button>} />

            <div className='mb-5 sm:hidden'>
                <Dropdown>
                    <DropdownButton className={mobileSalesTabButtonClasses}>
                        {activeSalesTab.label}
                        <ChevronDown data-slot='icon' aria-hidden='true' />
                    </DropdownButton>
                    <DropdownMenu anchor='bottom start' className='min-w-64'>
                        {salesTabs.map((tab) => (
                            <DropdownItem key={tab.key} href={salesHref(tab.key, query, sortParams)} aria-current={status === tab.key ? 'page' : undefined}>
                                {status === tab.key ? <Check data-slot='icon' aria-hidden='true' /> : null}
                                <DropdownLabel>{tab.label}</DropdownLabel>
                            </DropdownItem>
                        ))}
                    </DropdownMenu>
                </Dropdown>
            </div>

            <nav aria-label='Sales status' className='mb-5 hidden gap-2 overflow-x-auto sm:flex'>
                {salesTabs.map((tab) => (
                    <Link key={tab.key} href={salesHref(tab.key, query, sortParams)} aria-current={status === tab.key ? 'page' : undefined} className={cn('shrink-0 rounded-md px-3 py-2 text-sm font-medium text-zinc-500 transition hover:text-zinc-700 focus:outline-hidden focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-500 dark:text-zinc-400 dark:hover:text-white', status === tab.key && 'bg-purple-100 text-purple-700 hover:text-purple-700 dark:bg-purple-500/15 dark:text-purple-300 dark:hover:text-purple-300')}>
                        {tab.label}
                    </Link>
                ))}
            </nav>

            <div className='space-y-6'>
                <TableSearch query={query} placeholder='Filter sales by order, company, status, or package' preservedParams={preservedParams} />
                {orders.length > 0 ? (
                    <>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead sortHref={salesSortHref('order', status, query, sortKey, sortDirection)} sortDirection={activeTableSortDirection('order', sortKey, sortDirection)}>Order</TableHead>
                                    <TableHead sortHref={salesSortHref('status', status, query, sortKey, sortDirection)} sortDirection={activeTableSortDirection('status', sortKey, sortDirection)}>Status</TableHead>
                                    <TableHead className='hidden sm:table-cell' sortHref={salesSortHref('created', status, query, sortKey, sortDirection)} sortDirection={activeTableSortDirection('created', sortKey, sortDirection)}>Created</TableHead>
                                    <TableHead className='text-right' sortHref={salesSortHref('packages', status, query, sortKey, sortDirection)} sortDirection={activeTableSortDirection('packages', sortKey, sortDirection)}>Pkgs</TableHead>
                                    <TableHead className='text-right' sortHref={salesSortHref('total', status, query, sortKey, sortDirection)} sortDirection={activeTableSortDirection('total', sortKey, sortDirection)}>Total</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {paginatedOrders.map((order) => {
                                    const href = `/sales/${order.id}`;
                                    const label = `View order ${order.data.order_number}`;

                                    return (
                                        <TableRow key={order.id} className='group cursor-pointer'>
                                            <TableCell>
                                                <Link href={href} className='flex flex-col items-start gap-1 text-zinc-950 group-hover:text-purple-700 dark:text-white dark:group-hover:text-purple-400'>
                                                    <div className='font-semibold text-lg'>Order #{order.data.order_number}</div>
                                                    <div className='font-medium text-zinc-500 dark:text-zinc-400'>{order.data.company_name}</div>
                                                </Link>
                                            </TableCell>
                                            <TableCell>
                                                <Link href={href} aria-hidden tabIndex={-1} className='absolute inset-0 z-10'>
                                                    <span className='sr-only'>{label}</span>
                                                </Link>
                                                <StatusBadge status={order.data.status} />
                                            </TableCell>
                                            <TableCell className='hidden sm:table-cell'>
                                                <Link href={href} aria-hidden tabIndex={-1} className='absolute inset-0 z-10'>
                                                    <span className='sr-only'>{label}</span>
                                                </Link>
                                                <span className='font-medium text-zinc-500 dark:text-zinc-300'>{formatDate(order.data.created_at)}</span>
                                            </TableCell>
                                            <TableCell className='text-right font-medium text-purple-400'>
                                                <Link href={href} aria-hidden tabIndex={-1} className='absolute inset-0 z-10'>
                                                    <span className='sr-only'>{label}</span>
                                                </Link>
                                                {order.data.items.length}
                                            </TableCell>
                                            <TableCell className='text-right font-medium text-zinc-950 dark:text-white'>
                                                <Link href={href} aria-hidden tabIndex={-1} className='absolute inset-0 z-10'>
                                                    <span className='sr-only'>{label}</span>
                                                </Link>
                                                {formatMoney(order.data.total_cents)}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                        <TablePagination baseHref={paginationHref} currentPage={currentPage} totalItems={orders.length} />
                    </>
                ) : (
                    <p className='py-12 text-sm/6 text-center font-semibold uppercase text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-950/20 rounded-xl'>No matching orders</p>
                )}
            </div>
        </div>
    );
}

function sortOrders(orders: FirestoreRecord<OrderData>[], sortKey: SalesTableSortKey | null, sortDirection: TableSortDirection | null): FirestoreRecord<OrderData>[] {
    if (!sortKey || !sortDirection) {
        return orders;
    }

    const direction = sortDirection === 'asc' ? 1 : -1;
    return [...orders].sort((a, b) => compareOrders(a, b, sortKey) * direction);
}

function compareOrders(a: FirestoreRecord<OrderData>, b: FirestoreRecord<OrderData>, sortKey: SalesTableSortKey): number {
    switch (sortKey) {
        case 'order':
            return a.data.order_number - b.data.order_number;
        case 'status':
            return compareStrings(orderStatusLabel(a.data.status), orderStatusLabel(b.data.status));
        case 'created':
            return (dateFromFirestore(a.data.created_at)?.getTime() ?? 0) - (dateFromFirestore(b.data.created_at)?.getTime() ?? 0);
        case 'packages':
            return a.data.items.length - b.data.items.length;
        case 'total':
            return a.data.total_cents - b.data.total_cents;
    }
}

function compareStrings(a: string | null | undefined, b: string | null | undefined): number {
    return (a ?? '').localeCompare(b ?? '', undefined, { numeric: true, sensitivity: 'base' });
}

function salesSortHref(column: SalesTableSortKey, status: string, query: string, sortKey: SalesTableSortKey | null, sortDirection: TableSortDirection | null): string {
    return tableSortHref('/sales', column, { status: status === 'all' ? undefined : status, q: query }, sortKey, sortDirection);
}
