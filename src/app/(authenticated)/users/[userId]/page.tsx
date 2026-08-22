import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Avatar } from '@/components/ui/avatar';
import { Badge, StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EditUserDialog } from '@/components/users/edit-user-dialog';
import { UserActivityLog, type UserActivityLogEntry } from './user-activity-log';
import { requireManagerOrAdmin } from '@/lib/auth/session';
import { listActivity, listOrders } from '@/lib/data/orders';
import { getUserProfile, isSeededAdminEmail } from '@/lib/data/profiles';
import { dateFromFirestore, formatDate, formatDateTime, formatMoney } from '@/lib/domain/format';
import type { ActivityData, FirestoreRecord, OrderData, UserProfileData, UserRole } from '@/lib/domain/types';

const roleColors: Record<UserRole, 'purple' | 'blue' | 'emerald' | 'zinc'> = {
    Admin: 'purple',
    Manager: 'blue',
    Employee: 'emerald',
    Guest: 'zinc',
};

const involvementPriority = ['Salesperson', 'Payment', 'Invoice', 'Discount', 'Created', 'Activity'] as const;

type UserDetailSearchParams = {
    edit?: string | string[];
};

type SerializedUser = {
    id: string;
    data: Omit<UserProfileData, 'updated_at'>;
};

type UserOrderActivity = FirestoreRecord<ActivityData> & {
    order: FirestoreRecord<OrderData>;
};

type RelatedOrderRow = {
    order: FirestoreRecord<OrderData>;
    involvement: string[];
};

export default async function UserDetailPage({
    params,
    searchParams,
}: {
    params: Promise<{ userId: string }>;
    searchParams: Promise<UserDetailSearchParams>;
}): Promise<React.ReactElement> {
    const currentUser = await requireManagerOrAdmin();
    const { userId } = await params;
    const [profile, orders] = await Promise.all([getUserProfile(userId), listOrders()]);

    if (!profile) {
        notFound();
    }

    const search = await searchParams;
    const userHref = userPath(profile.id);
    const activity = await listUserOrderActivity(orders, profile.id);
    const activityLogEntries = serializeActivityLogEntries(activity);
    const activityOrderIds = new Set(activity.map((entry) => entry.order.id));
    const relatedOrders = orders
        .map((order) => ({
            order,
            involvement: userInvolvementLabels(order, profile.id, activityOrderIds.has(order.id)),
        }))
        .filter((row) => row.involvement.length > 0)
        .sort((a, b) => firestoreMillis(b.order.data.created_at) - firestoreMillis(a.order.data.created_at));
    const selectedUserIsAdmin = profile.data.role === 'Admin' || isSeededAdminEmail(profile.data.email);
    const canEditUser = currentUser.role === 'Admin' || !selectedUserIsAdmin;
    const lockedRole: UserRole | null = isSeededAdminEmail(profile.data.email)
        ? 'Admin'
        : currentUser.role === 'Manager' && profile.id === currentUser.uid
            ? currentUser.role
            : null;
    const editHref = `${userHref}?edit=1`;
    const editOpen = Boolean(firstSearchParam(search.edit));

    return (
        <div className='space-y-6'>
            <UserHeaderCard user={profile} editHref={canEditUser ? editHref : null} />

            <div className='grid gap-6 xl:grid-cols-[1.44fr_0.76fr]'>
                <RelatedOrdersCard rows={relatedOrders} />
                <UserActivityLog activity={activityLogEntries} />
            </div>

            {canEditUser && editOpen ? (
                <EditUserDialog user={serializeUser(profile)} closeHref={userHref} viewerRole={currentUser.role} lockedRole={lockedRole} />
            ) : null}
        </div>
    );
}

function UserHeaderCard({ user, editHref }: {
    user: FirestoreRecord<UserProfileData>;
    editHref: string | null
}): React.ReactElement {
    const role = user.data.role || 'Guest';
    const displayName = user.data.display_name?.trim() || '—';
    const email = user.data.email?.trim() || 'No email';
    const title = user.data.title?.trim() || 'No title';
    const avatarName = user.data.display_name || user.data.email || user.id;

    return (
        <Card>
            <CardContent className='flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between'>
                <div className='flex min-w-0 items-center gap-4'>
                    <Avatar name={avatarName} picture={user.data.picture} className='size-16 rounded-xl text-2xl' />
                    <div className='min-w-0'>
                        <div className='flex flex-wrap items-center gap-2'>
                            <h2 className='truncate text-2xl/7 font-semibold text-zinc-950 dark:text-white'>{displayName}</h2>
                            <Badge color={roleColors[role]}>{role}</Badge>
                        </div>
                        <p className='mt-1 break-words text-sm font-medium text-zinc-500 dark:text-zinc-400'>{email}</p>
                        <p className='mt-1 text-sm font-medium text-zinc-600 dark:text-zinc-300'>{title}</p>
                    </div>
                </div>
                <div className='flex flex-col items-start gap-4 sm:items-end'>
                    {editHref ? <Button href={editHref} color='purple'>Edit User</Button> : null}
                    <dl className='sm:text-right'>
                        <UserMetaItem label='Last Updated' value={formatDate(user.data.updated_at)} />
                    </dl>
                </div>
            </CardContent>
        </Card>
    );
}

