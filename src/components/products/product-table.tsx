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
};

export function ProductTable({ products, brands, strains, selectedProductId, hrefBase = "/products" }: ProductTableProps): React.ReactElement {
  const hasActiveStrains = strains.some((strain) => strain.data.deleted_at === null || strain.data.deleted_at === undefined);

  if (products.length === 0) {
    if (brands.length === 0) {
      return <EmptyState title="No products yet" description="Create a brand before adding your first product." />;
    }

    return hasActiveStrains
      ? <EmptyState title="No products yet" description="Add a product to start building your sales catalog." />
      : <EmptyState title="No products yet" description="Create a strain before adding your first product." />;
  }

  const brandNames = new Map(brands.map((brand) => [brand.id, brand.data.name]));
  const strainNames = new Map(strains.map((strain) => [strain.id, `${strain.data.name}${strain.data.deleted_at !== null && strain.data.deleted_at !== undefined ? " (deleted)" : ""}`]));

  function displayStrains(strainIds: string[]): string {
    return strainIds.length > 0 ? strainIds.map((strainId) => strainNames.get(strainId) ?? strainId).join(", ") : "—";
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Brand</TableHead>
          <TableHead>Strains</TableHead>
          <TableHead>Category</TableHead>
          <TableHead>SKU</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {products.map((product) => {
          const separator = hrefBase.includes("?") ? "&" : "?";
          const href = `${hrefBase}${separator}product=${product.id}`;
          const label = `Edit ${product.data.name}`;

          return (
            <TableRow key={product.id} className={cn("group cursor-pointer", selectedProductId === product.id && "bg-zinc-950/2.5 dark:bg-white/5")}>
              <TableCell>
                <Link href={href} className="font-semibold text-zinc-950 group-hover:text-zinc-700 dark:text-white dark:group-hover:text-zinc-300">
                  <span className="absolute inset-0" />
                  {product.data.name}
                </Link>
              </TableCell>
              <TableCell>
                <Link href={href} aria-hidden tabIndex={-1} className="absolute inset-0 z-10">
                  <span className="sr-only">{label}</span>
                </Link>
                {brandNames.get(product.data.brand_id) ?? "Unknown Brand"}
              </TableCell>
              <TableCell>
                <Link href={href} aria-hidden tabIndex={-1} className="absolute inset-0 z-10">
                  <span className="sr-only">{label}</span>
                </Link>
                {displayStrains(product.data.strain_ids)}
              </TableCell>
              <TableCell>
                <Link href={href} aria-hidden tabIndex={-1} className="absolute inset-0 z-10">
                  <span className="sr-only">{label}</span>
                </Link>
                {product.data.category || "—"}
              </TableCell>
              <TableCell>
                <Link href={href} aria-hidden tabIndex={-1} className="absolute inset-0 z-10">
                  <span className="sr-only">{label}</span>
                </Link>
                {product.data.sku || "—"}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
