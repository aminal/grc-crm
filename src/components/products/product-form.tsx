"use client";

import * as Headless from "@headlessui/react";
import { CheckIcon, ChevronUpDownIcon } from "@heroicons/react/20/solid";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DialogActions } from "@/components/ui/dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { cn } from "@/lib/utils";
import type { ProductData } from "@/lib/domain/types";

export type ProductFormValues = Pick<ProductData, "name" | "brand_id" | "strain_ids" | "category" | "unit_base_price_cents" | "case_quantity" | "sku" | "upc" | "notes">;
export type ProductFormBrandOption = {
  id: string;
  name: string;
  archived: boolean;
};
export type ProductFormStrainOption = {
  id: string;
  name: string;
  archived: boolean;
};

const PRODUCT_CATEGORY_OPTIONS = [
  "Buds",
  "Pre-roll",
  "Concentrate",
  "Shake/Trim",
  "Immature Plants",
  "Seeds",
  "Raw Pre-Rolls",
  "Infused Pre-Rolls",
  "Premium Bud Pre-Roll",
  "Concentrate (Bulk)",
  "Concentrate (Each)",
  "Concentrate (Weight)",
  "Extract",
  "Infused",
  "Infused (Bulk)",
  "Infused (Each)",
  "Infused (edible)",
  "Infused (non-edible)",
  "Infused Liquid",
  "Topical",
  "Tincture",
  "Vape Cartridge",
];

type ProductFormProps = {
  brands: ProductFormBrandOption[];
  strains: ProductFormStrainOption[];
  product?: ProductFormValues;
  action: (formData: FormData) => void | Promise<void>;
  submitLabel: string;
  pendingLabel: string;
  pending: boolean;
  error: string | null;
  showReason: boolean;
  onCancel: () => void;
  onArchive?: () => void;
};

