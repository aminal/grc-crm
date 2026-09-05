import { notFound } from 'next/navigation';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { isFeatureEnabled } from '@/lib/auth/permissions';
import { requireSectionEnabled } from '@/lib/auth/session';
import { listDistributors } from '@/lib/data/distributors';
import { findInventoryBatchMetadata, groupInventory, listVisiblePackages } from '@/lib/data/inventory';
import { compactNumber, formatDate, formatInventoryCategory } from '@/lib/domain/format';
import type { PackageData } from '@/lib/domain/types';
import { BatchEditDialogButton } from './batch-edit-dialog';
import { PackageTable, type InventoryPackageRow } from './package-table';

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
    const packageLocation = firstPackage ? [firstPackage.location, firstPackage.sublocation].filter(Boolean).join(' / ') || 'No location' : 'No location';
    const packageTestStatus = group.lab_statuses.length > 0 ? (
        <>
            {group.lab_statuses.map((labStatus) => (
                <Badge key={labStatus} color='violet'>{formatLabStatus(labStatus)}</Badge>
            ))}
        </>
    ) : null;
    const availablePackageCount = group.packages.filter((packageRecord) => packageStatus(packageRecord.data) === 'available').length;
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
        { label: 'Total Units', value: `${compactNumber(group.total_quantity)}` },
        { label: 'Product Type', value: formatInventoryCategory(group.category) || '—' },
        { label: 'Expiration', value: formatDate(group.expiration_date ?? firstPackage?.expiration_date) },
        { label: 'PKGS Available', value: `${availablePackageCount} / ${group.package_count}` },
        ...(batchMetadataValues.batch_number ? [{ label: 'Batch Number', value: batchMetadataValues.batch_number }] : []),
        ...(batchMetadataValues.sku ? [{ label: 'SKU', value: batchMetadataValues.sku }] : []),
        ...(batchMetadataValues.thc_percentage ? [{ label: 'THC %', value: `${batchMetadataValues.thc_percentage}%` }] : []),
        ...(batchMetadataValues.cbd_percentage ? [{ label: 'CBD %', value: `${batchMetadataValues.cbd_percentage}%` }] : []),
        { label: 'COA', value: coaUrl ? <a href={coaUrl} target='_blank' rel='noreferrer' className='text-purple-500 hover:text-purple-400'>VIEW COA</a> : '—' },
        { label: 'Strain', value: packageStrain },
        { label: 'Location', value: packageLocation },
    ];
    const headerActions = canManageBatch || canCreateOrder ? (
        <>
            {canManageBatch ? <BatchEditDialogButton group={encodedGroup} metadata={batchMetadataValues} /> : null}
            {canCreateOrder ? <Button color='purple' href='/sales/create'>Create Order</Button> : null}
        </>
    ) : null;

    return (
        <div>
            <PageHeader
                title={group.item}
                actions={headerActions}
                description={'Source Package: ' + (group.source_packages || 'unknown source')}
            >
                <div className='flex flex-wrap items-center gap-2 text-base/6 font-medium text-zinc-500 sm:text-base/6 dark:text-zinc-400'>
                    {packageTestStatus}
                </div>
            </PageHeader>

            <Card className='mb-6'>
                <CardContent>
                    <div className='grid gap-4 xl:gap-x-14 grid-cols-2 xl:grid-cols-4'>
                        {packageDetails.map((detail) => (
                            <div key={detail.label}>
                                <p className='text-sm text-zinc-500 font-semibold uppercase'>{detail.label}</p>
                                <div className='mt-0.5 font-semibold text-zinc-950 dark:text-white'>{detail.value}</div>
                            </div>
                        ))}
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

