"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { StrainForm, type StrainFormValues } from "@/components/strains/strain-form";
import { DeleteConfirmationDialog } from "@/components/ui/dialog";
import { archiveStrainAction, updateStrainFormAction } from "@/app/(authenticated)/strains/actions";

type StrainEditFormStrain = {
  id: string;
  data: StrainFormValues;
};

type StrainEditFormProps = {
  strain: StrainEditFormStrain;
  cancelHref: string;
  successHref: string;
  canArchive?: boolean;
};

type StrainFormState = {
  error: string | null;
  success: boolean;
};

const initialState: StrainFormState = {
  error: null,
  success: false,
};

export function StrainEditForm({ strain, cancelHref, successHref, canArchive = false }: StrainEditFormProps): React.ReactElement {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(updateStrainFormAction.bind(null, strain.id), initialState);
  const [showArchiveConfirmation, setShowArchiveConfirmation] = useState(false);

  useEffect(() => {
    if (state.success) {
      router.replace(successHref, { scroll: false });
    }
  }, [router, state.success, successHref]);

  return (
    <>
      <StrainForm
        strain={strain.data}
        action={formAction}
        submitLabel="Save Changes"
        pendingLabel="Saving Changes..."
        pending={pending}
        error={state.error}
        showReason
        onCancel={() => router.replace(cancelHref, { scroll: false })}
        onArchive={canArchive ? () => setShowArchiveConfirmation(true) : undefined}
      />
      {canArchive ? (
        <DeleteConfirmationDialog
          open={showArchiveConfirmation}
          onClose={() => setShowArchiveConfirmation(false)}
          title="Archive Strain"
          description={<>This will archive {strain.data.name}. Products that already reference it will keep their reference. Type ARCHIVE to confirm.</>}
          action={archiveStrainAction.bind(null, strain.id)}
          submitLabel="Archive Strain"
          confirmationValue="ARCHIVE"
        />
      ) : null}
    </>
  );
}
