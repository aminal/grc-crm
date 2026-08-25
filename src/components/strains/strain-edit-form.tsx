"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { StrainForm, type StrainFormValues } from "@/components/strains/strain-form";
import { updateStrainFormAction } from "@/app/(authenticated)/strains/actions";
import type { StrainStatus } from "@/lib/domain/types";

type StrainEditFormStrain = {
  id: string;
  data: StrainFormValues;
};

type StrainEditFormProps = {
  strain: StrainEditFormStrain;
  cancelHref: string;
  successHref: string;
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

export function StrainEditForm({ strain, cancelHref, successHref }: StrainEditFormProps): React.ReactElement {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(updateStrainFormAction.bind(null, strain.id), initialState);

  useEffect(() => {
    if (state.success) {
      router.replace(state.status === "Archived" ? "/strains" : successHref, { scroll: false });
    }
  }, [router, state.status, state.success, successHref]);

  return (
    <StrainForm
      strain={strain.data}
      action={formAction}
      submitLabel="Save Changes"
      pendingLabel="Saving Changes..."
      pending={pending}
      error={state.error}
      showReason
      onCancel={() => router.replace(cancelHref, { scroll: false })}
    />
  );
}
