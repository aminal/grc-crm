import { PageHeader } from '@/components/layout/page-header';
import { UserTable } from '@/components/users/user-table';
import { EditUserDialog } from '@/components/users/edit-user-dialog';
import { TableSearch } from '@/components/ui/table-search';
import { requireManagerOrAdmin } from '@/lib/auth/session';
import { isSeededAdminEmail, listUsers } from '@/lib/data/profiles';
import type { FirestoreRecord, UserProfileData, UserRole } from '@/lib/domain/types';

type UsersSearchParams = {
    q?: string | string[];
    user?: string | string[];
};

type SerializedUser = {
    id: string;
    data: Omit<UserProfileData, 'updated_at'>;
};

function serializeUser(user: FirestoreRecord<UserProfileData>): SerializedUser {
    return {
        id: user.id,
        data: {
            email: user.data.email,
            display_name: user.data.display_name,
            picture: user.data.picture,
            role: user.data.role,
            title: user.data.title,
        },
    };
}

function firstSearchParam(value: string | string[] | undefined): string {
    return Array.isArray(value) ? (value[0] ?? '') : (value ?? '');
}

function hrefWithQuery(baseHref: string, query: string, params: Record<string, string> = {}): string {
    const searchParams = new URLSearchParams();
    if (query) {
        searchParams.set('q', query);
    }

    Object.entries(params).forEach(([key, value]) => {
        if (value) {
            searchParams.set(key, value);
        }
    });

    const search = searchParams.toString();
    return search ? `${baseHref}?${search}` : baseHref;
}

function filterUsers(users: FirestoreRecord<UserProfileData>[], query: string): FirestoreRecord<UserProfileData>[] {
    const normalized = query.trim().toLowerCase();
    return normalized ? users.filter((user) => [
        user.data.display_name,
        user.data.email,
        user.data.role,
        user.data.title,
    ].join(' ').toLowerCase().includes(normalized)) : users;
}

export default async function UsersPage({
    searchParams,
}: {
    searchParams: Promise<UsersSearchParams>;
}): Promise<React.ReactElement> {
    const currentUser = await requireManagerOrAdmin();
    const users = await listUsers();
    const params = await searchParams;
    const query = firstSearchParam(params.q).trim();
    const selectedUserId = firstSearchParam(params.user).trim();
    const selectedUser = selectedUserId ? users.find((u) => u.id === selectedUserId) : null;
    const selectedUserIsAdmin = selectedUser ? selectedUser.data.role === 'Admin' || isSeededAdminEmail(selectedUser.data.email) : false;
    const canEditSelectedUser = selectedUser ? currentUser.role === 'Admin' || !selectedUserIsAdmin : false;
    const serializedUser = selectedUser && canEditSelectedUser ? serializeUser(selectedUser) : null;
    const lockedRole: UserRole | null = serializedUser
        ? isSeededAdminEmail(serializedUser.data.email)
            ? 'Admin'
            : currentUser.role === 'Manager' && serializedUser.id === currentUser.uid
                ? currentUser.role
                : null
        : null;
    const filteredUsers = filterUsers(users, query);
    const filteredHref = hrefWithQuery('/users', query);

    return (
        <>
            <PageHeader title='Users' />
            <div className='space-y-6'>
                <TableSearch query={query} placeholder='Filter users by name, email, role, or title' />
                <UserTable users={filteredUsers} selectedUserId={selectedUserId || undefined} viewerRole={currentUser.role} hrefBase={filteredHref} />
            </div>
            {serializedUser && (
                <EditUserDialog user={serializedUser} closeHref={filteredHref} viewerRole={currentUser.role} lockedRole={lockedRole} />
            )}
        </>
    );
}
