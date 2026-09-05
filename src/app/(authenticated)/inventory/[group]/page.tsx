import { notFound } from 'next/navigation';
import { HeaderCard } from '@/components/layout/header-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { isFeatureEnabled } from '@/lib/auth/permissions';
import { requireSectionEnabled } from '@/lib/auth/session';
import { listDistributors } from '@/lib/data/distributors';
import { findInventoryBatchMetadata, groupInventory, listVisiblePackages } from '@/lib/data/inventory';
import { compactNumber, formatDate, formatInventoryCategory } from '@/lib/domain/format';
import type { PackageData } from '@/lib/domain/types';
import { BatchEditDialogButton } from './batch-edit-dialog';
import { type InventoryPackageRow, PackageTable } from './package-table';

type PackageStatus = NonNullable<PackageData['package_status']>;

const packageStatusOrder = {
  available: 0,
  sold: 1,
  pending: 2,
  inactive: 3,
} satisfies Record<PackageStatus, number>;

export default async function InventoryGroupPage({ params }: {
  params: Promise<{ group: string }>
}): Promise<React.ReactElement> {
  const user = await requireSectionEnabled('inventory');
  const canCreateOrder = isFeatureEnabled(user, 'sales', 'create_orders');
  const canManageBatch = isFeatureEnabled(user, 'inventory', 'manage_batches');
  const canManageConsignment = isFeatureEnabled(user, 'inventory', 'manage_consignment');

  const { group: encodedGroup } = await params;
  const key = decodeURIComponent(encodedGroup);
  const [permissionedPackages, distributors] = await Promise.all([listVisiblePackages(user), canManageConsignment ? listDistributors() : Promise.resolve([])]);
  const group = groupInventory(permissionedPackages).find((row) => row.key === key);
  if (!group) {
    notFound();
  }
  const batchMetadata = await findInventoryBatchMetadata(key);
  const batchMetadataValues = {
    batch_number: batchMetadata?.data.batch_number ?? '',
    sku: batchMetadata?.data.sku ?? '',
    thc_percentage: batchMetadata?.data.thc_percentage ?? '',
    cbd_percentage: batchMetadata?.data.cbd_percentage ?? '',
    coa_url: batchMetadata?.data.coa_url ?? '',
  };
  const coaUrl = batchMetadataValues.coa_url;
  const firstPackage = group.packages[0]?.data;
  const packageStrain = group.strains.join(' / ') || firstPackage?.strain || 'No strain';
  const packageTestStatus = group.lab_statuses.length > 0 ? (
    <>
            {group.lab_statuses.map((labStatus) => (
              <Badge key={labStatus} color='violet'>{formatLabStatus(labStatus)}</Badge>
            ))}
        </>
  ) : null;
  const availablePackages = group.packages.filter((packageRecord) => packageStatus(packageRecord.data) === 'available');
  const availablePackageCount = availablePackages.length;
  const availableUnitCount = availablePackages.reduce((total, packageRecord) => total + Number(packageRecord.data.quantity ?? 0), 0);
  const totalUnitDisplay = `${compactNumber(availableUnitCount)}/${compactNumber(group.total_quantity)}`;
  const thcPercentage = batchMetadataValues.thc_percentage || null;
  const cbdPercentage = batchMetadataValues.cbd_percentage || null;
  const thcStat = thcPercentage ? (
    <div className='flex min-w-28 flex-col rounded-xl bg-purple-500/10 px-6 py-4 text-purple-700 dark:bg-zinc-600/10 dark:text-purple-300'>
      <div className='flex items-start justify-end gap-0.5 text-4xl/9 font-semibold tracking-tight'>
        {thcPercentage}
        <div className='text-md/3.5! mt-1 leading-none font-semibold  text-purple-600/80 dark:text-purple-600'>THC<br />%
        </div>
      </div>
      {cbdPercentage ? (
        <div className='mt-2 border-t border-zinc-900/30 pt-2 dark:border-white/5'>
          <div className='mt-1 flex items-start justify-end gap-0.5 text-4xl/9 font-semibold tracking-tight'>
            {cbdPercentage}
            <div className='text-md/3.5! mt-1 leading-none font-semibold  text-purple-600/80 dark:text-purple-600'>CBD<br />%
            </div>
          </div>
        </div>
      ) : null}
      <div className='mt-2 border-t border-zinc-900/30 pt-2 dark:border-white/5'>
        <div className='flex justify-end gap-0.5 text-3xl/9 font-semibold tracking-tight'>{totalUnitDisplay}</div>
        <div className='text-right text-md/3! font-semibold uppercase tracking-[0.1em] text-purple-600/80 dark:text-purple-600'>
          Total Units
        </div>
      </div>
    </div>
  ) : null;
  const sortedPackages = [...group.packages].sort((left, right) => packageStatusOrder[packageStatus(left.data)] - packageStatusOrder[packageStatus(right.data)]);
  const distributorOptions = distributors.map((distributor) => ({
    value: distributor.id,
    label: distributor.data.name,
    description: distributor.data.license_number || undefined,
  }));
  const packageRows: InventoryPackageRow[] = sortedPackages.map((packageRecord) => ({
    id: packageRecord.id,
    item: packageRecord.data.item || group.item || 'Unknown item',
    package_tag: packageRecord.data.package_tag || 'Unknown package',
    status: packageStatus(packageRecord.data),
    quantity: packageRecord.data.quantity,
    unit_label: packageRecord.data.unit_of_measure === 'ea' ? 'Units' : packageRecord.data.unit_of_measure || 'Qty',
    distributor_name: packageRecord.data.consignment?.distributor_name ?? '',
  }));
  const packageDetails = [
    { label: 'Product Type', value: formatInventoryCategory(group.category) || '—' },
    { label: 'Expires', value: formatDate(group.expiration_date ?? firstPackage?.expiration_date) },
    { label: 'PKGS Available', value: `${availablePackageCount} / ${group.package_count}` },
    ...(batchMetadataValues.batch_number ? [{ label: 'Batch Number', value: batchMetadataValues.batch_number }] : []),
    ...(batchMetadataValues.sku ? [{ label: 'SKU', value: batchMetadataValues.sku }] : []),
    { label: 'Strain', value: packageStrain },
  ];
  const headerActions = canManageBatch || canCreateOrder || coaUrl ? (
    <div className='flex flex-wrap gap-2 sm:justify-end'>
      {coaUrl ? <Button outline href={coaUrl} target='_blank' rel='noreferrer'>View COA</Button> : null}
      {canManageBatch ? <BatchEditDialogButton group={encodedGroup} metadata={batchMetadataValues} /> : null}
      {canCreateOrder ? <Button color='purple' href='/sales/create'>Create Order</Button> : null}
    </div>
  ) : null;

  return (
    <div>
      <HeaderCard
        title={batchMetadataValues.sku || 'No SKU'}
        badge={packageTestStatus}
        media={thcStat}
        actions={headerActions}
        className='mb-6'
        meta={[
          { label: 'Source Package', value: group.source_packages || 'unknown source', breakAll: true },
          ...packageDetails,
        ]}
      />

      <PackageTable
        group={encodedGroup}
        rows={packageRows}
        distributorOptions={distributorOptions}
        canManageConsignment={canManageConsignment}
      />
    </div>
  );
}

function packageStatus(packageData: PackageData): NonNullable<PackageData['package_status']> {
  return packageData.package_status ?? (packageData.active ? 'available' : 'inactive');
}

function formatLabStatus(value: string): string {
  return value
    .replaceAll('_', ' ')
    .replaceAll('-', ' ')
    .replace(/\b(RETEST|TEST)\s*(PASSED|FAILED)\b/gi, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim();
}

