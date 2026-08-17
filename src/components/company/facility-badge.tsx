import { Badge } from "@/components/ui/badge";
import type { CompanyStatus, FacilityType } from "@/lib/domain/types";

const facilityColors: Record<FacilityType, React.ComponentProps<typeof Badge>["color"]> = {
  Dispensary: "blue",
  Processor: "cyan",
  Distributor: "amber",
  Cultivator: "emerald",
  Microbusiness: "fuchsia",
};

const companyStatusColors: Record<CompanyStatus, React.ComponentProps<typeof Badge>["color"]> = {
  Lead: "blue",
  Pending: "orange",
  Active: "emerald",
  "Active - COD Only": "green",
  "On Hold - Financial": "yellow",
  "On Hold - Compliance": "yellow",
  Inactive: "zinc",
  Blacklisted: "red",
};

export function FacilityBadge({ facilityType }: { facilityType: FacilityType }): React.ReactElement {
  return <Badge color={facilityColors[facilityType]}>{facilityType}</Badge>;
}

export function CompanyStatusBadge({ status }: { status: CompanyStatus }): React.ReactElement {
  return <Badge color={companyStatusColors[status]}>{status}</Badge>;
}
