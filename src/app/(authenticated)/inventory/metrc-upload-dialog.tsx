"use client";

import * as Headless from "@headlessui/react";
import { Upload, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Field, Input } from "@/components/ui/field";
import { uploadInventoryAction } from "./actions";

export function MetrcUploadDialog(): React.ReactElement {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button type="button" onClick={() => setIsOpen(true)}>
        <Upload data-slot="icon" aria-hidden="true" />
        METRC Upload
      </Button>
      <Dialog size="lg" open={isOpen} onClose={setIsOpen} className="relative">
        <Headless.CloseButton
          className="absolute top-4 right-4 rounded-lg bg-zinc-950 p-2 cursor-pointer text-white transition hover:bg-zinc-800 focus:outline-hidden focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-500 dark:bg-zinc-950/40 dark:hover:bg-zinc-950"
          aria-label="Close dialog"
        >
          <X className="size-4" aria-hidden="true" />
        </Headless.CloseButton>
        <DialogTitle className="pr-10">METRC Upload</DialogTitle>
        <DialogDescription>Upload a METRC active-package .xlsx export to sync inventory.</DialogDescription>
        <DialogBody>
          <form action={uploadInventoryAction} className="space-y-4">
            <Field label="Active Packages .xlsx">
              <Input name="file" type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" required />
            </Field>
            <Button>Sync Inventory</Button>
          </form>
        </DialogBody>
      </Dialog>
    </>
  );
}
