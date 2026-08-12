"use client";

import * as Headless from "@headlessui/react";
import {
  ArchiveBoxIcon,
  BanknotesIcon,
  BeakerIcon,
  BuildingOffice2Icon,
  CubeIcon,
  HomeIcon,
  TagIcon,
} from "@heroicons/react/20/solid";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGroup, motion } from "motion/react";
import { useId } from "react";
import { cn } from "@/lib/utils";
import { TouchTarget } from "@/components/ui/button";

const navItems = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: HomeIcon,
    isCurrent: (pathname: string) => pathname === "/dashboard",
  },
  {
    href: "/sales",
    label: "Sales",
    icon: BanknotesIcon,
    isCurrent: (pathname: string) => pathname === "/sales" || pathname.startsWith("/sales/"),
  },
  {
    href: "/inventory",
    label: "Inventory",
    icon: ArchiveBoxIcon,
    isCurrent: (pathname: string) => pathname === "/inventory" || pathname.startsWith("/inventory/"),
  },
  {
    href: "/companies",
    label: "Companies",
    icon: BuildingOffice2Icon,
    isCurrent: (pathname: string) => pathname === "/companies" || pathname.startsWith("/companies/"),
  },
  {
    href: "/brands",
    label: "Brands",
    icon: TagIcon,
    isCurrent: (pathname: string) => pathname === "/brands" || pathname.startsWith("/brands/"),
  },
  {
    href: "/strains",
    label: "Strains",
    icon: BeakerIcon,
    isCurrent: (pathname: string) => pathname === "/strains" || pathname.startsWith("/strains/"),
  },
  {
    href: "/products",
    label: "Products",
    icon: CubeIcon,
    isCurrent: (pathname: string) => pathname === "/products" || pathname.startsWith("/products/"),
  },
] as const;

const sidebarItemClasses = cn(
  "flex cursor-pointer w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left text-base/6 font-medium text-zinc-950 sm:py-2 sm:text-sm/5",
  "*:data-[slot=icon]:size-6 *:data-[slot=icon]:shrink-0 *:data-[slot=icon]:fill-zinc-500 sm:*:data-[slot=icon]:size-5",
  "*:last:data-[slot=icon]:ml-auto *:last:data-[slot=icon]:size-5 sm:*:last:data-[slot=icon]:size-4",
  "*:data-[slot=avatar]:-m-0.5 *:data-[slot=avatar]:size-7 sm:*:data-[slot=avatar]:size-6",
  "data-hover:bg-zinc-950/5 data-hover:*:data-[slot=icon]:fill-zinc-950",
  "data-active:bg-zinc-950/5 data-active:*:data-[slot=icon]:fill-zinc-950",
  "data-current:*:data-[slot=icon]:fill-zinc-950",
  "dark:text-white dark:*:data-[slot=icon]:fill-zinc-400",
  "dark:data-hover:bg-white/5 dark:data-hover:*:data-[slot=icon]:fill-white",
  "dark:data-active:bg-white/5 dark:data-active:*:data-[slot=icon]:fill-white",
  "dark:data-current:*:data-[slot=icon]:fill-white",
  "dark:data-current:bg-white/5",
);

export function SidebarNav({ onNavigate }: { onNavigate?: () => void } = {}): React.ReactElement {
  const pathname = usePathname();
  const id = useId();

  return (
    <LayoutGroup id={id}>
      <div data-slot="section" className="flex flex-col gap-0.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const current = item.isCurrent(pathname);

          return (
            <span key={item.href} className="relative">
              {current ? <motion.span layoutId="current-indicator" className="absolute inset-y-2 -left-4 w-0.5 rounded-full bg-zinc-950 dark:bg-white" /> : null}
              <Headless.CloseButton
                as={Link}
                href={item.href}
                aria-current={current ? "page" : undefined}
                onClick={onNavigate}
                data-current={current ? "true" : undefined}
                className={sidebarItemClasses}
              >
                <TouchTarget>
                  <Icon data-slot="icon" aria-hidden="true" />
                  <span className="truncate">{item.label}</span>
                </TouchTarget>
              </Headless.CloseButton>
            </span>
          );
        })}
      </div>
    </LayoutGroup>
  );
}

export { sidebarItemClasses };
