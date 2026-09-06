import { notFound } from 'next/navigation';
import { HeaderCard } from '@/components/layout/header-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { isFeatureEnabled } from '@/lib/auth/permissions';
import { requireSectionEnabled } from '@/lib/auth/session';
import { listDistributors } from '@/lib/data/distributors';
import { findInventoryBatchMetadata, groupInventory, listVisiblePackages } from '@/lib/data/inventory';
import { compactNumber, formatDate, formatInventoryCategory } from '@/lib/domain/format';
import type { PackageData } from '@/lib/domain/types';
import { cn } from '@/lib/utils';
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
  ) : <Badge color='zinc'>No lab status</Badge>;
  const availablePackages = group.packages.filter((packageRecord) => packageStatus(packageRecord.data) === 'available');
  const availablePackageCount = availablePackages.length;
  const availableUnitCount = availablePackages.reduce((total, packageRecord) => total + Number(packageRecord.data.quantity ?? 0), 0);
  const totalUnitCount = group.total_quantity;
  const remainingUnitPercent = totalUnitCount > 0 ? Math.min(100, Math.max(0, (availableUnitCount / totalUnitCount) * 100)) : 0;
  const thcPercentage = batchMetadataValues.thc_percentage ? `${batchMetadataValues.thc_percentage}%` : '—';
  const cbdPercentage = batchMetadataValues.cbd_percentage ? `${batchMetadataValues.cbd_percentage}%` : '—';
  const sourcePackage = group.source_packages || 'Unknown source';
  const batchIconLabel = (batchMetadataValues.sku || group.item || 'Batch').slice(0, 2).toUpperCase();
  const batchIcon = (
    <div className='flex size-14 items-center justify-center rounded-2xl bg-purple-500/10 text-lg font-semibold tracking-tight text-purple-700 ring-1 ring-purple-500/15 dark:bg-purple-400/10 dark:text-purple-200 dark:ring-purple-300/15'>
      {batchIconLabel}
    </div>
  );
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
  const operationalStats = [
    { label: 'THC', value: thcPercentage, accent: Boolean(batchMetadataValues.thc_percentage) },
    { label: 'CBD', value: cbdPercentage, accent: Boolean(batchMetadataValues.cbd_percentage) },
    { label: 'Expires', value: formatDate(group.expiration_date ?? firstPackage?.expiration_date) },
    { label: 'Available Packages', value: `${availablePackageCount} / ${group.package_count}` },
    { label: 'Product Type', value: formatInventoryCategory(group.category) || '—' },
    { label: 'Batch Number', value: batchMetadataValues.batch_number || '—' },
    { label: 'Strain', value: packageStrain, wide: true },
    { label: 'Source Package', value: sourcePackage, breakAll: true, wide: true },
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
        subtitle={<span className='font-semibold text-zinc-900 dark:text-white'>{group.item || 'Unknown item'}</span>}
        badge={packageTestStatus}
        media={batchIcon}
        actions={headerActions}
        className='mb-4'
      />

      <Card className='mb-6 overflow-hidden'>
        <CardContent className='p-0'>
          <div className='grid gap-0 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,2fr)]'>
            <section className='border-b border-zinc-950/5 bg-zinc-50/80 p-4 dark:border-white/10 dark:bg-white/[0.03] sm:p-5 lg:border-r lg:border-b-0'>
              <div className='flex items-start justify-between gap-4'>
                <div>
                  <p className='text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400'>Remaining Units</p>
                  <p className='mt-2 text-4xl/10 font-semibold tracking-tight text-zinc-950 dark:text-white'>
                    {compactNumber(availableUnitCount)}
                    <span className='ml-2 text-2xl/8 font-medium text-zinc-500 dark:text-zinc-400'>/ {compactNumber(totalUnitCount)}</span>
                  </p>
                </div>
                <Badge color={availableUnitCount > 0 ? 'emerald' : 'zinc'}>{availableUnitCount > 0 ? 'Available' : 'Unavailable'}</Badge>
              </div>
              <div className='mt-5'>
                <div
                  className='h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-white/10'
                  role='progressbar'
                  aria-label={`${compactNumber(availableUnitCount)} of ${compactNumber(totalUnitCount)} units remaining`}
                  aria-valuemin={0}
                  aria-valuemax={Math.max(totalUnitCount, availableUnitCount, 1)}
                  aria-valuenow={availableUnitCount}
                >
                  <div className='h-full rounded-full bg-purple-600 dark:bg-purple-400' style={{ width: `${remainingUnitPercent}%` }} />
                </div>
                <div className='mt-2 flex justify-between text-xs/5 font-medium text-zinc-500 dark:text-zinc-400'>
                  <span>{Math.round(remainingUnitPercent)}% remaining</span>
                  <span>Total units tracked</span>
                </div>
              </div>
            </section>

            <section className='grid grid-cols-2 gap-px bg-zinc-950/5 dark:bg-white/10 lg:grid-cols-4'>
              {operationalStats.map((stat) => (
                <OperationalStat key={stat.label} {...stat} />
              ))}
            </section>
          </div>
        </CardContent>
      </Card>

      <PackageTable
        group={encodedGroup}
        rows={packageRows}
        distributorOptions={distributorOptions}
        canManageConsignment={canManageConsignment}
      />
    </div>
  );
}

function OperationalStat({ label, value, accent = false, breakAll = false, wide = false }: {
  label: string;
  value: React.ReactNode;
  accent?: boolean;
  breakAll?: boolean;
  wide?: boolean;
}): React.ReactElement {
  return (
    <dl className={cn('bg-white p-4 dark:bg-zinc-950 sm:p-5', wide && 'col-span-2 lg:col-span-1')}>
      <dt className='text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400'>{label}</dt>
      <dd className={cn(
        'mt-2 text-lg/7 font-semibold text-zinc-950 dark:text-white',
        accent && 'text-purple-700 dark:text-purple-300',
        breakAll && 'break-all',
      )}>{value}</dd>
    </dl>
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

