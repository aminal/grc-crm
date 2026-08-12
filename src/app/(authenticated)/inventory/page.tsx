import { Plus } from 'lucide-react';
import Link from 'next/link';
import { PageHeader } from '@/components/layout/page-header';
import { StatusBadge } from '@/components/ui/badge';
import { buttonClasses } from '@/components/ui/button';
import { InventoryControls } from '@/components/inventory/inventory-controls';
import { groupInventory, listPackages } from '@/lib/data/inventory';
import { listProducts } from '@/lib/data/sales-settings';
import { compactNumber, formatDate, formatInventoryCategory, formatMoney } from '@/lib/domain/format';
import {
    filterInventoryGroups,
    inventoryCounts,
    type InventorySortField,
    sortInventoryGroups
} from '@/lib/metrc/inventory-grouping';
import { MetrcUploadDialog } from './metrc-upload-dialog';

export default async function InventoryPage({ searchParams }: {
    searchParams: Promise<{ q?: string; show_sold?: string; sort?: string; direction?: string }>
}): Promise<React.ReactElement> {
    const params = await searchParams;
    const query = (params.q ?? '').toLowerCase().trim();
    const showSold = params.show_sold === '1';
    const sort = isInventorySortField(params.sort) ? params.sort : 'expiration_date';
    const direction = params.direction === 'desc' ? 'desc' : 'asc';
    const [packages, products] = await Promise.all([listPackages(false), listProducts()]);
    const productsById = new Map(products.map((product) => [product.id, product.data]));
    const visiblePackages = showSold ? packages : packages.filter((packageRecord) => packageRecord.data.package_status === 'available');
    const groups = sortInventoryGroups(filterInventoryGroups(groupInventory(visiblePackages), query), sort, direction);
    const counts = inventoryCounts(groups);
    const countText = `${counts.products} ${counts.products === 1 ? 'product' : 'products'} · ${counts.packages} ${counts.packages === 1 ? 'pkg' : 'pkgs'}`;

    return (
        <div>
            <PageHeader
                title='Inventory'
                description='Upload METRC active-package exports, track package status, and drill into product/source groups.'
                actions={(
                    <>
                        <MetrcUploadDialog />
                        <Link href='/sales/create' className={buttonClasses()}>
                            <Plus data-slot='icon' aria-hidden='true' />
                            New Order
                        </Link>
                    </>
                )}
            />

            <div className='space-y-2'>
                <InventoryControls query={query} sort={sort} direction={direction} showSold={showSold} />
                <div className='dark:text-zinc-300 uppercase text-sm/6 font-semibold'>{countText}</div>
                <div>
                    <ul className='space-y-5'>
                        {groups.map((group) => {
                            const product = group.product_id ? productsById.get(group.product_id) : undefined;
                            const valueCents = Math.round((product?.unit_base_price_cents ?? 0) * group.total_quantity);

                            return (
                                <li key={group.key} className='dark:bg-zinc-950/40 p-6 rounded-xl'>
                                    <Link href={`/inventory/${encodeURIComponent(group.key)}`} className='flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between'>
                                        <div>
                                            <h2 className='text-base/7 font-semibold text-zinc-950 sm:text-xl/6 dark:text-white'>{group.item} </h2>
                                            <div className='flex gap-4 pt-2'>
                                                <StatusBadge status={group.status} />
                                                <p className='mt-1 text-sm text-zinc-400/85 uppercase font-bold pb-2'>{group.source_packages || 'No source package'}</p>
                                            </div>
                                            <p className='mt-1 text-sm text-zinc-500'>{[formatInventoryCategory(group.category), group.strains.join(' / '), group.lab_statuses.join(' / ')].filter(Boolean).join(' · ') || 'No category, strain, or lab status'}</p>
                                            <p className='mt-1 text-sm text-zinc-500'>Expires {formatDate(group.expiration_date)}</p>
                                        </div>
                                        <div className='flex flex-col items-end uppercase font-semibold text-zinc-300 text-right'>
                                            <div className='flex'>
                                                <div className='flex flex-col'>
                                                    <div className='text-3xl/6 font-bold text-purple-500'>{group.package_count}</div>
                                                    <div className='text-sm/6 text-zinc-500'>{ group.package_count === 1 ? 'PKG' : 'PKGS' }</div>
                                                </div>
                                                <div className='w-0.5 bg-zinc-800 mx-4'/>
                                                <div className='flex flex-col'>
                                                    <div className='text-3xl/6 font-bold text-white'>{compactNumber(group.total_quantity)}</div>
                                                    <div className='text-sm/6 text-zinc-500'>{group.mixed_units ? group.units.join(' / ') : (group.unit_of_measure === "ea" ? 'Units' : group.unit_of_measure)}</div>
                                                </div>
                                            </div>
                                            <div className='pt-3 text-sm/6 text-zinc-500'>
                                                <div className='text-2xl/6 font-bold text-white'>{formatMoney(valueCents)}</div>
                                                <div>Value</div>
                                            </div>
                                        </div>
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                    {groups.length === 0 ?
                        <p className='border-t border-zinc-950/10 py-8 text-sm/6 text-zinc-500 dark:border-white/10 dark:text-zinc-400'>No
                            inventory packages matched your filters.</p> : null}
                </div>
            </div>
        </div>
    );
}

function isInventorySortField(value: string | undefined): value is InventorySortField {
    return value === 'expiration_date' || value === 'item' || value === 'package_count' || value === 'quantity';
}
