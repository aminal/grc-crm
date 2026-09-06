import { Plus } from 'lucide-react';
import Link from 'next/link';
import { PageHeader } from '@/components/layout/page-header';
import { Badge, StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { StatsBar, type StatsBarItem } from '@/components/ui/stats-bar';
import { TableSearch } from '@/components/ui/table-search';
import { activeTableSortDirection, paginatedTableItems, Table, TableBody, TableCell, TableHead, TableHeader, TablePagination, TableRow, tablePageFromSearchParam, tableSortDirectionFromSearchParam, tableSortHref, tableSortKeyFromSearchParam, tableSortParams, type TableSortDirection } from '@/components/ui/table';
import { isFeatureEnabled } from '@/lib/auth/permissions';
import { requireSectionEnabled } from '@/lib/auth/session';
import { listDistributorCompanies } from '@/lib/data/crm';
import { groupInventory, listPackages } from '@/lib/data/inventory';
import { listProducts, listStrains } from '@/lib/data/sales-settings';
import { compactNumber, formatInventoryCategory, formatMoney } from '@/lib/domain/format';
import type { FirestoreRecord, PackageData, ProductData } from '@/lib/domain/types';
import {
    filterInventoryGroups,
} from '@/lib/metrc/inventory-grouping';
import { MetrcUploadDialog } from './metrc-upload-dialog';

type InventoryGroup = ReturnType<typeof groupInventory>[number];
type InventoryTableSortKey = 'item' | 'type' | 'strain' | 'packages' | 'quantity' | 'value';

const inventorySortKeys = ['item', 'type', 'strain', 'packages', 'quantity', 'value'] as const;

type InventorySearchParams = {
    q?: string | string[];
    page?: string | string[];
    sort?: string | string[];
    dir?: string | string[];
};

type InventoryStats = {
    activePackageCount: number;
    availablePackageCount: number;
    availableProductCount: number;
    inventoryValueCents: number;
    pendingPackageCount: number;
    soldPackageCount: number;
};

export default async function InventoryPage({ searchParams }: {
    searchParams: Promise<InventorySearchParams>
}): Promise<React.ReactElement> {
    const user = await requireSectionEnabled('inventory');
    const canManageInventory = isFeatureEnabled(user, 'inventory', 'upload_metrc');
    const canCreateOrder = isFeatureEnabled(user, 'sales', 'create_orders');
    const canViewPrivateStrains = isFeatureEnabled(user, 'strains', 'view_private_strains');

    const params = await searchParams;
    const query = firstSearchParam(params.q).toLowerCase().trim();
    const sortKey = tableSortKeyFromSearchParam(params.sort, inventorySortKeys);
    const sortDirection = sortKey ? tableSortDirectionFromSearchParam(params.dir) : null;
    const sortParams = tableSortParams(sortKey, sortDirection);
    const [packages, products, strains, distributors] = await Promise.all([listPackages(false), listProducts(), listStrains(), canManageInventory ? listDistributorCompanies() : Promise.resolve([])]);
    const distributorOptions = distributors.map((distributor) => ({
        value: distributor.id,
        label: distributor.data.company_name,
        description: [
            distributor.data.license_number,
            [distributor.data.address.city, distributor.data.address.state].filter(Boolean).join(', '),
        ].filter(Boolean).join(' · ') || undefined,
    }));
    const privateStrainIds = new Set(strains.filter((strain) => strain.data.status === 'Hidden').map((strain) => strain.id));
    const privateProductIds = new Set(products.filter((product) => product.data.status === 'Hidden' || product.data.strain_ids.some((strainId) => privateStrainIds.has(strainId))).map((product) => product.id));
    const visibleProducts = canViewPrivateStrains ? products : products.filter((product) => !privateProductIds.has(product.id));
    const productsById = new Map(visibleProducts.map((product) => [product.id, product.data]));
    const permissionedPackages = canViewPrivateStrains ? packages : packages.filter((packageRecord) => !packageRecord.data.product_id || !privateProductIds.has(packageRecord.data.product_id));
    const allPackageGroups = groupInventory(permissionedPackages);
    const packageAvailabilityByGroup = new Map(allPackageGroups.map((group) => [
        group.key,
        {
            available: group.packages.filter((packageRecord) => (packageRecord.data.package_status ?? 'available') === 'available').length,
            total: group.package_count,
        },
    ]));
    const visiblePackages = permissionedPackages.filter((packageRecord) => (packageRecord.data.package_status ?? 'available') === 'available');
    const availableGroups = groupInventory(visiblePackages);
    const inventoryStats = inventoryStatsFromGroups(availableGroups, permissionedPackages, productsById);
    const groups = sortInventoryGroups(filterInventoryGroups(availableGroups, query), sortKey, sortDirection, productsById);
    const currentPage = tablePageFromSearchParam(params.page, groups.length);
    const paginatedGroups = paginatedTableItems(groups, currentPage);
    const paginationHref = inventoryHref(query, sortParams);

    return (
        <div>
            <PageHeader
                title='Inventory'
                actions={(
                    <>
                        {canManageInventory ? <MetrcUploadDialog distributorOptions={distributorOptions} /> : null}
                        {canCreateOrder ? (
                            <Button color='purple' href='/sales/create'>
                                <Plus data-slot='icon' aria-hidden='true' />
                                New Order
                            </Button>
                        ) : null}
                    </>
                )}
            />

            <div className='-mt-2 space-y-6'>
                <StatsBar items={inventoryStatsItems(inventoryStats)} />
                <div className='space-y-2'>
                    <TableSearch query={query} placeholder='Search inventory' preservedParams={sortParams} />
                    <div>
                        {groups.length > 0 ? (
                            <>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead sortHref={inventorySortHref('item', query, sortKey, sortDirection)} sortDirection={activeTableSortDirection('item', sortKey, sortDirection)}>Item</TableHead>
                                            <TableHead sortHref={inventorySortHref('type', query, sortKey, sortDirection)} sortDirection={activeTableSortDirection('type', sortKey, sortDirection)}>Type</TableHead>
                                            <TableHead sortHref={inventorySortHref('strain', query, sortKey, sortDirection)} sortDirection={activeTableSortDirection('strain', sortKey, sortDirection)}>Strain</TableHead>
                                            <TableHead className='text-right' sortHref={inventorySortHref('packages', query, sortKey, sortDirection)} sortDirection={activeTableSortDirection('packages', sortKey, sortDirection)}>Pkgs</TableHead>
                                            <TableHead className='text-right' sortHref={inventorySortHref('quantity', query, sortKey, sortDirection)} sortDirection={activeTableSortDirection('quantity', sortKey, sortDirection)}>Quantity</TableHead>
                                            <TableHead className='text-right' sortHref={inventorySortHref('value', query, sortKey, sortDirection)} sortDirection={activeTableSortDirection('value', sortKey, sortDirection)}>Value</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {paginatedGroups.map((group) => {
                                            const product = group.product_id ? productsById.get(group.product_id) : undefined;
                                            const productName = product?.name || group.item;
                                            const skuLabel = product?.sku || 'No SKU';
                                            const valueCents = inventoryValueCents(group, productsById);
                                            const quantityLabel = group.mixed_units ? group.units.join(' / ') : (group.unit_of_measure === 'ea' ? 'Units' : group.unit_of_measure);
                                            const typeLabel = formatInventoryCategory(group.category);
                                            const strainLabel = group.strains.join(' / ');
                                            const availability = packageAvailabilityByGroup.get(group.key);
                                            const availablePackageCount = availability?.available ?? group.packages.filter((packageRecord) => packageRecord.data.package_status === 'available').length;
                                            const totalPackageCount = availability?.total ?? group.package_count;
                                            const statusPrefix = group.status === 'available' ? `${availablePackageCount}/${totalPackageCount}` : undefined;
                                            const href = `/inventory/${encodeURIComponent(group.key)}`;
                                            const label = `View inventory group ${skuLabel}`;

                                            return (
                                                <TableRow key={group.key} className='group cursor-pointer'>
                                                    <TableCell>
                                                        <Link href={href} className='flex flex-col items-start gap-1 text-zinc-950 group-hover:text-purple-700 dark:text-white dark:group-hover:text-purple-400'>
                                                            <div className='font-semibold text-lg'>{skuLabel}</div>
                                                            <div className='font-medium text-zinc-500 dark:text-zinc-400'>{productName || 'No product name'}</div>
                                                            <div className='font-medium dark:text-zinc-400/85'>{group.source_packages || 'No source package'}</div>
                                                            <div className='flex flex-wrap items-center gap-2'>
                                                                <StatusBadge status={group.status} prefix={statusPrefix} />
                                                                {group.lab_statuses.length > 0 ? group.lab_statuses.map((labStatus) => (
                                                                    <Badge key={labStatus} color='violet'>{formatLabStatus(labStatus)}</Badge>
                                                                )) : <span className='font-semibold text-zinc-500 dark:text-zinc-400'>No lab status</span>}
                                                            </div>
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
                                <TablePagination baseHref={paginationHref} currentPage={currentPage} totalItems={groups.length} />
                            </>
                        ) : (
                            <p className='border-t border-zinc-950/10 py-8 text-sm/6 text-zinc-500 dark:border-white/10 dark:text-zinc-400'>No inventory packages matched your filters.</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function inventoryStatsFromGroups(groups: InventoryGroup[], packages: FirestoreRecord<PackageData>[], productsById: Map<string, ProductData>): InventoryStats {
    const totalValueCents = groups.reduce((sum, group) => sum + inventoryValueCents(group, productsById), 0);

    return {
        activePackageCount: packages.length,
        availablePackageCount: groups.reduce((sum, group) => sum + group.package_count, 0),
        availableProductCount: groups.length,
        inventoryValueCents: totalValueCents,
        pendingPackageCount: packages.filter((packageRecord) => packageRecord.data.package_status === 'pending').length,
        soldPackageCount: packages.filter((packageRecord) => packageRecord.data.package_status === 'sold').length,
    };
}

function formatInventoryStatMoney(cents: number): string {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(cents / 100);
}

function inventoryStatsItems(stats: InventoryStats): StatsBarItem[] {
    return [
        {
            label: 'Products',
            value: compactNumber(stats.availableProductCount),
            valueClassName: 'text-sky-700 dark:text-sky-500/90',
        },
        {
            label: 'Active',
            value: compactNumber(stats.activePackageCount),
            valueClassName: 'text-indigo-700 dark:text-indigo-400',
        },
        {
            label: 'Available',
            value: compactNumber(stats.availablePackageCount),
            valueClassName: 'text-emerald-700 dark:text-emerald-500/90',
        },
        {
            label: 'Pending',
            value: compactNumber(stats.pendingPackageCount),
            valueClassName: 'text-amber-700 dark:text-amber-400/95',
        },
        {
            label: 'Sold',
            value: compactNumber(stats.soldPackageCount),
            valueClassName: 'text-purple-700 dark:text-purple-400/95',
        },
        {
            label: 'Inv Value',
            value: formatInventoryStatMoney(stats.inventoryValueCents),
            valueClassName: 'text-purple-700 dark:text-emerald-400/95',
        },
    ];
}

function sortInventoryGroups(groups: InventoryGroup[], sortKey: InventoryTableSortKey | null, sortDirection: TableSortDirection | null, productsById: Map<string, ProductData>): InventoryGroup[] {
    if (!sortKey || !sortDirection) {
        return groups;
    }

    const direction = sortDirection === 'asc' ? 1 : -1;
    return [...groups].sort((a, b) => compareInventoryGroups(a, b, sortKey, productsById) * direction);
}

function compareInventoryGroups(a: InventoryGroup, b: InventoryGroup, sortKey: InventoryTableSortKey, productsById: Map<string, ProductData>): number {
    switch (sortKey) {
        case 'item':
            return compareStrings(a.item, b.item);
        case 'type':
            return compareStrings(formatInventoryCategory(a.category), formatInventoryCategory(b.category));
        case 'strain':
            return compareStrings(a.strains.join(' / '), b.strains.join(' / '));
        case 'packages':
            return a.package_count - b.package_count;
        case 'quantity':
            return a.total_quantity - b.total_quantity;
        case 'value':
            return inventoryValueCents(a, productsById) - inventoryValueCents(b, productsById);
    }
}

function inventoryValueCents(group: InventoryGroup, productsById: Map<string, ProductData>): number {
    const product = group.product_id ? productsById.get(group.product_id) : undefined;
    return Math.round((product?.unit_base_price_cents ?? 0) * group.total_quantity);
}

function compareStrings(a: string | null | undefined, b: string | null | undefined): number {
    return (a ?? '').localeCompare(b ?? '', undefined, { numeric: true, sensitivity: 'base' });
}

function inventorySortHref(column: InventoryTableSortKey, query: string, sortKey: InventoryTableSortKey | null, sortDirection: TableSortDirection | null): string {
    return tableSortHref('/inventory', column, { q: query }, sortKey, sortDirection);
}

function formatLabStatus(value: string): string {
    return value
        .replaceAll('_', ' ')
        .replaceAll('-', ' ')
        .replace(/\b(RETEST|TEST)\s*(PASSED|FAILED)\b/gi, '$1 $2')
        .replace(/\s+/g, ' ')
        .trim();
}

function inventoryHref(query: string, params: Record<string, string> = {}): string {
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
    return search ? `/inventory?${search}` : '/inventory';
}

function firstSearchParam(value: string | string[] | undefined): string {
    return Array.isArray(value) ? (value[0] ?? '') : (value ?? '');
}
