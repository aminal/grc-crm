import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { BrandData, FirestoreRecord, ProductData, StrainData } from "@/lib/domain/types";
import { cn } from "@/lib/utils";

type ProductTableProps = {
  products: FirestoreRecord<ProductData>[];
  brands: FirestoreRecord<BrandData>[];
  strains: FirestoreRecord<StrainData>[];
  selectedProductId?: string;
  hrefBase?: string;
  canManage?: boolean;
};

function isArchived(record: FirestoreRecord<BrandData | StrainData>): boolean {
  const archived = record.data.archived_at ?? ("deleted_at" in record.data ? record.data.deleted_at : null);
  return archived !== null && archived !== undefined;
}

export function ProductTable({ products, brands, strains, selectedProductId, hrefBase = "/products", canManage = true }: ProductTableProps): React.ReactElement {
  const hasActiveStrains = strains.some((strain) => !isArchived(strain));

  if (products.length === 0) {
    if (brands.length === 0) {
      return <EmptyState title="No products yet" description="Create a brand before adding your first product." />;
    }

    return hasActiveStrains
      ? <EmptyState title="No products yet" description="Add a product to start building your sales catalog." />
      : <EmptyState title="No products yet" description="Create a strain before adding your first product." />;
  }

  const brandNames = new Map(brands.map((brand) => [brand.id, `${brand.data.name}${isArchived(brand) ? " (archived)" : ""}`]));
  const strainNames = new Map(strains.map((strain) => [strain.id, `${strain.data.name}${isArchived(strain) ? " (archived)" : ""}`]));

  function displayStrains(strainIds: string[]): string {
    return strainIds.length > 0 ? strainIds.map((strainId) => strainNames.get(strainId) ?? strainId).join(", ") : "—";
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>SKU</TableHead>
          <TableHead>Brand</TableHead>
          <TableHead>Strain</TableHead>
          <TableHead>Category</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {products.map((product) => {
          const separator = hrefBase.includes("?") ? "&" : "?";
          const href = `${hrefBase}${separator}product=${product.id}`;
          const label = `Edit ${product.data.name}`;

          return (
            <TableRow key={product.id} className={cn(canManage && "group cursor-pointer", canManage && selectedProductId === product.id && "bg-zinc-950/2.5 dark:bg-white/5")}>
              <TableCell>
                {canManage ? (
                  <Link href={href} className="font-semibold text-zinc-950 group-hover:text-zinc-700 dark:text-white dark:group-hover:text-zinc-300">
                    <span className="absolute inset-0" />
                    {product.data.name}
                  </Link>
                ) : (
                  <span className="font-semibold text-zinc-950 dark:text-white">{product.data.name}</span>
                )}
              </TableCell>
              <TableCell>
                {canManage ? (
                  <Link href={href} aria-hidden tabIndex={-1} className="absolute inset-0 z-10">
                    <span className="sr-only">{label}</span>
                  </Link>
                ) : null}
                {product.data.sku || "—"}
              </TableCell>
              <TableCell>
                {canManage ? (
                  <Link href={href} aria-hidden tabIndex={-1} className="absolute inset-0 z-10">
                    <span className="sr-only">{label}</span>
                  </Link>
                ) : null}
                {brandNames.get(product.data.brand_id) ?? "Unknown Brand"}
              </TableCell>
              <TableCell>
                {canManage ? (
                  <Link href={href} aria-hidden tabIndex={-1} className="absolute inset-0 z-10">
                    <span className="sr-only">{label}</span>
                  </Link>
                ) : null}
                {displayStrains(product.data.strain_ids)}
              </TableCell>
              <TableCell>
                {canManage ? (
                  <Link href={href} aria-hidden tabIndex={-1} className="absolute inset-0 z-10">
                    <span className="sr-only">{label}</span>
                  </Link>
                ) : null}
                {product.data.category || "—"}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
