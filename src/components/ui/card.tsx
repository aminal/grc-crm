import { cn } from "@/lib/utils";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>): React.ReactElement {
  return <div className={cn("rounded-lg bg-white shadow-xs ring-1 ring-zinc-950/5 dark:bg-zinc-950/40", className)} {...props} />;
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>): React.ReactElement {
  return <div className={cn("border-b border-zinc-950/5 dark:border-zinc-900 bg-zinc-50 dark:bg-zinc-950/45 rounded-t-lg px-5 py-4", className)} {...props} />;
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLDivElement>): React.ReactElement {
  return <h2 className={cn("text-2xl/7 font-medium text-zinc-700 sm:text-2xl/7 uppercase dark:text-white", className)} {...props} />;
}

export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>): React.ReactElement {
  return <div className={cn("p-5", className)} {...props} />;
}
