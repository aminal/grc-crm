import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateTime } from "@/lib/domain/format";
import type { BrandData, FirestoreRecord, ProductData } from "@/lib/domain/types";
import { cn } from "@/lib/utils";

type ProductTableProps = {
  products: FirestoreRecord<ProductData>[];
  brands: FirestoreRecord<BrandData>[];
  selectedProductId?: string;
  hrefBase?: string;
};

export function ProductTable({ products, brands, selectedProductId, hrefBase = "/products" }: ProductTableProps): React.ReactElement {
  if (products.length === 0) {
    return brands.length > 0
      ? <EmptyState title="No products yet" description="Add a product to start building your sales catalog." />
      : <EmptyState title="No products yet" description="Create a brand before adding your first product." />;
  }

  const brandNames = new Map(brands.map((brand) => [brand.id, brand.data.name]));

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Brand</TableHead>
          <TableHead>Category</TableHead>
          <TableHead>SKU</TableHead>
          <TableHead>Updated</TableHead>
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
                {product.data.category || "—"}
              </TableCell>
              <TableCell>
                <Link href={href} aria-hidden tabIndex={-1} className="absolute inset-0 z-10">
                  <span className="sr-only">{label}</span>
                </Link>
                {product.data.sku || "—"}
              </TableCell>
              <TableCell>
                <Link href={href} aria-hidden tabIndex={-1} className="absolute inset-0 z-10">
                  <span className="sr-only">{label}</span>
                </Link>
                {formatDateTime(product.data.updated_at)}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
