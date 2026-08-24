import { notFound } from 'next/navigation';
import { StrainHeaderCard, compositionLabel } from '@/components/strains/strain-header-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { isFeatureEnabled } from '@/lib/auth/permissions';
import { requireSectionEnabled } from '@/lib/auth/session';
import { findStrain } from '@/lib/data/sales-settings';
import { formatDate } from '@/lib/domain/format';
import type { FirestoreRecord, StrainData } from '@/lib/domain/types';

type StrainDetailParams = {
    strainId: string;
};

export default async function StrainDetailPage({ params }: {
    params: Promise<StrainDetailParams>;
}): Promise<React.ReactElement> {
    const currentUser = await requireSectionEnabled('strains');
    const { strainId } = await params;
    const strain = await findStrain(strainId);

    if (!strain || strainIsArchived(strain)) {
        notFound();
    }

    const strainHref = strainPath(strain.id);
    const canEditStrain = isFeatureEnabled(currentUser, 'strains', 'update_strains');

    return (
        <div className='space-y-6'>
            <StrainHeaderCard strain={strain} editHref={canEditStrain ? `${strainHref}/edit` : null} />
            <StrainDetailsCard strain={strain} />
        </div>
    );
}

function StrainDetailsCard({ strain }: { strain: FirestoreRecord<StrainData> }): React.ReactElement {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Strain Details</CardTitle>
            </CardHeader>
            <CardContent>
                <dl className='grid gap-5 sm:grid-cols-2 xl:grid-cols-3'>
                    <DetailItem label='Name' value={strain.data.name || '—'} />
                    <DetailItem label='Breeder' value={strain.data.breeder || '—'} />
                    <DetailItem label='Genetics' value={strain.data.genetics || '—'} />
                    <DetailItem label='Composition' value={compositionLabel(strain.data.sativa_percentage)} />
                    <DetailItem label='Created' value={formatDate(strain.data.created_at)} />
                    <DetailItem label='Last Updated' value={formatDate(strain.data.updated_at)} />
                </dl>
                {strain.data.notes ? (
                    <dl className='mt-6'>
                        <DetailItem label='Notes' value={<span className='whitespace-pre-wrap'>{strain.data.notes}</span>} />
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

function strainPath(strainId: string): string {
    return `/strains/${encodeURIComponent(strainId)}`;
}

function strainIsArchived(strain: FirestoreRecord<StrainData>): boolean {
    const archived = strain.data.archived_at ?? strain.data.deleted_at;
    return archived !== null && archived !== undefined;
}
