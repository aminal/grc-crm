import Link from "next/link";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { BrandDialog } from "@/components/brands/brand-dialog";
import { BrandTable } from "@/components/brands/brand-table";
import { buttonClasses } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { findBrand, listBrandActivity, listBrands } from "@/lib/data/sales-settings";
import { dateFromFirestore } from "@/lib/domain/format";
import type { BrandData, FirestoreRecord, SettingsActivityData } from "@/lib/domain/types";

const brandsHref = "/brands";

type BrandDialogBrand = {
  id: string;
  data: Pick<BrandData, "name" | "website" | "notes">;
};

type BrandDialogActivity = {
  id: string;
  data: Pick<SettingsActivityData, "action" | "reason" | "actor_email" | "actor_name" | "changes"> & {
    created_at: string | null;
  };
};

function serializeFirestoreDate(value: BrandData["created_at"] | SettingsActivityData["created_at"]): string | null {
  return dateFromFirestore(value)?.toISOString() ?? null;
}

function serializeBrand(record: FirestoreRecord<BrandData>): BrandDialogBrand {
  return {
    id: record.id,
    data: {
      name: record.data.name,
      website: record.data.website,
      notes: record.data.notes,
    },
  };
}

function serializeActivity(record: FirestoreRecord<SettingsActivityData>): BrandDialogActivity {
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

export default async function BrandsPage({ searchParams }: { searchParams: Promise<{ brand?: string }> }): Promise<React.ReactElement> {
  const params = await searchParams;
  const brandParam = typeof params.brand === "string" ? params.brand.trim() : "";
  const showCreateBrandDialog = brandParam === "new";
  const showEditBrandDialog = brandParam !== "" && brandParam !== "new";

  let brands: FirestoreRecord<BrandData>[] = [];
  let selectedBrand: FirestoreRecord<BrandData> | null = null;
  let brandActivity: FirestoreRecord<SettingsActivityData>[] = [];

  if (showEditBrandDialog) {
    [brands, selectedBrand, brandActivity] = await Promise.all([
      listBrands(),
      findBrand(brandParam),
      listBrandActivity(brandParam),
    ]);
  } else {
    brands = await listBrands();
  }

  const serializedBrand = selectedBrand ? serializeBrand(selectedBrand) : null;
  const serializedActivity = brandActivity.map(serializeActivity);

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
      <Card>
        <CardHeader>
          <h2 className="text-base/7 font-semibold text-zinc-950 sm:text-sm/6 dark:text-white">Brands</h2>
        </CardHeader>
        <CardContent>
          <BrandTable brands={brands} selectedBrandId={selectedBrand?.id} hrefBase={brandsHref} />
        </CardContent>
      </Card>
      {showCreateBrandDialog ? <BrandDialog mode="create" activity={[]} closeHref={brandsHref} /> : null}
      {showEditBrandDialog && serializedBrand ? <BrandDialog mode="edit" brand={serializedBrand} activity={serializedActivity} closeHref={brandsHref} /> : null}
    </div>
  );
}
