'use client';

import { Pencil, Plus, X } from 'lucide-react';
import { useState } from 'react';
import { CompanyForm, type CompanyFormValues } from '@/components/company/company-form';
import { Button } from '@/components/ui/button';
import { DeleteConfirmationDialog, Dialog, DialogBody, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { createCompanyAction, deleteCompanyAction, updateCompanyAction } from './actions';

export function NewCompanyDialog({ initialOpen = false }: { initialOpen?: boolean }): React.ReactElement {
    const [isOpen, setIsOpen] = useState(initialOpen);

    return (
        <>
            <Button type='button' onClick={() => setIsOpen(true)}>
                <Plus data-slot='icon' aria-hidden='true' />
                New Company
            </Button>
            <Dialog size='3xl' open={isOpen} onClose={() => setIsOpen(false)} className='relative'>
                <div className='flex items-start justify-between'>
                    <DialogTitle className='pr-10'>New Company</DialogTitle>
                    <button
                        type='button'
                        onClick={() => setIsOpen(false)}
                        className='relative -top-1 rounded-lg bg-zinc-950 p-2 cursor-pointer text-white transition hover:bg-zinc-800 focus:outline-hidden focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-500 dark:bg-zinc-950/40 dark:hover:bg-zinc-950'
                        aria-label='Close dialog'
                    >
                        <X className='size-4' aria-hidden='true' />
                    </button>
                </div>

                <DialogDescription>Create a company account with licensing, location, and social profile
                    details.</DialogDescription>
                <DialogBody>
                    <CompanyForm
                        action={createCompanyAction}
                        submitLabel='Create Company'
                        footerEnd={<Button type='button' variant='plain' onClick={() => setIsOpen(false)}>Cancel</Button>}
                    />
                </DialogBody>
            </Dialog>
        </>
    );
}

export function EditCompanyDialog({ companyId, company }: { companyId: string; company: CompanyFormValues }): React.ReactElement {
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
            <Button type='button' variant='primary' onClick={() => setIsOpen(true)}>
                <Pencil data-slot='icon' aria-hidden='true' />
                Edit
            </Button>
            <Dialog size='3xl' open={isOpen} onClose={closeEditDialog} className='relative'>
                <div className='flex items-start justify-between'>
                    <DialogTitle className='pr-10'>Edit Company</DialogTitle>
                    <button
                        type='button'
                        onClick={closeEditDialog}
                        className='relative -top-1 rounded-lg bg-zinc-950 p-2 cursor-pointer text-white transition hover:bg-zinc-800 focus:outline-hidden focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-500 dark:bg-zinc-950/40 dark:hover:bg-zinc-950'
                        aria-label='Close dialog'
                    >
                        <X className='size-4' aria-hidden='true' />
                    </button>
                </div>

                <DialogDescription>Update licensing, location, and social profile details.</DialogDescription>
                <DialogBody>
                    <CompanyForm
                        company={company}
                        action={updateCompanyAction.bind(null, companyId)}
                        submitLabel='Save Company'
                        footerStart={<Button type='button' variant='danger' onClick={() => setIsDeleteOpen(true)}>Delete Company</Button>}
                        footerEnd={<Button type='button' variant='plain' onClick={closeEditDialog}>Cancel</Button>}
                    />
                </DialogBody>
            </Dialog>
            <DeleteConfirmationDialog
                open={isDeleteOpen}
                onClose={closeDeleteDialog}
                title='Delete Company'
                description={<>This will permanently delete {company.company_name}. Type DELETE to confirm.</>}
                action={deleteCompanyAction.bind(null, companyId)}
                submitLabel='Delete Company'
            />
        </>
    );
}
