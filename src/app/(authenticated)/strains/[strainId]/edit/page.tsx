import { notFound } from 'next/navigation';
import { StrainEditForm } from '@/components/strains/strain-edit-form';
import { StrainHeaderCard } from '@/components/strains/strain-header-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { isFeatureEnabled } from '@/lib/auth/permissions';
import { requireSectionEnabled } from '@/lib/auth/session';
import { findStrain } from '@/lib/data/sales-settings';
import type { FirestoreRecord, StrainData } from '@/lib/domain/types';

type StrainEditParams = {
    strainId: string;
};

type StrainEditStrain = {
    id: string;
    data: Pick<StrainData, 'name' | 'breeder' | 'genetics' | 'sativa_percentage' | 'status' | 'notes'>;
};

export default async function EditStrainPage({ params }: {
    params: Promise<StrainEditParams>;
}): Promise<React.ReactElement> {
    const currentUser = await requireSectionEnabled('strains');
    const canEditStrain = isFeatureEnabled(currentUser, 'strains', 'update_strains');
    const canViewPrivateStrains = isFeatureEnabled(currentUser, 'strains', 'view_private_strains');

    if (!canEditStrain) {
        notFound();
    }

    const { strainId } = await params;
    const strain = await findStrain(strainId);

    if (!strain || strainIsArchived(strain) || (strainIsPrivate(strain) && !canViewPrivateStrains)) {
        notFound();
    }

    const strainHref = strainPath(strain.id);

    return (
        <div className='space-y-6'>
            <StrainHeaderCard strain={strain} />
            <Card>
                <CardHeader>
                    <CardTitle>Strain Details</CardTitle>
                </CardHeader>
                <CardContent>
                    <StrainEditForm
                        strain={serializeStrain(strain)}
                        cancelHref={strainHref}
                        successHref={strainHref}
                    />
                </CardContent>
            </Card>
        </div>
    );
}

function serializeStrain(record: FirestoreRecord<StrainData>): StrainEditStrain {
    return {
        id: record.id,
        data: {
            name: record.data.name,
            breeder: record.data.breeder,
            genetics: record.data.genetics,
            sativa_percentage: record.data.sativa_percentage,
            status: record.data.status,
            notes: record.data.notes,
        },
    };
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
