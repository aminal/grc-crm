"use client";

import * as Headless from "@headlessui/react";
import { X, RefreshCcwDotIcon } from "lucide-react";
import { useActionState, useEffect, useMemo, useState } from "react";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogBody, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Field, Input } from "@/components/ui/field";
import { SearchableSelect, type SearchableSelectOption } from "@/components/ui/searchable-select";
import { compactNumber } from "@/lib/domain/format";
import type { SyncCandidatePackage } from "@/lib/metrc/sync-candidates";
import { analyzeInventoryUploadFormAction, finalizeInventorySyncFormAction, type InventorySyncState } from "./actions";

type MetrcSyncAnalysis = NonNullable<InventorySyncState["analysis"]>;

const initialState: InventorySyncState = {
  error: null,
  analysis: null,
  completed: false,
};

export function MetrcUploadDialog({ distributorOptions }: { distributorOptions: SearchableSelectOption[] }): React.ReactElement {
  const [isOpen, setIsOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);

  function openDialog(): void {
    setFormKey((key) => key + 1);
    setIsOpen(true);
  }

  return (
    <>
      <Button type="button" color="purple" onClick={openDialog}>
        <RefreshCcwDotIcon data-slot="icon" aria-hidden="true" />
        Sync Inventory
      </Button>
      <Dialog size="2xl" open={isOpen} onClose={setIsOpen} className="relative">
        <Headless.CloseButton
          className="absolute top-4 right-4 rounded-lg bg-zinc-100 text-zinc-500 hover:bg-zinc-200! p-2 cursor-pointer transition hover:bg-zinc-800 focus:outline-hidden focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-500 dark:bg-zinc-950/40 dark:hover:bg-zinc-950"
          aria-label="Close dialog"
        >
          <X className="size-4" aria-hidden="true" />
        </Headless.CloseButton>
        <MetrcSyncFlow key={formKey} distributorOptions={distributorOptions} onDone={() => setIsOpen(false)} />
      </Dialog>
    </>
  );
}

function MetrcSyncFlow({ distributorOptions, onDone }: { distributorOptions: SearchableSelectOption[]; onDone: () => void }): React.ReactElement {
  const [state, formAction, pending] = useActionState(analyzeInventoryUploadFormAction, initialState);

  useEffect(() => {
    if (state.completed) {
      onDone();
    }
  }, [onDone, state.completed]);

  if (state.analysis) {
    return <MetrcSyncReview analysis={state.analysis} distributorOptions={distributorOptions} onDone={onDone} />;
  }

  return (
    <>
      <DialogTitle className="pr-10">Inventory Sync</DialogTitle>
      <DialogDescription>Upload a METRC active-package .xlsx export to sync inventory.</DialogDescription>
      <DialogBody>
        <form action={formAction} className="space-y-4">
          {state.error ? <div className="rounded-lg bg-red-500/15 p-3 text-sm/6 font-medium text-red-700 ring-1 ring-red-500/20">{state.error}</div> : null}
          <Field label="Active Packages .xlsx">
            <Input name="file" type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" required disabled={pending} />
          </Field>
          <Button type="submit" color="purple" disabled={pending}>{pending ? "Syncing Inventory..." : "Sync Inventory"}</Button>
        </form>
      </DialogBody>
    </>
  );
}

