import { ChatBubbleLeftRightIcon, EnvelopeIcon, PhoneIcon, UserGroupIcon } from '@heroicons/react/20/solid';
import { ChevronRight, MoveRight } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Avatar } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/field';
import { Button } from '@/components/ui/button';
import { CompanyTabs } from '@/components/company/company-tabs';
import { createInteractionEntryAction } from '../../actions';
import { listInteractions } from '@/lib/data/crm';
import { dateFromFirestore, formatCompanySubheading, formatDateTime } from '@/lib/domain/format';
import type { FirestoreDate, InteractionMethod, InteractionRecord } from '@/lib/domain/types';
import { loadCompanyRoute } from '../company-route';
import { requireNonGuest } from '@/lib/auth/session';
import { LogInteractionDialog } from './log-interaction-dialog';

export default async function CompanyActivityPage({ params }: {
    params: Promise<{ companyId: string }>
}): Promise<React.ReactElement> {
    await requireNonGuest();

    const { companyId: routeSegment } = await params;
    const { company, companyId, companySlug } = await loadCompanyRoute(routeSegment, '/activity');
    const interactions = await listInteractions(companyId);
    const activitySummary = summarizeActivity(interactions);
    return (
        <div>
            <PageHeader title={company.data.company_name} description={formatCompanySubheading(company.data)} actions={
                <LogInteractionDialog companyId={companyId} />} />
            <CompanyTabs companySlug={companySlug} active='activity' />

            <div className='flex flex-col gap-6 sm:flex-row'>
                <div className='space-y-4 flex-1'>
                    {interactions.map((interaction) => {
                        const replyCount = interaction.entries.length;
                        const replyLabel = `${replyCount} ${replyCount === 1 ? 'Reply' : 'Replies'}`;

                        return (
                            <details key={interaction.id} className='group bg-zinc-100 dark:bg-zinc-950/40 rounded-lg lg:max-w-4xl'>
                                <summary className='cursor-pointer list-none p-5 [&::-webkit-details-marker]:hidden'>
                                    <div className='flex items-start gap-0'>
                                        <ActivityMethodIcon method={interaction.data.interaction_method} />
                                        <div className='flex mr-2 size-9 shrink-0 items-center justify-center text-zinc-400 dark:text-zinc-500'>
                                            <MoveRight className='size-5' aria-hidden='true' />
                                        </div>
                                        <div className='min-w-0 flex-1'>
                                            <ActivityComment
                                                className='min-w-0 flex-1'
                                                date={interaction.data.contact_date_time}
                                                name={interaction.data.salesperson_name}
                                                picture={interaction.data.salesperson_picture}
                                                note={interaction.data.discussion_notes}
                                            />
                                            <div className='ml-12 mt-3 flex items-center gap-1 text-xs font-semibold uppercase text-zinc-500 dark:text-zinc-400'>
                                                <ChevronRight className='size-4 transition-transform group-open:rotate-90' aria-hidden='true' />
                                                {replyLabel}
                                            </div>
                                        </div>
                                    </div>
                                </summary>

                                <div className='px-5 pb-5'>
                                    <div className='ml-[4.25rem]'>
                                        {replyCount > 0 ? (
                                            <div className='divide-y divide-zinc-950/5 rounded-lg bg-white px-6 py-4 dark:divide-white/5 dark:bg-zinc-950/40'>
                                                {interaction.entries.map((entry) => (
                                                    <div key={entry.id} className='py-4 first:pt-0 last:pb-0'>
                                                        <ActivityComment
                                                            date={entry.data.contact_date_time}
                                                            name={entry.data.salesperson_name}
                                                            picture={entry.data.salesperson_picture}
                                                            note={entry.data.discussion_notes}
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        ) : null}

                                        <details className='mt-4 rounded-lg bg-zinc-50 p-4 dark:bg-zinc-900'>
                                            <summary className='cursor-pointer text-md uppercase font-semibold text-zinc-400/75'>
                                                Add Reply
                                            </summary>
                                            <form action={createInteractionEntryAction.bind(null, companyId, interaction.id)} className='text-right mt-4 space-y-3 '>
                                                <Textarea name='discussion_notes' required placeholder='' />
                                                <Button variant='primary'>Add Reply</Button>
                                            </form>
                                        </details>
                                    </div>
                                </div>
                            </details>
                        );
                    })}

                    {interactions.length === 0 ? <Card><CardContent>
                        <p className='text-base/6 uppercase font-semibold text-zinc-500 text-center py-12'>No activity
                            has
                            been logged yet</p></CardContent></Card> : null}
                </div>
                <ActivityStatusPanel summary={activitySummary} />
            </div>
        </div>
    );
}

type ActivitySummary = {
    count: number;
    latestDate?: FirestoreDate;
    latestMethod?: InteractionMethod;
};

function summarizeActivity(interactions: InteractionRecord[]): ActivitySummary {
    let count = 0;
    let latestDate: Date | null = null;
    let latestValue: FirestoreDate | undefined;
    let latestMethod: InteractionMethod | undefined;

    for (const interaction of interactions) {
        count += 1;
        const interactionDate = dateFromFirestore(interaction.data.contact_date_time);

        if (interactionDate && (!latestDate || interactionDate.getTime() > latestDate.getTime())) {
            latestDate = interactionDate;
            latestValue = interaction.data.contact_date_time;
            latestMethod = interaction.data.interaction_method;
        }

        for (const entry of interaction.entries) {
            count += 1;
            const entryDate = dateFromFirestore(entry.data.contact_date_time);

            if (entryDate && (!latestDate || entryDate.getTime() > latestDate.getTime())) {
                latestDate = entryDate;
                latestValue = entry.data.contact_date_time;
                latestMethod = interaction.data.interaction_method;
            }
        }
    }

    return { count, latestDate: latestValue, latestMethod };
}

type ActivityMethodIconConfig = {
    Icon: typeof EnvelopeIcon;
    className: string;
};

const activityMethodIconConfig: Record<InteractionMethod, ActivityMethodIconConfig> = {
    Email: { Icon: EnvelopeIcon, className: 'text-blue-600' },
    Text: { Icon: ChatBubbleLeftRightIcon, className: 'text-green-600' },
    Phone: { Icon: PhoneIcon, className: 'text-purple-600' },
    'In-Person': { Icon: UserGroupIcon, className: 'text-zinc-600' },
};

const activityCommentTimeFormatter = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
});

const activityCommentWeekdayFormatter = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
});

