import Link from 'next/link';
import { Plus } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { BrandDialog } from '@/components/brands/brand-dialog';
import { BrandTable } from '@/components/brands/brand-table';
import { buttonClasses } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { TableSearch } from '@/components/ui/table-search';
import { canManageRestrictedResources, requireNonGuest } from '@/lib/auth/session';
import { findBrand, listBrands } from '@/lib/data/sales-settings';
import type { BrandData, FirestoreRecord } from '@/lib/domain/types';

const brandsHref = '/brands';

type BrandsSearchParams = {
    brand?: string | string[];
    q?: string | string[];
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
    const filteredHref = hrefWithQuery(brandsHref, query);
    const createBrandHref = hrefWithQuery(brandsHref, query, { brand: 'new' });
    const serializedBrand = selectedBrand ? serializeBrand(selectedBrand) : null;

    return (
        <div>
            <PageHeader
                title='Brands'
                actions={canManage ? (
                    <Link href={createBrandHref} className={buttonClasses()}>
                        <Plus data-slot='icon' aria-hidden='true' />
                        Add Brand
                    </Link>
                ) : null}
            />
            <div className='space-y-6'>
                <TableSearch query={query} placeholder='Filter brands by name, acronym, or website' />
                {query && filteredBrands.length === 0 ? <EmptyState title='No brands found' /> :
                    <BrandTable brands={filteredBrands} selectedBrandId={selectedBrand?.id} hrefBase={filteredHref} canManage={canManage} />}
            </div>
            {showCreateBrandDialog ? <BrandDialog mode='create' closeHref={filteredHref} /> : null}
            {showEditBrandDialog && serializedBrand ?
                <BrandDialog mode='edit' brand={serializedBrand} closeHref={filteredHref} /> : null}
        </div>
    );
}
