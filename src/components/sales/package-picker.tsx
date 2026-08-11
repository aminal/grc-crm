"use client";

import { useMemo, useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, Input } from "@/components/ui/field";
import { compactNumber, formatDate } from "@/lib/domain/format";

export type PackagePickerPackage = {
  package_tag: string;
  item: string;
  strain: string;
  category: string;
  source_packages: string;
  quantity: number;
  unit_of_measure: string;
  expiration_date: string | null;
};

type PackagePickerProps = {
  packages: PackagePickerPackage[];
  initialPrices?: Record<string, string>;
  maxVisible?: number;
};

export function PackagePicker({ packages, initialPrices = {}, maxVisible }: PackagePickerProps): React.ReactElement {
  const [query, setQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [prices, setPrices] = useState<Record<string, string>>(initialPrices);
  const normalizedQuery = query.trim().toLowerCase();
  const filteredPackages = useMemo(() => {
    const rows = normalizedQuery
      ? packages.filter((packageRecord) => [packageRecord.item, packageRecord.strain, packageRecord.package_tag, packageRecord.category, packageRecord.source_packages].join(" ").toLowerCase().includes(normalizedQuery))
      : packages;

    return maxVisible ? rows.slice(0, maxVisible) : rows;
  }, [maxVisible, normalizedQuery, packages]);

  function sourcePrice(sourcePackages: string): string {
    if (!sourcePackages) {
      return "";
    }

    for (const packageRecord of packages) {
      if (packageRecord.source_packages === sourcePackages && selectedTags.has(packageRecord.package_tag) && prices[packageRecord.package_tag]) {
        return prices[packageRecord.package_tag];
      }
    }

    return "";
  }

  function togglePackage(packageRecord: PackagePickerPackage, checked: boolean): void {
    setSelectedTags((current) => {
      const next = new Set(current);
      if (checked) {
        next.add(packageRecord.package_tag);
      } else {
        next.delete(packageRecord.package_tag);
      }
      return next;
    });

    if (checked && packageRecord.source_packages && !prices[packageRecord.package_tag]) {
      const copiedPrice = sourcePrice(packageRecord.source_packages);
      if (copiedPrice) {
        setPrices((current) => ({ ...current, [packageRecord.package_tag]: copiedPrice }));
      }
    }
  }

  function updatePrice(packageRecord: PackagePickerPackage, value: string): void {
    setPrices((current) => {
      const next = { ...current, [packageRecord.package_tag]: value };
      if (packageRecord.source_packages && selectedTags.has(packageRecord.package_tag)) {
        for (const row of packages) {
          if (row.source_packages === packageRecord.source_packages && selectedTags.has(row.package_tag)) {
            next[row.package_tag] = value;
          }
        }
      }
      return next;
    });
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
        <Field label="Search packages">
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Item, strain, tag, category, source package" />
        </Field>
        <p className="rounded-lg border border-zinc-950/10 bg-zinc-50 dark:bg-zinc-950/40 px-3 py-2 text-sm text-zinc-700">{selectedTags.size} selected</p>
      </div>

      <div className="space-y-3">
        {filteredPackages.map((packageRecord) => {
          const selected = selectedTags.has(packageRecord.package_tag);
          return (
            <label key={packageRecord.package_tag} className="block rounded-lg border border-zinc-950/10 bg-zinc-50 dark:bg-zinc-800 p-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex gap-3">
                  <Checkbox name="package_tags" value={packageRecord.package_tag} checked={selected} onChange={(event) => togglePackage(packageRecord, event.target.checked)} className="mt-1" />
                  <div>
                    <p className="font-semibold text-zinc-950">{packageRecord.item || "Unknown Item"}</p>
                    <p className="font-mono text-xs text-zinc-600">{packageRecord.package_tag}</p>
                    <p className="mt-1 text-sm text-zinc-500">{packageRecord.strain || "No strain"} · {compactNumber(packageRecord.quantity)} {packageRecord.unit_of_measure} · Expires {formatDate(packageRecord.expiration_date)}</p>
                    <p className="mt-1 text-xs text-zinc-500">{packageRecord.source_packages || "No source package"}</p>
                  </div>
                </div>
                <div className="w-full max-w-xs">
                  <Field label="Package price">
                    <Input name={`package_prices[${packageRecord.package_tag}]`} inputMode="decimal" placeholder="0.00" value={prices[packageRecord.package_tag] ?? ""} onChange={(event) => updatePrice(packageRecord, event.target.value)} disabled={!selected} required={selected} />
                  </Field>
                </div>
              </div>
            </label>
          );
        })}
        {filteredPackages.length === 0 ? <p className="rounded-lg border border-dashed border-zinc-950/10 p-8 text-center text-sm text-zinc-600">No available packages matched your search.</p> : null}
      </div>
    </div>
  );
}
