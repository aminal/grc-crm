import Link from "next/link";
import { ProductCategoryBadge } from "@/components/products/product-category-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { activeTableSortDirection, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, tableSortHref, type TableSortDirection } from "@/components/ui/table";
import type { BrandData, FirestoreRecord, ProductData, StrainData } from "@/lib/domain/types";

export type ProductTableSortKey = "name" | "sku" | "brand" | "strain" | "category";

type ProductTableProps = {
  products: FirestoreRecord<ProductData>[];
  brands: FirestoreRecord<BrandData>[];
  strains: FirestoreRecord<StrainData>[];
  query?: string;
  sortKey?: ProductTableSortKey | null;
  sortDirection?: TableSortDirection | null;
};

function isArchived(record: FirestoreRecord<BrandData | StrainData>): boolean {
  const archived = record.data.archived_at ?? ("deleted_at" in record.data ? record.data.deleted_at : null);
  return archived !== null && archived !== undefined;
}

export function ProductTable({ products, brands, strains, query = "", sortKey = null, sortDirection = null }: ProductTableProps): React.ReactElement {
  const hasActiveStrains = strains.some((strain) => !isArchived(strain));

  if (products.length === 0) {
    if (brands.length === 0) {
      return <EmptyState title="No products yet" description="Create a brand before adding your first product." />;
    }

    return hasActiveStrains
      ? <EmptyState title="No products yet" description="Add a product to start building your sales catalog." />
      : <EmptyState title="No products yet" description="Create a strain before adding your first product." />;
  }

  const brandLabels = new Map(brands.map((brand) => [brand.id, `${brand.data.acronym || brand.data.name}${isArchived(brand) ? " (archived)" : ""}`]));
  const strainNames = new Map(strains.map((strain) => [strain.id, `${strain.data.name}${isArchived(strain) ? " (archived)" : ""}`]));

  function displayStrains(strainIds: string[]): string {
    return strainIds.length > 0 ? strainIds.map((strainId) => strainNames.get(strainId) ?? strainId).join(", ") : "—";
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead sortHref={productSortHref("name", query, sortKey, sortDirection)} sortDirection={activeTableSortDirection("name", sortKey, sortDirection)}>Name</TableHead>
          <TableHead sortHref={productSortHref("category", query, sortKey, sortDirection)} sortDirection={activeTableSortDirection("category", sortKey, sortDirection)}>Category</TableHead>
          <TableHead sortHref={productSortHref("sku", query, sortKey, sortDirection)} sortDirection={activeTableSortDirection("sku", sortKey, sortDirection)}>SKU</TableHead>
          <TableHead sortHref={productSortHref("brand", query, sortKey, sortDirection)} sortDirection={activeTableSortDirection("brand", sortKey, sortDirection)}>Brand</TableHead>
          <TableHead sortHref={productSortHref("strain", query, sortKey, sortDirection)} sortDirection={activeTableSortDirection("strain", sortKey, sortDirection)}>Strain</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {products.map((product) => {
          const href = `/products/${encodeURIComponent(product.id)}`;
          const label = `View ${product.data.name}`;

          return (
            <TableRow key={product.id} className="group cursor-pointer">
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
                <ProductCategoryBadge category={product.data.category} />
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
                {brandLabels.get(product.data.brand_id) ?? "Unknown Brand"}
              </TableCell>
              <TableCell>
                <Link href={href} aria-hidden tabIndex={-1} className="absolute inset-0 z-10">
                  <span className="sr-only">{label}</span>
                </Link>
                {displayStrains(product.data.strain_ids)}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

function productSortHref(column: ProductTableSortKey, query: string, sortKey: ProductTableSortKey | null, sortDirection: TableSortDirection | null): string {
  return tableSortHref("/products", column, { q: query }, sortKey, sortDirection);
}
