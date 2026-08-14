'use client';

import { ChevronDownIcon, XMarkIcon } from '@heroicons/react/20/solid';
import { useState } from 'react';
import { Button, buttonClasses } from '@/components/ui/button';
import { Dialog, DialogActions, DialogBody, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Dropdown, DropdownButton, DropdownItem, DropdownLabel, DropdownMenu } from '@/components/ui/dropdown';
import { Field, Input } from '@/components/ui/field';
import {
    approveOrderAction,
    cancelOrderAction,
    deliverOrderAction,
    deliveryRejectOrderAction,
    payOrderAction,
    rejectOrderAction,
    unapproveOrderAction,
    undeliverOrderAction,
} from '../actions';

type InvoiceApprovalDefaults = {
    invoiceNumber: string;
    dueDate: string;
    termsLabel: string;
    totalLabel: string;
};

type OrderActionsMenuProps = {
    orderId: string;
    actions: string[];
    approvalInvoice: InvoiceApprovalDefaults;
};

export function OrderActionsMenu({ orderId, actions, approvalInvoice }: OrderActionsMenuProps): React.ReactElement {
    const [isCreateInvoiceDialogOpen, setIsCreateInvoiceDialogOpen] = useState(false);
    const [isDeliverDialogOpen, setIsDeliverDialogOpen] = useState(false);

    function closeCreateInvoiceDialog(): void {
        setIsCreateInvoiceDialogOpen(false);
    }

    function closeDeliverDialog(): void {
        setIsDeliverDialogOpen(false);
    }

    return (
        <>
            <Dropdown>
                <DropdownButton className={buttonClasses('secondary')}>
                    Actions
                    <ChevronDownIcon data-slot='icon' aria-hidden='true' />
                </DropdownButton>
                <DropdownMenu anchor='bottom end' className='min-w-56'>
                    {actions.length === 0 ? (
                        <div className='col-span-full px-3 py-2 text-sm text-zinc-500 dark:text-zinc-400'>
                            No actions are available for this status.
                        </div>
                    ) : null}
                    {actions.includes('approve') ? (
                        <DropdownItem onClick={() => setIsCreateInvoiceDialogOpen(true)}>
                            <DropdownLabel>Mark as Approved</DropdownLabel>
                        </DropdownItem>
                    ) : null}
                    {actions.includes('reject') ? (
                        <MenuActionForm action={rejectOrderAction.bind(null, orderId)} label='Mark as Rejected' />
                    ) : null}
                    {actions.includes('cancel') ? (
                        <MenuActionForm action={cancelOrderAction.bind(null, orderId)} label='Mark as Cancelled' />
                    ) : null}
                    {actions.includes('unapprove') ? (
                        <MenuActionForm action={unapproveOrderAction.bind(null, orderId)} label='Mark as Pending' />
                    ) : null}
                    {actions.includes('mark_pending') ? (
                        <MenuActionForm action={unapproveOrderAction.bind(null, orderId)} label='Mark as Pending' />
                    ) : null}
                    {actions.includes('deliver') ? (
                        <DropdownItem onClick={() => setIsDeliverDialogOpen(true)}>
                            <DropdownLabel>Mark Delivered</DropdownLabel>
                        </DropdownItem>
                    ) : null}
                    {actions.includes('undeliver') ? (
                        <MenuActionForm action={undeliverOrderAction.bind(null, orderId)} label='Mark as Approved' />
                    ) : null}
                    {actions.includes('delivery_reject') ? (
                        <MenuActionForm action={deliveryRejectOrderAction.bind(null, orderId)} label='Mark as Delivery Rejected' />
                    ) : null}
                    {actions.includes('pay') ? (
                        <MenuActionForm action={payOrderAction.bind(null, orderId)} label='Mark as Paid' />
                    ) : null}
                </DropdownMenu>
            </Dropdown>

            <Dialog size='lg' open={isCreateInvoiceDialogOpen} onClose={closeCreateInvoiceDialog} className='relative'>
                <div className='flex items-start justify-between'>
                    <DialogTitle className='pr-10'>Create Invoice</DialogTitle>
                    <button
                        type='button'
                        onClick={closeCreateInvoiceDialog}
                        className='relative -top-1 cursor-pointer rounded-lg bg-zinc-950 p-2 text-white transition hover:bg-zinc-800 focus:outline-hidden focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-500 dark:bg-zinc-950/40 dark:hover:bg-zinc-950'
                        aria-label='Close dialog'
                    >
                        <XMarkIcon className='size-4' aria-hidden='true' />
                    </button>
                </div>
                <DialogDescription>Create an invoice to approve this order. Closing this dialog leaves the order in its current status.</DialogDescription>
                <DialogBody>
                    <form action={approveOrderAction.bind(null, orderId)} className='space-y-4'>
                        <div className='grid gap-4 sm:grid-cols-2'>
                            <Field label='Invoice number'>
                                <Input name='invoice_number' defaultValue={approvalInvoice.invoiceNumber} required autoFocus />
                            </Field>
                            {approvalInvoice.dueDate ? (
                                <Field label='Due date'>
                                    <Input name='due_date' type='date' defaultValue={approvalInvoice.dueDate} required />
                                </Field>
                            ) : (
                                <Field label='Due date'>
                                    <Input defaultValue='Set after delivery' readOnly />
                                </Field>
                            )}
                            <Field label='Terms'>
                                <Input defaultValue={approvalInvoice.termsLabel} readOnly />
                            </Field>
                            <Field label='Total'>
                                <Input defaultValue={approvalInvoice.totalLabel} readOnly />
                            </Field>
                        </div>
                        <DialogActions>
                            <Button type='button' variant='plain' onClick={closeCreateInvoiceDialog}>Cancel</Button>
                            <Button>Create Invoice and Approve</Button>
                        </DialogActions>
                    </form>
                </DialogBody>
            </Dialog>

            <Dialog size='md' open={isDeliverDialogOpen} onClose={closeDeliverDialog} className='relative'>
                <div className='flex items-start justify-between'>
                    <DialogTitle className='pr-10'>Mark Delivered</DialogTitle>
                    <button
                        type='button'
                        onClick={closeDeliverDialog}
                        className='relative -top-1 cursor-pointer rounded-lg bg-zinc-950 p-2 text-white transition hover:bg-zinc-800 focus:outline-hidden focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-500 dark:bg-zinc-950/40 dark:hover:bg-zinc-950'
                        aria-label='Close dialog'
                    >
                        <XMarkIcon className='size-4' aria-hidden='true' />
                    </button>
                </div>
                <DialogDescription>Enter the date and time the delivery was made.</DialogDescription>
                <DialogBody>
                    <form action={deliverOrderAction.bind(null, orderId)} className='space-y-4'>
                        <Field label='Delivered at'>
                            <Input name='delivered_at' type='datetime-local' defaultValue={new Date().toISOString().slice(0, 16)} required autoFocus />
                        </Field>
                        <DialogActions>
                            <Button type='button' variant='plain' onClick={closeDeliverDialog}>Cancel</Button>
                            <Button>Mark Delivered</Button>
                        </DialogActions>
                    </form>
                </DialogBody>
            </Dialog>
        </>
    );
}

function MenuActionForm({ action, label }: { action: (formData: FormData) => void | Promise<void>; label: string }): React.ReactElement {
    return (
        <form action={action} className='contents'>
            <DropdownItem type='submit'>
                <DropdownLabel>{label}</DropdownLabel>
            </DropdownItem>
        </form>
    );
}
