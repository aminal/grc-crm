"use client";

import * as Headless from "@headlessui/react";
import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { BrandForm, type BrandFormValues } from "@/components/brands/brand-form";
import { Dialog, DialogBody, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { formatDateTime } from "@/lib/domain/format";
import type { SettingsActivityData } from "@/lib/domain/types";
import { createBrandFormAction, updateBrandFormAction } from "@/app/(authenticated)/brands/actions";

type BrandDialogBrand = {
  id: string;
  data: BrandFormValues;
};

type BrandDialogActivity = {
  id: string;
  data: Pick<SettingsActivityData, "action" | "reason" | "actor_email" | "actor_name" | "changes"> & {
    created_at: string | null;
  };
};

type BrandDialogProps = {
  mode: "create" | "edit";
  brand?: BrandDialogBrand;
  activity: BrandDialogActivity[];
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

const fieldLabels: Record<string, string> = {
  name: "Name",
  website: "Website",
  notes: "Notes",
};

export function BrandDialog({ mode, brand, activity, closeHref }: BrandDialogProps): React.ReactElement {
  const router = useRouter();
  const action = mode === "edit" && brand
    ? updateBrandFormAction.bind(null, brand.id)
    : createBrandFormAction;
  const [state, formAction, pending] = useActionState(action, initialState);

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
    : "Update brand details and review recent change history.";

  return (
    <Dialog size={mode === "edit" ? "4xl" : "xl"} open onClose={close} className="relative">
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
        <div className={mode === "edit" ? "grid gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]" : undefined}>
          <BrandForm
            brand={brand?.data}
            action={formAction}
            submitLabel={mode === "create" ? "Add Brand" : "Save Changes"}
            pendingLabel={mode === "create" ? "Adding Brand..." : "Saving Changes..."}
            pending={pending}
            error={state.error}
            showReason={mode === "edit"}
            onCancel={close}
          />
          {mode === "edit" ? <BrandActivityList activity={activity} /> : null}
        </div>
      </DialogBody>
    </Dialog>
  );
}

function BrandActivityList({ activity }: { activity: BrandDialogActivity[] }): React.ReactElement {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base/7 font-semibold text-zinc-950 sm:text-sm/6 dark:text-white">Activity History</h2>
        <p className="mt-1 text-sm/6 text-zinc-500 dark:text-zinc-400">Every brand change is recorded with the editor and field-level updates.</p>
      </div>
      {activity.length > 0 ? (
        activity.map((entry) => (
          <div key={entry.id} className="rounded-lg border border-zinc-950/10 bg-zinc-50 p-4 dark:border-white/10 dark:bg-zinc-950/40">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-zinc-950 capitalize dark:text-white">{entry.data.action}</p>
                <p className="text-sm text-zinc-600 dark:text-zinc-300">{entry.data.actor_name || entry.data.actor_email}</p>
                {entry.data.actor_email ? <p className="text-xs text-zinc-500 dark:text-zinc-400">{entry.data.actor_email}</p> : null}
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">{formatDateTime(entry.data.created_at)}</p>
            </div>
            {entry.data.reason ? (
              <div className="mt-3 rounded-lg bg-white p-3 text-sm text-zinc-700 ring-1 ring-zinc-950/5 dark:bg-zinc-900 dark:text-zinc-300 dark:ring-white/10">
                {entry.data.reason}
              </div>
            ) : null}
            <div className="mt-3 space-y-2">
              {entry.data.changes.map((change, index) => (
                <div key={`${entry.id}-${change.field}-${index}`} className="rounded-lg bg-white p-3 ring-1 ring-zinc-950/5 dark:bg-zinc-900 dark:ring-white/10">
                  <p className="text-xs font-semibold tracking-wide text-zinc-500 uppercase dark:text-zinc-400">{fieldLabels[change.field] ?? change.field}</p>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    <div>
                      <p className="text-[11px] font-semibold tracking-wide text-zinc-400 uppercase dark:text-zinc-500">Previous</p>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-600 dark:text-zinc-300">{change.previous_value || "—"}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold tracking-wide text-zinc-400 uppercase dark:text-zinc-500">Current</p>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-900 dark:text-white">{change.next_value || "—"}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      ) : (
        <div className="rounded-lg border border-dashed border-zinc-950/10 p-4 text-sm text-zinc-600 dark:border-white/10 dark:text-zinc-300">
          No activity has been recorded for this brand yet.
        </div>
      )}
    </div>
  );
}
