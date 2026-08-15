import { Check, ChevronDown } from "lucide-react";
import Link from "next/link";
import { buttonClasses } from "@/components/ui/button";
import { Dropdown, DropdownButton, DropdownItem, DropdownLabel, DropdownMenu } from "@/components/ui/dropdown";
import { cn } from "@/lib/utils";

const tabs = [
  { key: "details", label: "Details", href: "" },
  { key: "orders", label: "Orders", href: "/orders" },
  { key: "contacts", label: "Contacts", href: "/contacts" },
  { key: "activity", label: "Activity", href: "/activity" },
] as const;

export function CompanyTabs({ companySlug, active }: { companySlug: string; active: "details" | "orders" | "contacts" | "activity" }): React.ReactElement {
  const activeTab = tabs.find((tab) => tab.key === active) ?? tabs[0];

  return (
    <>
      <div className="mb-5 sm:hidden">
        <Dropdown>
          <DropdownButton className={buttonClasses("plain", "w-full justify-between bg-purple-100 text-purple-700 hover:bg-purple-100 dark:bg-purple-500/15 dark:text-purple-300 dark:hover:bg-purple-500/20")}>
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
