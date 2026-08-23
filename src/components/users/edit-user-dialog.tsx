'use client';

import * as Headless from '@headlessui/react';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import { Dialog, DialogBody, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { EditUserForm, type EditUserFormUser } from '@/components/users/edit-user-form';
import type { UserRole } from '@/lib/domain/types';

export function EditUserDialog({
    user,
    closeHref,
    viewerRole,
    lockedRole,
    viewerCanEditProfiles,
    viewerCanEditPermissions,
    viewerCanAssignAdminRole,
}: {
    user: EditUserFormUser;
    closeHref: string;
    viewerRole: UserRole;
    lockedRole: UserRole | null;
    viewerCanEditProfiles: boolean;
    viewerCanEditPermissions: boolean;
    viewerCanAssignAdminRole: boolean;
}): React.ReactElement {
    const router = useRouter();

    function close(): void {
        router.replace(closeHref, { scroll: false });
    }

    return (
        <Dialog open onClose={close} size='2xl' className='relative'>
            <Headless.CloseButton
                className='absolute top-4 right-4 rounded-lg bg-zinc-100 text-zinc-500 hover:bg-zinc-200! p-2 cursor-pointer transition hover:bg-zinc-800 focus:outline-hidden focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-500 dark:bg-zinc-950/40 dark:hover:bg-zinc-950'
                aria-label='Close dialog'
                onClick={close}
            >
                <X className='size-4' aria-hidden='true' />
            </Headless.CloseButton>
            <DialogTitle className='pr-10'>Edit User</DialogTitle>
            <DialogDescription>
                Update the profile and feature permissions for {user.data.display_name || user.data.email}.
            </DialogDescription>
            <DialogBody>
                <EditUserForm
                    user={user}
                    cancelHref={closeHref}
                    successHref={closeHref}
                    viewerRole={viewerRole}
                    lockedRole={lockedRole}
                    viewerCanEditProfiles={viewerCanEditProfiles}
                    viewerCanEditPermissions={viewerCanEditPermissions}
                    viewerCanAssignAdminRole={viewerCanAssignAdminRole}
                />
            </DialogBody>
        </Dialog>
    );
}
