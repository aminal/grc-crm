import { redirect } from 'next/navigation';
import { Plus } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { DistributorDialog } from '@/components/distributors/distributor-dialog';
import { DistributorTable, type DistributorTableSortKey } from '@/components/distributors/distributor-table';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { paginatedTableItems, TablePagination, tablePageFromSearchParam, tableSortDirectionFromSearchParam, tableSortKeyFromSearchParam, tableSortParams, type TableSortDirection } from '@/components/ui/table';
import { TableSearch } from '@/components/ui/table-search';
import { isFeatureEnabled } from '@/lib/auth/permissions';
import { requireSectionEnabled } from '@/lib/auth/session';
import { listDistributors } from '@/lib/data/distributors';
import type { DistributorData, FirestoreRecord } from '@/lib/domain/types';

const distributorsHref = '/distributors';
const distributorSortKeys = ['name', 'license_number', 'contact_name', 'phone'] as const;

type DistributorsSearchParams = {
    distributor?: string | string[];
    q?: string | string[];
    page?: string | string[];
    sort?: string | string[];
    dir?: string | string[];
};

function firstSearchParam(value: string | string[] | undefined): string {
    return Array.isArray(value) ? (value[0] ?? '') : (value ?? '');
}

function hrefWithQuery(baseHref: string, query: string, params: Record<string, string> = {}): string {
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
    return search ? `${baseHref}?${search}` : baseHref;
}

function filterDistributors(distributors: FirestoreRecord<DistributorData>[], query: string): FirestoreRecord<DistributorData>[] {
    const normalized = query.trim().toLowerCase();
    return normalized
        ? distributors.filter((distributor) => [
            distributor.data.name,
            distributor.data.license_number,
            distributor.data.contact_name,
            distributor.data.email,
            distributor.data.phone,
        ].join(' ').toLowerCase().includes(normalized))
        : distributors;
}

export default async function DistributorsPage({ searchParams }: {
    searchParams: Promise<DistributorsSearchParams>
}): Promise<React.ReactElement> {
    const user = await requireSectionEnabled('distributors');
    const canCreate = isFeatureEnabled(user, 'distributors', 'create_distributors');

    const params = await searchParams;
    const query = firstSearchParam(params.q).trim();
    const sortKey = tableSortKeyFromSearchParam(params.sort, distributorSortKeys);
    const sortDirection = sortKey ? tableSortDirectionFromSearchParam(params.dir) : null;
    const sortParams = tableSortParams(sortKey, sortDirection);
    const distributorParam = firstSearchParam(params.distributor).trim();
    const showCreateDistributorDialog = canCreate && distributorParam === 'new';

    if (distributorParam && distributorParam !== 'new') {
        redirect(`/distributors/${encodeURIComponent(distributorParam)}`);
    }

    const distributors = await listDistributors();

    const filteredDistributors = filterDistributors(distributors, query);
    const sortedDistributors = sortDistributors(filteredDistributors, sortKey, sortDirection);
    const currentPage = tablePageFromSearchParam(params.page, sortedDistributors.length);
    const paginatedDistributors = paginatedTableItems(sortedDistributors, currentPage);
    const paginationHref = hrefWithQuery(distributorsHref, query, sortParams);
    const pageParams: Record<string, string> = currentPage > 1 ? { ...sortParams, page: String(currentPage) } : sortParams;
    const filteredHref = hrefWithQuery(distributorsHref, query, pageParams);
    const createDistributorHref = hrefWithQuery(distributorsHref, query, { ...pageParams, distributor: 'new' });

    return (
        <div>
            <PageHeader
                title='Distributors'
                actions={canCreate ? (
                    <Button color='purple' href={createDistributorHref}>
                        <Plus data-slot='icon' aria-hidden='true' />
                        Add Distributor
                    </Button>
                ) : null}
            />
            <div className='space-y-6'>
                <TableSearch query={query} placeholder='Filter distributors by name, license, contact, email, or phone' preservedParams={sortParams} />
                {query && filteredDistributors.length === 0 ? <EmptyState title='No distributors found' /> : (
                    <>
                        <DistributorTable distributors={paginatedDistributors} query={query} sortKey={sortKey} sortDirection={sortDirection} />
                        <TablePagination baseHref={paginationHref} currentPage={currentPage} totalItems={sortedDistributors.length} />
                    </>
                )}
            </div>
            {showCreateDistributorDialog ? <DistributorDialog mode='create' closeHref={filteredHref} /> : null}
        </div>
    );
}

function sortDistributors(distributors: FirestoreRecord<DistributorData>[], sortKey: DistributorTableSortKey | null, sortDirection: TableSortDirection | null): FirestoreRecord<DistributorData>[] {
    if (!sortKey || !sortDirection) {
        return distributors;
    }

    const direction = sortDirection === 'asc' ? 1 : -1;
    return [...distributors].sort((a, b) => compareStrings(distributorSortValue(a, sortKey), distributorSortValue(b, sortKey)) * direction);
}

function distributorSortValue(distributor: FirestoreRecord<DistributorData>, sortKey: DistributorTableSortKey): string {
    switch (sortKey) {
        case 'name':
            return distributor.data.name;
        case 'license_number':
            return distributor.data.license_number ?? '';
        case 'contact_name':
            return distributor.data.contact_name ?? '';
        case 'phone':
            return distributor.data.phone ?? '';
    }
}

function compareStrings(a: string | null | undefined, b: string | null | undefined): number {
    return (a ?? '').localeCompare(b ?? '', undefined, { numeric: true, sensitivity: 'base' });
}
