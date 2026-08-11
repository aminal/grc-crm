"use client";

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { buttonClasses } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, Input, Select } from "@/components/ui/field";
import type { InventorySortDirection, InventorySortField } from "@/lib/metrc/inventory-grouping";

type InventoryControlsProps = {
  query: string;
  sort: InventorySortField;
  direction: InventorySortDirection;
  showSold: boolean;
  countText: string;
};

export function InventoryControls({ query, sort, direction, showSold, countText }: InventoryControlsProps): React.ReactElement {
  const router = useRouter();
  const searchParams = useSearchParams();
  const didLoadStoredControls = useRef(false);

  useEffect(() => {
    if (didLoadStoredControls.current) {
      return;
    }

    didLoadStoredControls.current = true;
    if (searchParams.toString()) {
      return;
    }

    const storedQuery = localStorage.getItem("inventory-q") ?? "";
    const storedSort = (localStorage.getItem("inventory-sort") ?? "expiration_date") as InventorySortField;
    const storedDirection = (localStorage.getItem("inventory-direction") ?? "asc") as InventorySortDirection;
    const storedShowSold = localStorage.getItem("inventory-show-sold") === "1";
    if (!storedQuery && storedSort === "expiration_date" && storedDirection === "asc" && !storedShowSold) {
      return;
    }

    const next = new URLSearchParams();
    if (storedQuery) {
      next.set("q", storedQuery);
    }
    if (storedSort !== "expiration_date") {
      next.set("sort", storedSort);
    }
    if (storedDirection !== "asc") {
      next.set("direction", storedDirection);
    }
    if (storedShowSold) {
      next.set("show_sold", "1");
    }

    router.replace(`/inventory?${next.toString()}`);
  }, [router, searchParams]);

  function persist(formData: FormData): void {
    localStorage.setItem("inventory-q", String(formData.get("q") ?? ""));
    localStorage.setItem("inventory-sort", String(formData.get("sort") ?? "expiration_date"));
    localStorage.setItem("inventory-direction", String(formData.get("direction") ?? "asc"));
    localStorage.setItem("inventory-show-sold", formData.get("show_sold") === "1" ? "1" : "0");
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        persist(new FormData(event.currentTarget));
      }}
    >
      <Field label="Search inventory">
        <Input name="q" defaultValue={query} placeholder="Item, tag, strain, category, source package" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Sort by">
          <Select name="sort" defaultValue={sort}>
            <option value="expiration_date">Expiration date</option>
            <option value="item">Item</option>
            <option value="package_count">Package count</option>
            <option value="quantity">Quantity</option>
          </Select>
        </Field>
        <Field label="Direction">
          <Select name="direction" defaultValue={direction}>
            <option value="asc">Ascending</option>
            <option value="desc">Descending</option>
          </Select>
        </Field>
      </div>
      <label className="flex items-center gap-3 text-base/6 text-zinc-950 sm:text-sm/6 dark:text-white">
        <Checkbox name="show_sold" value="1" defaultChecked={showSold} />
        Show pending and sold packages
      </label>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-zinc-600">{countText}</p>
        <button className={buttonClasses("secondary")}>Apply Filters</button>
      </div>
    </form>
  );
}
