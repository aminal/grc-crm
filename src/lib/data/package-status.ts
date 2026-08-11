import "server-only";

import type { OrderData, PackageData } from "@/lib/domain/types";
import { buildPackageStatusMap, type PackageStatusInfo } from "@/lib/sales/package-status";
import { listCollection } from "./firestore";

export type { DerivedPackageStatus, PackageStatusInfo } from "@/lib/sales/package-status";

export async function packageStatusMap(): Promise<Record<string, PackageStatusInfo>> {
  const orders = await listCollection<OrderData>("orders");
  return buildPackageStatusMap(orders);
}

export function derivedPackageStatus(packageData: PackageData, map: Record<string, PackageStatusInfo>): PackageStatusInfo {
  if (!packageData.active) {
    return { status: "inactive" };
  }

  return map[packageData.package_tag] ?? { status: "available" };
}
