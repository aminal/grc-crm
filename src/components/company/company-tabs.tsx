import Link from "next/link";
import { cn } from "@/lib/utils";

const tabs = [
  { key: "details", label: "Details", href: "" },
  { key: "orders", label: "Orders", href: "/orders" },
  { key: "contacts", label: "Contacts", href: "/contacts" },
  { key: "activity", label: "Activity", href: "/activity" },
] as const;

export function CompanyTabs({ companySlug, active }: { companySlug: string; active: "details" | "orders" | "contacts" | "activity" }): React.ReactElement {
  return (
    <div className="mb-5 flex gap-2 overflow-x-auto rounded-lg bg-zinc-50 dark:bg-zinc-950/40 p-2.5">
      {tabs.map((tab) => (
        <Link key={tab.key} href={`/companies/${companySlug}${tab.href}`} className={cn("rounded-lg px-6 py-2.5 uppercase text-sm font-semibold text-zinc-600 transition hover:text-white", active === tab.key && "bg-zinc-950 text-white hover:text-white")}>
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
