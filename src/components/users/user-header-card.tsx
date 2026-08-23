import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { formatDate } from '@/lib/domain/format';
import type { FirestoreRecord, UserProfileData, UserRole } from '@/lib/domain/types';
import { Label } from '@/components/ui/label';

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
        <Card>
            <CardContent className='flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between'>
                <div className='flex min-w-0 items-start gap-4'>
                    <Avatar name={avatarName} picture={user.data.picture} className='size-16 rounded-xl text-2xl' />
                    <div className='min-w-0'>
                        <div className='flex flex-wrap items-center gap-2'>
                            <h2 className='truncate pt-0.5 text-3xl/8 font-semibold text-zinc-950 dark:text-white'>{displayName}</h2>
                            <Badge color={roleColors[role]}>{role}</Badge>
                        </div>
                        <div className='pt-3 flex gap-4 xl:gap-12 text-sm'>
                            <dl className='flex flex-col'>
                                <UserMetaItem label='Title' value={title} />
                            </dl>
                            <dl className='flex flex-col'>
                                <UserMetaItem label='Role' value={role} />
                            </dl>
                            <dl className='flex flex-col'>
                                <UserMetaItem label='Email' value={email} />
                            </dl>
                            <dl className='flex flex-col'>
                                <UserMetaItem label='Last Updated' breakAll value={formatDate(user.data.updated_at)} />
                            </dl>
                        </div>
                    </div>
                </div>
                <div className='flex flex-col items-start gap-4 sm:items-end'>
                    {editHref ? <Button href={editHref} color='purple'>Edit User</Button> : null}
                </div>
            </CardContent>
        </Card>
    );
}

function UserMetaItem({ label, value, breakAll = false }: {
    label: string;
    value: string;
    breakAll?: boolean;
}): React.ReactElement {
    return (
        <div>
            <dt className='text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500'>{label}</dt>
            <dd className={breakAll ? 'mt-1 break-all font-semibold text-zinc-950 dark:text-white' : 'mt-1 font-semibold text-zinc-950 dark:text-white'}>{value}</dd>
        </div>
    );
}
