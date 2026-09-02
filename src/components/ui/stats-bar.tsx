import clsx from 'clsx';
import type { ReactElement, ReactNode } from 'react';
import { Label } from './label';

export type StatsBarItem = {
    label: string;
    value: ReactNode;
    valueClassName?: string;
};

export function StatsBar({ items, className }: { items: StatsBarItem[]; className?: string }): ReactElement {
    return (
        <dl className={clsx('grid gap-4 rounded-xl bg-zinc-50 p-2 grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 dark:bg-zinc-950/30', className)}>
            {items.map((item) => (
                <div key={item.label} className='px-4 pt-1.5 pb-2'>
                    <Label as='div' className='flex xl:justify-end tracking-[0.16em]!'>{item.label}</Label>
                    <dd className={clsx('xl:text-right text-2xl/7 font-semibold', item.valueClassName)}>{item.value}</dd>
                </div>
            ))}
        </dl>
    );
}
