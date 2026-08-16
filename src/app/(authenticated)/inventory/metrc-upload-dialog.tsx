"use client";

import * as Headless from "@headlessui/react";
import { X, RefreshCcwDotIcon } from "lucide-react";
import { useActionState, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Field, Input } from "@/components/ui/field";
import { uploadInventoryFormAction } from "./actions";

type InventoryUploadFormState = {
  error: string | null;
  success: boolean;
};

const initialState: InventoryUploadFormState = {
  error: null,
  success: false,
};

export function MetrcUploadDialog(): React.ReactElement {
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
      <Dialog size="lg" open={isOpen} onClose={setIsOpen} className="relative">
        <Headless.CloseButton
          className="absolute top-4 right-4 rounded-lg bg-zinc-100 text-zinc-500 hover:bg-zinc-200! p-2 cursor-pointer transition hover:bg-zinc-800 focus:outline-hidden focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-500 dark:bg-zinc-950/40 dark:hover:bg-zinc-950"
          aria-label="Close dialog"
        >
          <X className="size-4" aria-hidden="true" />
        </Headless.CloseButton>
        <DialogTitle className="pr-10">Inventory Sync</DialogTitle>
        <DialogDescription>Upload a METRC active-package .xlsx export to sync inventory.</DialogDescription>
        <DialogBody>
          <MetrcUploadForm key={formKey} onSuccess={() => setIsOpen(false)} />
        </DialogBody>
      </Dialog>
    </>
  );
}

function MetrcUploadForm({ onSuccess }: { onSuccess: () => void }): React.ReactElement {
  const [state, formAction, pending] = useActionState(uploadInventoryFormAction, initialState);

  useEffect(() => {
    if (state.success) {
      onSuccess();
    }
  }, [onSuccess, state.success]);

  return (
    <form action={formAction} className="space-y-4">
      {state.error ? <div className="rounded-lg bg-red-500/15 p-3 text-sm/6 font-medium text-red-700 ring-1 ring-red-500/20">{state.error}</div> : null}
      <Field label="Active Packages .xlsx">
        <Input name="file" type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" required disabled={pending} />
      </Field>
      <Button type="submit" color="purple" disabled={pending}>{pending ? "Syncing Inventory..." : "Sync Inventory"}</Button>
    </form>
  );
}
