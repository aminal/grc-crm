"use client";

import { Pencil, Plus, X } from "lucide-react";
import { useState } from "react";
import { createContactAction, deleteContactAction, updateContactAction } from "@/app/(authenticated)/companies/actions";
import { ContactForm, type ContactFormValues } from "@/components/company/contact-form";
import { Button } from "@/components/ui/button";
import { DeleteConfirmationDialog, Dialog, DialogBody, DialogDescription, DialogTitle } from "@/components/ui/dialog";

export function AddContactDialog({ companyId }: { companyId: string }): React.ReactElement {
  const [isOpen, setIsOpen] = useState(false);

  function close(): void {
    setIsOpen(false);
  }

  return (
    <>
      <Button type="button" onClick={() => setIsOpen(true)}>
        <Plus data-slot="icon" aria-hidden="true" />
        Add Contact
      </Button>
      <Dialog size="2xl" open={isOpen} onClose={close} className="relative">
        <div className="flex items-start justify-between">
          <DialogTitle className="pr-10">Add Contact</DialogTitle>
          <button
            type="button"
            onClick={close}
            className="relative -top-1 rounded-lg bg-zinc-950 p-2 cursor-pointer text-white transition hover:bg-zinc-800 focus:outline-hidden focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-500 dark:bg-zinc-950/40 dark:hover:bg-zinc-950"
            aria-label="Close dialog"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
        <DialogDescription>Add a contact for this company.</DialogDescription>
        <DialogBody>
          <ContactForm
            action={createContactAction.bind(null, companyId)}
            submitLabel="Add Contact"
            footerEnd={<Button type="button" variant="plain" onClick={close}>Cancel</Button>}
          />
        </DialogBody>
      </Dialog>
    </>
  );
}

export function EditContactDialog({ companyId, contactId, contact }: { companyId: string; contactId: string; contact: ContactFormValues }): React.ReactElement {
  const [isOpen, setIsOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  function closeEditDialog(): void {
    setIsOpen(false);
    setIsDeleteOpen(false);
  }

  function closeDeleteDialog(): void {
    setIsDeleteOpen(false);
  }

  return (
    <>
      <Button type="button" variant="secondary" onClick={() => setIsOpen(true)}>
        <Pencil data-slot="icon" aria-hidden="true" />
        Edit
      </Button>
      <Dialog size="2xl" open={isOpen} onClose={closeEditDialog} className="relative">
        <div className="flex items-start justify-between">
          <DialogTitle className="pr-10">Edit Contact</DialogTitle>
          <button
            type="button"
            onClick={closeEditDialog}
            className="relative -top-1 rounded-lg bg-zinc-950 p-2 cursor-pointer text-white transition hover:bg-zinc-800 focus:outline-hidden focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-500 dark:bg-zinc-950/40 dark:hover:bg-zinc-950"
            aria-label="Close dialog"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
        <DialogDescription>Update {contact.name}&apos;s contact details.</DialogDescription>
        <DialogBody>
          <ContactForm
            contact={contact}
            action={updateContactAction.bind(null, companyId, contactId)}
            submitLabel="Save Contact"
            footerStart={<Button type="button" variant="danger" onClick={() => setIsDeleteOpen(true)}>Delete</Button>}
            footerEnd={<Button type="button" variant="plain" onClick={closeEditDialog}>Cancel</Button>}
          />
        </DialogBody>
      </Dialog>
      <DeleteConfirmationDialog
        open={isDeleteOpen}
        onClose={closeDeleteDialog}
        title="Delete Contact"
        description={<>This will permanently delete {contact.name}. Type DELETE to confirm.</>}
        action={deleteContactAction.bind(null, companyId, contactId)}
        submitLabel="Delete Contact"
      />
    </>
  );
}
