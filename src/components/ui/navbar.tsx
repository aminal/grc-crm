"use client";

import * as Headless from "@headlessui/react";
import Link from "next/link";
import { LayoutGroup, motion } from "motion/react";
import { forwardRef, useId } from "react";
import type React from "react";
import { TouchTarget } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function NavbarContainer({ className, ...props }: React.ComponentPropsWithoutRef<"nav">):React.ReactElement {
  return <div {...props} className={cn(className, "px-2 bg-zinc-950/40 rounded-xl")} />;
}

export function Navbar({ className, ...props }: React.ComponentPropsWithoutRef<"nav">): React.ReactElement {
  return <nav {...props} className={cn(className, "flex flex-1 items-center gap-4 py-2.5")} />;
}

export function NavbarDivider({ className, ...props }: React.ComponentPropsWithoutRef<"div">): React.ReactElement {
  return <div aria-hidden="true" {...props} className={cn(className, "h-6 w-px bg-zinc-950/10 dark:bg-white/10")} />;
}

export function NavbarSection({ className, ...props }: React.ComponentPropsWithoutRef<"div">): React.ReactElement {
  const id = useId();

  return (
    <LayoutGroup id={id}>
      <div {...props} className={cn(className, "flex items-center gap-3")} />
    </LayoutGroup>
  );
}

export function NavbarSpacer({ className, ...props }: React.ComponentPropsWithoutRef<"div">): React.ReactElement {
  return <div aria-hidden="true" {...props} className={cn(className, "-ml-4 flex-1")} />;
}

type NavbarItemProps = {
  current?: boolean;
  className?: string;
  children: React.ReactNode;
} & (
  | ({ href?: never } & Omit<Headless.ButtonProps, "as" | "className">)
  | ({ href: string } & Omit<React.ComponentPropsWithoutRef<typeof Link>, "className">)
);

export const NavbarItem = forwardRef(function NavbarItem(
  { current, className, children, ...props }: NavbarItemProps,
  ref: React.ForwardedRef<HTMLAnchorElement | HTMLButtonElement>,
): React.ReactElement {
  const classes = cn(
    "relative flex min-w-0 items-center gap-3 rounded-lg p-2 px-4 text-left text-base/6 font-medium text-zinc-950 sm:text-base/5",
    "*:data-[slot=icon]:size-6 *:data-[slot=icon]:shrink-0 *:data-[slot=icon]:fill-zinc-500 sm:*:data-[slot=icon]:size-5",
    "*:not-nth-2:last:data-[slot=icon]:ml-auto *:not-nth-2:last:data-[slot=icon]:size-5 sm:*:not-nth-2:last:data-[slot=icon]:size-4",
    "*:data-[slot=avatar]:-m-0.5 *:data-[slot=avatar]:size-7 *:data-[slot=avatar]:[--avatar-radius:var(--radius-md)] sm:*:data-[slot=avatar]:size-6",
    "data-hover:bg-zinc-950/5 data-hover:*:data-[slot=icon]:fill-zinc-950",
    "data-active:bg-zinc-950/5 data-active:*:data-[slot=icon]:fill-zinc-950",
    "dark:text-white/45 dark:*:data-[slot=icon]:fill-zinc-400",
    "dark:data-hover:bg-white/5 dark:data-hover:*:data-[slot=icon]:fill-white",
    "dark:data-active:bg-white/5 dark:data-active:*:data-[slot=icon]:fill-purple-400",
    current && "text-purple-400! transition-colors duration-300",
  );

  return (
    <span className={cn(className, "relative")}>
      {current ? (
        <motion.span
          layoutId="current-indicator"
          className="absolute inset-x-4 -bottom-0.5 h-0.5 rounded-full bg-zinc-950 dark:bg-purple-400"
        />
      ) : null}
      {typeof props.href === "string" ? (
        <Headless.DataInteractive>
          <Link
            {...props}
            className={classes}
            data-current={current ? "true" : undefined}
            ref={ref as React.ForwardedRef<HTMLAnchorElement>}
          >
            <TouchTarget>{children}</TouchTarget>
          </Link>
        </Headless.DataInteractive>
      ) : (
        <Headless.Button
          {...props}
          className={cn("cursor-default", classes)}
          data-current={current ? "true" : undefined}
          ref={ref}
        >
          <TouchTarget>{children}</TouchTarget>
        </Headless.Button>
      )}
    </span>
  );
});

export function NavbarLabel({ className, ...props }: React.ComponentPropsWithoutRef<"span">): React.ReactElement {
  return <span {...props} className={cn(className, "truncate")} />;
}
