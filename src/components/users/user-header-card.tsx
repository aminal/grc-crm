import { HeaderCard } from '@/components/layout/header-card';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/domain/format';
import type { FirestoreRecord, UserProfileData, UserRole } from '@/lib/domain/types';

const roleColors: Record<UserRole, 'purple' | 'blue' | 'emerald' | 'zinc'> = {
    Admin: 'purple',
    Manager: 'blue',
    Employee: 'emerald',
    Guest: 'zinc',
};

export function UserHeaderCard({ user, editHref = null }: {
    user: FirestoreRecord<UserProfileData>;
    editHref?: string | null;
}): React.ReactElement {
    const role = user.data.role || 'Guest';
    const displayName = user.data.display_name?.trim() || '—';
    const email = user.data.email?.trim() || 'No email';
    const title = user.data.title?.trim() || 'No title';
    const avatarName = user.data.display_name || user.data.email || user.id;

    return (
        <HeaderCard
            title={displayName}
            badge={<Badge color={roleColors[role]}>{role}</Badge>}
            media={<Avatar name={avatarName} picture={user.data.picture} className='size-16 rounded-xl text-2xl' />}
            meta={[
                { label: 'Title', value: title },
                { label: 'Role', value: role },
                { label: 'Email', value: email },
                { label: 'Last Updated', value: formatDate(user.data.updated_at), breakAll: true },
            ]}
            actions={editHref ? <Button href={editHref} color='purple'>Edit User</Button> : null}
        />
    );
}
