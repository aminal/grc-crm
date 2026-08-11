import { createHash } from "node:crypto";
import type { FirestoreRecord, InventoryProductGroup, PackageData } from "@/lib/domain/types";

export type InventorySortField = "expiration_date" | "item" | "package_count" | "quantity";
export type InventorySortDirection = "asc" | "desc";

function parseMillis(value: unknown): number | null {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return value.getTime();
  }

  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? null : parsed;
  }

  if (typeof value === "object" && value !== null && "toMillis" in value && typeof value.toMillis === "function") {
    return value.toMillis() as number;
  }

  if (typeof value === "object" && value !== null && "toDate" in value && typeof value.toDate === "function") {
    return (value.toDate() as Date).getTime();
  }

  return null;
}

function groupKey(item: string, sourcePackages: string): string {
  return createHash("sha1").update(`${item.toLowerCase()}\u001f${sourcePackages.toLowerCase()}`).digest("hex");
}

function dominantUnit(rows: FirestoreRecord<PackageData>[]): string {
  const counts = new Map<string, number>();

  for (const row of rows) {
    const unit = row.data.unit_of_measure.trim();
    if (unit) {
      counts.set(unit, (counts.get(unit) ?? 0) + 1);
    }
  }

  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] ?? "";
}

function rollupStatus(rows: FirestoreRecord<PackageData>[]): "available" | "pending" | "sold" | "inactive" {
  const statuses = new Set(rows.map((row) => row.data.package_status ?? "available"));
  if (statuses.has("sold")) {
    return "sold";
  }

  if (statuses.has("pending")) {
    return "pending";
  }

  if (statuses.has("inactive")) {
    return "inactive";
  }

  return "available";
}

function firstNonEmpty(values: string[]): string {
  return values.map((value) => value.trim()).find(Boolean) ?? "";
}

export function groupInventory(packages: FirestoreRecord<PackageData>[]): InventoryProductGroup[] {
  const groups = new Map<string, FirestoreRecord<PackageData>[]>();

  for (const packageRecord of packages) {
    const item = packageRecord.data.item.trim() || "—";
    const sourcePackages = packageRecord.data.source_packages.trim();
    const key = groupKey(item, sourcePackages);
    groups.set(key, [...(groups.get(key) ?? []), packageRecord]);
  }

  return sortInventoryGroups(
    [...groups.entries()].map(([key, rows]) => {
      const units = [...new Set(rows.map((row) => row.data.unit_of_measure.trim()).filter(Boolean))].sort();
      const expirationRows = rows
        .map((row) => ({ value: row.data.expiration_date, ts: parseMillis(row.data.expiration_date) }))
        .filter((row): row is { value: string; ts: number } => row.ts !== null)
        .sort((a, b) => a.ts - b.ts);
      const expirationDate = expirationRows[0]?.value ?? null;
      const expirationTs = expirationRows[0]?.ts ?? null;
      const sortedPackages = [...rows].sort((a, b) => {
        const aTs = parseMillis(a.data.expiration_date);
        const bTs = parseMillis(b.data.expiration_date);
        if (aTs === null && bTs !== null) {
          return 1;
        }
        if (aTs !== null && bTs === null) {
          return -1;
        }
        if (aTs !== null && bTs !== null && aTs !== bTs) {
          return aTs - bTs;
        }
        return a.data.package_tag.localeCompare(b.data.package_tag);
      });
      const item = firstNonEmpty(rows.map((row) => row.data.item)) || "—";
      const sourcePackages = firstNonEmpty(rows.map((row) => row.data.source_packages));
      const strains = [...new Set(rows.map((row) => row.data.strain.trim()).filter(Boolean))].sort();
      const labStatuses = [...new Set(rows.map((row) => row.data.lab_testing_status.trim()).filter(Boolean))].sort();

      return {
        key,
        item,
        source_packages: sourcePackages,
        package_count: rows.length,
        total_quantity: rows.reduce((sum, row) => sum + Number(row.data.quantity ?? 0), 0),
        unit_of_measure: dominantUnit(rows),
        mixed_units: units.length > 1,
        units,
        expiration_date: expirationDate,
        expiration_ts: expirationTs,
        category: firstNonEmpty(rows.map((row) => row.data.category)),
        strains,
        lab_statuses: labStatuses,
        search: rows
          .map((row) => [row.data.item, row.data.source_packages, row.data.category, row.data.strain, row.data.package_tag, row.data.source_harvest].join(" "))
          .join(" ")
          .toLowerCase(),
        packages: sortedPackages,
        status: rollupStatus(rows),
      } satisfies InventoryProductGroup;
    }),
    "expiration_date",
    "asc",
  );
}

export function filterInventoryGroups(groups: InventoryProductGroup[], query: string): InventoryProductGroup[] {
  const normalized = query.trim().toLowerCase();
  return normalized ? groups.filter((group) => group.search.includes(normalized)) : groups;
}

export function sortInventoryGroups(groups: InventoryProductGroup[], field: InventorySortField, direction: InventorySortDirection): InventoryProductGroup[] {
  const multiplier = direction === "asc" ? 1 : -1;
  return [...groups].sort((a, b) => {
    if (field === "expiration_date") {
      if (a.expiration_ts === null && b.expiration_ts !== null) {
        return 1;
      }
      if (a.expiration_ts !== null && b.expiration_ts === null) {
        return -1;
      }
      if (a.expiration_ts !== null && b.expiration_ts !== null && a.expiration_ts !== b.expiration_ts) {
        return (a.expiration_ts - b.expiration_ts) * multiplier;
      }
    } else if (field === "item") {
      const compared = a.item.localeCompare(b.item);
      if (compared !== 0) {
        return compared * multiplier;
      }
    } else if (field === "package_count") {
      const compared = a.package_count - b.package_count;
      if (compared !== 0) {
        return compared * multiplier;
      }
    } else if (field === "quantity") {
      const compared = a.total_quantity - b.total_quantity;
      if (compared !== 0) {
        return compared * multiplier;
      }
    }

    return a.item.localeCompare(b.item) || a.source_packages.localeCompare(b.source_packages);
  });
}

export function inventoryCounts(groups: InventoryProductGroup[]): { products: number; packages: number } {
  return {
    products: groups.length,
    packages: groups.reduce((sum, group) => sum + group.package_count, 0),
  };
}
