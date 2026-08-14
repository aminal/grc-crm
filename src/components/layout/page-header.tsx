export function PageHeader({ title, description, actions, children }: { title: string; description?: string; actions?: React.ReactNode; children?: React.ReactNode }): React.ReactElement {
  return (
    <div className="mb-8 flex items-start justify-between gap-4">
      <div className="min-w-0">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <h1 className="text-2xl/8 font-semibold text-zinc-950 sm:text-3xl/10 dark:text-white uppercase">{title}</h1>
          {children ? <div className="shrink-0">{children}</div> : null}
        </div>
        {description ? <p className="mt-2 max-w-2xl text-base/6 text-zinc-500 sm:text-base/6 dark:text-zinc-400 font-medium">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap justify-end gap-2">{actions}</div> : null}
    </div>
  );
}
