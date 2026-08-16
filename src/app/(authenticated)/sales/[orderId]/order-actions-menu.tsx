'use client';

import { ChevronDownIcon, XMarkIcon } from '@heroicons/react/20/solid';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { DeleteConfirmationDialog, Dialog, DialogActions, DialogBody, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Dropdown, DropdownButton, DropdownDivider, DropdownItem, DropdownLabel, DropdownMenu } from '@/components/ui/dropdown';
import { Field, Input } from '@/components/ui/field';
import {
    approveOrderAction,
    cancelOrderAction,
    closeOrderAction,
    deleteOrderAction,
    deliverOrderAction,
    deliveryRejectOrderAction,
    rejectOrderAction,
    reopenOrderAction,
    unapproveOrderAction,
} from '../actions';
import { RecordPaymentDialog } from './record-payment-dialog';

const actionsButtonClasses = 'relative isolate inline-flex items-baseline justify-center gap-x-2 rounded-lg border text-base/6 font-semibold px-[calc(--spacing(3.5)-1px)] py-[calc(--spacing(2.5)-1px)] sm:px-[calc(--spacing(3)-1px)] sm:py-[calc(--spacing(1.5)-1px)] sm:text-sm/6 focus:not-data-focus:outline-hidden data-focus:outline-2 data-focus:outline-offset-2 data-focus:outline-blue-500 data-disabled:opacity-50 *:data-[slot=icon]:-mx-0.5 *:data-[slot=icon]:my-0.5 *:data-[slot=icon]:size-5 *:data-[slot=icon]:shrink-0 *:data-[slot=icon]:self-center *:data-[slot=icon]:text-(--btn-icon) sm:*:data-[slot=icon]:my-1 sm:*:data-[slot=icon]:size-4 forced-colors:[--btn-icon:ButtonText] forced-colors:data-hover:[--btn-icon:ButtonText] border-transparent bg-(--btn-border) dark:bg-(--btn-bg) before:absolute before:inset-0 before:-z-10 before:rounded-[calc(var(--radius-lg)-1px)] before:bg-(--btn-bg) before:shadow-sm dark:before:hidden dark:border-white/5 after:absolute after:inset-0 after:-z-10 after:rounded-[calc(var(--radius-lg)-1px)] after:shadow-[inset_0_1px_--theme(--color-white/15%)] data-active:after:bg-(--btn-hover-overlay) data-hover:after:bg-(--btn-hover-overlay) dark:after:-inset-px dark:after:rounded-lg data-disabled:before:shadow-none data-disabled:after:shadow-none text-white [--btn-hover-overlay:var(--color-white)]/10 [--btn-bg:var(--color-purple-500)] [--btn-border:var(--color-purple-600)]/90 [--btn-icon:var(--color-white)] data-active:[--btn-icon:var(--color-white)] data-hover:[--btn-icon:var(--color-white)] dark:[--btn-icon:var(--color-white)] dark:data-hover:[--btn-icon:var(--color-white)] dark:data-active:[--btn-icon:var(--color-white)]';

type InvoiceApprovalDefaults = {
    invoiceNumber: string;
    dueDate: string;
    termsLabel: string;
    totalLabel: string;
};

type OrderActionsMenuProps = {
    orderId: string;
    orderNumber: number;
    actions: string[];
    approvalInvoice: InvoiceApprovalDefaults;
    canManage: boolean;
    canDelete: boolean;
    hasInvoice: boolean;
    canRecordPayment: boolean;
    recordPaymentBalanceCents: number;
    defaultPaidAt: string;
};

type ConfirmableOrderAction = 'reject' | 'cancel' | 'close';

