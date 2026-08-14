import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Badge, StatusBadge } from '@/components/ui/badge';
import { buttonClasses } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { groupInventory, listPackages } from '@/lib/data/inventory';
import { compactNumber, formatDate, formatInventoryCategory } from '@/lib/domain/format';
import type { PackageData } from '@/lib/domain/types';

export default async function InventoryGroupPage({ params }: {
    params: Promise<{ group: string }>
}): Promise<React.ReactElement> {
    const { group: encodedGroup } = await params;
    const key = decodeURIComponent(encodedGroup);
    const packages = await listPackages(false);
    const group = groupInventory(packages).find((row) => row.key === key);
    if (!group) {
        notFound();
    }
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
    const packageDetails = [
        { label: 'Total Units', value: `${compactNumber(group.total_quantity)}` },
        { label: 'Product Type', value: formatInventoryCategory(group.category) || '—' },
        { label: 'Expiration', value: formatDate(group.expiration_date ?? firstPackage?.expiration_date) },
        { label: 'PKGS Available', value: `${availablePackageCount} / ${group.package_count}` },
        { label: 'Strain', value: packageStrain },
        { label: 'Location', value: packageLocation },
    ];

    return (
        <div>
            <PageHeader title={group.item} actions={
                <Link href='/sales/create' className={buttonClasses()}>Create Order</Link>}>
                <div className='flex flex-wrap items-center gap-2 text-base/6 font-medium text-zinc-500 sm:text-base/6 dark:text-zinc-400'>
                    {packageTestStatus}
                    <span>{'Source Package: ' + (group.source_packages || 'unknown source')}</span>
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

            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Item</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className='text-right'>Quantity</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {group.packages.map((packageRecord) => {
                        const status = packageStatus(packageRecord.data);
                        const packageTag = packageRecord.data.package_tag || 'Unknown package';
                        const unitLabel = packageRecord.data.unit_of_measure === 'ea' ? 'Units' : packageRecord.data.unit_of_measure || 'Qty';

                        return (
                            <TableRow key={packageRecord.id}>
                                <TableCell>
                                    <div className='flex flex-col items-start gap-1 text-zinc-950 dark:text-white'>
                                        <div className='font-semibold text-lg'>{packageRecord.data.item || group.item || 'Unknown item'}</div>
                                        <div className='font-medium uppercase text-zinc-700 dark:text-zinc-400/85'>{packageTag}</div>
                                    </div>
                                </TableCell>
                                <TableCell><StatusBadge status={status} /></TableCell>
                                <TableCell className='text-right font-medium text-purple-400'>{compactNumber(packageRecord.data.quantity)} {unitLabel}</TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
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

