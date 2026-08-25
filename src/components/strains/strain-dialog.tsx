"use client";

import * as Headless from "@headlessui/react";
import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { StrainForm, type StrainFormValues } from "@/components/strains/strain-form";
import { Dialog, DialogBody, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { createStrainFormAction, updateStrainFormAction } from "@/app/(authenticated)/strains/actions";
import type { StrainStatus } from "@/lib/domain/types";

type StrainDialogStrain = {
  id: string;
  data: StrainFormValues;
};

type StrainDialogProps = {
  mode: "create" | "edit";
  strain?: StrainDialogStrain;
  closeHref: string;
};

type StrainFormState = {
  error: string | null;
  success: boolean;
  status: StrainStatus | null;
};

const initialState: StrainFormState = {
  error: null,
  success: false,
  status: null,
};

export function StrainDialog({ mode, strain, closeHref }: StrainDialogProps): React.ReactElement {
  const router = useRouter();
  const action = mode === "edit" && strain
    ? updateStrainFormAction.bind(null, strain.id)
    : createStrainFormAction;
  const [state, formAction, pending] = useActionState(action, initialState);

  useEffect(() => {
    if (state.success) {
      router.replace(closeHref, { scroll: false });
    }
  }, [closeHref, router, state.success]);

  function close(): void {
    router.replace(closeHref, { scroll: false });
  }

  const title = mode === "create" ? "Add Strain" : "Edit Strain";
  const description = mode === "create"
    ? "Add a cannabis strain that products can reference."
    : "Update strain details.";

  return (
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
        <StrainForm
          strain={strain?.data}
          action={formAction}
          submitLabel={mode === "create" ? "Add Strain" : "Save Changes"}
          pendingLabel={mode === "create" ? "Adding Strain..." : "Saving Changes..."}
          pending={pending}
          error={state.error}
          showReason={mode === "edit"}
          onCancel={close}
        />
      </DialogBody>
    </Dialog>
  );
}

