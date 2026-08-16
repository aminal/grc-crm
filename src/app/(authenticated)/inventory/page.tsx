import { Plus } from 'lucide-react';
import Link from 'next/link';
import { PageHeader } from '@/components/layout/page-header';
import { Badge, StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TableSearch } from '@/components/ui/table-search';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { canManageRestrictedResources, requireNonGuest } from '@/lib/auth/session';
import { groupInventory, listPackages } from '@/lib/data/inventory';
import { listProducts } from '@/lib/data/sales-settings';
import { compactNumber, formatInventoryCategory, formatMoney } from '@/lib/domain/format';
import {
    filterInventoryGroups,
    inventoryCounts,
} from '@/lib/metrc/inventory-grouping';
import { MetrcUploadDialog } from './metrc-upload-dialog';

export default async function InventoryPage({ searchParams }: {
    searchParams: Promise<{ q?: string | string[] }>
}): Promise<React.ReactElement> {
    const user = await requireNonGuest();
    const canManage = canManageRestrictedResources(user);

    const params = await searchParams;
    const query = firstSearchParam(params.q).toLowerCase().trim();
    const [packages, products] = await Promise.all([listPackages(false), listProducts()]);
    const productsById = new Map(products.map((product) => [product.id, product.data]));
    const packageAvailabilityByGroup = new Map(groupInventory(packages).map((group) => [
        group.key,
        {
            available: group.packages.filter((packageRecord) => packageRecord.data.package_status === 'available').length,
            total: group.package_count,
        },
    ]));
    const visiblePackages = packages.filter((packageRecord) => packageRecord.data.package_status === 'available');
    const groups = filterInventoryGroups(groupInventory(visiblePackages), query);
    const counts = inventoryCounts(groups);
    const countText = `${counts.products} ${counts.products === 1 ? 'product' : 'products'} · ${counts.packages} ${counts.packages === 1 ? 'pkg' : 'pkgs'}`;

    return (
        <div>
            <PageHeader
                title='Inventory'
                actions={(
                    <>
                        {canManage ? <MetrcUploadDialog /> : null}
                        <Button color='purple' href='/sales/create'>
                            <Plus data-slot='icon' aria-hidden='true' />
                            New Order
                        </Button>
                    </>
                )}
            />

            <div className='space-y-2'>
                <TableSearch query={query} placeholder='Search inventory' />
                <div className='dark:text-zinc-300 uppercase text-sm/6 font-semibold'>{countText}</div>
                <div>
                    {groups.length > 0 ? (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Item</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Strain</TableHead>
                                    <TableHead className='text-right'>Pkgs</TableHead>
                                    <TableHead className='text-right'>Quantity</TableHead>
                                    <TableHead className='text-right'>Value</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {groups.map((group) => {
                                    const product = group.product_id ? productsById.get(group.product_id) : undefined;
                                    const valueCents = Math.round((product?.unit_base_price_cents ?? 0) * group.total_quantity);
                                    const quantityLabel = group.mixed_units ? group.units.join(' / ') : (group.unit_of_measure === 'ea' ? 'Units' : group.unit_of_measure);
                                    const typeLabel = formatInventoryCategory(group.category);
                                    const strainLabel = group.strains.join(' / ');
                                    const availability = packageAvailabilityByGroup.get(group.key);
                                    const availablePackageCount = availability?.available ?? group.packages.filter((packageRecord) => packageRecord.data.package_status === 'available').length;
                                    const totalPackageCount = availability?.total ?? group.package_count;
                                    const statusPrefix = group.status === 'available' ? `${availablePackageCount}/${totalPackageCount}` : undefined;
                                    const href = `/inventory/${encodeURIComponent(group.key)}`;
                                    const label = `View inventory group ${group.item}`;

                                    return (
                                        <TableRow key={group.key} className='group cursor-pointer'>
                                            <TableCell>
                                                <Link href={href} className='flex flex-col items-start gap-1 text-zinc-950 group-hover:text-purple-700 dark:text-white dark:group-hover:text-purple-400'>
                                                    <div className='font-semibold text-lg'>{group.item}</div>
                                                    <div className='flex flex-wrap items-center gap-2'>
                                                        <StatusBadge status={group.status} prefix={statusPrefix} />
                                                        {group.lab_statuses.length > 0 ? group.lab_statuses.map((labStatus) => (
                                                            <Badge key={labStatus} color='violet'>{formatLabStatus(labStatus)}</Badge>
                                                        )) : <span className='font-semibold text-zinc-500 dark:text-zinc-400'>No lab status</span>}
                                                    </div>
                                                    <div className='font-medium dark:text-zinc-400/85'>{group.source_packages || 'No source package'}</div>
                                                </Link>
                                            </TableCell>
                                            <TableCell>
                                                <Link href={href} aria-hidden tabIndex={-1} className='absolute inset-0 z-10'>
                                                    <span className='sr-only'>{label}</span>
                                                </Link>
                                                <span className='font-medium text-zinc-500 dark:text-zinc-300'>{typeLabel || 'No type'}</span>
                                            </TableCell>
                                            <TableCell>
                                                <Link href={href} aria-hidden tabIndex={-1} className='absolute inset-0 z-10'>
                                                    <span className='sr-only'>{label}</span>
                                                </Link>
                                                <span className='font-medium text-zinc-500 dark:text-zinc-300'>{strainLabel || 'No strain'}</span>
                                            </TableCell>
                                            <TableCell className='text-right font-medium text-purple-400'>
                                                <Link href={href} aria-hidden tabIndex={-1} className='absolute inset-0 z-10'>
                                                    <span className='sr-only'>{label}</span>
                                                </Link>
                                                {compactNumber(group.package_count)}
                                            </TableCell>
                                            <TableCell className='text-right font-medium text-zinc-950 dark:text-white'>
                                                <Link href={href} aria-hidden tabIndex={-1} className='absolute inset-0 z-10'>
                                                    <span className='sr-only'>{label}</span>
                                                </Link>
                                                {compactNumber(group.total_quantity)} {quantityLabel}
                                            </TableCell>
                                            <TableCell className='text-right font-medium text-zinc-950 dark:text-white'>
                                                <Link href={href} aria-hidden tabIndex={-1} className='absolute inset-0 z-10'>
                                                    <span className='sr-only'>{label}</span>
                                                </Link>
                                                {formatMoney(valueCents)}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    ) : (
                        <p className='border-t border-zinc-950/10 py-8 text-sm/6 text-zinc-500 dark:border-white/10 dark:text-zinc-400'>No inventory packages matched your filters.</p>
                    )}
                </div>
            </div>
        </div>
    );
}

function formatLabStatus(value: string): string {
    return value
        .replaceAll('_', ' ')
        .replaceAll('-', ' ')
        .replace(/\b(RETEST|TEST)\s*(PASSED|FAILED)\b/gi, '$1 $2')
        .replace(/\s+/g, ' ')
        .trim();
}

function firstSearchParam(value: string | string[] | undefined): string {
    return Array.isArray(value) ? (value[0] ?? '') : (value ?? '');
}