export function OrderActionsMenu({ orderId, orderNumber, actions, approvalInvoice, canManage, canDelete, hasInvoice, canRecordPayment, recordPaymentBalanceCents, defaultPaidAt }: OrderActionsMenuProps): React.ReactElement {
    const [isCreateInvoiceDialogOpen, setIsCreateInvoiceDialogOpen] = useState(false);
    const [isDeliverDialogOpen, setIsDeliverDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isRecordPaymentDialogOpen, setIsRecordPaymentDialogOpen] = useState(false);
    const [confirmationAction, setConfirmationAction] = useState<ConfirmableOrderAction | null>(null);
    const visibleActions = canManage ? actions : actions.filter((action) => action === 'reject' || action === 'cancel' || action === 'close' || action === 'reopen');
    const canShowRecordPayment = canManage && canRecordPayment;

    function closeCreateInvoiceDialog(): void {
        setIsCreateInvoiceDialogOpen(false);
    }

    function closeDeliverDialog(): void {
        setIsDeliverDialogOpen(false);
    }

    function closeDeleteDialog(): void {
        setIsDeleteDialogOpen(false);
    }

    function closeConfirmationDialog(): void {
        setConfirmationAction(null);
    }

    function closeRecordPaymentDialog(): void {
        setIsRecordPaymentDialogOpen(false);
    }

    return (
        <>
            <Dropdown>
                <DropdownButton className={actionsButtonClasses}>
                    Actions
                    <ChevronDownIcon data-slot='icon' aria-hidden='true' />
                </DropdownButton>
                <DropdownMenu anchor='bottom end' className='min-w-56'>
                    {visibleActions.length === 0 && !canShowRecordPayment && !canDelete ? (
                        <div className='col-span-full px-3 py-2 text-sm text-zinc-500 dark:text-zinc-400'>
                            No actions are available for this status.
                        </div>
                    ) : null}
                    {visibleActions.includes('approve') ? (
                        <DropdownItem onClick={() => setIsCreateInvoiceDialogOpen(true)}>
                            <DropdownLabel>Mark as Approved</DropdownLabel>
                        </DropdownItem>
                    ) : null}
                    {visibleActions.includes('reject') ? (
                        <DropdownItem onClick={() => setConfirmationAction('reject')}>
                            <DropdownLabel>Mark as Rejected</DropdownLabel>
                        </DropdownItem>
                    ) : null}
                    {visibleActions.includes('cancel') ? (
                        <DropdownItem onClick={() => setConfirmationAction('cancel')}>
                            <DropdownLabel>Mark as Cancelled</DropdownLabel>
                        </DropdownItem>
                    ) : null}
                    {visibleActions.includes('unapprove') ? (
                        <MenuActionForm action={unapproveOrderAction.bind(null, orderId)} label='Mark as Pending' />
                    ) : null}
                    {visibleActions.includes('mark_pending') ? (
                        <MenuActionForm action={unapproveOrderAction.bind(null, orderId)} label='Mark as Pending' />
                    ) : null}
                    {visibleActions.includes('deliver') ? (
                        <DropdownItem onClick={() => setIsDeliverDialogOpen(true)}>
                            <DropdownLabel>Mark Delivered</DropdownLabel>
                        </DropdownItem>
                    ) : null}
                    {visibleActions.includes('delivery_reject') ? (
                        <MenuActionForm action={deliveryRejectOrderAction.bind(null, orderId)} label='Mark as Delivery Rejected' />
                    ) : null}
                    {visibleActions.includes('close') ? (
                        <DropdownItem onClick={() => setConfirmationAction('close')}>
                            <DropdownLabel>Close Order</DropdownLabel>
                        </DropdownItem>
                    ) : null}
                    {visibleActions.includes('reopen') ? (
                        <MenuActionForm action={reopenOrderAction.bind(null, orderId)} label='Reopen Order' />
                    ) : null}
                    {canShowRecordPayment ? (
                        <DropdownItem onClick={() => setIsRecordPaymentDialogOpen(true)}>
                            <DropdownLabel>Record Payment</DropdownLabel>
                        </DropdownItem>
                    ) : null}
                    {canDelete ? (
                        <>
                            {visibleActions.length > 0 || canShowRecordPayment ? <DropdownDivider /> : null}
                            <DropdownItem onClick={() => setIsDeleteDialogOpen(true)}>
                                <DropdownLabel className='text-red-600 group-data-focus:text-white dark:text-red-400'>Delete</DropdownLabel>
                            </DropdownItem>
                        </>
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
                            <Button type='button' plain onClick={closeCreateInvoiceDialog}>Cancel</Button>
                            <Button color='purple'>Create Invoice and Approve</Button>
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
                            <Button type='button' plain onClick={closeDeliverDialog}>Cancel</Button>
                            <Button color='purple'>Mark Delivered</Button>
                        </DialogActions>
                    </form>
                </DialogBody>
            </Dialog>

            {confirmationAction ? (
                <ConfirmOrderActionDialog actionType={confirmationAction} orderId={orderId} orderNumber={orderNumber} onClose={closeConfirmationDialog} />
            ) : null}

            {canShowRecordPayment ? (
                <RecordPaymentDialog
                    orderId={orderId}
                    balanceCents={recordPaymentBalanceCents}
                    defaultPaidAt={defaultPaidAt}
                    open={isRecordPaymentDialogOpen}
                    onClose={closeRecordPaymentDialog}
                    showTrigger={false}
                />
            ) : null}

            <DeleteConfirmationDialog
                open={isDeleteDialogOpen}
                onClose={closeDeleteDialog}
                title='Delete Order'
                description={<>This will permanently delete Order #{orderNumber}{hasInvoice ? ' and its invoice' : ''}. Type DELETE to confirm.</>}
                action={deleteOrderAction.bind(null, orderId)}
                submitLabel='Delete Order'
            />
        </>
    );
}

function ConfirmOrderActionDialog({ actionType, orderId, orderNumber, onClose }: { actionType: ConfirmableOrderAction; orderId: string; orderNumber: number; onClose: () => void }): React.ReactElement {
    const details = confirmationDetailsForAction(actionType, orderNumber);

    return (
        <Dialog size='md' open onClose={onClose} className='relative'>
            <div className='flex items-start justify-between'>
                <DialogTitle className='pr-10'>{details.title}</DialogTitle>
                <button
                    type='button'
                    onClick={onClose}
                    className='relative -top-1 cursor-pointer rounded-lg bg-zinc-950 p-2 text-white transition hover:bg-zinc-800 focus:outline-hidden focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-500 dark:bg-zinc-950/40 dark:hover:bg-zinc-950'
                    aria-label='Close dialog'
                >
                    <XMarkIcon className='size-4' aria-hidden='true' />
                </button>
            </div>
            <DialogDescription>{details.description}</DialogDescription>
            <DialogBody>
                <form action={confirmationServerAction(actionType, orderId)}>
                    <DialogActions>
                        <Button type='button' plain onClick={onClose}>Cancel</Button>
                        <Button type='submit' color='red'>{details.submitLabel}</Button>
                    </DialogActions>
                </form>
            </DialogBody>
        </Dialog>
    );
}

function confirmationDetailsForAction(actionType: ConfirmableOrderAction, orderNumber: number): { title: string; description: string; submitLabel: string } {
    switch (actionType) {
        case 'reject':
            return {
                title: 'Mark Order as Rejected',
                description: `This will mark Order #${orderNumber} as rejected. Are you sure you want to continue?`,
                submitLabel: 'Mark as Rejected',
            };
        case 'cancel':
            return {
                title: 'Mark Order as Cancelled',
                description: `This will mark Order #${orderNumber} as cancelled. Are you sure you want to continue?`,
                submitLabel: 'Mark as Cancelled',
            };
        case 'close':
            return {
                title: 'Close Order',
                description: `This will close Order #${orderNumber}. Are you sure you want to continue?`,
                submitLabel: 'Close Order',
            };
    }
}

function confirmationServerAction(actionType: ConfirmableOrderAction, orderId: string): (formData?: FormData) => Promise<void> {
    switch (actionType) {
        case 'reject':
            return rejectOrderAction.bind(null, orderId);
        case 'cancel':
            return cancelOrderAction.bind(null, orderId);
        case 'close':
            return closeOrderAction.bind(null, orderId);
    }
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
