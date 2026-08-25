import { TagIcon } from '@heroicons/react/20/solid';
import { HeaderCard } from '@/components/layout/header-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { BrandData, FirestoreRecord } from '@/lib/domain/types';

export function BrandHeaderCard({ brand, editHref = null }: {
  brand: FirestoreRecord<BrandData>;
  editHref?: string | null;
}): React.ReactElement {
  const acronym = brand.data.acronym?.trim();

  return (
    <HeaderCard
      title={brand.data.name || 'Brand'}
      badge={acronym ? <Badge color='purple'>{acronym}</Badge> : null}
      media={(
        <div className='flex size-16 items-center justify-center rounded-xl bg-purple-500/15 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400'>
          <TagIcon className='size-8' aria-hidden='true' />
        </div>
      )}
      actions={editHref ? <Button href={editHref} color='purple'>Edit Brand</Button> : null}
    />
  );
}
