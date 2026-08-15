'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Input } from '@/components/ui/field';

type TableSearchProps = {
    query: string;
    placeholder: string;
    paramName?: string;
    preservedParams?: Record<string, string>;
};

export function TableSearch({
    query,
    placeholder,
    paramName = 'q',
    preservedParams
}: TableSearchProps): React.ReactElement {
    const pathname = usePathname();
    const router = useRouter();
    const [value, setValue] = useState(query);
    const lastAppliedQuery = useRef(query);

    const applySearch = useCallback(
        (nextQuery: string) => {
            if (nextQuery === query) {
                return;
            }

            lastAppliedQuery.current = nextQuery;

            const params = new URLSearchParams();
            Object.entries(preservedParams ?? {}).forEach(([key, value]) => {
                if (value) {
                    params.set(key, value);
                }
            });
            if (nextQuery) {
                params.set(paramName, nextQuery);
            }

            const search = params.toString();
            router.replace(search ? `${pathname}?${search}` : pathname, { scroll: false });
        },
        [paramName, pathname, preservedParams, query, router],
    );

    useEffect(() => {
        if (query !== lastAppliedQuery.current) {
            lastAppliedQuery.current = query;
            setValue(query);
        }
    }, [query]);

    useEffect(() => {
        const nextQuery = value.trim();
        if (nextQuery === query) {
            return;
        }

        const timeout = window.setTimeout(() => {
            applySearch(nextQuery);
        }, 250);

        return () => window.clearTimeout(timeout);
    }, [applySearch, query, value]);

    return (
        <form
            action={pathname}
            className='w-full'
            role='search'
            onSubmit={(event) => {
                event.preventDefault();
                applySearch(value.trim());
            }}
        >
            <Input
                type='search'
                name={paramName}
                value={value}
                onChange={(event) => setValue(event.target.value)}
                placeholder={placeholder}
                aria-label={placeholder}
                className='text-sm/6! sm:text-sm/6!'
            />
        </form>
    );
}
