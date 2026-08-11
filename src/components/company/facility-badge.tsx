import { Badge } from "@/components/ui/badge";
import type { FacilityType } from "@/lib/domain/types";

const colors: Record<FacilityType, React.ComponentProps<typeof Badge>["color"]> = {
  Dispensary: "blue",
  Processor: "cyan",
  Distributor: "amber",
  Cultivator: "emerald",
  Microbusiness: "fuchsia",
};

export function FacilityBadge({ facilityType }: { facilityType: FacilityType }): React.ReactElement {
  return <Badge color={colors[facilityType]}>{facilityType}</Badge>;
}
