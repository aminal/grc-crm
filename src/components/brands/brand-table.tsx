import Link from 'next/link';
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
import type { BrandData, FirestoreRecord } from '@/lib/domain/types';

export type BrandTableSortKey = 'name' | 'acronym' | 'website';

export function BrandTable({
    brands,
    query = '',
    sortKey = null,
    sortDirection = null,
    baseHref = '/settings/brands',
    rowParams = {},
}: {
    brands: FirestoreRecord<BrandData>[];
    query?: string;
    sortKey?: BrandTableSortKey | null;
    sortDirection?: TableSortDirection | null;
    baseHref?: string;
    rowParams?: Record<string, string>;
}): React.ReactElement {
    if (brands.length === 0) {
        return <EmptyState title='No brands yet' description='Create a brand to start building your sales catalog.' />;
    }

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead sortHref={brandSortHref(baseHref, 'name', query, sortKey, sortDirection)} sortDirection={activeTableSortDirection('name', sortKey, sortDirection)}>Name</TableHead>
                    <TableHead className='hidden sm:table-cell' sortHref={brandSortHref(baseHref, 'acronym', query, sortKey, sortDirection)} sortDirection={activeTableSortDirection('acronym', sortKey, sortDirection)}>Acronym</TableHead>
                    <TableHead sortHref={brandSortHref(baseHref, 'website', query, sortKey, sortDirection)} sortDirection={activeTableSortDirection('website', sortKey, sortDirection)}>Website</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {brands.map((brand) => {
                    const href = brandHref(baseHref, brand.id, query, rowParams);
                    const label = `View ${brand.data.name}`;

                    return (
                        <TableRow key={brand.id} className='group cursor-pointer'>
                            <TableCell>
                                <Link href={href} className='font-semibold text-zinc-950 group-hover:text-zinc-700 dark:text-white dark:group-hover:text-zinc-300'>
                                    <span className='absolute inset-0' />
                                    {brand.data.name}
                                </Link>
                                {brand.data.acronym ?
                                    <div className='mt-1 text-xs font-medium text-zinc-500 xl:hidden dark:text-zinc-400'>
                                        Acronym: {brand.data.acronym}
                                    </div> : null}
                            </TableCell>
                            <TableCell className='hidden sm:table-cell'>
                                <Link href={href} aria-hidden tabIndex={-1} className='absolute inset-0 z-10'>
                                    <span className='sr-only'>{label}</span>
                                </Link>
                                {brand.data.acronym || '—'}
                            </TableCell>
                            <TableCell className='max-w-sm truncate'>
                                <Link href={href} aria-hidden tabIndex={-1} className='absolute inset-0 z-10'>
                                    <span className='sr-only'>{label}</span>
                                </Link>
                                {brand.data.website || '—'}
                            </TableCell>
                        </TableRow>
                    );
                })}
            </TableBody>
        </Table>
    );
}

function brandHref(baseHref: string, brandId: string, query: string, params: Record<string, string>): string {
    const searchParams = new URLSearchParams();
    if (query) {
        searchParams.set('q', query);
    }

    Object.entries(params).forEach(([key, value]) => {
        if (value) {
            searchParams.set(key, value);
        }
    });

    searchParams.set('brand', brandId);
    return `${baseHref}?${searchParams.toString()}`;
}

function brandSortHref(baseHref: string, column: BrandTableSortKey, query: string, sortKey: BrandTableSortKey | null, sortDirection: TableSortDirection | null): string {
    return tableSortHref(baseHref, column, { q: query }, sortKey, sortDirection);
}
