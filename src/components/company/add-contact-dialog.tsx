'use client';

import { useRouter } from 'next/navigation';
import { Pencil, Plus, X } from 'lucide-react';
import { useState } from 'react';
import { createContactAction, deleteContactAction, setPrimaryContactAction, updateContactAction } from '@/app/(authenticated)/companies/actions';
import { ContactForm, type ContactFormValues } from '@/components/company/contact-form';
import { Button, buttonClasses } from '@/components/ui/button';
import {
    DeleteConfirmationDialog,
    Dialog,
    DialogActions,
    DialogBody,
    DialogDescription,
    DialogTitle
} from '@/components/ui/dialog';

export function AddContactDialog({ companyId }: { companyId: string }): React.ReactElement {
    const [isOpen, setIsOpen] = useState(false);

    function close(): void {
        setIsOpen(false);
    }

    return (
        <>
            <Button type='button' onClick={() => setIsOpen(true)}>
                <Plus className='size-5 shrink-0 sm:size-4' aria-hidden='true' />
                Add Contact
            </Button>
            <Dialog size='2xl' open={isOpen} onClose={close} className='relative'>
                <div className='flex items-start justify-between'>
                    <DialogTitle className='pr-10'>Add Contact</DialogTitle>
                    <button
                        type='button'
                        onClick={close}
                        className='relative -top-1 rounded-lg bg-zinc-950 p-2 cursor-pointer text-white transition hover:bg-zinc-800 focus:outline-hidden focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-500 dark:bg-zinc-950/40 dark:hover:bg-zinc-950'
                        aria-label='Close dialog'
                    >
                        <X className='size-4' aria-hidden='true' />
                    </button>
                </div>
                <DialogDescription>Add a contact for this company.</DialogDescription>
                <DialogBody>
                    <ContactForm
                        action={createContactAction.bind(null, companyId)}
                        submitLabel='Add Contact'
                        footerEnd={<Button type='button' variant='plain' onClick={close}>Cancel</Button>}
                    />
                </DialogBody>
            </Dialog>
        </>
    );
}

type ViewContactDialogProps = {
    companyId: string;
    contactId: string;
    contact: ContactFormValues;
    email: string;
    phone: string | null;
    dialablePhone: string | null;
    callUrl: string | null;
    isPrimary: boolean;
    canManageCompany?: boolean;
    closeHref: string;
};