function RelatedOrdersCard({ rows }: { rows: RelatedOrderRow[] }): React.ReactElement {
    return (
        <div>
            <Card>
                <CardHeader>
                    <CardTitle>Related Orders</CardTitle>
                    <p className='mt-1 text-sm text-zinc-500 dark:text-zinc-400'>Orders this user created, sold,
                        changed,
                        invoiced, discounted, or collected payment on.</p>
                </CardHeader>
                <CardContent className={rows.length > 0 ? 'p-0' : undefined}>
                    {rows.length > 0 ? (
                        <Table className='mx-0! pt-4 pb-6 [--gutter:--spacing(5)]!'>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Order #</TableHead>
                                    <TableHead>Company</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className='text-right'>Total</TableHead>
                                    <TableHead>Involvement</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {rows.map((row) => {
                                    const href = `/sales/${encodeURIComponent(row.order.id)}`;
                                    const label = `View order ${row.order.data.order_number}`;
                                    const involvementLabel = primaryInvolvementLabel(row.involvement);

                                    return (
                                        <TableRow key={row.order.id} className='group cursor-pointer'>
                                            <TableCell>
                                                <Link href={href} className='font-semibold text-purple-700 hover:text-purple-900 dark:text-purple-300 dark:hover:text-purple-200'>
                                                    <span className='absolute inset-0' />
                                                    {row.order.data.order_number}
                                                </Link>
                                            </TableCell>
                                            <TableCell>
                                                <Link href={href} aria-hidden tabIndex={-1} className='absolute inset-0 z-10'>
                                                    <span className='sr-only'>{label}</span>
                                                </Link>
                                                {row.order.data.company_name}
                                            </TableCell>
                                            <TableCell>
                                                <Link href={href} aria-hidden tabIndex={-1} className='absolute inset-0 z-10'>
                                                    <span className='sr-only'>{label}</span>
                                                </Link>
                                                <StatusBadge status={row.order.data.status} />
                                            </TableCell>
                                            <TableCell className='text-right font-medium text-zinc-950 dark:text-white'>
                                                <Link href={href} aria-hidden tabIndex={-1} className='absolute inset-0 z-10'>
                                                    <span className='sr-only'>{label}</span>
                                                </Link>
                                                {formatMoney(row.order.data.total_cents)}
                                            </TableCell>
                                            <TableCell>
                                                <Link href={href} aria-hidden tabIndex={-1} className='absolute inset-0 z-10'>
                                                    <span className='sr-only'>{label}</span>
                                                </Link>
                                                <Badge color='zinc'>{involvementLabel}</Badge>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    ) : (
                        <p className='text-sm text-zinc-500 dark:text-zinc-400'>No related orders found for this
                            user.</p>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

function UserMetaItem({ label, value, breakAll = false }: {
    label: string;
    value: string;
    breakAll?: boolean
}): React.ReactElement {
    return (
        <div>
            <dt className='text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500'>{label}</dt>
            <dd className={breakAll ? 'mt-2 break-all font-semibold text-zinc-950 dark:text-white' : 'mt-2 font-semibold text-zinc-950 dark:text-white'}>{value}</dd>
        </div>
    );
}

async function listUserOrderActivity(orders: FirestoreRecord<OrderData>[], userId: string): Promise<UserOrderActivity[]> {
    const activityByOrder = await Promise.all(orders.map(async (order) => {
        const entries = await listActivity(order.id);
        return entries
            .filter((entry) => entry.data.actor_user_id === userId)
            .map((entry) => ({ ...entry, order }));
    }));

    return activityByOrder.flat().sort((a, b) => firestoreMillis(b.data.created_at) - firestoreMillis(a.data.created_at));
}

function serializeActivityLogEntries(activity: UserOrderActivity[]): UserActivityLogEntry[] {
    return activity.map((entry) => ({
        id: `${entry.order.id}-${entry.id}`,
        orderId: entry.order.id,
        orderNumber: entry.order.data.order_number,
        companyName: entry.order.data.company_name,
        actorName: entry.data.actor_name,
        actorPicture: entry.data.actor_picture,
        actionLabel: formatActivityAction(entry.data.action),
        createdAtLabel: formatDateTime(entry.data.created_at),
    }));
}

function primaryInvolvementLabel(labels: string[]): string {
    return involvementPriority.find((label) => labels.includes(label)) ?? labels[0] ?? 'Activity';
}

function userInvolvementLabels(order: FirestoreRecord<OrderData>, userId: string, hasActivity: boolean): string[] {
    const labels: string[] = [];
    const invoice = order.data.invoice;
    const payments = invoice?.payments ?? [];

    if (order.data.salesperson?.uid === userId) {
        labels.push('Salesperson');
    }

    if (order.data.created_by?.uid === userId) {
        labels.push('Created');
    }

    if (invoice?.issued_by?.uid === userId || invoice?.created_by?.uid === userId) {
        labels.push('Invoice');
    }

    if (invoice?.discount?.applied_by?.uid === userId) {
        labels.push('Discount');
    }

    if (payments.some((payment) => payment.recorded_by?.uid === userId || payment.updated_by?.uid === userId)) {
        labels.push('Payment');
    }

    if (hasActivity && labels.length === 0) {
        labels.push('Activity');
    }

    return labels;
}

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

function userPath(userId: string): string {
    return `/users/${encodeURIComponent(userId)}`;
}

function firestoreMillis(value: Parameters<typeof dateFromFirestore>[0]): number {
    return dateFromFirestore(value)?.getTime() ?? 0;
}

function formatActivityAction(action: string): string {
    const label = action.replaceAll('_', ' ');
    return label ? `${label.charAt(0).toUpperCase()}${label.slice(1)}` : label;
}
