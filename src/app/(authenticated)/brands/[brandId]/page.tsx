import { notFound, redirect } from 'next/navigation';
import { BrandDialog } from '@/components/brands/brand-dialog';
import { BrandHeaderCard } from '@/components/brands/brand-header-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { isFeatureEnabled } from '@/lib/auth/permissions';
import { requireSectionEnabled } from '@/lib/auth/session';
import { findBrand } from '@/lib/data/sales-settings';
import { formatDate } from '@/lib/domain/format';
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

function BrandDetailsCard({ brand }: { brand: FirestoreRecord<BrandData> }): React.ReactElement {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Brand Details</CardTitle>
            </CardHeader>
            <CardContent>
                <dl className='grid gap-5 sm:grid-cols-2 xl:grid-cols-3'>
                    <DetailItem label='Name' value={brand.data.name || '—'} />
                    <DetailItem label='Acronym' value={brand.data.acronym || '—'} />
                    <DetailItem label='Website' value={brand.data.website || '—'} />
                    <DetailItem label='Created' value={formatDate(brand.data.created_at)} />
                    <DetailItem label='Last Updated' value={formatDate(brand.data.updated_at)} />
                </dl>
                {brand.data.notes ? (
                    <dl className='mt-6'>
                        <DetailItem label='Notes' value={<span className='whitespace-pre-wrap'>{brand.data.notes}</span>} />
                    </dl>
                ) : null}
            </CardContent>
        </Card>
    );
}

function DetailItem({ label, value }: {
    label: string;
    value: React.ReactNode;
}): React.ReactElement {
    return (
        <div>
            <dt className='text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500'>{label}</dt>
            <dd className='mt-1 break-words text-sm/6 font-semibold text-zinc-950 dark:text-white'>{value}</dd>
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
