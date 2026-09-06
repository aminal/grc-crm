'use client';

import { useCallback, useEffect, useState } from 'react';

const themeStorageKey = 'theme';
const themePreferenceEventName = 'grc-theme-preference-change';

type ThemePreferenceEvent = CustomEvent<{ isDarkMode: boolean }>;

export function getPreferredDarkMode(): boolean {
    if (typeof window === 'undefined') {
        return false;
    }

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
    if (typeof document === 'undefined') {
        return;
    }

    document.documentElement.classList.toggle('dark', isDarkMode);
    document.documentElement.style.colorScheme = isDarkMode ? 'dark' : 'light';
}

function saveThemePreference(isDarkMode: boolean): void {
    if (typeof window === 'undefined') {
        return;
    }

    try {
        window.localStorage.setItem(themeStorageKey, isDarkMode ? 'dark' : 'light');
    } catch {
        return;
    }
}

function publishThemePreference(isDarkMode: boolean): void {
    if (typeof window === 'undefined') {
        return;
    }

    window.dispatchEvent(new CustomEvent(themePreferenceEventName, { detail: { isDarkMode } }));
}

export function setThemePreference(isDarkMode: boolean): void {
    applyThemePreference(isDarkMode);
    saveThemePreference(isDarkMode);
    publishThemePreference(isDarkMode);
}

export function useThemePreference(): readonly [boolean, (isDarkMode: boolean) => void] {
    const [isDarkMode, setIsDarkMode] = useState(getPreferredDarkMode);

    useEffect(() => {
        function syncThemePreference(): void {
            setIsDarkMode(getPreferredDarkMode());
        }

        function handleThemePreferenceChange(event: Event): void {
            const detail = (event as ThemePreferenceEvent).detail;

            if (typeof detail?.isDarkMode === 'boolean') {
                setIsDarkMode(detail.isDarkMode);
                return;
            }

            syncThemePreference();
        }

        function handleStorage(event: StorageEvent): void {
            if (event.key === themeStorageKey) {
                syncThemePreference();
            }
        }

        syncThemePreference();
        window.addEventListener(themePreferenceEventName, handleThemePreferenceChange);
        window.addEventListener('storage', handleStorage);

        return () => {
            window.removeEventListener(themePreferenceEventName, handleThemePreferenceChange);
            window.removeEventListener('storage', handleStorage);
        };
    }, []);

    const updateThemePreference = useCallback((nextIsDarkMode: boolean) => {
        setIsDarkMode(nextIsDarkMode);
        setThemePreference(nextIsDarkMode);
    }, []);

    return [isDarkMode, updateThemePreference] as const;
}
