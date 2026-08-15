import { cn } from "@/lib/utils";

export type ButtonVariant = "primary" | "secondary" | "danger" | "plain";
export type ButtonSize = "xs" | "sm" | "md" | "lg";

type ButtonClassesOptions = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
};

const baseClasses = [
  "relative cursor-pointer isolate inline-flex items-baseline justify-center gap-x-2 rounded-lg border font-semibold uppercase",
  "focus:outline-hidden focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-500",
  "disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50",
  "*:data-[slot=icon]:-mx-0.5 *:data-[slot=icon]:my-0.5 *:data-[slot=icon]:size-4 *:data-[slot=icon]:shrink-0 *:data-[slot=icon]:self-center *:data-[slot=icon]:text-(--btn-icon) forced-colors:[--btn-icon:ButtonText]",
];

const sizeClasses: Record<ButtonSize, string[]> = {
  xs: [
    "px-[calc(--spacing(2)+0px)]! py-[calc(--spacing(2)-4px)]! text-[0.76rem]/5! tracking-wide!",
  ],
  sm: [
    "px-[calc(--spacing(2)+1px)]! py-[calc(--spacing(2)-3px)]! text-[0.86rem]/5! tracking-wide!",
  ],
  md: [
    "px-[calc(--spacing(3)+3px)] pt-[calc(--spacing(2))] pb-[calc(--spacing(2)-2px)] text-md",
  ],
  lg: [
    "px-[calc(--spacing(4)+3px)] pt-[calc(--spacing(2.5))] pb-[calc(--spacing(2.5)-2px)] text-lg",
  ],
};

const solidClasses = [
  "border-transparent bg-(--btn-border) dark:bg-(--btn-bg)",
  "before:absolute before:inset-0 before:-z-10 before:rounded-[calc(var(--radius-lg)-1px)] before:bg-(--btn-bg) before:shadow-sm dark:before:hidden",
  "dark:border-white/5",
  "after:absolute after:inset-0 after:-z-10 after:rounded-[calc(var(--radius-lg)-1px)] after:shadow-[inset_0_1px_--theme(--color-white/15%)]",
  "hover:after:bg-(--btn-hover-overlay) active:after:bg-(--btn-hover-overlay) dark:after:-inset-px dark:after:rounded-lg",
  "disabled:before:shadow-none disabled:after:shadow-none",
];

const variantClasses: Record<ButtonVariant, string[]> = {
  primary: [
    ...solidClasses,
    "text-white [--btn-bg:var(--color-purple-500)] [--btn-border:var(--color-purple-600)]/90 [--btn-hover-overlay:var(--color-white)]/10",
    "dark:text-white/85 dark:hover:text-white dark:[--btn-bg:var(--color-purple-500)] dark:[--btn-hover-overlay:var(--color-white)]/5",
    "[--btn-icon:var(--color-white)] hover:[--btn-icon:var(--color-white)] active:[--btn-icon:var(--color-zinc-300)]",
  ],
  secondary: [
    "border-0 bg-emerald-400/75 text-zinc-950 hover:bg-emerald-400 active:bg-emerald-400",
    "dark:text-white/90 dark:hover:bg-emerald-400 dark:hover:text-white dark:active:bg-emerald-400",
    "[--btn-icon:var(--color-zinc-500)] hover:[--btn-icon:var(--color-zinc-700)] active:[--btn-icon:var(--color-zinc-700)] dark:hover:[--btn-icon:var(--color-zinc-400)] dark:active:[--btn-icon:var(--color-zinc-400)]",
  ],
  danger: [
    ...solidClasses,
    "text-white [--btn-hover-overlay:var(--color-white)]/10 [--btn-bg:var(--color-red-600)] [--btn-border:var(--color-red-700)]/90",
    "[--btn-icon:var(--color-red-300)] hover:[--btn-icon:var(--color-red-200)] active:[--btn-icon:var(--color-red-200)]",
  ],
  plain: [
    "border-transparent text-zinc-950 hover:bg-zinc-950/5 active:bg-zinc-950/5",
    "dark:text-white dark:hover:bg-white/10 dark:active:bg-white/10",
    "[--btn-icon:var(--color-zinc-500)] hover:[--btn-icon:var(--color-zinc-700)] active:[--btn-icon:var(--color-zinc-700)] dark:[--btn-icon:var(--color-zinc-500)] dark:hover:[--btn-icon:var(--color-zinc-400)] dark:active:[--btn-icon:var(--color-zinc-400)]",
  ],
};

export function buttonClasses(options?: ButtonClassesOptions): string;
export function buttonClasses(variant?: ButtonVariant, className?: string): string;
export function buttonClasses(variantOrOptions: ButtonVariant | ButtonClassesOptions = "primary", className?: string): string {
  const options = typeof variantOrOptions === "string" ? { variant: variantOrOptions, className } : variantOrOptions;
  const variant = options?.variant ?? "primary";
  const size = options?.size ?? "md";

  return cn(baseClasses, sizeClasses[size], variantClasses[variant], options?.className);
}

export function TouchTarget({ children }: { children: React.ReactNode }): React.ReactElement {
  return (
    <>
      <span className="pointer-fine:hidden absolute top-1/2 left-1/2 size-[max(100%,2.75rem)] -translate-x-1/2 -translate-y-1/2" aria-hidden="true" />
      {children}
    </>
  );
}

export type ButtonProps = Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "size"> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export function Button({ className, variant = "primary", size = "md", children, ...props }: ButtonProps): React.ReactElement {
  return (
    <button className={buttonClasses({ variant, size, className })} {...props}>
      <TouchTarget>{children}</TouchTarget>
    </button>
  );
}