export function ViewContactDialog({
    companyId,
    contactId,
    contact,
    email,
    phone,
    dialablePhone,
    callUrl,
    isPrimary,
    canManageCompany = true,
    closeHref
}: ViewContactDialogProps): React.ReactElement {
    const router = useRouter();
    const [isEditing, setIsEditing] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);

    function close(): void {
        setIsEditing(false);
        setIsDeleteOpen(false);
        router.replace(closeHref, { scroll: false });
    }

    function closeDeleteDialog(): void {
        setIsDeleteOpen(false);
    }

    return (
        <>
            <Dialog size='2xl' open onClose={close} className='relative'>
                <div className='flex items-start justify-between gap-4'>
                    <DialogTitle className='pr-10'>{isEditing ? 'Edit Contact' : 'View Contact'}</DialogTitle>
                    <div className='flex items-start gap-2'>
                        {canManageCompany && !isPrimary ? (
                            <form action={setPrimaryContactAction.bind(null, companyId, contactId)}>
                                <Button type='submit' variant='primary' size='sm'>Make Primary</Button>
                            </form>
                        ) : null}
                        <button
                            type='button'
                            onClick={close}
                            className='relative rounded-lg bg-zinc-950 p-2 cursor-pointer text-white transition hover:bg-zinc-800 focus:outline-hidden focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-500 dark:bg-zinc-950/40 dark:hover:bg-zinc-950'
                            aria-label='Close dialog'
                        >
                            <X className='size-4' aria-hidden='true' />
                        </button>
                    </div>
                </div>
                <DialogDescription>{isEditing ? `Update ${contact.name}'s contact details.` : `Review ${contact.name}'s contact details.`}</DialogDescription>
                <DialogBody>
                    {isEditing ? (
                        <ContactForm
                            contact={contact}
                            action={updateContactAction.bind(null, companyId, contactId)}
                            submitLabel='Save Contact'
                            footerStart={
                                <Button type='button' variant='danger' onClick={() => setIsDeleteOpen(true)}>Delete</Button>}
                            footerEnd={
                                <Button type='button' variant='plain' onClick={() => setIsEditing(false)}>Cancel</Button>}
                        />
                    ) : (
                        <>
                            <div className='space-y-6'>
                                <dl className='grid gap-4 sm:grid-cols-2'>
                                    <ContactDetail label='Name'>{displayValue(contact.name)}</ContactDetail>
                                    <ContactDetail label='Status'>{isPrimary ? 'Primary contact' : 'Contact'}</ContactDetail>
                                    <ContactDetail label='Title'>{displayValue(contact.title)}</ContactDetail>
                                    <ContactDetail label='Preferred communication'>{contact.preferred_communication}</ContactDetail>
                                    <ContactDetail label='Email'>
                                        {email ?
                                            <ContactDetailLink href={`mailto:${email}`}>{email}</ContactDetailLink> : '—'}
                                    </ContactDetail>
                                    <ContactDetail label='Phone'>
                                        {phone ? (dialablePhone ?
                                            <ContactDetailLink href={`tel:${dialablePhone}`}>{phone}</ContactDetailLink> : phone) : '—'}
                                    </ContactDetail>
                                </dl>
                                <section>
                                    <h3 className='text-sm/6 font-semibold text-zinc-950 dark:text-white'>Socials</h3>
                                    <dl className='mt-3 grid gap-4 sm:grid-cols-2'>
                                        <ContactDetail label='Instagram'>
                                            {contact.social_links.instagram ?
                                                <ContactDetailLink href={contact.social_links.instagram} external>{displayValue(contact.instagram_handle || contact.social_links.instagram)}</ContactDetailLink> : displayValue(contact.instagram_handle)}
                                        </ContactDetail>
                                        <ContactDetail label='X'>
                                            {contact.social_links.x ?
                                                <ContactDetailLink href={contact.social_links.x} external>{displayValue(contact.x_handle || contact.social_links.x)}</ContactDetailLink> : displayValue(contact.x_handle)}
                                        </ContactDetail>
                                        <ContactDetail label='Facebook' className='sm:col-span-2'>
                                            {contact.social_links.facebook ?
                                                <ContactDetailLink href={contact.social_links.facebook} external>{contact.social_links.facebook}</ContactDetailLink> : '—'}
                                        </ContactDetail>
                                    </dl>
                                </section>
                            </div>
                            <DialogActions>
                                <Button type='button' variant='plain' onClick={close}>Close</Button>
                                {callUrl ?
                                    <a href={callUrl} target='_blank' rel='noreferrer' className={buttonClasses('secondary')}>Call</a> : null}
                                <Button type='button' onClick={() => setIsEditing(true)}>
                                    <Pencil data-slot='icon' aria-hidden='true' />
                                    Edit
                                </Button>
                            </DialogActions>
                        </>
                    )}
                </DialogBody>
            </Dialog>
            <DeleteConfirmationDialog
                open={isDeleteOpen}
                onClose={closeDeleteDialog}
                title='Delete Contact'
                description={<>This will permanently delete {contact.name}. Type DELETE to confirm.</>}
                action={deleteContactAction.bind(null, companyId, contactId)}
                submitLabel='Delete Contact'
            />
        </>
    );
}

function ContactDetail({ label, className, children }: {
    label: string;
    className?: string;
    children: React.ReactNode
}): React.ReactElement {
    return (
        <div className={className}>
            <dt className='text-xs/5 font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400'>{label}</dt>
            <dd className='mt-1 break-words text-base/6 font-medium text-zinc-950 whitespace-normal dark:text-white'>{children}</dd>
        </div>
    );
}

function ContactDetailLink({ href, external = false, children }: {
    href: string;
    external?: boolean;
    children: React.ReactNode
}): React.ReactElement {
    return (
        <a href={href} target={external ? '_blank' : undefined} rel={external ? 'noreferrer' : undefined} className='text-purple-700 hover:text-purple-900 dark:text-purple-400 dark:hover:text-purple-300'>
            {children}
        </a>
    );
}

function displayValue(value: string): string {
    const trimmed = value.trim();
    return trimmed || '—';
}
