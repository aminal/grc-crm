import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export type HeaderCardMetaItem = {
  label: string;
  value: React.ReactNode;
  breakAll?: boolean;
};

export function HeaderCard({ title, subtitle, badge, media, meta = [], actions, className }: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  badge?: React.ReactNode;
  media?: React.ReactNode;
  meta?: HeaderCardMetaItem[];
  actions?: React.ReactNode;
  className?: string;
}): React.ReactElement {
  return (
    <Card className={className}>
      <CardContent className='flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between'>
        <div className={cn(
          'flex min-w-0 gap-4',
          meta.length > 0 ? 'items-start' : 'items-center',
        )}>
          {media ? <div className='shrink-0'>{media}</div> : null}
          <div className='min-w-0'>
            <div className={cn(
              'flex min-w-0',
              meta.length > 0 || badge
                ? 'flex-row flex-wrap items-center gap-x-3 gap-y-2'
                : 'flex-col items-start gap-0',
            )}>
              <h2 className='min-w-0 max-w-full truncate pt-0.5 pl-0.5 text-3xl/8 font-semibold text-zinc-950 dark:text-white'>{title}</h2>
              {badge ? <div className='flex flex-row flex-wrap gap-2'>{badge}</div> : null}
            </div>
            {subtitle ? <div className='mt-2 pl-0.5 text-sm/6 font-medium text-zinc-600 dark:text-zinc-300'>{subtitle}</div> : null}
            {meta.length > 0 ? (
              <div className='flex flex-wrap gap-x-4 gap-y-3 pt-3 text-sm xl:gap-x-12'>
                {meta.map((item, index) => (
                  <dl key={`${item.label}-${index}`} className='flex flex-col'>
                    <HeaderCardMeta label={item.label} value={item.value} breakAll={item.breakAll} />
                  </dl>
                ))}
              </div>
            ) : null}
          </div>
        </div>
        {actions ? <div className='flex flex-col items-start gap-4 sm:items-end'>{actions}</div> : null}
      </CardContent>
    </Card>
  );
}

function HeaderCardMeta({ label, value, breakAll = false }: HeaderCardMetaItem): React.ReactElement {
  return (
    <div>
      <dt className='text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500'>{label}</dt>
      <dd className={cn('mt-1 font-semibold text-zinc-950 dark:text-white', breakAll && 'break-all')}>{value}</dd>
    </div>
  );
}
