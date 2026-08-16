import { Check, ChevronDown } from "lucide-react";
import Link from "next/link";
import { Dropdown, DropdownButton, DropdownItem, DropdownLabel, DropdownMenu } from "@/components/ui/dropdown";
import { cn } from "@/lib/utils";

const tabs = [
  { key: "details", label: "Details", href: "" },
  { key: "orders", label: "Orders", href: "/orders" },
  { key: "contacts", label: "Contacts", href: "/contacts" },
  { key: "activity", label: "Activity", href: "/activity" },
] as const;

const mobileTabButtonClasses = "relative isolate inline-flex items-baseline justify-center gap-x-2 rounded-lg border text-base/6 font-semibold px-[calc(--spacing(3.5)-1px)] py-[calc(--spacing(2.5)-1px)] sm:px-[calc(--spacing(3)-1px)] sm:py-[calc(--spacing(1.5)-1px)] sm:text-sm/6 focus:not-data-focus:outline-hidden data-focus:outline-2 data-focus:outline-offset-2 data-focus:outline-blue-500 data-disabled:opacity-50 *:data-[slot=icon]:-mx-0.5 *:data-[slot=icon]:my-0.5 *:data-[slot=icon]:size-5 *:data-[slot=icon]:shrink-0 *:data-[slot=icon]:self-center *:data-[slot=icon]:text-(--btn-icon) sm:*:data-[slot=icon]:my-1 sm:*:data-[slot=icon]:size-4 forced-colors:[--btn-icon:ButtonText] forced-colors:data-hover:[--btn-icon:ButtonText] border-transparent text-zinc-950 data-active:bg-zinc-950/5 data-hover:bg-zinc-950/5 dark:text-white dark:data-active:bg-white/10 dark:data-hover:bg-white/10 [--btn-icon:var(--color-zinc-500)] data-active:[--btn-icon:var(--color-zinc-700)] data-hover:[--btn-icon:var(--color-zinc-700)] dark:[--btn-icon:var(--color-zinc-500)] dark:data-active:[--btn-icon:var(--color-zinc-400)] dark:data-hover:[--btn-icon:var(--color-zinc-400)] w-full justify-between bg-purple-100 text-purple-700 data-hover:bg-purple-100 hover:bg-purple-100 dark:bg-purple-500/15 dark:text-purple-300 dark:data-hover:bg-purple-500/20 dark:hover:bg-purple-500/20";

export function CompanyTabs({ companySlug, active }: { companySlug: string; active: "details" | "orders" | "contacts" | "activity" }): React.ReactElement {
  const activeTab = tabs.find((tab) => tab.key === active) ?? tabs[0];

  return (
    <>
      <div className="mb-5 sm:hidden">
        <Dropdown>
          <DropdownButton className={mobileTabButtonClasses}>
            {activeTab.label}
            <ChevronDown data-slot="icon" aria-hidden="true" />
          </DropdownButton>
          <DropdownMenu anchor="bottom start" className="min-w-64">
            {tabs.map((tab) => (
              <DropdownItem key={tab.key} href={`/companies/${companySlug}${tab.href}`} aria-current={active === tab.key ? "page" : undefined}>
                {active === tab.key ? <Check data-slot="icon" aria-hidden="true" /> : null}
                <DropdownLabel>{tab.label}</DropdownLabel>
              </DropdownItem>
            ))}
          </DropdownMenu>
        </Dropdown>
      </div>

      <nav aria-label="Company sections" className="mb-5 hidden gap-2 overflow-x-auto sm:flex">
        {tabs.map((tab) => (
          <Link key={tab.key} href={`/companies/${companySlug}${tab.href}`} aria-current={active === tab.key ? "page" : undefined} className={cn("shrink-0 rounded-md px-3 py-2 text-sm font-medium text-zinc-500 transition hover:text-zinc-700 focus:outline-hidden focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-500 dark:text-zinc-400 dark:hover:text-white", active === tab.key && "bg-purple-100 text-purple-700 hover:text-purple-700 dark:bg-purple-500/15 dark:text-purple-300 dark:hover:text-purple-300")}>
            {tab.label}
          </Link>
        ))}
      </nav>
    </>
  );
}
