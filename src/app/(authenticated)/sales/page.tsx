import { Plus } from 'lucide-react';
import Link from 'next/link';
import { PageHeader } from '@/components/layout/page-header';
import { StatusBadge } from '@/components/ui/badge';
import { buttonClasses } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { SectionTabs } from '@/components/ui/section-tabs';
import { formatDateTime, formatMoney } from '@/lib/domain/format';
import { listOrders } from '@/lib/data/orders';

export default async function SalesPage({ searchParams }: {
    searchParams: Promise<{ status?: string }>
}): Promise<React.ReactElement> {
    const params = await searchParams;
    const status = params.status ?? '';
    const orders = (await listOrders()).filter((order) => !status || order.data.status === status);

    return (
        <div>
            <PageHeader title='Sales' description='Track orders, approvals, deliveries, invoices, payments, and monitor all the activity between.' actions={
                <Link href='/sales/create' className={buttonClasses()}>
                    <Plus data-slot='icon' aria-hidden='true' />
                    New Order
                </Link>} />

            <SectionTabs
                items={[
                    { key: 'all', label: 'All', href: '/sales' },
                    { key: 'pending', label: 'Pending', href: '/sales?status=pending' },
                    { key: 'approved', label: 'Approved', href: '/sales?status=approved' },
                    { key: 'delivered', label: 'Delivered', href: '/sales?status=delivered' },
                    { key: 'paid', label: 'Paid', href: '/sales?status=paid' },
                ]}
                activeKey={status || 'all'}
            />

            <div className='space-y-3'>
                {orders.map((order) => (
                    <Link key={order.id} href={`/sales/${order.id}`} className='block rounded-lg bg-white shadow-xs ring-1 ring-zinc-950/5 p-5 transition hover:border-zinc-950/20 hover:bg-zinc-50 dark:bg-zinc-950/40 dark:hover:bg-zinc-900'>
                        <div className='flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between'>
                            <div>
                                <div className='flex flex-wrap items-center gap-2'>
                                    <h2 className='text-base/7 font-semibold text-zinc-950 sm:text-sm/6 dark:text-white'>Order
                                        #{order.data.order_number}</h2>
                                    <StatusBadge status={order.data.status} />
                                </div>
                                <p className='mt-2 text-sm text-zinc-700'>{order.data.company_name}</p>
                                <p className='text-sm text-zinc-500'>{order.data.items.length} packages ·
                                    Created {formatDateTime(order.data.created_at)}</p>
                            </div>
                            <div className='text-left lg:text-right'>
                                <p className='text-lg font-semibold text-zinc-950 dark:text-white'>{formatMoney(order.data.total_cents)}</p>
                                <p className='text-sm text-zinc-600'>Invoice
                                    balance {formatMoney(order.data.invoice?.balance_cents ?? 0)}</p>
                            </div>
                        </div>
                    </Link>
                ))}
                {orders.length === 0 ? <Card><CardContent><p className='text-sm text-zinc-600'>No orders found.</p>
                </CardContent></Card> : null}
            </div>
        </div>
    );
}
