'use client';

import { useState } from 'react';
import { StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { SearchableSelectOption } from '@/components/ui/searchable-select';
import { compactNumber } from '@/lib/domain/format';
import type { PackageData } from '@/lib/domain/types';
import { ConsignmentDialog, RemoveConsignmentDialog } from './consignment-dialog';

export type InventoryPackageRow = {
  id: string;
  item: string;
  package_tag: string;
  status: NonNullable<PackageData['package_status']>;
  quantity: number;
  unit_label: string;
  distributor_name: string;
};

type PackageTableProps = {
  group: string;
  rows: InventoryPackageRow[];
  distributorOptions: SearchableSelectOption[];
  canManageConsignment: boolean;
};

export function PackageTable({
  group,
  rows,
  distributorOptions,
  canManageConsignment
}: PackageTableProps): React.ReactElement {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [dialog, setDialog] = useState<'consign' | 'remove' | null>(null);
  const selected = rows.filter((row) => selectedIds.includes(row.id));
  const allSelected = rows.length > 0 && selected.length === rows.length;
  const consignedSelected = selected.filter((row) => row.distributor_name);
  const canShowConsignmentControls = canManageConsignment && distributorOptions.length > 0;

  function togglePackage(packageId: string, checked: boolean): void {
    setSelectedIds((current) => (checked ? [...new Set([...current, packageId])] : current.filter((id) => id !== packageId)));
  }

  function toggleAll(checked: boolean): void {
    setSelectedIds(checked ? rows.map((row) => row.id) : []);
  }

  function closeDialog(): void {
    setDialog(null);
  }

  function completeDialog(): void {
    setDialog(null);
    setSelectedIds([]);
  }

  return (
    <>
      {canShowConsignmentControls ? (
        <div className='mb-4 inline-flex flex-wrap items-center'>
          <div className='px-3 py-2 text-sm/6 font-semibold text-zinc-600 dark:text-zinc-300'>
            {selected.length} of {rows.length} selected
          </div>
          <div className='flex flex-wrap items-center gap-1 rounded-xl bg-zinc-100 p-1 dark:bg-zinc-950/40'>
          <div className='px-3 py-2 text-sm/6 font-semibold uppercase text-zinc-600 dark:text-zinc-300'>With Selected:</div>
          <Button type='button' plain className='!border-0 !px-3 !py-2 text-zinc-700 data-disabled:text-zinc-400 data-hover:bg-white/70 dark:text-zinc-200 dark:data-disabled:text-zinc-500 dark:data-hover:bg-white/10' disabled={selected.length === 0} onClick={() => setDialog('consign')}>
            Assign To Distributor
          </Button>
          <Button type='button' plain className='!border-0 !px-3 !py-2 text-zinc-700 data-disabled:text-zinc-400 data-hover:bg-white/70 dark:text-zinc-200 dark:data-disabled:text-zinc-500 dark:data-hover:bg-white/10' disabled={consignedSelected.length === 0} onClick={() => setDialog('remove')}>
            Return to Inventory
          </Button>
          </div>
        </div>
      ) : null}

      <Table>
        <TableHeader>
          <TableRow>
            {canShowConsignmentControls ? (
              <TableHead className='w-10'>
                <Checkbox
                  checked={allSelected}
                  onChange={(event) => toggleAll(event.target.checked)}
                  disabled={rows.length === 0}
                  aria-label='Select all packages'
                />
              </TableHead>
            ) : null}
            <TableHead>Item</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Distributor</TableHead>
            <TableHead className='text-right'>Quantity</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              {canShowConsignmentControls ? (
                <TableCell className='w-10'>
                  <Checkbox
                    checked={selectedIds.includes(row.id)}
                    onChange={(event) => togglePackage(row.id, event.target.checked)}
                    aria-label={`Select ${row.package_tag}`}
                  />
                </TableCell>
              ) : null}
              <TableCell>
                <div className='flex flex-col items-start gap-1 text-zinc-950 dark:text-white'>
                  <div className='font-medium uppercase  text-zinc-700 dark:text-zinc-100/85'>{row.package_tag}</div>
                </div>
              </TableCell>
              <TableCell><StatusBadge status={row.status} /></TableCell>
              <TableCell>{row.distributor_name || '—'}</TableCell>
              <TableCell className='text-right font-medium text-purple-400'>{compactNumber(row.quantity)} {row.unit_label}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {canShowConsignmentControls && dialog === 'consign' ? (
        <ConsignmentDialog
          group={group}
          packageIds={selected.map((row) => row.id)}
          distributorOptions={distributorOptions}
          onClose={closeDialog}
          onSuccess={completeDialog}
        />
      ) : null}
      {canShowConsignmentControls && dialog === 'remove' ? (
        <RemoveConsignmentDialog
          group={group}
          packageIds={consignedSelected.map((row) => row.id)}
          onClose={closeDialog}
          onSuccess={completeDialog}
        />
      ) : null}
    </>
  );
}
