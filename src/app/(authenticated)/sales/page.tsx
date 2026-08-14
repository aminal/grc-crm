import { Plus } from 'lucide-react';
import Link from 'next/link';
import { PageHeader } from '@/components/layout/page-header';
import { StatusBadge } from '@/components/ui/badge';
import { buttonClasses } from '@/components/ui/button';
import { SectionTabs } from '@/components/ui/section-tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDate, formatMoney } from '@/lib/domain/format';
import { listOrders } from '@/lib/data/orders';

export default async function SalesPage({ searchParams }: {
    searchParams: Promise<{ status?: string }>
}): Promise<React.ReactElement> {
    const params = await searchParams;
    const status = params.status || 'pending';
    const orders = (await listOrders()).filter((order) => status === 'all' || order.data.status === status || (status === 'rejected' && order.data.status === 'delivery_rejected'));

    return (
        <div>
            <PageHeader title='Sales' description='Track orders, approvals, deliveries, invoices, payments, and monitor all the activity between.' actions={
                <Link href='/sales/create' className={buttonClasses()}>
                    <Plus data-slot='icon' aria-hidden='true' />
                    New Order
                </Link>} />

            <SectionTabs
                items={[
                    { key: 'pending', label: 'Pending', href: '/sales' },
                    { key: 'approved', label: 'Approved', href: '/sales?status=approved' },
                    { key: 'delivered', label: 'Delivered', href: '/sales?status=delivered' },
                    { key: 'paid', label: 'Paid', href: '/sales?status=paid' },
                    { key: 'rejected', label: 'Rejected', href: '/sales?status=rejected' },
                    { key: 'cancelled', label: 'Cancelled', href: '/sales?status=cancelled' },
                    { key: 'all', label: 'All', href: '/sales?status=all' },
                ]}
                activeKey={status}
            />

            <div>
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
