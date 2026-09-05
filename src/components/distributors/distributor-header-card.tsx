import { TruckIcon } from '@heroicons/react/20/solid';
import { HeaderCard } from '@/components/layout/header-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { DistributorData, FirestoreRecord } from '@/lib/domain/types';

export function DistributorHeaderCard({ distributor, editHref = null }: {
  distributor: FirestoreRecord<DistributorData>;
  editHref?: string | null;
}): React.ReactElement {
  const licenseNumber = distributor.data.license_number?.trim();

  return (
    <HeaderCard
      title={distributor.data.name || 'Distributor'}
      badge={licenseNumber ? <Badge color='purple'>{licenseNumber}</Badge> : null}
      media={(
        <div className='flex size-16 items-center justify-center rounded-xl bg-purple-500/15 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400'>
          <TruckIcon className='size-8' aria-hidden='true' />
        </div>
      )}
      actions={editHref ? <Button href={editHref} color='purple'>Edit Distributor</Button> : null}
    />
  );
}
