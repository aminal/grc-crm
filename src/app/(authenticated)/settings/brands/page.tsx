import { notFound, redirect } from 'next/navigation';
import { ChevronRight, Plus } from 'lucide-react';
import { BrandDialog } from '@/components/brands/brand-dialog';
import { BrandDetailsCard, BrandHeaderCard } from '@/components/brands/brand-header-card';
import { BrandTable, type BrandTableSortKey } from '@/components/brands/brand-table';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import {
  paginatedTableItems,
  tablePageFromSearchParam,
  TablePagination,
  type TableSortDirection,
  tableSortDirectionFromSearchParam,
  tableSortKeyFromSearchParam,
  tableSortParams
} from '@/components/ui/table';
import { TableSearch } from '@/components/ui/table-search';
import { isFeatureEnabled } from '@/lib/auth/permissions';
import { requireSectionEnabled } from '@/lib/auth/session';
import { listBrands } from '@/lib/data/sales-settings';
import type { BrandData, FirestoreRecord } from '@/lib/domain/types';
import { SettingsShell } from '../settings-shell';
import Link from 'next/link';

const brandsHref = '/settings/brands';
const brandSortKeys = ['name', 'acronym', 'website'] as const;

type BrandsSearchParams = {
  brand?: string | string[];
  edit?: string | string[];
  q?: string | string[];
  page?: string | string[];
  sort?: string | string[];
  dir?: string | string[];
};

type BrandDialogBrand = {
  id: string;
  data: Pick<BrandData, 'name' | 'acronym' | 'website' | 'notes'>;
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

function filterBrands(brands: FirestoreRecord<BrandData>[], query: string): FirestoreRecord<BrandData>[] {
  const normalized = query.trim().toLowerCase();
  return normalized ? brands.filter((brand) => [brand.data.name, brand.data.acronym, brand.data.website].join(' ').toLowerCase().includes(normalized)) : brands;
}

export default async function SettingsBrandsPage({ searchParams }: {
  searchParams: Promise<BrandsSearchParams>
}): Promise<React.ReactElement> {
  const user = await requireSectionEnabled('brands');
  const canCreate = isFeatureEnabled(user, 'brands', 'create_brands');
  const canEdit = isFeatureEnabled(user, 'brands', 'update_brands');
  const canArchive = isFeatureEnabled(user, 'brands', 'archive_brands');

  const params = await searchParams;
  const query = firstSearchParam(params.q).trim();
  const sortKey = tableSortKeyFromSearchParam(params.sort, brandSortKeys);
  const sortDirection = sortKey ? tableSortDirectionFromSearchParam(params.dir) : null;
  const sortParams = tableSortParams(sortKey, sortDirection);
  const brandParam = firstSearchParam(params.brand).trim();
  const selectedBrandId = brandParam && brandParam !== 'new' ? brandParam : '';
  const showCreateBrandDialog = canCreate && brandParam === 'new';

  const brands = await listBrands();
  const selectedBrand = selectedBrandId ? brands.find((brand) => brand.id === selectedBrandId) ?? null : null;

  if (selectedBrandId && !selectedBrand) {
    notFound();
  }

  const filteredBrands = filterBrands(brands, query);
  const sortedBrands = sortBrands(filteredBrands, sortKey, sortDirection);
  const currentPage = tablePageFromSearchParam(params.page, sortedBrands.length);
  const paginatedBrands = paginatedTableItems(sortedBrands, currentPage);
  const paginationHref = hrefWithQuery(brandsHref, query, sortParams);
  const pageParams: Record<string, string> = currentPage > 1 ? {
    ...sortParams,
    page: String(currentPage)
  } : sortParams;
  const filteredHref = hrefWithQuery(brandsHref, query, pageParams);
  const createBrandHref = hrefWithQuery(brandsHref, query, { ...pageParams, brand: 'new' });
  const selectedBrandHref = selectedBrand ? hrefWithQuery(brandsHref, query, {
    ...pageParams,
    brand: selectedBrand.id
  }) : filteredHref;
  const editBrandHref = selectedBrand && canEdit ? hrefWithQuery(brandsHref, query, {
    ...pageParams,
    brand: selectedBrand.id,
    edit: '1'
  }) : null;
  const showEditBrandDialog = selectedBrand !== null && firstSearchParam(params.edit) !== '';

  if (showEditBrandDialog && !canEdit) {
    redirect(selectedBrandHref);
  }

  return (
    <SettingsShell current='brands'>
      <div className='space-y-8'>
        {selectedBrand ? (
          <section className='space-y-6' aria-labelledby='selected-brand-heading'>
            <div className='flex flex-wrap items-center gap-2'>
              <h2 className='text-2xl/7 font-medium text-zinc-700 uppercase dark:text-white'>
                <Link href={filteredHref}>Brands</Link>
              </h2>
              <ChevronRight data-slot='icon' aria-hidden='true' className='size-8'/>
              <h2 id='selected-brand-heading' className='text-2xl/7 font-medium text-zinc-700 uppercase dark:text-white'>
                View Brand
              </h2>
              <div className='flex flex-1 items-center justify-end'>
                <Button href={editBrandHref || undefined} color='purple' className='uppercase text-md!'>Edit Brand</Button>
              </div>
            </div>
            <BrandHeaderCard brand={selectedBrand} />
            <BrandDetailsCard brand={selectedBrand} />
          </section>
        ) : (
          <div className='space-y-6'>
            <div className='flex flex-wrap items-center justify-between gap-4'>
              <h2 className='text-2xl/7 -mt-0.5 font-medium text-zinc-700 uppercase dark:text-white'>
                Brands
              </h2>
              {canCreate ? (
                <Button color='purple' href={createBrandHref} className='uppercase text-md!'>
                  <Plus data-slot='icon' aria-hidden='true' />
                  Add Brand
                </Button>
              ) : null}
            </div>
            <TableSearch query={query} placeholder='Filter brands by name, acronym, or website' preservedParams={sortParams} />
            {query && filteredBrands.length === 0 ? <EmptyState title='No brands found' /> : (
              <>
              <BrandTable brands={paginatedBrands} query={query} sortKey={sortKey} sortDirection={sortDirection} baseHref={brandsHref} rowParams={pageParams} />
              <TablePagination baseHref={paginationHref} currentPage={currentPage} totalItems={sortedBrands.length} />
            </>
            )}
          </div>
        )}
      </div>
      {showCreateBrandDialog ? <BrandDialog mode='create' closeHref={filteredHref} /> : null}
      {selectedBrand && showEditBrandDialog ?
        <BrandDialog mode='edit' brand={serializeBrand(selectedBrand)} closeHref={selectedBrandHref} canArchive={canArchive} /> : null}
    </SettingsShell>
  );
}

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
