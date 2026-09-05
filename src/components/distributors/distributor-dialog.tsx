"use client";

import * as Headless from "@headlessui/react";
import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { DistributorForm, type DistributorFormValues } from "@/components/distributors/distributor-form";
import { DeleteConfirmationDialog, Dialog, DialogBody, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { archiveDistributorAction, createDistributorFormAction, updateDistributorFormAction } from "@/app/(authenticated)/distributors/actions";

type DistributorDialogDistributor = {
  id: string;
  data: DistributorFormValues;
};

type DistributorDialogProps = {
  mode: "create" | "edit";
  distributor?: DistributorDialogDistributor;
  closeHref: string;
  canArchive?: boolean;
};

type DistributorFormState = {
  error: string | null;
  success: boolean;
};

const initialState: DistributorFormState = {
  error: null,
  success: false,
};

export function DistributorDialog({ mode, distributor, closeHref, canArchive = false }: DistributorDialogProps): React.ReactElement {
  const router = useRouter();
  const action = mode === "edit" && distributor
    ? updateDistributorFormAction.bind(null, distributor.id)
    : createDistributorFormAction;
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

  const title = mode === "create" ? "Add Distributor" : `Edit ${distributor?.data.name ?? "Distributor"}`;
  const description = mode === "create"
    ? "Add a distributor used for consigned inventory."
    : "Update distributor details.";

  return (
    <>
      <Dialog size="xl" open onClose={close} className="relative">
        <Headless.CloseButton
          className="absolute top-4 right-4 rounded-lg bg-zinc-100 text-zinc-500 hover:bg-zinc-200! p-2 cursor-pointer transition hover:bg-zinc-800 focus:outline-hidden focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-500 dark:bg-zinc-950/40 dark:hover:bg-zinc-950"
          aria-label="Close dialog"
          onClick={close}
        >
          <X className="size-4" aria-hidden="true" />
        </Headless.CloseButton>
        <DialogTitle className="pr-10">{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
        <DialogBody>
          <DistributorForm
            distributor={distributor?.data}
            action={formAction}
            submitLabel={mode === "create" ? "Add Distributor" : "Save Changes"}
            pendingLabel={mode === "create" ? "Adding Distributor..." : "Saving Changes..."}
            pending={pending}
            error={state.error}
            showReason={mode === "edit"}
            onCancel={close}
            onArchive={mode === "edit" && distributor && canArchive ? () => setShowArchiveConfirmation(true) : undefined}
          />
        </DialogBody>
      </Dialog>
      {mode === "edit" && distributor && canArchive ? (
        <DeleteConfirmationDialog
          open={showArchiveConfirmation}
          onClose={() => setShowArchiveConfirmation(false)}
          title="Archive Distributor"
          description={<>This will archive {distributor.data.name}. Packages already consigned to it will keep their reference. Type ARCHIVE to confirm.</>}
          action={archiveDistributorAction.bind(null, distributor.id)}
          submitLabel="Archive Distributor"
          confirmationValue="ARCHIVE"
        />
      ) : null}
    </>
  );
}
