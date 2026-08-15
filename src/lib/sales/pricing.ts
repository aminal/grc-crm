import type { PackageData } from "@/lib/domain/types";

export type SourcePackageFields = Pick<PackageData, "source_packages" | "original_source_package_label" | "package_tag" | "quantity">;

export type SourcePriceRecord = {
  priceCents: number;
  quantity: number;
};

export function sourcePackageKey(packageData: SourcePackageFields): string {
  return packageData.source_packages || packageData.original_source_package_label || packageData.package_tag;
}

export function assertSameSourcePrice(sourcePrices: Map<string, SourcePriceRecord>, packageData: SourcePackageFields, priceCents: number): void {
  const key = sourcePackageKey(packageData);
  const quantity = Number(packageData.quantity ?? 0);
  const existing = sourcePrices.get(key);
  if (existing && existing.quantity > 0 && quantity > 0) {
    if (existing.priceCents * quantity !== priceCents * existing.quantity) {
      throw new Error("Packages from the same source package must use the same price per unit.");
    }
  }

  if (!existing || (existing.quantity <= 0 && quantity > 0)) {
    sourcePrices.set(key, { priceCents, quantity });
  }
}