const activityCommentRelativeFormatter = new Intl.RelativeTimeFormat('en-US', {
    numeric: 'auto',
});

function startOfDay(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function startOfWeek(date: Date): Date {
    const start = startOfDay(date);
    start.setDate(start.getDate() - start.getDay());
    return start;
}

function formatTimeSince(date: Date, now: Date): string {
    const diffMs = now.getTime() - date.getTime();

    if (diffMs < 60_000) {
        return 'just now';
    }

    const diffMinutes = Math.floor(diffMs / 60_000);

    if (diffMinutes < 60) {
        return activityCommentRelativeFormatter.format(-diffMinutes, 'minute');
    }

    return activityCommentRelativeFormatter.format(-Math.floor(diffMinutes / 60), 'hour');
}

function formatActivityCommentDate(value: FirestoreDate | undefined): string {
    const date = dateFromFirestore(value);

    if (!date) {
        return '—';
    }

    const now = new Date();
    const commentDay = startOfDay(date).getTime();
    const today = startOfDay(now).getTime();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (commentDay === today) {
        return formatTimeSince(date, now);
    }

    if (commentDay === yesterday.getTime()) {
        return `Yesterday at ${activityCommentTimeFormatter.format(date)}`;
    }

    if (commentDay >= startOfWeek(now).getTime() && commentDay < today) {
        return `${activityCommentWeekdayFormatter.format(date)} at ${activityCommentTimeFormatter.format(date)}`;
    }

    return formatDateTime(value);
}

function ActivityMethodIcon({ method }: { method: InteractionMethod }): React.ReactElement {
    const { Icon, className } = activityMethodIconConfig[method];

    return (
        <div className={`flex size-9 shrink-0 items-center justify-center ${className}`}>
            <Icon className='size-5' aria-hidden='true' />
            <span className='sr-only'>{method}</span>
        </div>
    );
}

function ActivityStatusPanel({ summary }: { summary: ActivitySummary }): React.ReactElement {
    const latestActivity = summary.latestDate ? formatActivityCommentDate(summary.latestDate) : '—';
    const totalActivity = <div className='uppercase'>{`${summary.count} ${summary.count === 1 ? 'Interaction' : 'Interactions'}`}</div>;

    return (
        <aside className='w-full shrink-0 sm:w-72 lg:w-80'>
            <Card>
                <CardContent className='space-y-5 p-5'>
                    <dl className='space-y-4'>
                        <ActivityStatusItem label='Latest activity' value={latestActivity} />
                        <ActivityStatusItem label='Total' value={totalActivity} />
                    </dl>
                </CardContent>
            </Card>
        </aside>
    );
}

function ActivityStatusItem({ label, value }: {
    label: string;
    value: string | React.ReactElement;
}): React.ReactElement {
    return (
        <div>
            <dt className='text-xs/5 font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400'>{label}</dt>
            <dd className='mt-1 text-sm/6 font-medium text-zinc-950 dark:text-white'>{value}</dd>
        </div>
    );
}

function ActivityComment({ name, picture, note, date, className = '' }: {
    name: string;
    picture: string;
    note: string;
    date?: FirestoreDate;
    className?: string;
}): React.ReactElement {
    const wrapperClassName = className ? `flex items-start gap-3 ${className}` : 'flex items-start gap-3';
    const metadata = date === undefined ? undefined : formatActivityCommentDate(date);

    return (
        <div className={wrapperClassName}>
            <Avatar name={name} picture={picture} />
            <div className='flex-1'>
                <div className='flex flex-wrap gap-x-2 gap-y-1'>
                    <div className='text-base/5 font-semibold pb-1 text-zinc-950 dark:text-white'>
                        {name}
                        {metadata ?
                            <div className='text-xs font-semibold uppercase text-zinc-500 dark:text-zinc-400'>{metadata}</div> : null}
                    </div>
                </div>
                <div className={metadata
                    ? 'mt-1 whitespace-pre-wrap text-base font-medium text-zinc-700 dark:text-zinc-300'
                    : 'mt-1 whitespace-pre-wrap text-base font-medium leading-6 text-zinc-800 dark:text-zinc-200'
                }>{note}</div>
            </div>
        </div>
    );
}
