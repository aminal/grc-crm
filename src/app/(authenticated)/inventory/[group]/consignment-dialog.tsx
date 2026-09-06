"use client";

import * as Headless from "@headlessui/react";
import { X } from "lucide-react";
import { useActionState, useEffect, useId } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogActions, DialogBody, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Field, Textarea } from "@/components/ui/field";
import { SearchableSelect, type SearchableSelectOption } from "@/components/ui/searchable-select";
import { clearPackagesConsignmentFormAction, consignPackagesFormAction, type PackageConsignmentState } from "./actions";

type ConsignmentDialogProps = {
  group: string;
  packageIds: string[];
  distributorOptions: SearchableSelectOption[];
  onClose: () => void;
  onSuccess: () => void;
};

type RemoveConsignmentDialogProps = Omit<ConsignmentDialogProps, "distributorOptions">;

const initialState: PackageConsignmentState = {
  error: null,
  success: false,
};

function packageLabel(count: number): string {
  return `${count} package${count === 1 ? "" : "s"}`;
}

function PackageIdInputs({ packageIds }: { packageIds: string[] }): React.ReactElement {
  return (
    <>
      {packageIds.map((packageId) => (
        <input key={packageId} type="hidden" name="package_ids" value={packageId} />
      ))}
    </>
  );
}

function CloseButton({ onClose }: { onClose: () => void }): React.ReactElement {
  return (
    <Headless.CloseButton
      className="absolute top-4 right-4 rounded-lg bg-zinc-100 text-zinc-500 hover:bg-zinc-200! p-2 cursor-pointer transition hover:bg-zinc-800 focus:outline-hidden focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-500 dark:bg-zinc-950/40 dark:hover:bg-zinc-950"
      aria-label="Close dialog"
      onClick={onClose}
    >
      <X className="size-4" aria-hidden="true" />
    </Headless.CloseButton>
  );
}

export function ConsignmentDialog({ group, packageIds, distributorOptions, onClose, onSuccess }: ConsignmentDialogProps): React.ReactElement {
  const formId = useId();
  const [state, formAction, pending] = useActionState(consignPackagesFormAction.bind(null, group), initialState);

  useEffect(() => {
    if (state.success) {
      onSuccess();
    }
  }, [onSuccess, state.success]);

  return (
    <Dialog size="xl" open onClose={onClose} className="relative">
      <CloseButton onClose={onClose} />
      <DialogTitle className="pr-10">Mark as Consignment</DialogTitle>
      <DialogDescription>
        {packageLabel(packageIds.length)} selected. Consigned packages stay active and sellable, and are not deactivated by future METRC syncs.
      </DialogDescription>
      <DialogBody>
        {state.error ? <div className="mb-4 rounded-lg bg-red-500/15 p-3 text-sm/6 font-medium text-red-700 ring-1 ring-red-500/20">{state.error}</div> : null}
        <form id={formId} action={formAction} className="space-y-4">
          <PackageIdInputs packageIds={packageIds} />
          <Field label="Distributor company">
            <SearchableSelect
              name="distributor_id"
              options={distributorOptions}
              placeholder="Search distributor companies"
              emptyMessage="No active distributor companies found."
              required
              disabled={pending}
            />
          </Field>
          <Field label="Notes">
            <Textarea name="notes" rows={3} disabled={pending} />
          </Field>
        </form>
        <DialogActions>
          <Button type="button" plain onClick={onClose} disabled={pending}>Cancel</Button>
          <Button type="submit" form={formId} color="purple" disabled={pending}>
            {pending ? "Saving..." : `Mark ${packageLabel(packageIds.length)}`}
          </Button>
        </DialogActions>
      </DialogBody>
    </Dialog>
  );
}

export function RemoveConsignmentDialog({ group, packageIds, onClose, onSuccess }: RemoveConsignmentDialogProps): React.ReactElement {
  const formId = useId();
  const [state, formAction, pending] = useActionState(clearPackagesConsignmentFormAction.bind(null, group), initialState);

  useEffect(() => {
    if (state.success) {
      onSuccess();
    }
  }, [onSuccess, state.success]);

  return (
    <Dialog size="lg" open onClose={onClose} className="relative">
      <CloseButton onClose={onClose} />
      <DialogTitle className="pr-10">Return to Inventory</DialogTitle>
      <DialogDescription>
        Remove the consignment designation from {packageLabel(packageIds.length)}. They stay active and will appear as deactivation candidates on the next METRC sync.
      </DialogDescription>
      <DialogBody>
        {state.error ? <div className="mb-4 rounded-lg bg-red-500/15 p-3 text-sm/6 font-medium text-red-700 ring-1 ring-red-500/20">{state.error}</div> : null}
        <form id={formId} action={formAction}>
          <PackageIdInputs packageIds={packageIds} />
        </form>
        <DialogActions>
          <Button type="button" plain onClick={onClose} disabled={pending}>Cancel</Button>
          <Button type="submit" form={formId} color="red" disabled={pending}>
            {pending ? "Removing..." : "Remove Consignment"}
          </Button>
        </DialogActions>
      </DialogBody>
    </Dialog>
  );
}
