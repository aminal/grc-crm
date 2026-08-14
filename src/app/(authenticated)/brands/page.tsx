import Link from "next/link";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { BrandDialog } from "@/components/brands/brand-dialog";
import { BrandTable } from "@/components/brands/brand-table";
import { buttonClasses } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { findBrand, listBrands } from "@/lib/data/sales-settings";
import type { BrandData, FirestoreRecord } from "@/lib/domain/types";

const brandsHref = "/brands";

type BrandDialogBrand = {
  id: string;
  data: Pick<BrandData, "name" | "acronym" | "website" | "notes">;
};

function serializeBrand(record: FirestoreRecord<BrandData>): BrandDialogBrand {
  return {
    id: record.id,
    data: {
      name: record.data.name,
      acronym: record.data.acronym,
      website: record.data.website,
      notes: record.data.notes,
    },
  };
}

export default async function BrandsPage({ searchParams }: { searchParams: Promise<{ brand?: string }> }): Promise<React.ReactElement> {
  const params = await searchParams;
  const brandParam = typeof params.brand === "string" ? params.brand.trim() : "";
  const showCreateBrandDialog = brandParam === "new";
  const showEditBrandDialog = brandParam !== "" && brandParam !== "new";

  let brands: FirestoreRecord<BrandData>[] = [];
  let selectedBrand: FirestoreRecord<BrandData> | null = null;

  if (showEditBrandDialog) {
    [brands, selectedBrand] = await Promise.all([
      listBrands(),
      findBrand(brandParam),
    ]);
  } else {
    brands = await listBrands();
  }

  const serializedBrand = selectedBrand ? serializeBrand(selectedBrand) : null;

  return (
    <div>
      <PageHeader
        title="Brands"
        description="Manage the brands used throughout the sales workflow."
        actions={
          <Link href={`${brandsHref}?brand=new`} className={buttonClasses()}>
            <Plus data-slot="icon" aria-hidden="true" />
            Add Brand
          </Link>
        }
      />
      <BrandTable brands={brands} selectedBrandId={selectedBrand?.id} hrefBase={brandsHref} />
      {showCreateBrandDialog ? <BrandDialog mode="create" closeHref={brandsHref} /> : null}
      {showEditBrandDialog && serializedBrand ? <BrandDialog mode="edit" brand={serializedBrand} closeHref={brandsHref} /> : null}
    </div>
  );
}
