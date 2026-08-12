"use client";

import { Plus, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogActions, DialogBody, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { INTERACTION_METHODS } from "@/lib/domain/constants";
import { createInteractionAction } from "../../actions";

export function LogInteractionDialog({ companyId }: { companyId: string }): React.ReactElement {
  const [isOpen, setIsOpen] = useState(false);

  function close(): void {
    setIsOpen(false);
  }

  return (
    <>
      <Button type="button" onClick={() => setIsOpen(true)}>
        <Plus data-slot="icon" aria-hidden="true" />
        Log Interaction
      </Button>
      <Dialog size="xl" open={isOpen} onClose={close} className="relative">
        <div className="flex items-start justify-between">
          <DialogTitle className="pr-10">Log Interaction</DialogTitle>
          <button
            type="button"
            onClick={close}
            className="relative -top-1 rounded-lg bg-zinc-950 p-2 cursor-pointer text-white transition hover:bg-zinc-800 focus:outline-hidden focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-500 dark:bg-zinc-950/40 dark:hover:bg-zinc-950"
            aria-label="Close dialog"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
        <DialogDescription>Record an email, text, phone call, or in-person conversation.</DialogDescription>
        <DialogBody>
          <form action={createInteractionAction.bind(null, companyId)} className="space-y-4">
            <Field label="Contact date/time">
              <Input name="contact_date_time" type="datetime-local" />
            </Field>
            <Field label="Method">
              <Select name="interaction_method" defaultValue="Email">
                {INTERACTION_METHODS.map((method) => <option key={method} value={method}>{method}</option>)}
              </Select>
            </Field>
            <Field label="Discussion notes">
              <Textarea name="discussion_notes" required />
            </Field>
            <DialogActions>
              <Button type="button" variant="plain" onClick={close}>Cancel</Button>
              <Button>Log Interaction</Button>
            </DialogActions>
          </form>
        </DialogBody>
      </Dialog>
    </>
  );
}
