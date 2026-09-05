"use client";

import * as Headless from "@headlessui/react";
import { X } from "lucide-react";
import { useActionState, useEffect, useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogActions, DialogBody, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Field, Input } from "@/components/ui/field";
import type { InventoryBatchMetadataData } from "@/lib/domain/types";
import { updateBatchMetadataFormAction, type BatchMetadataState } from "./actions";

type BatchEditDialogValues = Pick<
  InventoryBatchMetadataData,
  "batch_number" | "sku" | "thc_percentage" | "cbd_percentage" | "coa_url"
>;

type BatchEditDialogProps = {
  group: string;
  metadata: BatchEditDialogValues;
};

const initialState: BatchMetadataState = {
  error: null,
  success: false,
};

export function BatchEditDialogButton({ group, metadata }: BatchEditDialogProps): React.ReactElement {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button type="button" color='emerald' onClick={() => setOpen(true)}>Edit Batch</Button>
      {open ? <BatchEditDialog group={group} metadata={metadata} onClose={() => setOpen(false)} /> : null}
    </>
  );
}

function BatchEditDialog({ group, metadata, onClose }: BatchEditDialogProps & { onClose: () => void }): React.ReactElement {
  const formId = useId();
  const [state, formAction, pending] = useActionState(updateBatchMetadataFormAction.bind(null, group), initialState);

  useEffect(() => {
    if (state.success) {
      onClose();
    }
  }, [onClose, state.success]);

  return (
    <Dialog size="xl" open onClose={onClose} className="relative">
      <Headless.CloseButton
        className="absolute top-4 right-4 rounded-lg bg-zinc-100 text-zinc-500 hover:bg-zinc-200! p-2 cursor-pointer transition hover:bg-zinc-800 focus:outline-hidden focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-500 dark:bg-zinc-950/40 dark:hover:bg-zinc-950"
        aria-label="Close dialog"
        onClick={onClose}
      >
        <X className="size-4" aria-hidden="true" />
      </Headless.CloseButton>
      <DialogTitle className="pr-10">Edit Batch</DialogTitle>
      <DialogDescription>Store non-METRC batch details for this inventory group.</DialogDescription>
      <DialogBody>
        {state.error ? <div className="mb-4 rounded-lg bg-red-500/15 p-3 text-sm/6 font-medium text-red-700 ring-1 ring-red-500/20">{state.error}</div> : null}
        <form id={formId} action={formAction} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Batch Number">
              <Input
                type="text"
                name="batch_number"
                defaultValue={metadata.batch_number}
                disabled={pending}
                autoFocus
              />
            </Field>
            <Field label="SKU">
              <Input
                type="text"
                name="sku"
                defaultValue={metadata.sku}
                disabled={pending}
              />
            </Field>
            <Field label="THC %">
              <Input
                type="number"
                name="thc_percentage"
                defaultValue={metadata.thc_percentage}
                placeholder="0.00"
                min="0"
                max="100"
                step="0.01"
                inputMode="decimal"
                disabled={pending}
              />
            </Field>
            <Field label="CBD %">
              <Input
                type="number"
                name="cbd_percentage"
                defaultValue={metadata.cbd_percentage}
                placeholder="0.00"
                min="0"
                max="100"
                step="0.01"
                inputMode="decimal"
                disabled={pending}
              />
            </Field>
          </div>
          <Field label="COA URL">
            <Input
              type="url"
              name="coa_url"
              defaultValue={metadata.coa_url}
              placeholder="https://"
              autoComplete="url"
              disabled={pending}
            />
          </Field>
        </form>
        <DialogActions>
          <Button type="button" plain onClick={onClose} disabled={pending}>Cancel</Button>
          <Button type="submit" form={formId} color="purple" disabled={pending}>{pending ? "Saving..." : "Save Batch"}</Button>
        </DialogActions>
      </DialogBody>
    </Dialog>
  );
}
