import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

export type StrainTableStrain = {
  id: string;
  data: {
    name: string;
    sativa_percentage: number;
  };
};

function formatComposition(sativaPercentage: number): string {
  return `${100 - sativaPercentage}% Indica / ${sativaPercentage}% Sativa`;
}

export function StrainTable({
  strains,
  selectedStrainId,
  hrefBase = "/strains",
  canManage = true,
}: {
  strains: StrainTableStrain[];
  selectedStrainId?: string;
  hrefBase?: string;
  canManage?: boolean;
}): React.ReactElement {
  if (strains.length === 0) {
    return <EmptyState title="No strains yet" description="Create a strain before adding products to the sales catalog." />;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Composition</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {strains.map((strain) => {
          const separator = hrefBase.includes("?") ? "&" : "?";
          const href = `${hrefBase}${separator}strain=${strain.id}`;
          const label = `Edit ${strain.data.name}`;

          return (
            <TableRow key={strain.id} className={cn(canManage && "group cursor-pointer", canManage && selectedStrainId === strain.id && "bg-zinc-950/2.5 dark:bg-white/5")}>
              <TableCell>
                {canManage ? (
                  <Link href={href} className="font-semibold text-zinc-950 group-hover:text-zinc-700 dark:text-white dark:group-hover:text-zinc-300">
                    <span className="absolute inset-0" />
                    {strain.data.name}
                  </Link>
                ) : (
                  <span className="font-semibold text-zinc-950 dark:text-white">{strain.data.name}</span>
                )}
              </TableCell>
              <TableCell className="max-w-sm truncate">
                {canManage ? (
                  <Link href={href} aria-hidden tabIndex={-1} className="absolute inset-0 z-10">
                    <span className="sr-only">{label}</span>
                  </Link>
                ) : null}
                {formatComposition(strain.data.sativa_percentage)}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
