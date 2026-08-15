import { cn } from '@/lib/utils';

export function PageHeader({ title, description, actions, children }: {
    title: string;
    description?: string;
    actions?: React.ReactNode;
    children?: React.ReactNode
}): React.ReactElement {
    return (
        <div className={cn(
            description ? 'mb-4' : 'mb-6',
        )}>
            <div className='flex flex-wrap items-start justify-between gap-4 sm:flex-nowrap'>
                <div className='min-w-0 max-w-full sm:flex-1'>
                    <h1 className='min-w-0 break-words text-3xl/8 pt-1 font-semibold text-zinc-950 sm:text-3xl/8 dark:text-white uppercase'>{title}</h1>
                    {description ?
                        <p className='mt-2 max-w-2xl break-words text-base/6 text-zinc-500 sm:text-base/6 dark:text-zinc-400 font-medium'>{description}</p> : null}
                    {children ? <div className='mt-2 shrink-0'>{children}</div> : null}
                </div>
                {actions ?
                    <div className='flex max-w-full flex-wrap gap-2 sm:shrink-0 sm:justify-end'>{actions}</div> : null}
            </div>
        </div>
    );
}
