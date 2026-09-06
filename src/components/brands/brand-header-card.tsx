import { HeaderCard } from '@/components/layout/header-card';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDate } from '@/lib/domain/format';
import type { BrandData, FirestoreRecord } from '@/lib/domain/types';

export function BrandHeaderCard({ brand }: {
  brand: FirestoreRecord<BrandData>;
  editHref?: string | null;
}): React.ReactElement {
  const acronym = brand.data.acronym?.trim();

  return (
    <HeaderCard
      title={brand.data.name || 'Brand'}
      className='dark:bg-zinc-600/15'
      badge={acronym ? <Badge color='purple'>{acronym}</Badge> : null}
    />
  );
}

export function BrandDetailsCard({ brand }: { brand: FirestoreRecord<BrandData> }): React.ReactElement {
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
