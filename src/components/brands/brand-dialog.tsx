"use client";

import * as Headless from "@headlessui/react";
import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { BrandForm, type BrandFormValues } from "@/components/brands/brand-form";
import { DeleteConfirmationDialog, Dialog, DialogBody, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { archiveBrandAction, createBrandFormAction, updateBrandFormAction } from "@/app/(authenticated)/brands/actions";

type BrandDialogBrand = {
  id: string;
  data: BrandFormValues;
};

type BrandDialogProps = {
  mode: "create" | "edit";
  brand?: BrandDialogBrand;
  closeHref: string;
};

type BrandFormState = {
  error: string | null;
  success: boolean;
};

const initialState: BrandFormState = {
  error: null,
  success: false,
};

export function BrandDialog({ mode, brand, closeHref }: BrandDialogProps): React.ReactElement {
  const router = useRouter();
  const action = mode === "edit" && brand
    ? updateBrandFormAction.bind(null, brand.id)
    : createBrandFormAction;
  const [state, formAction, pending] = useActionState(action, initialState);
  const [showArchiveConfirmation, setShowArchiveConfirmation] = useState(false);

  useEffect(() => {
    if (state.success) {
      router.replace(closeHref, { scroll: false });
    }
  }, [closeHref, router, state.success]);

  function close(): void {
    router.replace(closeHref, { scroll: false });
  }

  const title = mode === "create" ? "Add Brand" : `Edit ${brand?.data.name ?? "Brand"}`;
  const description = mode === "create"
    ? "Add a brand used throughout the sales workflow."
    : "Update brand details.";

  return (
    <>
      <Dialog size="xl" open onClose={close} className="relative">
        <Headless.CloseButton
          className="absolute top-4 right-4 rounded-lg bg-zinc-950 p-2 cursor-pointer text-white transition hover:bg-zinc-800 focus:outline-hidden focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 dark:bg-zinc-950/40 dark:hover:bg-zinc-950"
          aria-label="Close dialog"
          onClick={close}
        >
          <X className="size-4" aria-hidden="true" />
        </Headless.CloseButton>
        <DialogTitle className="pr-10">{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
        <DialogBody>
          <BrandForm
            brand={brand?.data}
            action={formAction}
            submitLabel={mode === "create" ? "Add Brand" : "Save Changes"}
            pendingLabel={mode === "create" ? "Adding Brand..." : "Saving Changes..."}
            pending={pending}
            error={state.error}
            showReason={mode === "edit"}
            onCancel={close}
            onArchive={mode === "edit" && brand ? () => setShowArchiveConfirmation(true) : undefined}
          />
        </DialogBody>
      </Dialog>
      {mode === "edit" && brand ? (
        <DeleteConfirmationDialog
          open={showArchiveConfirmation}
          onClose={() => setShowArchiveConfirmation(false)}
          title="Archive Brand"
          description={<>This will archive {brand.data.name}. Products that already reference it will keep their reference. Type ARCHIVE to confirm.</>}
          action={archiveBrandAction.bind(null, brand.id)}
          submitLabel="Archive Brand"
          confirmationValue="ARCHIVE"
        />
      ) : null}
    </>
  );
}

