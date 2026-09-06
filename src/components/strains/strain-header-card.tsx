import { HeaderCard } from '@/components/layout/header-card';
import { Badge, type BadgeColor } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDate } from '@/lib/domain/format';
import type { FirestoreRecord, StrainData, StrainStatus } from '@/lib/domain/types';

type StrainHeaderCardProps = {
    strain: FirestoreRecord<StrainData>;
    editHref?: string | null;
};

export function StrainHeaderCard({ strain }: StrainHeaderCardProps): React.ReactElement {
    return (
        <HeaderCard
            title={strain.data.name || 'Strain'}
            className='dark:bg-zinc-600/15'
            badge={(
                <>
                    <Badge color={compositionBadgeColor(strain.data.sativa_percentage)}>{compositionKind(strain.data.sativa_percentage)}</Badge>
                    <StrainStatusBadge status={strain.data.status} />
                </>
            )}
        />
    );
}

export function StrainDetailsCard({ strain }: { strain: FirestoreRecord<StrainData> }): React.ReactElement {
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
                    <DetailItem label='Status' value={strain.data.status} />
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

export function compositionLabel(sativaPercentage: number): string {
    return `${100 - sativaPercentage}% Indica / ${sativaPercentage}% Sativa`;
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

function StrainStatusBadge({ status }: { status: StrainStatus }): React.ReactElement {
    const statusColors = {
        Active: 'emerald',
        Hidden: 'purple',
        'Coming Soon': 'sky',
        Sunsetting: 'amber',
        Archived: 'zinc',
    } satisfies Record<StrainStatus, BadgeColor>;

    return <Badge color={statusColors[status]}>{status}</Badge>;
}

function compositionKind(sativaPercentage: number): 'Indica' | 'Hybrid' | 'Sativa' {
    if (sativaPercentage === 50) {
        return 'Hybrid';
    }

    return sativaPercentage > 50 ? 'Sativa' : 'Indica';
}

function compositionBadgeColor(sativaPercentage: number): BadgeColor {
    const kind = compositionKind(sativaPercentage);
    if (kind === 'Sativa') {
        return 'orange';
    }

    if (kind === 'Indica') {
        return 'purple';
    }

    return 'blue';
}
