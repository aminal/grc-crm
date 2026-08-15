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
          <DropdownButton className={buttonClasses("plain", "w-full justify-between bg-zinc-50 dark:bg-zinc-950/40")}>
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

      <div className="mb-5 hidden gap-2 overflow-x-auto rounded-lg bg-zinc-50 dark:bg-zinc-950/40 p-2.5 sm:flex">
        {tabs.map((tab) => (
          <Link key={tab.key} href={`/companies/${companySlug}${tab.href}`} aria-current={active === tab.key ? "page" : undefined} className={cn("rounded-lg px-6 py-2.5 uppercase text-sm font-semibold text-zinc-600 transition hover:text-zinc-950/95 dark:hover:text-white", active === tab.key && " bg-zinc-300 dark:bg-zinc-950 text-zinc-950/65 dark:text-white")}>
            {tab.label}
          </Link>
        ))}
      </div>
    </>
  );
}
