import { Plus } from 'lucide-react';
import Link from 'next/link';
import { PageHeader } from '@/components/layout/page-header';
import { StatusBadge } from '@/components/ui/badge';
import { buttonClasses } from '@/components/ui/button';
import { TableSearch } from '@/components/ui/table-search';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDate, formatMoney, orderStatusLabel } from '@/lib/domain/format';
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

type SalesSearchParams = {
    q?: string | string[];
    status?: string | string[];
};

function firstSearchParam(value: string | string[] | undefined): string {
    return Array.isArray(value) ? (value[0] ?? '') : (value ?? '');
}

function salesHref(status: string, query: string): string {
    const searchParams = new URLSearchParams();
    if (status !== 'all') {
        searchParams.set('status', status);
    }
    if (query) {
        searchParams.set('q', query);
    }

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
    const statusOrders = (await listOrders()).filter((order) => matchesStatus(order, status));
    const orders = filterOrders(statusOrders, query);
    const preservedParams = status === 'all' ? undefined : { status };

    return (
        <div>
            <PageHeader title='Sales' actions={
                <Link href='/sales/create' className={buttonClasses()}>
                    <Plus data-slot='icon' aria-hidden='true' />
                    New Order
                </Link>} />

            <div className='mb-5 flex gap-2 overflow-x-auto rounded-lg bg-zinc-50 p-2.5 dark:bg-zinc-950/40'>
                {salesTabs.map((tab) => (
                    <Link key={tab.key} href={salesHref(tab.key, query)} className={cn('rounded-lg px-6 py-2.5 uppercase text-sm font-semibold text-zinc-600 transition hover:text-zinc-950/95 dark:hover:text-white', status === tab.key && ' bg-zinc-300 dark:bg-zinc-950 text-zinc-950/65 dark:text-white')}>
                        {tab.label}
                    </Link>
                ))}
            </div>

            <div className='space-y-6'>
                <TableSearch query={query} placeholder='Filter sales by order, company, status, or package' preservedParams={preservedParams} />
                {orders.length > 0 ? (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Order</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className='hidden sm:table-cell'>Created</TableHead>
                                <TableHead className='text-right'>Pkgs</TableHead>
                                <TableHead className='text-right'>Total</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {orders.map((order) => {
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
                ) : (
                    <p className='py-12 text-sm/6 text-center font-semibold uppercase text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-950/20 rounded-xl'>No matching orders</p>
                )}
            </div>
        </div>
    );
}
