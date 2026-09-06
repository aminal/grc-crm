import { requireUser } from '@/lib/auth/session';
import { SettingsShell } from '../settings-shell';
import { AppearanceSettings } from './appearance-settings';

export default async function SettingsAppearancePage(): Promise<React.ReactElement> {
    await requireUser();

    return (
        <SettingsShell current='appearance'>
            <AppearanceSettings />
        </SettingsShell>
    );
}
