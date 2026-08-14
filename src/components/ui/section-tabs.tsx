"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Select } from "@/components/ui/field";
import { cn } from "@/lib/utils";

export type SectionTabItem = {
  key: string;
  label: string;
  href: string;
};

export function SectionTabs({
  items,
  activeKey,
  ariaLabel = "Tabs",
  className,
}: {
  items: readonly SectionTabItem[];
  activeKey: string;
  ariaLabel?: string;
  className?: string;
}): React.ReactElement {
  const router = useRouter();
  const activeItem = items.find((item) => item.key === activeKey);

  function handleTabChange(event: React.ChangeEvent<HTMLSelectElement>): void {
    router.push(event.target.value);
  }

  return (
    <>
      <div className={cn("mb-5 sm:hidden", className)}>
        <Select value={activeItem?.href ?? ""} onChange={handleTabChange} aria-label={ariaLabel}>
          {activeItem ? null : <option value="" disabled>Select section</option>}
          {items.map((item) => (
            <option key={item.key} value={item.href}>
              {item.label}
            </option>
          ))}
        </Select>
      </div>
      <nav aria-label={ariaLabel} className={cn("mb-5 hidden gap-2 overflow-x-auto rounded-xl bg-zinc-50 p-2.5 sm:flex dark:bg-zinc-950/40", className)}>
        {items.map((item) => (
          <Link
            key={item.key}
            href={item.href}
            aria-current={activeKey === item.key ? "page" : undefined}
            className={cn(
              "rounded-lg px-4 py-2 text-sm font-semibold text-zinc-600 transition hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white",
              activeKey === item.key && "bg-zinc-950 text-white hover:text-white dark:bg-white/5 dark:text-white dark:hover:text-white",
            )}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </>
  );
}
