'use client';

import * as Headless from '@headlessui/react';
import {
  ArrowRightStartOnRectangleIcon,
  Bars3Icon,
  ChevronUpIcon,
  MoonIcon,
  UserCircleIcon,
  XMarkIcon
} from '@heroicons/react/20/solid';
import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useId, useState } from 'react';
import type { AuthenticatedUser } from '@/lib/domain/types';
import { TouchTarget } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import {
  Dropdown,
  DropdownButton,
  DropdownDivider,
  DropdownItem,
  DropdownLabel,
  DropdownMenu
} from '@/components/ui/dropdown';
import { sidebarItemClasses, SidebarNav } from '@/components/layout/sidebar-nav';
import { cn } from '@/lib/utils';

type SidebarProps = {
    user: AuthenticatedUser;
    logoutAction: () => Promise<void>;
};

const navbarItemClasses = cn(
    'relative flex min-w-0 items-center gap-3 rounded-lg p-2 text-left text-base/6 font-medium text-zinc-950 sm:text-sm/5',
    '*:data-[slot=icon]:size-6 *:data-[slot=icon]:shrink-0 *:data-[slot=icon]:fill-zinc-500 sm:*:data-[slot=icon]:size-5',
    'data-hover:bg-zinc-950/5 data-hover:*:data-[slot=icon]:fill-zinc-950',
    'data-active:bg-zinc-950/5 data-active:*:data-[slot=icon]:fill-zinc-950',
    'dark:text-white dark:*:data-[slot=icon]:fill-zinc-400',
    'dark:data-hover:bg-white/5 dark:data-hover:*:data-[slot=icon]:fill-white',
    'dark:data-active:bg-white/5 dark:data-active:*:data-[slot=icon]:fill-white',
);

const themeStorageKey = 'theme';

function getPreferredDarkMode(): boolean {
    try {
        const storedTheme = window.localStorage.getItem(themeStorageKey);

        if (storedTheme === 'dark') {
            return true;
        }

        if (storedTheme === 'light') {
            return false;
        }

        return window.matchMedia('(prefers-color-scheme: dark)').matches;
    } catch {
        return false;
    }
}

function applyThemePreference(isDarkMode: boolean): void {
    document.documentElement.classList.toggle('dark', isDarkMode);
    document.documentElement.style.colorScheme = isDarkMode ? 'dark' : 'light';
}

function saveThemePreference(isDarkMode: boolean): void {
    try {
        window.localStorage.setItem(themeStorageKey, isDarkMode ? 'dark' : 'light');
    } catch {
        return;
    }
}

export function Sidebar({ user, logoutAction }: SidebarProps): React.ReactElement {
    const [showSidebar, setShowSidebar] = useState(false);

    return (
        <>
            <Headless.Dialog open={showSidebar} onClose={() => setShowSidebar(false)} className='lg:hidden'>
                <Headless.DialogBackdrop
                    transition
                    className='fixed inset-0 bg-black/30 transition data-closed:opacity-0 data-enter:duration-300 data-enter:ease-out data-leave:duration-200 data-leave:ease-in'
                />
                <Headless.DialogPanel
                    transition
                    className='fixed inset-y-0 w-full max-w-80 transition duration-300 ease-in-out data-closed:-translate-x-full'
                >
                    <div className='flex h-full flex-col rounded-lg bg-zinc-100 shadow-xs ring-1 ring-zinc-950/5 dark:bg-zinc-950 dark:ring-white/10'>
                        <SidebarContent user={user} logoutAction={logoutAction} onNavigate={() => setShowSidebar(false)} showCloseButton />
                    </div>
                </Headless.DialogPanel>
            </Headless.Dialog>

            <header className='flex items-center px-4 lg:hidden bg-zinc-100 border-b border-zinc-200/50 dark:bg-zinc-950/60 dark:border-zinc-900/50'>
                <div className='py-2.5'>
                    <Headless.Button type='button' className={navbarItemClasses} onClick={() => setShowSidebar(true)} aria-label='Open navigation'>
                        <TouchTarget>
                            <Bars3Icon data-slot='icon' aria-hidden='true' />
                        </TouchTarget>
                    </Headless.Button>
                </div>
                <div className='min-w-0'>
                    <nav className='flex items-center gap-4 py-2'>
                        <Brand compact />
                    </nav>
                </div>
            </header>

            <aside className='fixed inset-y-0 left-0 w-64 max-lg:hidden'>
                <SidebarContent user={user} logoutAction={logoutAction} />
            </aside>
        </>
    );
}

function SidebarContent({ user, logoutAction, onNavigate, showCloseButton = false }: {
    user: AuthenticatedUser;
    logoutAction: () => Promise<void>;
    onNavigate?: () => void;
    showCloseButton?: boolean;
}): React.ReactElement {
    return (
        <nav className='flex h-full min-h-0 flex-col bg-zinc-100 dark:bg-zinc-950'>
            <div className='flex flex-col border-b border-zinc-950/5 p-4 dark:border-white/5 [&>[data-slot=section]+[data-slot=section]]:mt-2.5'>
                <div data-slot='section' className={cn('flex gap-0.5', showCloseButton ? 'items-start' : 'flex-col')}>
                    <Brand />
                    {showCloseButton ? (
                        <Headless.CloseButton className={cn(navbarItemClasses, 'shrink-0')} aria-label='Close navigation'>
                            <TouchTarget>
                                <XMarkIcon data-slot='icon' aria-hidden='true' />
                            </TouchTarget>
                        </Headless.CloseButton>
                    ) : null}
                </div>
            </div>
            <div className='flex flex-1 flex-col overflow-y-auto p-4 [&>[data-slot=section]+[data-slot=section]]:mt-8'>
                <SidebarNav user={user} onNavigate={onNavigate} />
                <div aria-hidden='true' className='mt-8 flex-1' />
            </div>
            <div className='flex flex-col border-t border-zinc-950/5 p-4 dark:border-white/5 [&>[data-slot=section]+[data-slot=section]]:mt-2.5'>
                <UserPanel user={user} logoutAction={logoutAction} onNavigate={onNavigate} />
            </div>
        </nav>
    );
}

