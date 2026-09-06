import Link from 'next/link';
import { ProductCategoryBadge } from '@/components/products/product-category-badge';
import { Badge, type BadgeColor } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import {
    activeTableSortDirection,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
    type TableSortDirection,
    tableSortHref
} from '@/components/ui/table';
import type { BrandData, FirestoreRecord, ProductData, ProductStatus, StrainData } from '@/lib/domain/types';

export type ProductTableSortKey = 'name' | 'sku' | 'brand' | 'strain' | 'category' | 'status';

type ProductTableProps = {
    products: FirestoreRecord<ProductData>[];
    brands: FirestoreRecord<BrandData>[];
    strains: FirestoreRecord<StrainData>[];
    query?: string;
    sortKey?: ProductTableSortKey | null;
    sortDirection?: TableSortDirection | null;
    baseHref?: string;
    rowParams?: Record<string, string>;
};

function isArchived(record: FirestoreRecord<BrandData | StrainData>): boolean {
    const archived = record.data.archived_at ?? ('deleted_at' in record.data ? record.data.deleted_at : null);
    return archived !== null && archived !== undefined;
}

export function ProductTable({
    products,
    brands,
    strains,
    query = '',
    sortKey = null,
    sortDirection = null,
    baseHref = '/settings/products',
    rowParams = {},
}: ProductTableProps): React.ReactElement {
    const hasActiveStrains = strains.some((strain) => !isArchived(strain));

    if (products.length === 0) {
        if (brands.length === 0) {
            return <EmptyState title='No products yet' description='Create a brand before adding your first product.' />;
        }

        return hasActiveStrains
            ? <EmptyState title='No products yet' description='Add a product to start building your sales catalog.' />
            : <EmptyState title='No products yet' description='Create a strain before adding your first product.' />;
    }

    const brandLabels = new Map(brands.map((brand) => [brand.id, `${brand.data.acronym || brand.data.name}${isArchived(brand) ? ' (archived)' : ''}`]));
    const strainNames = new Map(strains.map((strain) => [strain.id, `${strain.data.name}${isArchived(strain) ? ' (archived)' : ''}`]));

    function displayStrains(strainIds: string[]): string {
        return strainIds.length > 0 ? strainIds.map((strainId) => strainNames.get(strainId) ?? strainId).join(', ') : '—';
    }

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead sortHref={productSortHref(baseHref, 'name', query, sortKey, sortDirection)} sortDirection={activeTableSortDirection('name', sortKey, sortDirection)}>Name</TableHead>
                    <TableHead sortHref={productSortHref(baseHref, 'category', query, sortKey, sortDirection)} sortDirection={activeTableSortDirection('category', sortKey, sortDirection)}>Category</TableHead>
                    <TableHead sortHref={productSortHref(baseHref, 'status', query, sortKey, sortDirection)} sortDirection={activeTableSortDirection('status', sortKey, sortDirection)}>Status</TableHead>
                    <TableHead className='hidden xl:table-cell' sortHref={productSortHref(baseHref, 'sku', query, sortKey, sortDirection)} sortDirection={activeTableSortDirection('sku', sortKey, sortDirection)}>SKU</TableHead>
                    <TableHead className='hidden xl:table-cell' sortHref={productSortHref(baseHref, 'brand', query, sortKey, sortDirection)} sortDirection={activeTableSortDirection('brand', sortKey, sortDirection)}>Brand</TableHead>
                    <TableHead className='hidden sm:table-cell' sortHref={productSortHref(baseHref, 'strain', query, sortKey, sortDirection)} sortDirection={activeTableSortDirection('strain', sortKey, sortDirection)}>Strain</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {products.map((product) => {
                    const href = productHref(baseHref, product.id, query, rowParams);
                    const label = `View ${product.data.name}`;

                    return (
                        <TableRow key={product.id} className='group cursor-pointer'>
                            <TableCell>
                                <Link href={href} className='font-semibold text-zinc-950 group-hover:text-zinc-700 dark:text-white dark:group-hover:text-zinc-300'>
                                    <span className='absolute inset-0' />
                                    {product.data.name}
                                    {product.data.sku ?
                                        <div className='mt-1 text-xs font-medium text-zinc-500 xl:hidden dark:text-zinc-400'>{product.data.sku}</div> : null}
                                    <div className='flex gap-2'>
                                        {product.data.strain_ids.length ?
                                            <div className='mt-1 text-xs font-medium text-zinc-500 md:hidden dark:text-zinc-400'>{displayStrains(product.data.strain_ids)}</div> : null}
                                        {product.data.strain_ids.length && product.data.brand_id ?
                                            <div className='pt-0.5 text-zinc-500 md:hidden dark:text-zinc-400'>•</div> : ''}
                                        {product.data.brand_id ?
                                            <div className='mt-1 text-xs font-medium text-zinc-500 xl:hidden dark:text-zinc-400'>
                                                Brand: {brandLabels.get(product.data.brand_id)}
                                            </div> : null}
                                    </div>
                                </Link>
                            </TableCell>
                            <TableCell>
                                <Link href={href} aria-hidden tabIndex={-1} className='absolute inset-0 z-10'>
                                    <span className='sr-only'>{label}</span>
                                </Link>
                                <ProductCategoryBadge category={product.data.category} />
                            </TableCell>
                            <TableCell>
                                <Link href={href} aria-hidden tabIndex={-1} className='absolute inset-0 z-10'>
                                    <span className='sr-only'>{label}</span>
                                </Link>
                                <ProductStatusBadge status={product.data.status} />
                            </TableCell>
                            <TableCell className='hidden xl:table-cell'>
                                <Link href={href} aria-hidden tabIndex={-1} className='absolute inset-0 z-10'>
                                    <span className='sr-only'>{label}</span>
                                </Link>
                                {product.data.sku || '—'}
                            </TableCell>
                            <TableCell className='hidden xl:table-cell'>
                                <Link href={href} aria-hidden tabIndex={-1} className='absolute inset-0 z-10'>
                                    <span className='sr-only'>{label}</span>
                                </Link>
                                {brandLabels.get(product.data.brand_id) ?? 'Unknown Brand'}
                            </TableCell>
                            <TableCell className='hidden sm:table-cell'>
                                <Link href={href} aria-hidden tabIndex={-1} className='absolute inset-0 z-10'>
                                    <span className='sr-only'>{label}</span>
                                </Link>
                                {displayStrains(product.data.strain_ids)}
                            </TableCell>
                        </TableRow>
                    );
                })}
            </TableBody>
        </Table>
    );
}

function ProductStatusBadge({ status }: { status: ProductStatus }): React.ReactElement {
    const statusColors = {
        Active: 'emerald',
        Hidden: 'purple',
        'Coming Soon': 'sky',
        Sunsetting: 'amber',
        Archived: 'zinc',
    } satisfies Record<ProductStatus, BadgeColor>;

    return <Badge color={statusColors[status]}>{status}</Badge>;
}

function productHref(baseHref: string, productId: string, query: string, params: Record<string, string>): string {
    const searchParams = new URLSearchParams();
    if (query) {
        searchParams.set('q', query);
    }

    Object.entries(params).forEach(([key, value]) => {
        if (value) {
            searchParams.set(key, value);
        }
    });

    searchParams.set('product', productId);
    return `${baseHref}?${searchParams.toString()}`;
}

function productSortHref(baseHref: string, column: ProductTableSortKey, query: string, sortKey: ProductTableSortKey | null, sortDirection: TableSortDirection | null): string {
    return tableSortHref(baseHref, column, { q: query }, sortKey, sortDirection);
}
