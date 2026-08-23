'use client';

import { useActionState, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Field, Input, Select } from '@/components/ui/field';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { APP_SECTIONS, normalizePermissions, SECTION_FEATURES, SECTION_LABELS } from '@/lib/auth/permissions';
import type { AppSection, UserPermissions, UserProfileData, UserRole } from '@/lib/domain/types';
import { updateUserFormAction } from '@/app/(authenticated)/users/actions';

const roles: UserRole[] = ['Guest', 'Employee', 'Manager', 'Admin'];

export type EditUserFormUser = {
    id: string;
    data: Pick<UserProfileData, 'email' | 'display_name' | 'picture' | 'role' | 'title' | 'permissions'>;
};

type EditUserFormProps = {
    user: EditUserFormUser;
    cancelHref: string;
    successHref: string;
    viewerRole: UserRole;
    lockedRole: UserRole | null;
    viewerCanEditProfiles: boolean;
    viewerCanEditPermissions: boolean;
    viewerCanAssignAdminRole: boolean;
};

export function EditUserForm({
    user,
    cancelHref,
    successHref,
    viewerRole,
    lockedRole,
    viewerCanEditProfiles,
    viewerCanEditPermissions,
    viewerCanAssignAdminRole,
}: EditUserFormProps): React.ReactElement {
    const router = useRouter();
    const [state, formAction, pending] = useActionState(
        updateUserFormAction.bind(null, user.id),
        { error: null, success: false }
    );
    const currentRole = lockedRole ?? (user.data.role || 'Guest');
    const availableRoles = viewerRole === 'Admin' && viewerCanAssignAdminRole ? roles : roles.filter((role) => role !== 'Admin');
    const visibleRoles = availableRoles.includes(currentRole) ? availableRoles : [currentRole, ...availableRoles];
    const effectivePermissions = normalizePermissions(currentRole, user.data.permissions, user.data.email);
    const [permissions, setPermissions] = useState(effectivePermissions);
    const permissionsLocked = lockedRole === 'Admin';
    const roleLocked = lockedRole !== null || !viewerCanEditProfiles;

    function setSectionPermission(section: AppSection, checked: boolean): void {
        setPermissions((currentPermissions) => ({
            ...currentPermissions,
            [section]: {
                ...currentPermissions[section],
                enabled: section === 'dashboard' ? true : checked,
            },
        }));
    }

    function setFeaturePermission(section: AppSection, featureKey: string, checked: boolean): void {
        setPermissions((currentPermissions) => ({
            ...currentPermissions,
            [section]: {
                ...currentPermissions[section],
                features: {
                    ...currentPermissions[section].features,
                    [featureKey]: checked,
                },
            },
        }) as UserPermissions);
    }

    useEffect(() => {
        if (state.success) {
            router.replace(successHref, { scroll: false });
        }
    }, [router, state.success, successHref]);

    return (
        <form action={formAction} className='space-y-6'>
            <div className='grid sm:grid-cols-2 gap-4'>
                <Field label='Display name'>
                    <Input name='display_name' defaultValue={user.data.display_name ?? ''} readOnly={!viewerCanEditProfiles} required />
                </Field>
                <Field label='Role'>
                    {roleLocked && <input type='hidden' name='role' value={currentRole} />}
                    <Select name='role' defaultValue={currentRole} disabled={roleLocked}>
                        {visibleRoles.map((role) => (
                            <option key={role} value={role}>
                                {role}
                            </option>
                        ))}
                    </Select>
                </Field>
            </div>
            <Field label='Title'>
                <Input name='title' defaultValue={user.data.title ?? ''} placeholder='e.g. Sales Representative' readOnly={!viewerCanEditProfiles} />
            </Field>
            <div className='space-y-3'>
                <div>
                    <h3 className='text-sm font-semibold uppercase tracking-[0.2em] text-zinc-500'>User Permissions</h3>
                    {permissionsLocked ?
                        <p className='mt-1 text-sm text-zinc-500 dark:text-zinc-400'>Seeded Admins always keep access to every section and feature.</p>
                        : null
                    }
                    {!viewerCanEditPermissions ?
                        <p className='mt-1 text-sm text-zinc-500 dark:text-zinc-400'>You can view this user&apos;s permissions, but cannot change them.</p>
                        : null
                    }
                </div>
                <div className='grid gap-4 lg:gap-6 lg:grid-cols-2'>
                    {APP_SECTIONS.map((section) => {
                        const sectionConfig = permissionsLocked ? effectivePermissions[section] : permissions[section];
                        const sectionEnabled = sectionConfig.enabled;
                        const sectionDisabled = permissionsLocked || !viewerCanEditPermissions || section === 'dashboard';

                        return (
                            <div key={section} className='rounded-lg bg-zinc-200/25 dark:bg-white/5'>
                                <input type='hidden' name={`section_${section}_enabled`} value={sectionEnabled ? 'true' : 'false'} />
                                <div className='flex items-start gap-3 bg-zinc-950/5 px-6 py-4 rounded-t-lg'>
                                    <div className='flex items-center gap-x-2 text-sm text-zinc-700 dark:text-zinc-300'>
                                        <Switch
                                            color='purple'
                                            checked={sectionEnabled}
                                            disabled={sectionDisabled}
                                            onChange={(checked) => setSectionPermission(section, checked)}
                                        />
                                    </div>
                                    <div>
                                        <h3 className='text-base/5 uppercase font-semibold text-zinc-950 dark:text-white'>{SECTION_LABELS[section]}</h3>
                                    </div>
                                </div>
                                <div className='py-4 px-6 grid gap-2 sm:grid-cols-2'>
                                    {SECTION_FEATURES[section].map((feature) => {
                                        const featureEnabled = (sectionConfig.features as Record<string, boolean | undefined>)[feature.key] === true;
                                        const featureDisabled = permissionsLocked || !viewerCanEditPermissions || !sectionEnabled;

                                        return (
                                            <div key={feature.key}>
                                            <label className='inline-flex items-center gap-x-2 pr-2 py-1.5 text-sm text-zinc-700 dark:text-zinc-300'>
                                                <input type='hidden' name={`feature_${section}_${feature.key}`} value={featureEnabled ? 'true' : 'false'} />
                                                <Switch
                                                    color='purple'
                                                    checked={featureEnabled}
                                                    disabled={featureDisabled}
                                                    onChange={(checked) => setFeaturePermission(section, feature.key, checked)}
                                                />
                                                {feature.label}
                                            </label>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
            {state.error && (
                <p className='text-sm text-red-500'>{state.error}</p>
            )}
            <div className='flex justify-end gap-x-3'>
                <Button type='button' plain onClick={() => router.replace(cancelHref, { scroll: false })}>
                    Cancel
                </Button>
                <Button type='submit' color='purple' disabled={pending}>
                    {pending ? 'Saving...' : 'Save Changes'}
                </Button>
            </div>
        </form>
    );
}
