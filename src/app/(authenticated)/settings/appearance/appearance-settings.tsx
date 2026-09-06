'use client';

import { MoonIcon } from '@heroicons/react/20/solid';
import { Switch } from '@/components/ui/switch';
import { useThemePreference } from '@/lib/theme-preference';

export function AppearanceSettings(): React.ReactElement {
    const [isDarkMode, setIsDarkMode] = useThemePreference();

    return (
        <div className='max-w-2xl space-y-6'>
            <div>
                <h2 className='text-lg/6 font-semibold text-zinc-950 dark:text-white'>Appearance</h2>
                <p className='mt-2 text-sm/6 text-zinc-500 dark:text-zinc-400'>Choose how GRC CRM looks on this device.</p>
            </div>
            <div className='rounded-xl border border-zinc-950/10 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/5 sm:p-6'>
                <div className='flex items-center justify-between gap-4'>
                    <div className='flex min-w-0 items-start gap-3'>
                        <span className='flex size-10 shrink-0 items-center justify-center rounded-lg bg-purple-500/10 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300'>
                            <MoonIcon className='size-5' aria-hidden='true' />
                        </span>
                        <div>
                            <h3 className='text-base/6 font-semibold text-zinc-950 dark:text-white'>Dark mode</h3>
                            <p className='mt-1 text-sm/6 text-zinc-500 dark:text-zinc-400'>Use a darker color theme throughout the app.</p>
                        </div>
                    </div>
                    <Switch color='purple' checked={isDarkMode} onChange={setIsDarkMode} aria-label='Dark mode' className='shrink-0' />
                </div>
            </div>
        </div>
    );
}
