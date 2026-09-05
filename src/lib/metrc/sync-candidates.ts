import type { FirestoreRecord, MetrcSyncStateData, PackageData } from '@/lib/domain/types';
import type { DerivedPackageStatus, PackageStatusInfo } from '@/lib/sales/package-status';

export type SyncCandidatePackage = {
  id: string;
  package_tag: string;
  item: string;
  strain: string;
  quantity: number;
  unit_of_measure: string;
  package_status: DerivedPackageStatus;
  eligible_for_consignment: boolean;
};

export class SyncSelectionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SyncSelectionError';
  }
}

export function assertFinalizableSync(current: MetrcSyncStateData | null, syncId: string): void {
  if (!syncId) {
    throw new SyncSelectionError('Missing sync reference. Re-upload the METRC export and try again.');
  }

  if (!current || current.sync_id !== syncId) {
    throw new SyncSelectionError('This METRC sync is no longer the latest one. Re-upload the METRC export and try again.');
  }

  if (current.finalized_at) {
    throw new SyncSelectionError('This METRC sync has already been finalized. Re-upload the METRC export and try again.');
  }
}

export function stalePackagesForSync(packages: FirestoreRecord<PackageData>[], syncId: string): FirestoreRecord<PackageData>[] {
  return packages.filter((packageRecord) => {
    const data = packageRecord.data;
    return data.active === true && !data.consignment && data.last_sync_id !== syncId;
  });
}

const PROTECTED_PACKAGE_STATUSES: ReadonlySet<DerivedPackageStatus> = new Set(['sold', 'pending']);

export function toSyncCandidates(
  stale: FirestoreRecord<PackageData>[],
  statusMap: Record<string, PackageStatusInfo>,
): SyncCandidatePackage[] {
  return stale
    .map((packageRecord) => {
      const data = packageRecord.data;
      const status: DerivedPackageStatus = data.active ? statusMap[data.package_tag]?.status ?? 'available' : 'inactive';

      return {
        id: packageRecord.id,
        package_tag: data.package_tag,
        item: data.item,
        strain: data.strain,
        quantity: Number(data.quantity ?? 0),
        unit_of_measure: data.unit_of_measure,
        package_status: status,
        eligible_for_consignment: status === 'available',
      } satisfies SyncCandidatePackage;
    })
    .filter((candidate) => !PROTECTED_PACKAGE_STATUSES.has(candidate.package_status))
    .sort((a, b) => `${a.item} ${a.package_tag}`.localeCompare(`${b.item} ${b.package_tag}`));
}

export function partitionSyncFinalization(
  candidates: SyncCandidatePackage[],
  selectedIds: string[],
): { consign: string[]; deactivate: string[] } {
  const candidateById = new Map(candidates.map((candidate) => [candidate.id, candidate]));
  const selected = new Set<string>();

  for (const selectedId of selectedIds) {
    const candidate = candidateById.get(selectedId);
    if (!candidate) {
      throw new SyncSelectionError('Some selected packages are no longer part of this sync. Re-upload the METRC export and try again.');
    }

    if (!candidate.eligible_for_consignment) {
      throw new SyncSelectionError(`Package ${candidate.package_tag} is ${candidate.package_status} and cannot be marked as consignment.`);
    }

    selected.add(selectedId);
  }

  return {
    consign: candidates.filter((candidate) => selected.has(candidate.id)).map((candidate) => candidate.id),
    deactivate: candidates.filter((candidate) => !selected.has(candidate.id)).map((candidate) => candidate.id),
  };
}
