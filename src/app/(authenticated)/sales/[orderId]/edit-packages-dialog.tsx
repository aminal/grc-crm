"use client";

import * as Headless from "@headlessui/react";
import { X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogBody, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { PackagePicker, type PackagePickerPackage } from "@/components/sales/package-picker";
import { updatePackagesAction } from "../actions";

type EditPackagesDialogProps = {
  orderId: string;
  packages: PackagePickerPackage[];
  initialSelectedTags: string[];
  initialPackagePrices: Record<string, string>;
};

export function EditPackagesDialog({ orderId, packages, initialSelectedTags, initialPackagePrices }: EditPackagesDialogProps): React.ReactElement {
  const [isOpen, setIsOpen] = useState(false);

  function close(): void {
    setIsOpen(false);
  }

  return (
    <>
      <Button type="button" variant="primary" size="sm" onClick={() => setIsOpen(true)}>Edit</Button>
      <Dialog size="5xl" open={isOpen} onClose={close} className="relative">
        <Headless.CloseButton
          className="absolute top-4 right-4 cursor-pointer rounded-lg bg-zinc-950 p-2 text-white transition hover:bg-zinc-800 focus:outline-hidden focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 dark:bg-zinc-950/40 dark:hover:bg-zinc-950"
          aria-label="Close dialog"
        >
          <X className="size-4" aria-hidden="true" />
        </Headless.CloseButton>
        <DialogTitle className="pr-10">Edit Packages</DialogTitle>
        <DialogDescription>Add or remove packages from this order.</DialogDescription>
        <DialogBody>
          <form action={updatePackagesAction.bind(null, orderId)} className="space-y-6">
            <Card>
              {packages.length > 0 ? <PackagePicker packages={packages} initialPrices={initialPackagePrices} initialSelectedTags={initialSelectedTags} title="Packages" /> : (
                <>
                  <CardHeader>
                    <CardTitle>Packages</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="rounded-lg border border-dashed border-zinc-950/10 p-8 text-center text-sm text-zinc-600 dark:border-white/10 dark:text-zinc-400">No packages can be added.</p>
                  </CardContent>
                </>
              )}
            </Card>
            <div className="flex justify-end">
              <Button disabled={packages.length === 0}>Save Packages</Button>
            </div>
          </form>
        </DialogBody>
      </Dialog>
    </>
  );
}
