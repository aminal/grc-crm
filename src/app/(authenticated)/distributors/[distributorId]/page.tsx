import { notFound, redirect } from 'next/navigation';
import { DistributorDialog } from '@/components/distributors/distributor-dialog';
import { DistributorHeaderCard } from '@/components/distributors/distributor-header-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { isFeatureEnabled } from '@/lib/auth/permissions';
import { requireSectionEnabled } from '@/lib/auth/session';
import { findDistributor } from '@/lib/data/distributors';
import { formatDate } from '@/lib/domain/format';
import { formatPhone } from '@/lib/domain/phone';
import type { DistributorData, FirestoreRecord } from '@/lib/domain/types';

type DistributorDetailParams = {
    distributorId: string;
};

type DistributorDetailSearchParams = {
    edit?: string | string[];
};

type DistributorDialogDistributor = {
    id: string;
    data: Pick<DistributorData, 'name' | 'license_number' | 'contact_name' | 'email' | 'phone' | 'address' | 'notes'>;
};

export default async function DistributorDetailPage({ params, searchParams }: {
    params: Promise<DistributorDetailParams>;
    searchParams: Promise<DistributorDetailSearchParams>;
}): Promise<React.ReactElement> {
    const currentUser = await requireSectionEnabled('distributors');
    const { distributorId } = await params;
    const distributor = await findDistributor(distributorId);

    if (!distributor || distributorIsArchived(distributor)) {
        notFound();
    }

    const search = await searchParams;
    const distributorHref = distributorPath(distributor.id);
    const canEditDistributor = isFeatureEnabled(currentUser, 'distributors', 'update_distributors');
    const canArchiveDistributor = isFeatureEnabled(currentUser, 'distributors', 'archive_distributors');
    const showEditDistributorDialog = firstSearchParam(search.edit) !== '';

    if (showEditDistributorDialog && !canEditDistributor) {
        redirect(distributorHref);
    }

    return (
        <div className='space-y-6'>
            <DistributorHeaderCard distributor={distributor} editHref={canEditDistributor ? `${distributorHref}?edit=1` : null} />
            <DistributorDetailsCard distributor={distributor} />
            {showEditDistributorDialog ? <DistributorDialog mode='edit' distributor={serializeDistributor(distributor)} closeHref={distributorHref} canArchive={canArchiveDistributor} /> : null}
        </div>
    );
}

function DistributorDetailsCard({ distributor }: { distributor: FirestoreRecord<DistributorData> }): React.ReactElement {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Distributor Details</CardTitle>
            </CardHeader>
            <CardContent>
                <dl className='grid gap-5 sm:grid-cols-2 xl:grid-cols-3'>
                    <DetailItem label='Name' value={distributor.data.name || '—'} />
                    <DetailItem label='License' value={distributor.data.license_number || '—'} />
                    <DetailItem label='Contact' value={distributor.data.contact_name || '—'} />
                    <DetailItem label='Email' value={distributor.data.email || '—'} />
                    <DetailItem label='Phone' value={distributor.data.phone ? formatPhone(distributor.data.phone) : '—'} />
                    <DetailItem label='Address' value={formatAddress(distributor.data)} />
                    <DetailItem label='Created' value={formatDate(distributor.data.created_at)} />
                    <DetailItem label='Last Updated' value={formatDate(distributor.data.updated_at)} />
                </dl>
                {distributor.data.notes ? (
                    <dl className='mt-6'>
                        <DetailItem label='Notes' value={<span className='whitespace-pre-wrap'>{distributor.data.notes}</span>} />
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

function formatAddress(distributor: DistributorData): string {
    const cityState = [distributor.address.city, distributor.address.state].filter(Boolean).join(', ');
    return [distributor.address.street, cityState, distributor.address.postal_code].filter(Boolean).join(' · ') || '—';
}

function serializeDistributor(record: FirestoreRecord<DistributorData>): DistributorDialogDistributor {
    return {
        id: record.id,
        data: {
            name: record.data.name,
            license_number: record.data.license_number,
            contact_name: record.data.contact_name,
            email: record.data.email,
            phone: record.data.phone,
            address: record.data.address,
            notes: record.data.notes,
        },
    };
}

function firstSearchParam(value: string | string[] | undefined): string {
    return Array.isArray(value) ? (value[0] ?? '') : (value ?? '');
}

function distributorPath(distributorId: string): string {
    return `/distributors/${encodeURIComponent(distributorId)}`;
}

function distributorIsArchived(distributor: FirestoreRecord<DistributorData>): boolean {
    return distributor.data.archived_at !== null && distributor.data.archived_at !== undefined;
}
