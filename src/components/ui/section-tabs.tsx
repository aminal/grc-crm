import Link from "next/link";
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
  return (
    <nav aria-label={ariaLabel} className={cn("mb-5 flex gap-2 overflow-x-auto rounded-xl bg-zinc-50 p-2.5 dark:bg-zinc-950/40", className)}>
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
  );
}
