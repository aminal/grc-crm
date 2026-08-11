"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Field, Input } from "@/components/ui/field";

type CompanySearchProps = {
  query: string;
};

export function CompanySearch({ query }: CompanySearchProps): React.ReactElement {
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
      if (nextQuery) {
        params.set("q", nextQuery);
      }

      const search = params.toString();
      router.replace(search ? `${pathname}?${search}` : pathname, { scroll: false });
    },
    [pathname, query, router],
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
      action="/companies"
      className="w-full"
      role="search"
      onSubmit={(event) => {
        event.preventDefault();
        applySearch(value.trim());
      }}
    >
      <Field label="Search companies">
        <Input type="search" name="q" value={value} onChange={(event) => setValue(event.target.value)} placeholder="Company, license, or facility type" />
      </Field>
    </form>
  );
}
