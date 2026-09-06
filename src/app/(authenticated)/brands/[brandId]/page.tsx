import { notFound, redirect } from 'next/navigation';
import { BrandDialog } from '@/components/brands/brand-dialog';
import { BrandDetailsCard, BrandHeaderCard } from '@/components/brands/brand-header-card';
import { isFeatureEnabled } from '@/lib/auth/permissions';
import { requireSectionEnabled } from '@/lib/auth/session';
import { findBrand } from '@/lib/data/sales-settings';
import type { BrandData, FirestoreRecord } from '@/lib/domain/types';

type BrandDetailParams = {
    brandId: string;
};

type BrandDetailSearchParams = {
    edit?: string | string[];
};

type BrandDialogBrand = {
    id: string;
    data: Pick<BrandData, 'name' | 'acronym' | 'website' | 'notes'>;
};

export default async function BrandDetailPage({ params, searchParams }: {
    params: Promise<BrandDetailParams>;
    searchParams: Promise<BrandDetailSearchParams>;
}): Promise<React.ReactElement> {
    const currentUser = await requireSectionEnabled('brands');
    const { brandId } = await params;
    const brand = await findBrand(brandId);

    if (!brand || brandIsArchived(brand)) {
        notFound();
    }

    const search = await searchParams;
    const brandHref = brandPath(brand.id);
    const canEditBrand = isFeatureEnabled(currentUser, 'brands', 'update_brands');
    const canArchiveBrand = isFeatureEnabled(currentUser, 'brands', 'archive_brands');
    const showEditBrandDialog = firstSearchParam(search.edit) !== '';

    if (showEditBrandDialog && !canEditBrand) {
        redirect(brandHref);
    }

    return (
        <div className='space-y-6'>
            <BrandHeaderCard brand={brand} editHref={canEditBrand ? `${brandHref}?edit=1` : null} />
            <BrandDetailsCard brand={brand} />
            {showEditBrandDialog ? <BrandDialog mode='edit' brand={serializeBrand(brand)} closeHref={brandHref} canArchive={canArchiveBrand} /> : null}
        </div>
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

function firstSearchParam(value: string | string[] | undefined): string {
    return Array.isArray(value) ? (value[0] ?? '') : (value ?? '');
}

function brandPath(brandId: string): string {
    return `/brands/${encodeURIComponent(brandId)}`;
}

function brandIsArchived(brand: FirestoreRecord<BrandData>): boolean {
    return brand.data.archived_at !== null && brand.data.archived_at !== undefined;
}
