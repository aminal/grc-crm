"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Checkbox } from "@/components/ui/checkbox";
import { Input, Select } from "@/components/ui/field";
import type { InventorySortDirection, InventorySortField } from "@/lib/metrc/inventory-grouping";

type InventoryControlsProps = {
  query: string;
  sort: InventorySortField;
  direction: InventorySortDirection;
  showSold: boolean;
};

export function InventoryControls({ query, sort, direction, showSold }: InventoryControlsProps): React.ReactElement {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const didLoadStoredControls = useRef(false);
  const lastAppliedControls = useRef({ query, sort, direction, showSold });
  const [queryValue, setQueryValue] = useState(query);
  const [sortValue, setSortValue] = useState(sort);
  const [directionValue, setDirectionValue] = useState(direction);
  const [showSoldValue, setShowSoldValue] = useState(showSold);

  const applyControls = useCallback(
    (nextQuery: string, nextSort: InventorySortField, nextDirection: InventorySortDirection, nextShowSold: boolean, updateLastApplied = true) => {
      localStorage.setItem("inventory-q", nextQuery);
      localStorage.setItem("inventory-sort", nextSort);
      localStorage.setItem("inventory-direction", nextDirection);
      localStorage.setItem("inventory-show-sold", nextShowSold ? "1" : "0");

      const next = new URLSearchParams();
      if (nextQuery) {
        next.set("q", nextQuery);
      }
      if (nextSort !== "expiration_date") {
        next.set("sort", nextSort);
      }
      if (nextDirection !== "asc") {
        next.set("direction", nextDirection);
      }
      if (nextShowSold) {
        next.set("show_sold", "1");
      }

      if (updateLastApplied) {
        lastAppliedControls.current = { query: nextQuery, sort: nextSort, direction: nextDirection, showSold: nextShowSold };
      }

      const search = next.toString();
      if (search === searchParams.toString()) {
        return;
      }

      router.replace(search ? `${pathname}?${search}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  useEffect(() => {
    const lastApplied = lastAppliedControls.current;
    if (query === lastApplied.query && sort === lastApplied.sort && direction === lastApplied.direction && showSold === lastApplied.showSold) {
      return;
    }

    lastAppliedControls.current = { query, sort, direction, showSold };
    setQueryValue(query);
    setSortValue(sort);
    setDirectionValue(direction);
    setShowSoldValue(showSold);
  }, [query, sort, direction, showSold]);

  useEffect(() => {
    if (didLoadStoredControls.current) {
      return;
    }

    didLoadStoredControls.current = true;
    if (searchParams.toString()) {
      return;
    }

    const storedQuery = localStorage.getItem("inventory-q") ?? "";
    const storedSort = parseInventorySortField(localStorage.getItem("inventory-sort")) ?? "expiration_date";
    const storedDirection = parseInventorySortDirection(localStorage.getItem("inventory-direction")) ?? "asc";
    const storedShowSold = localStorage.getItem("inventory-show-sold") === "1";
    if (!storedQuery && storedSort === "expiration_date" && storedDirection === "asc" && !storedShowSold) {
      return;
    }

    applyControls(storedQuery, storedSort, storedDirection, storedShowSold, false);
  }, [applyControls, searchParams]);

  useEffect(() => {
    const nextQuery = queryValue.trim();
    if (nextQuery === query) {
      return;
    }

    const timeout = window.setTimeout(() => {
      applyControls(nextQuery, sortValue, directionValue, showSoldValue);
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [applyControls, directionValue, query, queryValue, showSoldValue, sortValue]);

  function handleSortChange(event: React.ChangeEvent<HTMLSelectElement>): void {
    const nextSort = event.target.value as InventorySortField;
    setSortValue(nextSort);
    applyControls(queryValue.trim(), nextSort, directionValue, showSoldValue);
  }

  function handleDirectionChange(event: React.ChangeEvent<HTMLSelectElement>): void {
    const nextDirection = event.target.value as InventorySortDirection;
    setDirectionValue(nextDirection);
    applyControls(queryValue.trim(), sortValue, nextDirection, showSoldValue);
  }

  function handleShowSoldChange(event: React.ChangeEvent<HTMLInputElement>): void {
    const nextShowSold = event.target.checked;
    setShowSoldValue(nextShowSold);
    applyControls(queryValue.trim(), sortValue, directionValue, nextShowSold);
  }

  return (
    <form
      className="rounded-lg bg-white/80 p-2 shadow-sm dark:bg-zinc-950/40"
      role="search"
      onSubmit={(event) => {
        event.preventDefault();
        applyControls(queryValue.trim(), sortValue, directionValue, showSoldValue);
      }}
    >
      <div className="grid grid-cols-2 gap-2 xl:grid-cols-[minmax(18rem,1fr)_8rem_7rem_auto_auto] xl:items-center">
        <div className="col-span-2 xl:col-span-1">
          <Input type="search" name="q" value={queryValue} onChange={(event) => setQueryValue(event.target.value)} placeholder="Search inventory" aria-label="Search inventory" />
        </div>
        <Select name="sort" value={sortValue} onChange={handleSortChange} aria-label="Sort inventory">
          <option value="expiration_date">Expiry</option>
          <option value="item">Item</option>
          <option value="package_count">Packages</option>
          <option value="quantity">Qty</option>
        </Select>
        <Select name="direction" value={directionValue} onChange={handleDirectionChange} aria-label="Sort direction">
          <option value="asc">Asc</option>
          <option value="desc">Desc</option>
        </Select>
        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-transparent bg-white px-3 py-2 text-sm/6 font-medium text-zinc-950 shadow-sm dark:border-transparent dark:bg-white/5 dark:text-white">
          <Checkbox name="show_sold" value="1" checked={showSoldValue} onChange={handleShowSoldChange} aria-label="Include sold packages" />
          Sold
        </label>
      </div>
    </form>
  );
}

function parseInventorySortField(value: string | null): InventorySortField | null {
  return value === "expiration_date" || value === "item" || value === "package_count" || value === "quantity" ? value : null;
}

function parseInventorySortDirection(value: string | null): InventorySortDirection | null {
  return value === "asc" || value === "desc" ? value : null;
}
