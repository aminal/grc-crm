import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth/session';
import { SettingsShell, settingsMenuItems, type SettingsMenuKey } from './settings-shell';

type SettingsSearchParams = {
    view?: string | string[];
};

function firstSearchParam(value: string | string[] | undefined): string {
    return Array.isArray(value) ? (value[0] ?? '') : (value ?? '');
}

function selectedSettingsMenuKey(value: string | string[] | undefined): SettingsMenuKey {
    const key = firstSearchParam(value).trim().toLowerCase();
    return settingsMenuItems.some((item) => item.key === key) ? key as SettingsMenuKey : 'general';
}

export default async function SettingsPage({
    searchParams,
}: {
    searchParams: Promise<SettingsSearchParams>;
}): Promise<React.ReactElement> {
    await requireUser();

    const params = await searchParams;
    const selectedKey = selectedSettingsMenuKey(params.view);

    if (selectedKey === 'appearance') {
        redirect('/settings/appearance');
    }

    if (selectedKey === 'brands') {
        redirect('/settings/brands');
    }

    if (selectedKey === 'products') {
        redirect('/settings/products');
    }

    if (selectedKey === 'strains') {
        redirect('/settings/strains');
    }

    const selectedItem = settingsMenuItems.find((item) => item.key === selectedKey) ?? settingsMenuItems[0];

    return (
        <SettingsShell current={selectedKey}>
            <h2 className='text-lg/6 font-semibold text-zinc-950 dark:text-white'>{selectedItem.label}</h2>
        </SettingsShell>
    );
}
