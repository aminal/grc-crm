"use client";

import { Combobox, ComboboxButton, ComboboxInput, ComboboxOption, ComboboxOptions } from "@headlessui/react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type React from "react";
import { controlClasses, controlFrameClasses } from "@/components/ui/field";
import { cn } from "@/lib/utils";

export type SearchableSelectOption = {
  value: string;
  label: string;
  description?: string;
  searchText?: string;
};

type SearchableSelectFooterAction = {
  href: string;
  label: React.ReactNode;
};

type SearchableSelectProps = {
  name: string;
  options: SearchableSelectOption[];
  defaultValue?: string;
  placeholder?: string;
  emptyMessage?: string;
  maxResults?: number;
  required?: boolean;
  disabled?: boolean;
  footerAction?: SearchableSelectFooterAction;
};

export function SearchableSelect({
  name,
  options,
  defaultValue = "",
  placeholder = "Search and select",
  emptyMessage = "No results found.",
  maxResults = 4,
  required = false,
  disabled = false,
  footerAction,
}: SearchableSelectProps): React.ReactElement {
  const [query, setQuery] = useState("");
  const [selectedOption, setSelectedOption] = useState<SearchableSelectOption | null>(() => optionByValue(options, defaultValue));
  const [isDirty, setIsDirty] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const didSelectOptionRef = useRef(false);
  const normalizedQuery = query.trim().toLowerCase();
  const filteredOptions = useMemo(() => {
    const matches = normalizedQuery ? options.filter((option) => optionText(option).includes(normalizedQuery)) : options;

    return [...matches]
      .sort((first, second) => {
        const rankDifference = searchRank(first, normalizedQuery) - searchRank(second, normalizedQuery);
        return rankDifference || first.label.localeCompare(second.label);
      })
      .slice(0, maxResults);
  }, [maxResults, normalizedQuery, options]);

  useEffect(() => {
    inputRef.current?.setCustomValidity(required && !disabled && (!selectedOption || isDirty) ? "Choose an option." : "");
  }, [disabled, isDirty, required, selectedOption]);

  function handleInputChange(event: React.ChangeEvent<HTMLInputElement>): void {
    const nextQuery = event.target.value;
    setQuery(nextQuery);
    setIsDirty(!selectedOption || nextQuery !== selectedOption.label);
  }

  function handleChange(option: SearchableSelectOption | null): void {
    didSelectOptionRef.current = option !== null;
    setSelectedOption(option);
    setIsDirty(false);
    setQuery("");
  }

  function handleClose(): void {
    setQuery("");

    if (didSelectOptionRef.current) {
      didSelectOptionRef.current = false;
      return;
    }

    if (isDirty) {
      setSelectedOption(null);
    }
  }

  return (
    <Combobox value={selectedOption} onChange={handleChange} disabled={disabled} immediate onClose={handleClose}>
      <div data-slot="control" className="relative">
        <input type="hidden" name={name} value={!isDirty ? (selectedOption?.value ?? "") : ""} disabled={disabled} />
        <span className={cn("group", controlFrameClasses)}>
          <ComboboxInput
            ref={inputRef}
            className={cn(
              controlClasses,
              "pr-[calc(--spacing(10)-1px)] pl-[calc(--spacing(3.5)-1px)] py-[calc(--spacing(3)-1px)] sm:pr-[calc(--spacing(9)-1px)] sm:pl-[calc(--spacing(3)-1px)] sm:py-[calc(--spacing(2)-1px)]",
            )}
            displayValue={(option: SearchableSelectOption | null) => option?.label ?? ""}
            onChange={handleInputChange}
            placeholder={placeholder}
            required={required}
            autoComplete="off"
          />
          <ComboboxButton type="button" className="absolute inset-y-0 right-0 flex cursor-pointer items-center pr-2 disabled:cursor-default" aria-label="Open options">
            <svg className="size-5 stroke-zinc-500 group-has-[input:disabled]:stroke-zinc-600 sm:size-4 dark:stroke-zinc-400 forced-colors:stroke-[CanvasText]" viewBox="0 0 16 16" aria-hidden="true" fill="none">
              <path d="M5.75 10.75L8 13L10.25 10.75" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
              <path d="M10.25 5.25L8 3L5.75 5.25" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </ComboboxButton>
        </span>
        <ComboboxOptions
          transition
          className={cn(
            "absolute z-30 mt-2 max-h-80 w-full overflow-y-auto rounded-xl bg-white p-1 shadow-lg ring-1 ring-zinc-950/10 transition duration-100 empty:hidden focus:outline-hidden dark:bg-zinc-800 dark:ring-white/10",
            "data-closed:data-leave:opacity-0 data-leave:ease-in",
          )}
        >
          {filteredOptions.map((option) => (
            <ComboboxOption
              key={option.value}
              value={option}
              className="group cursor-pointer rounded-lg px-3.5 py-3 text-left text-base/6 text-zinc-950 data-focus:bg-purple-500 dark:hover:bg-purple-500 data-focus:text-white sm:px-3 sm:py-2 sm:text-sm/6 dark:text-white"
            >
              <div className="font-semibold">{option.label}</div>
              {option.description ? <div className="mt-0.5 text-sm/5 text-zinc-500 group-data-focus:text-white sm:text-xs/5 dark:text-zinc-400">{option.description}</div> : null}
            </ComboboxOption>
          ))}
          {filteredOptions.length === 0 ? <div className="px-3.5 py-3 text-sm text-zinc-500 dark:text-zinc-400">{emptyMessage}</div> : null}
          {footerAction ? (
            <div className="mt-1 border-t border-zinc-950/5 pt-1 dark:border-white/10">
              <Link href={footerAction.href} onMouseDown={(event) => event.preventDefault()} className="block rounded-lg px-3.5 py-3 text-base/6 font-semibold text-purple-600 hover:bg-purple-50 focus:bg-purple-500 focus:text-white focus:outline-hidden sm:px-3 sm:py-2 sm:text-sm/6 dark:text-purple-300 dark:hover:bg-purple-500/10">
                {footerAction.label}
              </Link>
            </div>
          ) : null}
        </ComboboxOptions>
      </div>
    </Combobox>
  );
}

function optionByValue(options: SearchableSelectOption[], value: string): SearchableSelectOption | null {
  return options.find((option) => option.value === value) ?? null;
}

function optionText(option: SearchableSelectOption): string {
  return [option.label, option.description, option.searchText].filter(Boolean).join(" ").toLowerCase();
}

function searchRank(option: SearchableSelectOption, query: string): number {
  if (!query) {
    return 0;
  }

  const label = option.label.toLowerCase();
  if (label.startsWith(query)) {
    return 0;
  }

  if (label.includes(query)) {
    return 1;
  }

  return 2;
}
