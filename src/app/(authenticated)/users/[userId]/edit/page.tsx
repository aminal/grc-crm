import { notFound } from 'next/navigation';
import { EditUserForm, type EditUserFormUser } from '@/components/users/edit-user-form';
import { UserHeaderCard } from '@/components/users/user-header-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { isFeatureEnabled } from '@/lib/auth/permissions';
import { requireSectionEnabled } from '@/lib/auth/session';
import { getUserProfile, isSeededAdminEmail } from '@/lib/data/profiles';
import type { FirestoreRecord, UserProfileData, UserRole } from '@/lib/domain/types';

export default async function EditUserPage({
    params,
}: {
    params: Promise<{ userId: string }>;
}): Promise<React.ReactElement> {
    const currentUser = await requireSectionEnabled('users');
    const { userId } = await params;
    const profile = await getUserProfile(userId);

    if (!profile) {
        notFound();
    }

    const selectedUserIsAdmin = profile.data.role === 'Admin' || isSeededAdminEmail(profile.data.email);
    const viewerCanEditProfiles = isFeatureEnabled(currentUser, 'users', 'edit_user_profiles');
    const viewerCanEditPermissions = isFeatureEnabled(currentUser, 'users', 'edit_user_permissions');
    const viewerCanAssignAdminRole = isFeatureEnabled(currentUser, 'users', 'assign_admin_role');
    const canEditUser = (viewerCanEditProfiles || viewerCanEditPermissions) && (currentUser.role === 'Admin' || !selectedUserIsAdmin);

    if (!canEditUser) {
        notFound();
    }

    const lockedRole: UserRole | null = isSeededAdminEmail(profile.data.email)
        ? 'Admin'
        : currentUser.role === 'Manager' && profile.id === currentUser.uid
            ? currentUser.role
            : null;
    const userHref = userPath(profile.id);

    return (
        <div className='space-y-6'>
            <UserHeaderCard user={profile} />
            <Card>
                <CardHeader>
                    <CardTitle>User Details</CardTitle>
                </CardHeader>
                <CardContent>
                    <EditUserForm
                        user={serializeUser(profile)}
                        cancelHref={userHref}
                        successHref={userHref}
                        viewerRole={currentUser.role}
                        lockedRole={lockedRole}
                        viewerCanEditProfiles={viewerCanEditProfiles}
                        viewerCanEditPermissions={viewerCanEditPermissions}
                        viewerCanAssignAdminRole={viewerCanAssignAdminRole}
                    />
                </CardContent>
            </Card>
        </div>
    );
}

function serializeUser(user: FirestoreRecord<UserProfileData>): EditUserFormUser {
    return {
        id: user.id,
        data: {
            email: user.data.email,
            display_name: user.data.display_name,
            picture: user.data.picture,
            role: user.data.role,
            title: user.data.title,
            permissions: user.data.permissions,
        },
    };
}

function userPath(userId: string): string {
    return `/users/${encodeURIComponent(userId)}`;
}