export function ProductForm({
  brands,
  strains,
  product,
  action,
  submitLabel,
  pendingLabel,
  pending,
  error,
  showReason,
  onCancel,
  onArchive,
}: ProductFormProps): React.ReactElement {
  const selectedBrandId = product?.brand_id ?? "";
  const selectedBrand = brands.find((brand) => brand.id === selectedBrandId);
  const activeBrands = brands.filter((brand) => !brand.archived);
  const brandOptions = selectedBrand?.archived ? [...activeBrands, selectedBrand] : activeBrands;
  const canChooseBrand = activeBrands.length > 0 || selectedBrand !== undefined;
  const activeStrains = strains.filter((strain) => !strain.archived);
  const hasActiveStrains = activeStrains.length > 0;
  const selectedStrainIds = new Set(product?.strain_ids ?? []);
  const archivedSelectedStrains = strains.filter((strain) => strain.archived && selectedStrainIds.has(strain.id));
  const [strainIds, setStrainIds] = useState(() => activeStrains.filter((strain) => selectedStrainIds.has(strain.id)).map((strain) => strain.id));
  const selectedStrainNames = [
    ...activeStrains.filter((strain) => strainIds.includes(strain.id)).map((strain) => strain.name),
    ...archivedSelectedStrains.map((strain) => `${strain.name} (archived)`),
  ];
  const strainSelectionLabel = selectedStrainNames.length > 0 ? selectedStrainNames.join(", ") : hasActiveStrains ? "Select strains" : "No strains available";
  const categoryOptions = product?.category && !PRODUCT_CATEGORY_OPTIONS.includes(product.category) ? [product.category, ...PRODUCT_CATEGORY_OPTIONS] : PRODUCT_CATEGORY_OPTIONS;

  return (
    <form action={action} className="space-y-4">
      {error ? <div className="rounded-lg bg-red-500/15 p-3 text-sm/6 font-medium text-red-700 ring-1 ring-red-500/20">{error}</div> : null}
      {!canChooseBrand ? (
        <div className="rounded-lg bg-amber-500/15 p-3 text-sm/6 font-medium text-amber-800 ring-1 ring-amber-500/20 dark:text-amber-200">
          Create an active brand before adding products.
        </div>
      ) : null}
      {!hasActiveStrains ? (
        <div className="rounded-lg bg-amber-500/15 p-3 text-sm/6 font-medium text-amber-800 ring-1 ring-amber-500/20 dark:text-amber-200">
          Create an active strain before adding products.
        </div>
      ) : null}
      <Field label="Name">
        <Input name="name" defaultValue={product?.name ?? ""} required disabled={pending} />
      </Field>
      <Field label="Brand">
        <Select name="brand_id" defaultValue={selectedBrandId} required disabled={pending || !canChooseBrand}>
          <option value="" disabled>Select a brand</option>
          {brandOptions.map((brand) => <option key={brand.id} value={brand.id} disabled={brand.archived && brand.id !== selectedBrandId}>{brand.name}{brand.archived ? " (archived)" : ""}</option>)}
        </Select>
      </Field>
      <Field label="Strains">
        <Headless.Listbox value={strainIds} onChange={setStrainIds} multiple disabled={pending || !hasActiveStrains} as="div" data-slot="control" className="relative">
          {strainIds.map((strainId) => <input key={`selected-${strainId}`} type="hidden" name="strain_ids" value={strainId} />)}
          {archivedSelectedStrains.map((strain) => <input key={`hidden-${strain.id}`} type="hidden" name="strain_ids" value={strain.id} />)}
          <Headless.ListboxButton
            type="button"
            className="group relative block w-full cursor-pointer rounded-lg border border-zinc-950/10 bg-white px-[calc(--spacing(3.5)-1px)] py-[calc(--spacing(3)-1px)] text-left text-base/6 font-medium text-zinc-950 shadow-sm hover:border-zinc-950/20 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-default disabled:border-zinc-950/20 disabled:bg-zinc-950/5 disabled:opacity-50 sm:px-[calc(--spacing(3)-1px)] sm:py-[calc(--spacing(2)-1px)] sm:text-base/6 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:border-white/20 dark:disabled:border-white/15 dark:disabled:bg-white/2.5"
          >
            <span className={cn("block truncate pr-8", selectedStrainNames.length === 0 && "text-zinc-500")}>{strainSelectionLabel}</span>
            <ChevronUpDownIcon className="pointer-events-none absolute top-1/2 right-3 size-5 -translate-y-1/2 text-zinc-500 sm:size-4 dark:text-zinc-400" aria-hidden="true" />
          </Headless.ListboxButton>
          <Headless.ListboxOptions
            transition
            className="absolute z-50 mt-2 max-h-60 w-full overflow-auto rounded-xl bg-white/95 p-1 shadow-lg ring-1 ring-zinc-950/10 transition focus:outline-hidden data-closed:data-leave:opacity-0 data-leave:duration-100 data-leave:ease-in dark:bg-zinc-800/95 dark:ring-white/10"
          >
            {activeStrains.map((strain) => (
              <Headless.ListboxOption
                key={strain.id}
                value={strain.id}
                className="group flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm/6 font-medium text-zinc-950 select-none data-focus:bg-blue-500 data-focus:text-white dark:text-white"
              >
                <CheckIcon className="invisible size-4 shrink-0 text-blue-600 group-data-selected:visible group-data-focus:text-white dark:text-blue-400" aria-hidden="true" />
                <span className="truncate">{strain.name}</span>
              </Headless.ListboxOption>
            ))}
          </Headless.ListboxOptions>
        </Headless.Listbox>
      </Field>
      <Field label="Category">
        <Select name="category" defaultValue={product?.category ?? ""} disabled={pending}>
          <option value="">Select a category</option>
          {categoryOptions.map((category) => <option key={category} value={category}>{category}</option>)}
        </Select>
      </Field>
      <Field label="Unit Base Price">
        <Input name="unit_base_price_cents" type="number" min="0" step="0.01" inputMode="decimal" defaultValue={product?.unit_base_price_cents ? (product.unit_base_price_cents / 100).toFixed(2) : ""} placeholder="0.00" disabled={pending} />
      </Field>
      <Field label="Case Quantity">
        <Input name="case_quantity" type="number" min="0" step="1" defaultValue={product?.case_quantity ? String(product.case_quantity) : ""} disabled={pending} />
      </Field>
      <Field label="SKU">
        <Input name="sku" defaultValue={product?.sku ?? ""} disabled={pending} />
      </Field>
      <Field label="UPC Code">
        <Input name="upc" defaultValue={product?.upc ?? ""} disabled={pending} />
      </Field>
      <Field label="Notes">
        <Textarea name="notes" defaultValue={product?.notes ?? ""} rows={4} disabled={pending} />
      </Field>
      {showReason ? (
        <Field label="Reason for edit">
          <Textarea name="reason" rows={3} required disabled={pending} />
        </Field>
      ) : null}
      <DialogActions>
        {onArchive ? <Button type="button" variant="danger" className="sm:mr-auto" onClick={onArchive} disabled={pending}>Archive</Button> : null}
        <Button type="button" variant="plain" onClick={onCancel} disabled={pending}>Cancel</Button>
        <Button disabled={pending || !canChooseBrand || !hasActiveStrains}>{pending ? pendingLabel : submitLabel}</Button>
      </DialogActions>
    </form>
  );
}
