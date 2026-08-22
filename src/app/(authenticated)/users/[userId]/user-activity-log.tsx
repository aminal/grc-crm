'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

const activityPageSize = 12;

export type UserActivityLogEntry = {
    id: string;
    orderId: string;
    orderNumber: number;
    companyName: string;
    actorName: string;
    actorPicture: string;
    actionLabel: string;
    createdAtLabel: string;
};

export function UserActivityLog({ activity }: { activity: UserActivityLogEntry[] }): React.ReactElement {
    const [visibleCount, setVisibleCount] = useState(activityPageSize);
    const visibleActivity = activity.slice(0, visibleCount);
    const hasMore = activity.length > visibleActivity.length;

    return (
        <div id='activity-log' className='rounded-xl bg-zinc-50 p-5 dark:bg-zinc-950/20'>
            <p className='text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500 pb-2'>Activity Log</p>
            {activity.length > 0 ? (
                <>
                    <ol className='mt-3 space-y-4 pl-2'>
                        {visibleActivity.map((entry, index) => (
                            <li key={entry.id} className='grid grid-cols-[1rem_1fr] gap-3 text-sm'>
                                <div className='relative flex items-center justify-center'>
                                    {index > 0 ?
                                        <span className='absolute top-0 bottom-1/2 left-1/2 w-px -translate-x-1/2 bg-zinc-300 dark:bg-purple-800/80' /> : null}
                                    {index < visibleActivity.length - 1 ?
                                        <span className='absolute left-1/2 top-1/2 -bottom-4 w-px -translate-x-1/2 bg-zinc-300 dark:bg-purple-800/80' /> : null}
                                    <span className='relative z-10 size-2 rounded-full bg-zinc-400 ring-4 ring-zinc-50 dark:bg-purple-600 dark:ring-purple-950/40' />
                                </div>
                                <div className='min-w-0 flex-1'>
                                    <div className='flex items-center gap-3'>
                                        <Avatar name={entry.actorName} picture={entry.actorPicture} className='size-6 rounded-md text-sm' />
                                        <div className='flex min-w-0 flex-col gap-1'>
                                            <p className='text-sm font-semibold text-zinc-950 dark:text-white'>{entry.actionLabel}</p>
                                            <p className='text-xs uppercase font-medium text-zinc-600 dark:text-zinc-400'>{entry.createdAtLabel}</p>
                                            <Link href={`/sales/${encodeURIComponent(entry.orderId)}`} className='truncate text-xs font-semibold uppercase text-purple-700 hover:text-purple-900 dark:text-purple-300 dark:hover:text-purple-200'>
                                                Order #{entry.orderNumber} · {entry.companyName}
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ol>
                    {hasMore ? (
                        <div className='mt-5 flex justify-center'>
                            <Button type='button' color='purple' className='uppercase' onClick={() => setVisibleCount((count) => count + activityPageSize)}>show more</Button>
                        </div>
                    ) : null}
                </>
            ) : (
                <p className='mt-3 text-sm text-zinc-500 dark:text-zinc-400'>No order activity has been recorded for
                    this user.</p>
            )}
        </div>
    );
}
