"use client";

import * as Headless from "@headlessui/react";
import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { Dialog, DialogBody, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Field, Input, Select } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import type { UserProfileData, UserRole } from "@/lib/domain/types";
import { updateUserFormAction } from "@/app/(authenticated)/users/actions";

const roles: UserRole[] = ["Guest", "Employee", "Manager", "Admin"];

export function EditUserDialog({
  user,
  closeHref,
  viewerRole,
  lockedRole,
}: {
  user: {
    id: string;
    data: Pick<UserProfileData, "email" | "display_name" | "picture" | "role" | "title">;
  };
  closeHref: string;
  viewerRole: UserRole;
  lockedRole: UserRole | null;
}): React.ReactElement {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    updateUserFormAction.bind(null, user.id),
    { error: null, success: false }
  );
  const currentRole = lockedRole ?? (user.data.role || "Guest");
  const availableRoles = viewerRole === "Admin" ? roles : roles.filter((role) => role !== "Admin");

  useEffect(() => {
    if (state.success) {
      router.replace(closeHref, { scroll: false });
    }
  }, [closeHref, router, state.success]);

  function close(): void {
    router.replace(closeHref, { scroll: false });
  }

  return (
    <Dialog open onClose={close} size="lg" className="relative">
      <Headless.CloseButton
        className="absolute top-4 right-4 rounded-lg bg-zinc-950 p-2 cursor-pointer text-white transition hover:bg-zinc-800 focus:outline-hidden focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 dark:bg-zinc-950/40 dark:hover:bg-zinc-950"
        aria-label="Close dialog"
        onClick={close}
      >
        <X className="size-4" aria-hidden="true" />
      </Headless.CloseButton>
      <DialogTitle className="pr-10">Edit User</DialogTitle>
      <DialogDescription>
        Update the display name, role, and title for {user.data.display_name || user.data.email}.
      </DialogDescription>
      <DialogBody>
        <form action={formAction} className="space-y-6">
          <Field label="Display name">
            <Input name="display_name" defaultValue={user.data.display_name ?? ""} required />
          </Field>
          <Field label="Role">
            {lockedRole && <input type="hidden" name="role" value={currentRole} />}
            <Select name="role" defaultValue={currentRole} disabled={lockedRole !== null}>
              {availableRoles.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Title">
            <Input name="title" defaultValue={user.data.title ?? ""} placeholder="e.g. Sales Representative" />
          </Field>
          {state.error && (
            <p className="text-sm text-red-500">{state.error}</p>
          )}
          <div className="flex justify-end gap-x-3">
            <Button type="button" variant="plain" onClick={close}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogBody>
    </Dialog>
  );
}
