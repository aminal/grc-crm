export function PageHeader({ title, description, actions, children }: { title: string; description?: string; actions?: React.ReactNode; children?: React.ReactNode }): React.ReactElement {
  return (
    <div className="mb-8 flex flex-col items-stretch gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 sm:flex-1">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <h1 className="min-w-0 break-words text-4xl/8 font-semibold text-zinc-950 sm:text-3xl/10 dark:text-white uppercase">{title}</h1>
          {children ? <div className="shrink-0">{children}</div> : null}
        </div>
        {description ? <p className="mt-2 max-w-2xl break-words text-base/6 text-zinc-500 sm:text-base/6 dark:text-zinc-400 font-medium">{description}</p> : null}
      </div>
      {actions ? <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:shrink-0 sm:justify-end">{actions}</div> : null}
    </div>
  );
}
