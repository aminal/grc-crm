import Link from "next/link";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { ProductDialog } from "@/components/products/product-dialog";
import { ProductTable } from "@/components/products/product-table";
import { buttonClasses } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  findProduct,
  findStrain,
  listBrands,
  listProducts,
  listStrains,
} from "@/lib/data/sales-settings";
import type { BrandData, FirestoreRecord, ProductData, StrainData } from "@/lib/domain/types";

const productsHref = "/products";

type ProductDialogProduct = {
  id: string;
  data: Pick<ProductData, "name" | "brand_id" | "strain_ids" | "category" | "unit_base_price_cents" | "case_quantity" | "sku" | "upc" | "notes">;
};

type ProductDialogBrand = {
  id: string;
  name: string;
};

type ProductDialogStrain = {
  id: string;
  name: string;
  deleted: boolean;
};

function serializeProduct(record: FirestoreRecord<ProductData>): ProductDialogProduct {
  return {
    id: record.id,
    data: {
      name: record.data.name,
      brand_id: record.data.brand_id,
      strain_ids: record.data.strain_ids,
      category: record.data.category,
      unit_base_price_cents: record.data.unit_base_price_cents,
      case_quantity: record.data.case_quantity,
      sku: record.data.sku,
      upc: record.data.upc,
      notes: record.data.notes,
    },
  };
}

function serializeBrand(record: FirestoreRecord<BrandData>): ProductDialogBrand {
  return {
    id: record.id,
    name: record.data.name,
  };
}

function strainIsDeleted(strain: FirestoreRecord<StrainData>): boolean {
  return strain.data.deleted_at !== null && strain.data.deleted_at !== undefined;
}

function serializeStrain(record: FirestoreRecord<StrainData>): ProductDialogStrain {
  return {
    id: record.id,
    name: record.data.name,
    deleted: strainIsDeleted(record),
  };
}

function strainIdsFromProducts(products: FirestoreRecord<ProductData>[]): string[] {
  return [...new Set(products.flatMap((product) => product.data.strain_ids))].filter(Boolean);
}

async function includeReferencedStrains(activeStrains: FirestoreRecord<StrainData>[], products: FirestoreRecord<ProductData>[]): Promise<FirestoreRecord<StrainData>[]> {
  const activeIds = new Set(activeStrains.map((strain) => strain.id));
  const missingIds = strainIdsFromProducts(products).filter((strainId) => !activeIds.has(strainId));
  const referencedStrains = await Promise.all(missingIds.map(findStrain));

  return [
    ...activeStrains,
    ...referencedStrains.filter((strain): strain is FirestoreRecord<StrainData> => strain !== null),
  ].sort((a, b) => a.data.name.localeCompare(b.data.name));
}

export default async function ProductsPage({ searchParams }: { searchParams: Promise<{ product?: string }> }): Promise<React.ReactElement> {
  const params = await searchParams;
  const productParam = typeof params.product === "string" ? params.product.trim() : "";
  const showCreateProductDialog = productParam === "new";
  const showEditProductDialog = productParam !== "" && productParam !== "new";

  let brands: FirestoreRecord<BrandData>[] = [];
  let products: FirestoreRecord<ProductData>[] = [];
  let activeStrains: FirestoreRecord<StrainData>[] = [];
  let selectedProduct: FirestoreRecord<ProductData> | null = null;

  if (showEditProductDialog) {
    [brands, products, activeStrains, selectedProduct] = await Promise.all([
      listBrands(),
      listProducts(),
      listStrains(),
      findProduct(productParam),
    ]);
  } else {
    [brands, products, activeStrains] = await Promise.all([
      listBrands(),
      listProducts(),
      listStrains(),
    ]);
  }

  const strains = await includeReferencedStrains(activeStrains, products);
  const serializedBrands = brands.map(serializeBrand);
  const serializedStrains = strains.map(serializeStrain);
  const serializedProduct = selectedProduct ? serializeProduct(selectedProduct) : null;

  return (
    <div>
      <PageHeader
        title="Products"
        description="Manage the products used throughout the sales workflow."
        actions={
          <Link href={`${productsHref}?product=new`} className={buttonClasses()}>
            <Plus data-slot="icon" aria-hidden="true" />
            Add Product
          </Link>
        }
      />
      <ProductTable products={products} brands={brands} strains={strains} selectedProductId={selectedProduct?.id} hrefBase={productsHref} />
      {showCreateProductDialog ? <ProductDialog mode="create" brands={serializedBrands} strains={serializedStrains} closeHref={productsHref} /> : null}
      {showEditProductDialog && serializedProduct ? <ProductDialog mode="edit" product={serializedProduct} brands={serializedBrands} strains={serializedStrains} closeHref={productsHref} /> : null}
    </div>
  );
}
