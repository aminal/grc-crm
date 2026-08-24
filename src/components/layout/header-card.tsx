import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export type HeaderCardMetaItem = {
    label: string;
    value: React.ReactNode;
    breakAll?: boolean;
};

export function HeaderCard({ title, badge, media, meta = [], actions, className }: {
    title: React.ReactNode;
    badge?: React.ReactNode;
    media?: React.ReactNode;
    meta?: HeaderCardMetaItem[];
    actions?: React.ReactNode;
    className?: string;
}): React.ReactElement {
    return (
        <Card className={className}>
            <CardContent className='flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between'>
                <div className='flex min-w-0 items-start gap-4'>
                    {media ? <div className='shrink-0'>{media}</div> : null}
                    <div className='min-w-0'>
                        <div className='flex flex-wrap items-center gap-2'>
                            <h2 className='truncate pt-0.5 text-3xl/8 font-semibold text-zinc-950 dark:text-white'>{title}</h2>
                            {badge}
                        </div>
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
