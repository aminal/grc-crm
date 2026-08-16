import { ChevronDown, ChevronUp } from "lucide-react";
import Link from "next/link";
import {
  Pagination,
  PaginationGap,
  PaginationList,
  PaginationNext,
  PaginationPage,
  PaginationPrevious,
} from "./pagination";
import { cn } from "@/lib/utils";

export const tablePageSize = 15;

export type TableSortDirection = "asc" | "desc";

type TableHeadProps = React.ThHTMLAttributes<HTMLTableCellElement> & {
  sortHref?: string;
  sortDirection?: TableSortDirection | null;
};

type TablePaginationPage = number | "gap";

type TablePaginationProps = {
  baseHref: string;
  currentPage: number;
  totalItems: number;
  pageSize?: number;
};

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

export function TableHead({ className, sortHref, sortDirection = null, children, ...props }: TableHeadProps): React.ReactElement {
  const content = sortHref ? (
    <Link href={sortHref} className="inline-flex items-center gap-1 rounded-sm outline-hidden transition hover:text-zinc-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-500 dark:hover:text-white">
      <span>{children}</span>
      {sortDirection === "asc" ? <ChevronUp data-slot="icon" aria-hidden="true" className="size-4" /> : null}
      {sortDirection === "desc" ? <ChevronDown data-slot="icon" aria-hidden="true" className="size-4" /> : null}
    </Link>
  ) : children;

  return (
    <th
      className={cn("border-b border-b-zinc-950/10 px-4 py-2 font-semibold uppercase first:pl-2.5 last:pr-(--gutter,--spacing(2)) sm:last:pr-1 dark:border-b-white/10", className)}
      aria-sort={sortDirection === "asc" ? "ascending" : sortDirection === "desc" ? "descending" : undefined}
      {...props}
    >
      {content}
    </th>
  );
}

export function TableCell({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>): React.ReactElement {
  return <td className={cn("relative border-b border-zinc-950/5 px-4 py-4 align-top text-zinc-700 first:pl-2.5 last:pr-(--gutter,--spacing(2)) sm:last:pr-1 dark:border-white/5 dark:text-zinc-300 group-hover:bg-zinc-950/2.5 dark:group-hover:bg-white/2.5", className)} {...props} />;
}

export function activeTableSortDirection<T extends string>(column: T, sortKey: T | null, sortDirection: TableSortDirection | null): TableSortDirection | null {
  return sortKey === column ? sortDirection : null;
}

export function tableSortDirectionFromSearchParam(value: string | string[] | undefined): TableSortDirection | null {
  const rawValue = Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
  return rawValue === "asc" || rawValue === "desc" ? rawValue : null;
}

export function tableSortKeyFromSearchParam<T extends string>(value: string | string[] | undefined, keys: readonly T[]): T | null {
  const rawValue = Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
  return keys.includes(rawValue as T) ? rawValue as T : null;
}

export function tableSortHref<T extends string>(
  baseHref: string,
  column: T,
  preservedParams: Record<string, string | null | undefined>,
  sortKey: T | null,
  sortDirection: TableSortDirection | null,
): string {
  const searchParams = new URLSearchParams();

  Object.entries(preservedParams).forEach(([key, value]) => {
    if (value) {
      searchParams.set(key, value);
    }
  });

  if (sortKey !== column || sortDirection === null) {
    searchParams.set("sort", column);
    searchParams.set("dir", "asc");
  } else if (sortDirection === "asc") {
    searchParams.set("sort", column);
    searchParams.set("dir", "desc");
  }

  const search = searchParams.toString();
  return search ? `${baseHref}?${search}` : baseHref;
}

export function tableSortParams<T extends string>(sortKey: T | null, sortDirection: TableSortDirection | null): Record<string, string> {
  return sortKey && sortDirection ? { sort: sortKey, dir: sortDirection } : {};
}

export function TablePagination({ baseHref, currentPage, totalItems, pageSize = tablePageSize }: TablePaginationProps): React.ReactElement | null {
  if (totalItems <= pageSize) {
    return null;
  }

  const totalPages = Math.ceil(totalItems / pageSize);
  const page = tablePage(currentPage, totalItems, pageSize);

  return (
    <Pagination className="pt-2">
      <PaginationPrevious href={page > 1 ? tablePageHref(baseHref, page - 1) : null} />
      <PaginationList>
        {tablePaginationPages(page, totalPages).map((paginationPage, index) => paginationPage === "gap" ? (
          <PaginationGap key={`gap-${index}`} />
        ) : (
          <PaginationPage key={paginationPage} href={tablePageHref(baseHref, paginationPage)} current={paginationPage === page}>
            {paginationPage}
          </PaginationPage>
        ))}
      </PaginationList>
      <PaginationNext href={page < totalPages ? tablePageHref(baseHref, page + 1) : null} />
    </Pagination>
  );
}

export function tablePageFromSearchParam(value: string | string[] | undefined, totalItems: number, pageSize = tablePageSize): number {
  const rawValue = Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
  return tablePage(Number.parseInt(rawValue, 10), totalItems, pageSize);
}

export function paginatedTableItems<T>(items: T[], currentPage: number, pageSize = tablePageSize): T[] {
  const page = tablePage(currentPage, items.length, pageSize);
  const start = (page - 1) * pageSize;
  return items.slice(start, start + pageSize);
}

export function tablePageHref(baseHref: string, page: number): string {
  if (page <= 1) {
    return baseHref;
  }

  const separator = baseHref.includes("?") ? "&" : "?";
  return `${baseHref}${separator}page=${page}`;
}

function tablePage(page: number, totalItems: number, pageSize: number): number {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  if (!Number.isFinite(page) || page < 1) {
    return 1;
  }

  return Math.min(Math.trunc(page), totalPages);
}

function tablePaginationPages(currentPage: number, totalPages: number): TablePaginationPage[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pageSet = new Set([1, totalPages, currentPage - 1, currentPage, currentPage + 1]);

  if (currentPage <= 4) {
    [2, 3, 4, 5].forEach((page) => pageSet.add(page));
  }

  if (currentPage >= totalPages - 3) {
    [totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1].forEach((page) => pageSet.add(page));
  }

  const visiblePages = [...pageSet]
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((a, b) => a - b);
  const pages: TablePaginationPage[] = [];

  visiblePages.forEach((page, index) => {
    if (index > 0 && page - visiblePages[index - 1] > 1) {
      pages.push("gap");
    }

    pages.push(page);
  });

  return pages;
}
