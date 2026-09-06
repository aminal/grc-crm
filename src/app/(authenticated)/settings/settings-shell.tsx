import Link from 'next/link';
import { PageHeader } from '@/components/layout/page-header';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export const settingsMenuItems = [
    { key: 'general', label: 'General' },
    { key: 'appearance', label: 'Appearance' },
    { key: 'notifications', label: 'Notifications' },
    { key: 'brands', label: 'Brands' },
    { key: 'products', label: 'Products' },
    { key: 'strains', label: 'Strains' },
] as const;

export type SettingsMenuKey = typeof settingsMenuItems[number]['key'];

function settingsMenuHref(key: SettingsMenuKey): string {
    switch (key) {
        case 'general':
            return '/settings';
        case 'appearance':
            return '/settings/appearance';
        case 'brands':
            return '/settings/brands';
        case 'products':
            return '/settings/products';
        case 'strains':
            return '/settings/strains';
        default:
            return `/settings?view=${key}`;
    }
}

export function SettingsShell({
    current,
    children,
}: {
    current: SettingsMenuKey;
    children: React.ReactNode;
}): React.ReactElement {
    return (
        <>
            <PageHeader title='Settings' />
            <Card className='mt-6 overflow-hidden'>
                <div className='grid lg:grid-cols-[16rem_1fr]'>
                    <nav aria-label='Settings sections' className='border-b border-zinc-950/5 p-3 dark:border-white/10 lg:border-r lg:border-b-0'>
                        <div className='flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible'>
                            {settingsMenuItems.map((item) => {
                                const selected = item.key === current;

                                return (
                                    <Link
                                        key={item.key}
                                        href={settingsMenuHref(item.key)}
                                        aria-current={selected ? 'page' : undefined}
                                        className={cn(
                                            'rounded-md px-3 py-2 text-sm font-medium whitespace-nowrap text-zinc-600 hover:bg-zinc-950/5 hover:text-zinc-950 dark:text-zinc-300 dark:hover:bg-white/5 dark:hover:text-white',
                                            selected && 'bg-zinc-950/5 text-zinc-950 dark:bg-white/5 dark:text-white'
                                        )}
                                    >
                                        {item.label}
                                    </Link>
                                );
                            })}
                        </div>
                    </nav>
                    <section className='min-h-80 p-6'>
                        {children}
                    </section>
                </div>
            </Card>
        </>
    );
}