function MetrcSyncReview({ analysis, distributorOptions, onDone }: { analysis: MetrcSyncAnalysis; distributorOptions: SearchableSelectOption[]; onDone: () => void }): React.ReactElement {
  const [state, formAction, pending] = useActionState(finalizeInventorySyncFormAction, { ...initialState, analysis });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const eligiblePackages = useMemo(() => analysis.stale_packages.filter((candidate) => candidate.eligible_for_consignment), [analysis.stale_packages]);
  const ineligiblePackages = useMemo(() => analysis.stale_packages.filter((candidate) => !candidate.eligible_for_consignment), [analysis.stale_packages]);
  const selectedCount = selectedIds.length;
  const deactivateCount = analysis.stale_packages.length - selectedCount;

  useEffect(() => {
    if (state.completed) {
      onDone();
    }
  }, [onDone, state.completed]);

  function togglePackage(packageId: string, checked: boolean): void {
    setSelectedIds((current) => (checked ? [...new Set([...current, packageId])] : current.filter((id) => id !== packageId)));
  }

  return (
    <>
      <DialogTitle className="pr-10">Review Missing Packages</DialogTitle>
      <DialogDescription>
        Synced {compactNumber(analysis.total_parsed)} package{analysis.total_parsed === 1 ? "" : "s"} ({compactNumber(analysis.created)} new, {compactNumber(analysis.updated)} updated).
        {analysis.consignment_cleared > 0 ? ` Cleared consignment on ${compactNumber(analysis.consignment_cleared)} returned package${analysis.consignment_cleared === 1 ? "" : "s"}.` : ""}
        {" "}
        {compactNumber(analysis.stale_packages.length)} active package{analysis.stale_packages.length === 1 ? " was" : "s were"} missing from this export. Check any package that left on consignment; everything else will be deactivated.
      </DialogDescription>
      <DialogBody>
        <form action={formAction} className="space-y-5">
          {state.error ? <div className="rounded-lg bg-red-500/15 p-3 text-sm/6 font-medium text-red-700 ring-1 ring-red-500/20">{state.error}</div> : null}
          <input type="hidden" name="sync_id" value={analysis.sync_id} />

          {eligiblePackages.length > 0 ? (
            <div className="space-y-2">
              <div className="text-sm/6 font-semibold text-zinc-950 dark:text-white">Consignment candidates</div>
              <ul className="max-h-72 divide-y divide-zinc-950/5 overflow-y-auto rounded-lg ring-1 ring-zinc-950/10 dark:divide-white/10 dark:ring-white/10">
                {eligiblePackages.map((candidate) => (
                  <li key={candidate.id} className="flex items-start gap-3 p-3">
                    <Checkbox
                      name="package_ids"
                      value={candidate.id}
                      checked={selectedIds.includes(candidate.id)}
                      onChange={(event) => togglePackage(candidate.id, event.target.checked)}
                      disabled={pending}
                      className="mt-1"
                      aria-label={`Mark ${candidate.package_tag} as consignment`}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-zinc-950 dark:text-white">{candidate.item || candidate.package_tag}</div>
                      <div className="text-sm/5 text-zinc-500 dark:text-zinc-400">{candidateSummary(candidate)}</div>
                    </div>
                    <StatusBadge status={candidate.package_status} />
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {ineligiblePackages.length > 0 ? (
            <div className="space-y-2">
              <div className="text-sm/6 font-semibold text-zinc-950 dark:text-white">Will be deactivated</div>
              <ul className="max-h-48 divide-y divide-zinc-950/5 overflow-y-auto rounded-lg ring-1 ring-zinc-950/10 dark:divide-white/10 dark:ring-white/10">
                {ineligiblePackages.map((candidate) => (
                  <li key={candidate.id} className="flex items-start gap-3 p-3">
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-zinc-950 dark:text-white">{candidate.item || candidate.package_tag}</div>
                      <div className="text-sm/5 text-zinc-500 dark:text-zinc-400">{candidateSummary(candidate)}</div>
                    </div>
                    <StatusBadge status={candidate.package_status} />
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="space-y-1.5">
            <Field label="Distributor company">
              <SearchableSelect
                name="distributor_id"
                options={distributorOptions}
                placeholder="Search distributor companies"
                emptyMessage="No active distributor companies found."
                required={selectedCount > 0}
                disabled={pending || selectedCount === 0}
              />
            </Field>
            <p className="text-sm/5 text-zinc-500 dark:text-zinc-400">
              {selectedCount > 0 ? "Applies to every checked package." : "Check at least one package to assign a distributor company."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" color="purple" disabled={pending}>
              {pending ? "Applying..." : `Consign ${compactNumber(selectedCount)}, Deactivate ${compactNumber(deactivateCount)}`}
            </Button>
            <Button type="button" plain onClick={onDone} disabled={pending}>Cancel</Button>
          </div>
          <p className="text-sm/5 text-zinc-500 dark:text-zinc-400">Cancelling leaves every missing package active and unchanged.</p>
        </form>
      </DialogBody>
    </>
  );
}

function candidateSummary(candidate: SyncCandidatePackage): string {
  return [candidate.package_tag, candidate.strain, `${compactNumber(candidate.quantity)} ${candidate.unit_of_measure || "ea"}`].filter(Boolean).join(" · ");
}
