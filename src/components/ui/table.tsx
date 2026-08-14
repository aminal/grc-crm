import { cn } from "@/lib/utils";

export function Table({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>): React.ReactElement {
  return (
    <div className="flow-root">
      <div className={cn("-mx-(--gutter) overflow-x-auto whitespace-nowrap [--gutter:--spacing(6)] lg:[--gutter:--spacing(10)]", className)} {...props}>
        <div className="inline-block min-w-full align-middle sm:px-(--gutter)">
          <table className="min-w-full text-left text-sm/6 text-zinc-950 dark:text-white">{children}</table>
        </div>
      </div>
    </div>
  );
}

export function TableHeader({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>): React.ReactElement {
  return <thead className={cn("text-zinc-500 dark:text-zinc-400", className)} {...props} />;
}

export function TableBody({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>): React.ReactElement {
  return <tbody className={className} {...props} />;
}

export function TableRow({ className, ...props }: React.HTMLAttributes<HTMLTableRowElement>): React.ReactElement {
  return <tr className={cn("group", className)} {...props} />;
}

export function TableHead({ className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>): React.ReactElement {
  return <th className={cn("border-b border-b-zinc-950/10 px-4 py-2 font-semibold uppercase first:pl-2.5 last:pr-(--gutter,--spacing(2)) sm:last:pr-1 dark:border-b-white/10", className)} {...props} />;
}

export function TableCell({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>): React.ReactElement {
  return <td className={cn("relative border-b border-zinc-950/5 px-4 py-4 align-top text-zinc-700 first:pl-2.5 last:pr-(--gutter,--spacing(2)) sm:last:pr-1 dark:border-white/5 dark:text-zinc-300 group-hover:bg-zinc-950/2.5 dark:group-hover:bg-white/2.5", className)} {...props} />;
}
