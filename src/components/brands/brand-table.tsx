import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { BrandData, FirestoreRecord } from "@/lib/domain/types";
import { cn } from "@/lib/utils";

export function BrandTable({
  brands,
  selectedBrandId,
  hrefBase = "/brands",
  canManage = true,
}: {
  brands: FirestoreRecord<BrandData>[];
  selectedBrandId?: string;
  hrefBase?: string;
  canManage?: boolean;
}): React.ReactElement {
  if (brands.length === 0) {
    return <EmptyState title="No brands yet" description="Create a brand to start building your sales catalog." />;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Acronym</TableHead>
          <TableHead>Website</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {brands.map((brand) => {
          const separator = hrefBase.includes("?") ? "&" : "?";
          const href = `${hrefBase}${separator}brand=${brand.id}`;
          const label = `Edit ${brand.data.name}`;

          return (
            <TableRow key={brand.id} className={cn(canManage && "group cursor-pointer", canManage && selectedBrandId === brand.id && "bg-zinc-950/2.5 dark:bg-white/5")}>
              <TableCell>
                {canManage ? (
                  <Link href={href} className="font-semibold text-zinc-950 group-hover:text-zinc-700 dark:text-white dark:group-hover:text-zinc-300">
                    <span className="absolute inset-0" />
                    {brand.data.name}
                  </Link>
                ) : (
                  <span className="font-semibold text-zinc-950 dark:text-white">{brand.data.name}</span>
                )}
              </TableCell>
              <TableCell>
                {canManage ? (
                  <Link href={href} aria-hidden tabIndex={-1} className="absolute inset-0 z-10">
                    <span className="sr-only">{label}</span>
                  </Link>
                ) : null}
                {brand.data.acronym || "—"}
              </TableCell>
              <TableCell className="max-w-sm truncate">
                {canManage ? (
                  <Link href={href} aria-hidden tabIndex={-1} className="absolute inset-0 z-10">
                    <span className="sr-only">{label}</span>
                  </Link>
                ) : null}
                {brand.data.website || "—"}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
