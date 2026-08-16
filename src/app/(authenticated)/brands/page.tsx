import { Plus } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { BrandDialog } from '@/components/brands/brand-dialog';
import { BrandTable, type BrandTableSortKey } from '@/components/brands/brand-table';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { paginatedTableItems, TablePagination, tablePageFromSearchParam, tableSortDirectionFromSearchParam, tableSortKeyFromSearchParam, tableSortParams, type TableSortDirection } from '@/components/ui/table';
import { TableSearch } from '@/components/ui/table-search';
import { canManageRestrictedResources, requireNonGuest } from '@/lib/auth/session';
import { findBrand, listBrands } from '@/lib/data/sales-settings';
import type { BrandData, FirestoreRecord } from '@/lib/domain/types';

const brandsHref = '/brands';
const brandSortKeys = ['name', 'acronym', 'website'] as const;

type BrandsSearchParams = {
    brand?: string | string[];
    q?: string | string[];
    page?: string | string[];
    sort?: string | string[];
    dir?: string | string[];
};

type BrandDialogBrand = {
    id: string;
    data: Pick<BrandData, 'name' | 'acronym' | 'website' | 'notes'>;
};

function serializeBrand(record: FirestoreRecord<BrandData>): BrandDialogBrand {
    return {
        id: record.id,
        data: {
            name: record.data.name,
            acronym: record.data.acronym,
            website: record.data.website,
            notes: record.data.notes,
        },
    };
}

function brandIsArchived(brand: FirestoreRecord<BrandData>): boolean {
    return brand.data.archived_at !== null && brand.data.archived_at !== undefined;
}

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

function filterBrands(brands: FirestoreRecord<BrandData>[], query: string): FirestoreRecord<BrandData>[] {
    const normalized = query.trim().toLowerCase();
    return normalized ? brands.filter((brand) => [brand.data.name, brand.data.acronym, brand.data.website].join(' ').toLowerCase().includes(normalized)) : brands;
}

export default async function BrandsPage({ searchParams }: {
    searchParams: Promise<BrandsSearchParams>
}): Promise<React.ReactElement> {
    const user = await requireNonGuest();
    const canManage = canManageRestrictedResources(user);

    const params = await searchParams;
    const query = firstSearchParam(params.q).trim();
    const sortKey = tableSortKeyFromSearchParam(params.sort, brandSortKeys);
    const sortDirection = sortKey ? tableSortDirectionFromSearchParam(params.dir) : null;
    const sortParams = tableSortParams(sortKey, sortDirection);
    const brandParam = firstSearchParam(params.brand).trim();
    const showCreateBrandDialog = canManage && brandParam === 'new';
    const showEditBrandDialog = canManage && brandParam !== '' && brandParam !== 'new';

    let brands: FirestoreRecord<BrandData>[] = [];
    let selectedBrand: FirestoreRecord<BrandData> | null = null;

    if (showEditBrandDialog) {
        [brands, selectedBrand] = await Promise.all([
            listBrands(),
            findBrand(brandParam),
        ]);
    } else {
        brands = await listBrands();
    }

    if (selectedBrand && brandIsArchived(selectedBrand)) {
        selectedBrand = null;
    }

    const filteredBrands = filterBrands(brands, query);
    const sortedBrands = sortBrands(filteredBrands, sortKey, sortDirection);
    const currentPage = tablePageFromSearchParam(params.page, sortedBrands.length);
    const paginatedBrands = paginatedTableItems(sortedBrands, currentPage);
    const paginationHref = hrefWithQuery(brandsHref, query, sortParams);
    const pageParams: Record<string, string> = currentPage > 1 ? { ...sortParams, page: String(currentPage) } : sortParams;
    const filteredHref = hrefWithQuery(brandsHref, query, pageParams);
    const createBrandHref = hrefWithQuery(brandsHref, query, { ...pageParams, brand: 'new' });
    const serializedBrand = selectedBrand ? serializeBrand(selectedBrand) : null;

    return (
        <div>
            <PageHeader
                title='Brands'
                actions={canManage ? (
                    <Button color='purple' href={createBrandHref}>
                        <Plus data-slot='icon' aria-hidden='true' />
                        Add Brand
                    </Button>
                ) : null}
            />
            <div className='space-y-6'>
                <TableSearch query={query} placeholder='Filter brands by name, acronym, or website' preservedParams={sortParams} />
                {query && filteredBrands.length === 0 ? <EmptyState title='No brands found' /> : (
                    <>
                        <BrandTable brands={paginatedBrands} selectedBrandId={selectedBrand?.id} hrefBase={filteredHref} canManage={canManage} query={query} sortKey={sortKey} sortDirection={sortDirection} />
                        <TablePagination baseHref={paginationHref} currentPage={currentPage} totalItems={sortedBrands.length} />
                    </>
                )}
            </div>
            {showCreateBrandDialog ? <BrandDialog mode='create' closeHref={filteredHref} /> : null}
            {showEditBrandDialog && serializedBrand ?
                <BrandDialog mode='edit' brand={serializedBrand} closeHref={filteredHref} /> : null}
        </div>
    );
}

function sortBrands(brands: FirestoreRecord<BrandData>[], sortKey: BrandTableSortKey | null, sortDirection: TableSortDirection | null): FirestoreRecord<BrandData>[] {
    if (!sortKey || !sortDirection) {
        return brands;
    }

    const direction = sortDirection === 'asc' ? 1 : -1;
    return [...brands].sort((a, b) => compareStrings(brandSortValue(a, sortKey), brandSortValue(b, sortKey)) * direction);
}

function brandSortValue(brand: FirestoreRecord<BrandData>, sortKey: BrandTableSortKey): string {
    switch (sortKey) {
        case 'name':
            return brand.data.name;
        case 'acronym':
            return brand.data.acronym ?? '';
        case 'website':
            return brand.data.website ?? '';
    }
}

function compareStrings(a: string | null | undefined, b: string | null | undefined): number {
    return (a ?? '').localeCompare(b ?? '', undefined, { numeric: true, sensitivity: 'base' });
}
