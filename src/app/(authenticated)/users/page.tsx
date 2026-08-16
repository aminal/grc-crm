import { PageHeader } from '@/components/layout/page-header';
import { UserTable, type UserTableSortKey } from '@/components/users/user-table';
import { EditUserDialog } from '@/components/users/edit-user-dialog';
import { paginatedTableItems, TablePagination, tablePageFromSearchParam, tableSortDirectionFromSearchParam, tableSortKeyFromSearchParam, tableSortParams, type TableSortDirection } from '@/components/ui/table';
import { TableSearch } from '@/components/ui/table-search';
import { requireManagerOrAdmin } from '@/lib/auth/session';
import { isSeededAdminEmail, listUsers } from '@/lib/data/profiles';
import type { FirestoreRecord, UserProfileData, UserRole } from '@/lib/domain/types';

const userSortKeys = ['name', 'email', 'role', 'title'] as const;

type UsersSearchParams = {
    q?: string | string[];
    user?: string | string[];
    page?: string | string[];
    sort?: string | string[];
    dir?: string | string[];
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
    const sortKey = tableSortKeyFromSearchParam(params.sort, userSortKeys);
    const sortDirection = sortKey ? tableSortDirectionFromSearchParam(params.dir) : null;
    const sortParams = tableSortParams(sortKey, sortDirection);
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
    const sortedUsers = sortUsers(filteredUsers, sortKey, sortDirection);
    const currentPage = tablePageFromSearchParam(params.page, sortedUsers.length);
    const paginatedUsers = paginatedTableItems(sortedUsers, currentPage);
    const paginationHref = hrefWithQuery('/users', query, sortParams);
    const pageParams: Record<string, string> = currentPage > 1 ? { ...sortParams, page: String(currentPage) } : sortParams;
    const filteredHref = hrefWithQuery('/users', query, pageParams);

    return (
        <>
            <PageHeader title='Users' />
            <div className='space-y-6'>
                <TableSearch query={query} placeholder='Filter users by name, email, role, or title' preservedParams={sortParams} />
                <UserTable users={paginatedUsers} selectedUserId={selectedUserId || undefined} viewerRole={currentUser.role} hrefBase={filteredHref} query={query} sortKey={sortKey} sortDirection={sortDirection} />
                <TablePagination baseHref={paginationHref} currentPage={currentPage} totalItems={sortedUsers.length} />
            </div>
            {serializedUser && (
                <EditUserDialog user={serializedUser} closeHref={filteredHref} viewerRole={currentUser.role} lockedRole={lockedRole} />
            )}
        </>
    );
}

function sortUsers(users: FirestoreRecord<UserProfileData>[], sortKey: UserTableSortKey | null, sortDirection: TableSortDirection | null): FirestoreRecord<UserProfileData>[] {
    if (!sortKey || !sortDirection) {
        return users;
    }

    const direction = sortDirection === 'asc' ? 1 : -1;
    return [...users].sort((a, b) => compareStrings(userSortValue(a, sortKey), userSortValue(b, sortKey)) * direction);
}

function userSortValue(user: FirestoreRecord<UserProfileData>, sortKey: UserTableSortKey): string {
    switch (sortKey) {
        case 'name':
            return user.data.display_name || '';
        case 'email':
            return user.data.email ?? '';
        case 'role':
            return user.data.role ?? '';
        case 'title':
            return user.data.title || '';
    }
}

function compareStrings(a: string | null | undefined, b: string | null | undefined): number {
    return (a ?? '').localeCompare(b ?? '', undefined, { numeric: true, sensitivity: 'base' });
}
