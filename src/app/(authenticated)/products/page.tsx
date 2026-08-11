import Link from "next/link";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { ProductDialog } from "@/components/products/product-dialog";
import { ProductTable } from "@/components/products/product-table";
import { buttonClasses } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  findProduct,
  listBrands,
  listProductActivity,
  listProducts,
} from "@/lib/data/sales-settings";
import { dateFromFirestore } from "@/lib/domain/format";
import type { BrandData, FirestoreRecord, ProductData, SettingsActivityData } from "@/lib/domain/types";

const productsHref = "/products";

type ProductDialogProduct = {
  id: string;
  data: Pick<ProductData, "name" | "brand_id" | "category" | "sku" | "notes">;
};

type ProductDialogBrand = {
  id: string;
  name: string;
};

type ProductDialogActivity = {
  id: string;
  data: Pick<SettingsActivityData, "action" | "reason" | "actor_email" | "actor_name" | "changes"> & {
    created_at: string | null;
  };
};

function serializeFirestoreDate(value: ProductData["created_at"] | SettingsActivityData["created_at"]): string | null {
  return dateFromFirestore(value)?.toISOString() ?? null;
}

function serializeProduct(record: FirestoreRecord<ProductData>): ProductDialogProduct {
  return {
    id: record.id,
    data: {
      name: record.data.name,
      brand_id: record.data.brand_id,
      category: record.data.category,
      sku: record.data.sku,
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

function serializeActivity(record: FirestoreRecord<SettingsActivityData>): ProductDialogActivity {
  return {
    id: record.id,
    data: {
      action: record.data.action,
      reason: record.data.reason,
      actor_email: record.data.actor_email,
      actor_name: record.data.actor_name,
      changes: record.data.changes,
      created_at: serializeFirestoreDate(record.data.created_at),
    },
  };
}

export default async function ProductsPage({ searchParams }: { searchParams: Promise<{ product?: string }> }): Promise<React.ReactElement> {
  const params = await searchParams;
  const productParam = typeof params.product === "string" ? params.product.trim() : "";
  const showCreateProductDialog = productParam === "new";
  const showEditProductDialog = productParam !== "" && productParam !== "new";

  let brands: FirestoreRecord<BrandData>[] = [];
  let products: FirestoreRecord<ProductData>[] = [];
  let selectedProduct: FirestoreRecord<ProductData> | null = null;
  let productActivity: FirestoreRecord<SettingsActivityData>[] = [];

  if (showEditProductDialog) {
    [brands, products, selectedProduct, productActivity] = await Promise.all([
      listBrands(),
      listProducts(),
      findProduct(productParam),
      listProductActivity(productParam),
    ]);
  } else {
    [brands, products] = await Promise.all([
      listBrands(),
      listProducts(),
    ]);
  }

  const serializedBrands = brands.map(serializeBrand);
  const serializedProduct = selectedProduct ? serializeProduct(selectedProduct) : null;
  const serializedActivity = productActivity.map(serializeActivity);

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
      <Card>
        <CardHeader>
          <h2 className="text-base/7 font-semibold text-zinc-950 sm:text-sm/6 dark:text-white">Products</h2>
        </CardHeader>
        <CardContent>
          <ProductTable products={products} brands={brands} selectedProductId={selectedProduct?.id} hrefBase={productsHref} />
        </CardContent>
      </Card>
      {showCreateProductDialog ? <ProductDialog mode="create" brands={serializedBrands} activity={[]} closeHref={productsHref} /> : null}
      {showEditProductDialog && serializedProduct ? <ProductDialog mode="edit" product={serializedProduct} brands={serializedBrands} activity={serializedActivity} closeHref={productsHref} /> : null}
    </div>
  );
}
