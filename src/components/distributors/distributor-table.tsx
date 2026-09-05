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
import { formatPhone } from '@/lib/domain/phone';
import type { DistributorData, FirestoreRecord } from '@/lib/domain/types';

export type DistributorTableSortKey = 'name' | 'license_number' | 'contact_name' | 'phone';

export function DistributorTable({
    distributors,
    query = '',
    sortKey = null,
    sortDirection = null,
}: {
    distributors: FirestoreRecord<DistributorData>[];
    query?: string;
    sortKey?: DistributorTableSortKey | null;
    sortDirection?: TableSortDirection | null;
}): React.ReactElement {
    if (distributors.length === 0) {
        return <EmptyState title='No distributors yet' description='Create a distributor to start consigning inventory.' />;
    }

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead sortHref={distributorSortHref('name', query, sortKey, sortDirection)} sortDirection={activeTableSortDirection('name', sortKey, sortDirection)}>Name</TableHead>
                    <TableHead className='hidden sm:table-cell' sortHref={distributorSortHref('license_number', query, sortKey, sortDirection)} sortDirection={activeTableSortDirection('license_number', sortKey, sortDirection)}>License</TableHead>
                    <TableHead className='hidden lg:table-cell' sortHref={distributorSortHref('contact_name', query, sortKey, sortDirection)} sortDirection={activeTableSortDirection('contact_name', sortKey, sortDirection)}>Contact</TableHead>
                    <TableHead sortHref={distributorSortHref('phone', query, sortKey, sortDirection)} sortDirection={activeTableSortDirection('phone', sortKey, sortDirection)}>Phone</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {distributors.map((distributor) => {
                    const href = `/distributors/${encodeURIComponent(distributor.id)}`;
                    const label = `View ${distributor.data.name}`;

                    return (
                        <TableRow key={distributor.id} className='group cursor-pointer'>
                            <TableCell>
                                <Link href={href} className='font-semibold text-zinc-950 group-hover:text-zinc-700 dark:text-white dark:group-hover:text-zinc-300'>
                                    <span className='absolute inset-0' />
                                    {distributor.data.name}
                                </Link>
                                {distributor.data.license_number ?
                                    <div className='mt-1 text-xs font-medium text-zinc-500 sm:hidden dark:text-zinc-400'>
                                        License: {distributor.data.license_number}
                                    </div> : null}
                            </TableCell>
                            <TableCell className='hidden sm:table-cell'>
                                <Link href={href} aria-hidden tabIndex={-1} className='absolute inset-0 z-10'>
                                    <span className='sr-only'>{label}</span>
                                </Link>
                                {distributor.data.license_number || '—'}
                            </TableCell>
                            <TableCell className='hidden lg:table-cell'>
                                <Link href={href} aria-hidden tabIndex={-1} className='absolute inset-0 z-10'>
                                    <span className='sr-only'>{label}</span>
                                </Link>
                                {distributor.data.contact_name || '—'}
                            </TableCell>
                            <TableCell>
                                <Link href={href} aria-hidden tabIndex={-1} className='absolute inset-0 z-10'>
                                    <span className='sr-only'>{label}</span>
                                </Link>
                                {distributor.data.phone ? formatPhone(distributor.data.phone) : '—'}
                            </TableCell>
                        </TableRow>
                    );
                })}
            </TableBody>
        </Table>
    );
}

function distributorSortHref(column: DistributorTableSortKey, query: string, sortKey: DistributorTableSortKey | null, sortDirection: TableSortDirection | null): string {
    return tableSortHref('/distributors', column, { q: query }, sortKey, sortDirection);
}