function Brand({ compact = false }: { compact?: boolean }): React.ReactElement {
    const content = (
        <TouchTarget>
            <Image
                data-slot='avatar'
                src='/web-app-manifest-192x192.png'
                alt=''
                width={192}
                height={192}
                className='size-10 shrink-0 rounded-lg'
            />
            <span className='min-w-0'>
                <span className='block truncate text-lg/5 font-semibold text-zinc-950 dark:text-white uppercase'>Green Room</span>
                <span className='block truncate text-sm/5 font-semibold text-zinc-500 dark:text-zinc-400'>CRM</span>
            </span>
        </TouchTarget>
    );

    if (compact) {
        return (
            <Link href='/dashboard' className={navbarItemClasses}>
                {content}
            </Link>
        );
    }

    return (
        <Headless.CloseButton as={Link} href='/dashboard' className={sidebarItemClasses}>
            {content}
        </Headless.CloseButton>
    );
}

function UserPanel({ user, logoutAction, onNavigate }: {
    user: AuthenticatedUser;
    logoutAction: () => Promise<void>;
    onNavigate?: () => void
}): React.ReactElement {
    const themeMenuItemId = useId();
    const [isDarkMode, setIsDarkMode] = useState(getPreferredDarkMode);

    useEffect(() => {
        applyThemePreference(isDarkMode);
    }, [isDarkMode]);

    const toggleThemePreference = useCallback(() => {
        const nextIsDarkMode = !isDarkMode;
        setIsDarkMode(nextIsDarkMode);
        applyThemePreference(nextIsDarkMode);
        saveThemePreference(nextIsDarkMode);
    }, [isDarkMode]);

    const handleThemeClick = useCallback(
        (event: React.MouseEvent<HTMLButtonElement>) => {
            event.preventDefault();
            toggleThemePreference();
        },
        [toggleThemePreference],
    );

    const handleThemeMenuKeyDownCapture = useCallback(
        (event: React.KeyboardEvent<HTMLDivElement>) => {
            if (event.key !== 'Enter' && event.key !== ' ' && event.key !== 'Spacebar') {
                return;
            }

            if (event.currentTarget.getAttribute('aria-activedescendant') !== themeMenuItemId) {
                return;
            }

            event.preventDefault();
            event.stopPropagation();
            toggleThemePreference();
        },
        [themeMenuItemId, toggleThemePreference],
    );

    const title = user.title?.trim();
    const userPanelDetail = title && title.toLowerCase() !== 'guest' ? title : user.role ?? 'Guest';

    return (
        <div data-slot='section' className='flex flex-col gap-0.5'>
            <Dropdown>
                <DropdownButton className={sidebarItemClasses}>
                    <TouchTarget>
            <span className='flex min-w-0 items-center gap-3'>
              <Avatar name={user.name ?? user.email} picture={user.picture} className='size-10 rounded-lg sm:size-9' />
              <span className='min-w-0'>
                <span className='block truncate text-sm/5 font-medium text-zinc-950 dark:text-white'>{user.name ?? user.email}</span>
                <span className='block truncate text-xs/5 font-medium text-zinc-500 dark:text-zinc-400'>{userPanelDetail}</span>
              </span>
            </span>
                        <ChevronUpIcon data-slot='icon' aria-hidden='true' />
                    </TouchTarget>
                </DropdownButton>
                <DropdownMenu className='min-w-56' anchor='top start' onKeyDownCapture={handleThemeMenuKeyDownCapture}>
                    <DropdownItem href='/profile' onClick={onNavigate}>
                        <UserCircleIcon data-slot='icon' aria-hidden='true' />
                        <DropdownLabel>My profile</DropdownLabel>
                    </DropdownItem>
                    <DropdownItem id={themeMenuItemId} aria-label={`Dark Mode ${isDarkMode ? 'on' : 'off'}`} onClick={handleThemeClick}>
                        <MoonIcon data-slot='icon' aria-hidden='true' />
                        <DropdownLabel>Dark Mode</DropdownLabel>
                        <span
                            aria-hidden='true'
                            className={cn(
                                'col-start-5 row-start-1 flex h-5 w-9 justify-self-end rounded-full p-0.5 transition-colors group-data-focus:bg-white/25',
                                isDarkMode ? 'bg-purple-500' : 'bg-zinc-200 dark:bg-zinc-700',
                            )}
                        >
              <span className={cn('size-4 rounded-full bg-white shadow-xs ring-1 ring-zinc-950/10 transition-transform', isDarkMode && 'translate-x-4')} />
            </span>
                    </DropdownItem>
                    <DropdownDivider />
                    <form action={logoutAction} className='contents'>
                        <DropdownItem type='submit' onClick={onNavigate}>
                            <ArrowRightStartOnRectangleIcon data-slot='icon' aria-hidden='true' />
                            <DropdownLabel>Sign out</DropdownLabel>
                        </DropdownItem>
                    </form>
                </DropdownMenu>
            </Dropdown>
        </div>
    );
}
