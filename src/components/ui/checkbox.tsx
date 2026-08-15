import { cn } from "@/lib/utils";

type CheckboxProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "type">;

export function Checkbox({ className, ...props }: CheckboxProps): React.ReactElement {
  return (
    <span className={cn("group relative isolate inline-flex size-4.5 items-center justify-center sm:size-4", className)}>
      <input type="checkbox" className="peer absolute inset-0 z-10 size-full cursor-pointer appearance-none rounded-[0.3125rem] focus:outline-hidden disabled:cursor-default" {...props} />
      <span
        aria-hidden="true"
        className={cn(
          "relative flex size-4.5 items-center justify-center rounded-[0.3125rem] border border-zinc-950/15 bg-white shadow-sm sm:size-4",
          "after:absolute after:inset-0 after:rounded-[calc(0.3125rem-1px)] after:shadow-[inset_0_1px_--theme(--color-white/15%)]",
          "group-hover:border-zinc-950/30 peer-checked:border-transparent peer-checked:bg-zinc-900 peer-checked:[&_svg]:opacity-100 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-purple-500 peer-disabled:opacity-50",
          "dark:border-white/15 dark:bg-white/5 dark:group-hover:border-white/30 dark:peer-checked:border-white/5 dark:peer-checked:bg-zinc-600 dark:after:hidden",
        )}
      >
        <svg className="size-4 stroke-white opacity-0 sm:h-3.5 sm:w-3.5" viewBox="0 0 14 14" fill="none">
          <path d="M3 8L6 11L11 3.5" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    </span>
  );
}
