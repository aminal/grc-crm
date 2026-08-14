import Link from "next/link";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { StrainDialog } from "@/components/strains/strain-dialog";
import { StrainTable, type StrainTableStrain } from "@/components/strains/strain-table";
import { buttonClasses } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { findStrain, listStrains } from "@/lib/data/sales-settings";
import type { FirestoreRecord, StrainData } from "@/lib/domain/types";

const strainsHref = "/strains";

type StrainDialogStrain = {
  id: string;
  data: Pick<StrainData, "name" | "breeder" | "genetics" | "sativa_percentage" | "notes">;
};

function serializeStrain(record: FirestoreRecord<StrainData>): StrainDialogStrain {
  return {
    id: record.id,
    data: {
      name: record.data.name,
      breeder: record.data.breeder,
      genetics: record.data.genetics,
      sativa_percentage: record.data.sativa_percentage,
      notes: record.data.notes,
    },
  };
}

function serializeTableStrain(record: FirestoreRecord<StrainData>): StrainTableStrain {
  return {
    id: record.id,
    data: {
      name: record.data.name,
      sativa_percentage: record.data.sativa_percentage,
    },
  };
}

function strainIsDeleted(strain: FirestoreRecord<StrainData>): boolean {
  return strain.data.deleted_at !== null && strain.data.deleted_at !== undefined;
}

export default async function StrainsPage({ searchParams }: { searchParams: Promise<{ strain?: string }> }): Promise<React.ReactElement> {
  const params = await searchParams;
  const strainParam = typeof params.strain === "string" ? params.strain.trim() : "";
  const showCreateStrainDialog = strainParam === "new";
  const showEditStrainDialog = strainParam !== "" && strainParam !== "new";

  let strains: FirestoreRecord<StrainData>[] = [];
  let selectedStrain: FirestoreRecord<StrainData> | null = null;

  if (showEditStrainDialog) {
    [strains, selectedStrain] = await Promise.all([
      listStrains(),
      findStrain(strainParam),
    ]);
  } else {
    strains = await listStrains();
  }

  if (selectedStrain && strainIsDeleted(selectedStrain)) {
    selectedStrain = null;
  }

  const serializedStrains = strains.map(serializeTableStrain);
  const serializedStrain = selectedStrain ? serializeStrain(selectedStrain) : null;

  return (
    <div>
      <PageHeader
        title="Strains"
        description="Track all our cultivars and raw strain genetics before they get turned into finished products."
        actions={
          <Link href={`${strainsHref}?strain=new`} className={buttonClasses()}>
            <Plus data-slot="icon" aria-hidden="true" />
            Add Strain
          </Link>
        }
      />
      <StrainTable strains={serializedStrains} selectedStrainId={selectedStrain?.id} hrefBase={strainsHref} />
      {showCreateStrainDialog ? <StrainDialog mode="create" closeHref={strainsHref} /> : null}
      {showEditStrainDialog && serializedStrain ? <StrainDialog mode="edit" strain={serializedStrain} closeHref={strainsHref} /> : null}
    </div>
  );
}
