import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateTime } from "@/lib/domain/format";
import type { BrandData, FirestoreRecord } from "@/lib/domain/types";
import { cn } from "@/lib/utils";

export function BrandTable({
  brands,
  selectedBrandId,
  hrefBase = "/brands",
}: {
  brands: FirestoreRecord<BrandData>[];
  selectedBrandId?: string;
  hrefBase?: string;
}): React.ReactElement {
  if (brands.length === 0) {
    return <EmptyState title="No brands yet" description="Create a brand to start building your sales catalog." />;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Website</TableHead>
          <TableHead>Updated</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {brands.map((brand) => {
          const separator = hrefBase.includes("?") ? "&" : "?";
          const href = `${hrefBase}${separator}brand=${brand.id}`;
          const label = `Edit ${brand.data.name}`;

          return (
            <TableRow key={brand.id} className={cn("group cursor-pointer", selectedBrandId === brand.id && "bg-zinc-950/2.5 dark:bg-white/5")}>
              <TableCell>
                <Link href={href} className="font-semibold text-zinc-950 group-hover:text-zinc-700 dark:text-white dark:group-hover:text-zinc-300">
                  <span className="absolute inset-0" />
                  {brand.data.name}
                </Link>
              </TableCell>
              <TableCell className="max-w-sm truncate">
                <Link href={href} aria-hidden tabIndex={-1} className="absolute inset-0 z-10">
                  <span className="sr-only">{label}</span>
                </Link>
                {brand.data.website || "—"}
              </TableCell>
              <TableCell>
                <Link href={href} aria-hidden tabIndex={-1} className="absolute inset-0 z-10">
                  <span className="sr-only">{label}</span>
                </Link>
                {formatDateTime(brand.data.updated_at)}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
