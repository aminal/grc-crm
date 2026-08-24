import { Cannabis } from 'lucide-react';
import { HeaderCard } from '@/components/layout/header-card';
import { Badge, type BadgeColor } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { FirestoreRecord, StrainData } from '@/lib/domain/types';

type StrainHeaderCardProps = {
    strain: FirestoreRecord<StrainData>;
    editHref?: string | null;
};

export function StrainHeaderCard({ strain, editHref = null }: StrainHeaderCardProps): React.ReactElement {
    return (
        <HeaderCard
            title={strain.data.name || 'Strain'}
            badge={<Badge color={compositionBadgeColor(strain.data.sativa_percentage)}>{compositionKind(strain.data.sativa_percentage)}</Badge>}
            media={(
                <div className='flex size-16 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300'>
                    <Cannabis className='size-8 [&_*]:fill-none' aria-hidden='true' />
                </div>
            )}
            actions={editHref ? <Button href={editHref} color='purple'>Edit Strain</Button> : null}
        />
    );
}

export function compositionLabel(sativaPercentage: number): string {
    return `${100 - sativaPercentage}% Indica / ${sativaPercentage}% Sativa`;
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
