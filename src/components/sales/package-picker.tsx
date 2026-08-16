'use client';

import { Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogActions, DialogBody, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Field, Input } from '@/components/ui/field';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { compactNumber, formatDate, formatMoney } from '@/lib/domain/format';
import { cn } from '@/lib/utils';

export type PackagePickerPackage = {
    package_tag: string;
    item: string;
    strain: string;
    category: string;
    source_packages: string;
    quantity: number;
    unit_of_measure: string;
    expiration_date: string | null;
    unit_base_price_cents: number;
};

type PackagePickerProps = {
    packages: PackagePickerPackage[];
    initialPrices?: Record<string, string>;
    initialSelectedTags?: string[];
    maxVisible?: number;
    title?: string;
};

export function PackagePicker({
    packages,
    initialPrices = {},
    initialSelectedTags = [],
    maxVisible,
    title
}: PackagePickerProps): React.ReactElement {
    const [query, setQuery] = useState('');
    const [selectedTags, setSelectedTags] = useState<Set<string>>(() => new Set(initialSelectedTags));
    const [prices, setPrices] = useState<Record<string, string>>(initialPrices);
    const [dialogOpen, setDialogOpen] = useState(false);
    const normalizedQuery = query.trim().toLowerCase();
    const filteredPackages = useMemo(() => {
        const rows = normalizedQuery
            ? packages.filter((packageRecord) => [packageRecord.item, packageRecord.strain, packageRecord.package_tag, packageRecord.category, packageRecord.source_packages].join(' ').toLowerCase().includes(normalizedQuery))
            : packages;

        return maxVisible ? rows.slice(0, maxVisible) : rows;
    }, [maxVisible, normalizedQuery, packages]);
    const selectedPackages = useMemo(() => packages.filter((packageRecord) => selectedTags.has(packageRecord.package_tag)), [packages, selectedTags]);
    const subtotalCents = selectedPackages.reduce((total, packageRecord) => total + moneyToCents(prices[packageRecord.package_tag]), 0);
    const taxCents = 0;
    const totalCents = subtotalCents + taxCents;

    function sourceUnitCents(sourcePackages: string): number {
        if (!sourcePackages) {
            return 0;
        }

        for (const packageRecord of packages) {
            if (packageRecord.source_packages === sourcePackages && selectedTags.has(packageRecord.package_tag)) {
                const quantity = Number(packageRecord.quantity ?? 0);
                const priceCents = moneyToCents(prices[packageRecord.package_tag]);
                if (quantity > 0 && priceCents > 0) {
                    return Math.round(priceCents / quantity);
                }
            }
        }

        return 0;
    }

    function derivedPackageCents(packageRecord: PackagePickerPackage): number {
        const quantity = Number(packageRecord.quantity ?? 0);
        if (quantity <= 0) {
            return 0;
        }

        const sourceUnit = sourceUnitCents(packageRecord.source_packages);
        if (sourceUnit > 0) {
            return sourceUnit * quantity;
        }

        const productUnitCents = Number(packageRecord.unit_base_price_cents ?? 0);
        return productUnitCents > 0 ? productUnitCents * quantity : 0;
    }

    function togglePackage(packageRecord: PackagePickerPackage, checked: boolean): void {
        setSelectedTags((current) => {
            const next = new Set(current);
            if (checked) {
                next.add(packageRecord.package_tag);
            } else {
                next.delete(packageRecord.package_tag);
            }
            return next;
        });

        if (checked && !prices[packageRecord.package_tag]) {
            const priceCents = derivedPackageCents(packageRecord);
            if (priceCents > 0) {
                setPrices((current) => ({ ...current, [packageRecord.package_tag]: centsToInputValue(priceCents) }));
            }
        }
    }

    function updatePrice(packageRecord: PackagePickerPackage, value: string): void {
        setPrices((current) => {
            const next = { ...current, [packageRecord.package_tag]: value };
            const quantity = Number(packageRecord.quantity ?? 0);
            const editedCents = moneyToCents(value);
            if (packageRecord.source_packages && quantity > 0 && editedCents > 0 && selectedTags.has(packageRecord.package_tag)) {
                const impliedUnitCents = Math.round(editedCents / quantity);
                for (const row of packages) {
                    if (row.source_packages === packageRecord.source_packages && selectedTags.has(row.package_tag) && row.package_tag !== packageRecord.package_tag) {
                        const siblingQuantity = Number(row.quantity ?? 0);
                        if (siblingQuantity > 0) {
                            next[row.package_tag] = centsToInputValue(impliedUnitCents * siblingQuantity);
                        }
                    }
                }
            }
            return next;
        });
    }

    function removePackage(packageRecord: PackagePickerPackage): void {
        togglePackage(packageRecord, false);
    }

    function unitPriceLabel(packageRecord: PackagePickerPackage): string {
        const unitCents = Number(packageRecord.unit_base_price_cents ?? 0);
        if (unitCents <= 0) {
            return 'Price per unit: —';
        }

        const unitLabel = packageRecord.unit_of_measure ? ` / ${packageRecord.unit_of_measure}` : '';
        return `Price per unit: ${formatMoney(unitCents)}${unitLabel}`;
    }

    const addPackagesButton = <Button type='button' color='emerald' onClick={() => setDialogOpen(true)}>+ Add
        Packages</Button>;
    const packageContent = (
        <>
            {selectedPackages.map((packageRecord) => (
                <input key={packageRecord.package_tag} type='hidden' name='package_tags' value={packageRecord.package_tag} />
            ))}

            {selectedPackages.length > 0 ? (
                <div className='space-y-4'>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Package</TableHead>
                                <TableHead>Quantity</TableHead>
                                <TableHead>Source</TableHead>
                                <TableHead className='text-right'>Price</TableHead>
                                <TableHead className='text-right'>Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {selectedPackages.map((packageRecord) => (
                                <TableRow key={packageRecord.package_tag}>
                                    <TableCell>
                                        <p className='font-semibold text-zinc-950 dark:text-white'>{packageRecord.item || 'Unknown Item'}</p>
                                        <p className='font-mono text-xs text-zinc-600 dark:text-zinc-400'>{packageRecord.package_tag}</p>
                                        <p className='mt-1 text-xs text-zinc-500'>{packageRecord.strain || 'No strain'} ·
                                            Expires {formatDate(packageRecord.expiration_date)}</p>
                                    </TableCell>
                                    <TableCell>{compactNumber(packageRecord.quantity)} {packageRecord.unit_of_measure}</TableCell>
                                    <TableCell className='max-w-xs whitespace-normal text-xs'>{packageRecord.source_packages || 'No source package'}</TableCell>
                                    <TableCell className='min-w-36 text-right'>
                                        <Input name={`package_prices[${packageRecord.package_tag}]`} inputMode='decimal' placeholder='0.00' value={prices[packageRecord.package_tag] ?? ''} onChange={(event) => updatePrice(packageRecord, event.target.value)} required />
                                    </TableCell>
                                    <TableCell className='text-right'>
                                        <Button type='button' plain className='px-2! py-1! *:data-[slot=icon]:size-4!' onClick={() => removePackage(packageRecord)} aria-label={`Remove ${packageRecord.item || packageRecord.package_tag}`}>
                                            <Trash2 data-slot='icon' aria-hidden='true' />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>

                    <div className='ml-auto w-full max-w-xs space-y-2 text-sm'>
                        <InvoiceTotalRow label='Subtotal' value={formatMoney(subtotalCents)} />
                        <InvoiceTotalRow label='Tax' value={formatMoney(taxCents)} />
                        <div className='border-t border-zinc-950/10 pt-2 dark:border-white/10'>
                            <InvoiceTotalRow label='Total' value={formatMoney(totalCents)} strong />
                        </div>
                    </div>
                </div>
            ) : (
                <p className='rounded-lg p-8 text-center uppercase font-semibold text-sm text-zinc-600 dark:text-zinc-400'>
                    No packages added yet
                </p>
            )}
        </>
    );
    const packageDialog = (
        <Dialog size='5xl' open={dialogOpen} onClose={() => setDialogOpen(false)}>
            <DialogTitle>Add Packages</DialogTitle>
            <DialogDescription>Search available METRC packages and choose the packages to include on this
                order.</DialogDescription>
            <DialogBody>
                <div className='space-y-4'>
                    <div className='grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end'>
                        <Field label='Search packages'>
                            <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder='Item, strain, tag, category, source package' />
                        </Field>
                        <p className='rounded-lg border border-zinc-950/10 bg-zinc-50 px-3 py-2 text-sm text-zinc-700 dark:border-white/10 dark:bg-zinc-950/40 dark:text-zinc-300'>{selectedTags.size} selected</p>
                    </div>

                    <div className='max-h-[60vh] space-y-3 overflow-y-auto pr-1'>
                        {filteredPackages.map((packageRecord) => {
                            const selected = selectedTags.has(packageRecord.package_tag);
                            return (
                                <div key={packageRecord.package_tag} className={`cursor-pointer rounded-lg p-4 transition-colors ${selected ? 'bg-purple-500 text-zinc-800 dark:bg-purple-500/50' : 'bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-800 dark:hover:bg-zinc-700/70'}`} onClick={() => togglePackage(packageRecord, !selected)}>
                                    <div className='flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between'>
                                        <div className='flex gap-3'>
                                            <Checkbox checked={selected} onClick={(event) => event.stopPropagation()} onChange={(event) => togglePackage(packageRecord, event.target.checked)} className='mt-1' />
                                            <div>
                                                <div className='flex font-semibold gap-2 text-zinc-950 dark:text-white'>
                                                    <div>{packageRecord.item || 'Unknown Item'}</div>
                                                    <div> ·</div>
                                                    <div className='uppercase font-semibold'>{compactNumber(packageRecord.quantity)} Units</div>
                                                </div>

                                                <div className='grid sm:grid-cols-2 space-x-8 space-y-2 mt-1.5'>
                                                    <div>
                                                        <div className={cn(
                                                            'text-sm font-semibold uppercase',
                                                            selected ? 'text-zinc-50 dark:text-black/50' : 'text-zinc-500 dark:text-black/50',
                                                        )}>Pacakge ID
                                                        </div>
                                                        <div className={cn(
                                                            'text-sm font-semibold',
                                                            selected ? 'text-purple-900 dark:text-purple-400' : 'text-zinc-700 dark:text-white/20',
                                                        )}>{packageRecord.package_tag}</div>
                                                    </div>
                                                    <div>
                                                        <div className={cn(
                                                            'text-sm font-semibold uppercase',
                                                            selected ? 'text-zinc-50 dark:text-black/50' : 'text-zinc-500 dark:text-black/50',
                                                        )}>Strain
                                                        </div>
                                                        <div className={cn(
                                                            'text-sm font-semibold',
                                                            selected ? 'text-purple-900 dark:text-purple-400' : 'text-zinc-700 dark:text-white/20',
                                                        )}>{packageRecord.strain || 'No strain'}</div>
                                                    </div>
                                                    <div>
                                                        <div className={cn(
                                                            'text-sm font-semibold uppercase',
                                                            selected ? 'text-zinc-50 dark:text-black/50' : 'text-zinc-500 dark:text-black/50',
                                                        )}>Source ID
                                                        </div>
                                                        <div className={cn(
                                                            'text-sm font-semibold',
                                                            selected ? 'text-purple-900 dark:text-purple-400' : 'text-zinc-700 dark:text-white/20',
                                                        )}>{packageRecord.source_packages || 'No source package'}</div>
                                                    </div>
                                                    <div>
                                                        <div className={cn(
                                                            'text-sm font-semibold uppercase',
                                                            selected ? 'text-zinc-50 dark:text-black/50' : 'text-zinc-500 dark:text-black/50',
                                                        )}>Expires
                                                        </div>
                                                        <div className={cn(
                                                            'text-sm font-semibold',
                                                            selected ? 'text-purple-900 dark:text-purple-400' : 'text-zinc-700 dark:text-white/20',
                                                        )}>{formatDate(packageRecord.expiration_date)}</div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className='w-full max-w-xs' onClick={(event) => event.stopPropagation()}>
                                            <Field label='Package price' className='dark:text-black/55! font-semibold!'>
                                                <Input inputMode='decimal' placeholder='0.00' value={prices[packageRecord.package_tag] ?? ''} onChange={(event) => updatePrice(packageRecord, event.target.value)} disabled={!selected} required={selected} />
                                                <p className={cn(
                                                    'mt-1.5 text-xs text-zinc-500 dark:text-purple-300/80 uppercase',
                                                    selected ? 'text-purple-300' : 'text-zinc-500 dark:text-zinc-400'
                                                )}>{unitPriceLabel(packageRecord)}</p>
                                            </Field>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        {filteredPackages.length === 0 ?
                            <p className='rounded-lg border border-dashed border-zinc-950/10 p-8 text-center text-sm text-zinc-600 dark:border-white/10 dark:text-zinc-400'>No
                                available packages matched your search.</p> : null}
                    </div>
                </div>
            </DialogBody>
            <DialogActions>
                <Button type='button' color='emerald' onClick={() => setDialogOpen(false)}>Done</Button>
            </DialogActions>
        </Dialog>
    );

    if (title) {
        return (
            <>
                <CardHeader className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
                    <CardTitle>{title}</CardTitle>
                    {addPackagesButton}
                </CardHeader>
                <CardContent className='space-y-4'>
                    {packageContent}
                </CardContent>
                {packageDialog}
            </>
        );
    }

    return (
        <div className='space-y-4'>
            {addPackagesButton}
            {packageContent}
            {packageDialog}
        </div>
    );
}

function moneyToCents(value: string | undefined): number {
    const clean = String(value ?? '').replace(/[^0-9.-]/g, '');
    if (!clean) {
        return 0;
    }

    const amount = Number(clean);
    return Number.isFinite(amount) ? Math.round(amount * 100) : 0;
}

function centsToInputValue(cents: number): string {
    return (cents / 100).toFixed(2);
}

function InvoiceTotalRow({ label, value, strong = false }: {
    label: string;
    value: string;
    strong?: boolean
}): React.ReactElement {
    return (
        <div className='flex items-center justify-between gap-6 text-zinc-700 dark:text-zinc-300'>
            <span className={strong ? 'font-semibold text-zinc-950 dark:text-white' : undefined}>{label}</span>
            <span className={strong ? 'text-lg font-semibold text-zinc-950 dark:text-white' : 'font-medium'}>{value}</span>
        </div>
    );
}
