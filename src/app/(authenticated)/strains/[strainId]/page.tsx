import { notFound } from 'next/navigation';
import { StrainDetailsCard, StrainHeaderCard } from '@/components/strains/strain-header-card';
import { isFeatureEnabled } from '@/lib/auth/permissions';
import { requireSectionEnabled } from '@/lib/auth/session';
import { findStrain } from '@/lib/data/sales-settings';
import type { FirestoreRecord, StrainData } from '@/lib/domain/types';

type StrainDetailParams = {
    strainId: string;
};

export default async function StrainDetailPage({ params }: {
    params: Promise<StrainDetailParams>;
}): Promise<React.ReactElement> {
    const currentUser = await requireSectionEnabled('strains');
    const canViewPrivateStrains = isFeatureEnabled(currentUser, 'strains', 'view_private_strains');
    const { strainId } = await params;
    const strain = await findStrain(strainId);

    if (!strain || strainIsArchived(strain) || (strainIsPrivate(strain) && !canViewPrivateStrains)) {
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

function strainPath(strainId: string): string {
    return `/strains/${encodeURIComponent(strainId)}`;
}

function strainIsArchived(strain: FirestoreRecord<StrainData>): boolean {
    const archived = strain.data.archived_at ?? strain.data.deleted_at;
    return strain.data.status === 'Archived' || (archived !== null && archived !== undefined);
}

function strainIsPrivate(strain: FirestoreRecord<StrainData>): boolean {
    return strain.data.status === 'Hidden';
}
