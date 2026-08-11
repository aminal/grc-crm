import type { PackageData } from "@/lib/domain/types";

export type SourcePackageFields = Pick<PackageData, "source_packages" | "original_source_package_label" | "package_tag">;

export function sourcePackageKey(packageData: SourcePackageFields): string {
  return packageData.source_packages || packageData.original_source_package_label || packageData.package_tag;
}

export function assertSameSourcePrice(sourcePrices: Map<string, number>, packageData: SourcePackageFields, priceCents: number): void {
  const key = sourcePackageKey(packageData);
  const existingPrice = sourcePrices.get(key);
  if (existingPrice !== undefined && existingPrice !== priceCents) {
    throw new Error("Packages from the same source package must use identical prices.");
  }

  sourcePrices.set(key, priceCents);
}
