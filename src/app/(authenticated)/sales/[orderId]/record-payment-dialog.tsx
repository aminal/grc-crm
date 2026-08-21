'use client';

import * as Headless from '@headlessui/react';
import { Pencil, X } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { DeleteConfirmationDialog, Dialog, DialogActions, DialogBody, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Field, Input, Select } from '@/components/ui/field';
import { PAYMENT_METHODS } from '@/lib/domain/constants';
import { formatDate, formatMoney } from '@/lib/domain/format';
import type { PaymentMethod } from '@/lib/domain/types';
import { addPaymentAction, deletePaymentAction, updatePaymentAction } from '../actions';

type RecordPaymentDialogProps = {
    orderId: string;
    balanceCents: number;
    defaultPaidAt: string;
    open?: boolean;
    onClose?: () => void;
    showTrigger?: boolean;
};

type EditablePayment = {
    id: string;
    method: PaymentMethod;
    method_label: string;
    amount_cents: number;
    paid_at: string;
    check_number: string;
};

type EditPaymentsDialogProps = {
    orderId: string;
    payments: EditablePayment[];
};

export function RecordPaymentDialog({
    orderId,
    balanceCents,
    defaultPaidAt,
    open,
    onClose,
    showTrigger = true
}: RecordPaymentDialogProps): React.ReactElement {
    const [isInternalOpen, setIsInternalOpen] = useState(false);
    const [method, setMethod] = useState('ach');
    const isOpen = open ?? isInternalOpen;

    function close(): void {
        setIsInternalOpen(false);
        onClose?.();
    }

    return (
        <>
            {showTrigger ? <Button type='button' color='emerald' onClick={() => setIsInternalOpen(true)}>
                Record Payment
            </Button> : null}
            <Dialog size='lg' open={isOpen} onClose={close} className='relative'>
                <Headless.CloseButton
                    className='absolute top-4 right-4 cursor-pointer rounded-lg bg-zinc-100 text-zinc-500 hover:bg-zinc-200! p-2 transition hover:bg-zinc-800 focus:outline-hidden focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-500 dark:bg-zinc-950/40 dark:hover:bg-zinc-950'
                    aria-label='Close dialog'
                >
                    <X className='size-4' aria-hidden='true' />
                </Headless.CloseButton>
                <DialogTitle className='pr-10'>Record Payment</DialogTitle>
                <DialogDescription>Record a payment for this invoice.</DialogDescription>
                <DialogBody>
                    <form action={addPaymentAction.bind(null, orderId)} className='grid gap-4 sm:grid-cols-2'>
                        <Field label='Amount'>
                            <Input name='amount' defaultValue={(balanceCents / 100).toFixed(2)} required />
                        </Field>
                        <Field label='Payment date'>
                            <Input name='paid_at' type='date' defaultValue={defaultPaidAt} required />
                        </Field>
                        <Field label='Method'>
                            <Select name='method' value={method} onChange={(event) => setMethod(event.target.value)}>
                                {Object.entries(PAYMENT_METHODS).map(([key, label]) =>
                                    <option key={key} value={key}>{label}</option>)}
                            </Select>
                        </Field>
                        {method === 'check' ? (
                            <Field label='Check number'>
                                <Input name='check_number' />
                            </Field>
                        ) : null}
                        <DialogActions className='sm:col-span-2'>
                            <Button type='button' plain onClick={close}>Cancel</Button>
                            <Button type='submit' color='purple'>Record Payment</Button>
                        </DialogActions>
                    </form>
                </DialogBody>
            </Dialog>
        </>
    );
}

export function EditPaymentsDialog({ orderId, payments }: EditPaymentsDialogProps): React.ReactElement {
    const [isOpen, setIsOpen] = useState(false);
    const [paymentToDelete, setPaymentToDelete] = useState<EditablePayment | null>(null);
    const title = payments.length === 1 ? 'Edit Payment' : 'Edit Payments';

    function close(): void {
        setIsOpen(false);
    }

    function closeDeleteDialog(): void {
        setPaymentToDelete(null);
    }

    return (
        <>
            <Button type='button' plain className='px-3! py-1.5!' onClick={() => setIsOpen(true)}>
                <Pencil data-slot='icon' aria-hidden='true' />
            </Button>
            <Dialog size='2xl' open={isOpen} onClose={close} className='relative'>
                <Headless.CloseButton
                    className='absolute top-4 right-4 cursor-pointer rounded-lg bg-zinc-100 text-zinc-500 hover:bg-zinc-200! p-2 transition hover:bg-zinc-800 focus:outline-hidden focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-500 dark:bg-zinc-950/40 dark:hover:bg-zinc-950'
                    aria-label='Close dialog'
                >
                    <X className='size-4' aria-hidden='true' />
                </Headless.CloseButton>
                <DialogTitle className='pr-10'>{title}</DialogTitle>
                <DialogDescription>Update or delete invoice payments.</DialogDescription>
                <DialogBody>
                    <div className='space-y-4'>
                        {payments.map((payment) => (
                            <div key={payment.id} className='rounded-xl border border-zinc-950/10 bg-zinc-50 p-4 dark:border-white/10 dark:bg-zinc-950/40'>
                                <div className='mb-4 flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between'>
                                    <div>
                                        <p className='font-semibold text-zinc-950 dark:text-white'>{formatMoney(payment.amount_cents)}</p>
                                        <p className='mt-1 text-sm text-zinc-600 dark:text-zinc-300'>{payment.method_label} · {formatDate(payment.paid_at)}</p>
                                    </div>
                                    {payment.check_number ? <p className='text-sm font-medium text-zinc-600 dark:text-zinc-300'>Check #{payment.check_number}</p> : null}
                                </div>
                                <div className='grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end'>
                                    <form action={updatePaymentAction.bind(null, orderId, payment.id)} className='grid gap-3 sm:grid-cols-2'>
                                        <Field label='Amount'>
                                            <Input name='amount' defaultValue={(payment.amount_cents / 100).toFixed(2)} required />
                                        </Field>
                                        <Field label='Payment date'>
                                            <Input name='paid_at' type='date' defaultValue={payment.paid_at} required />
                                        </Field>
                                        <Field label='Method'>
                                            <Select name='method' defaultValue={payment.method}>
                                                {Object.entries(PAYMENT_METHODS).map(([key, label]) =>
                                                    <option key={key} value={key}>{label}</option>)}
                                            </Select>
                                        </Field>
                                        <Field label='Check number'>
                                            <Input name='check_number' defaultValue={payment.check_number} />
                                        </Field>
                                        <div className='sm:col-span-2 sm:flex sm:justify-end'>
                                            <Button type='submit' color='emerald'>Save Payment</Button>
                                        </div>
                                    </form>
                                    <div className='lg:justify-self-end'>
                                        <Button type='button' color='red' onClick={() => setPaymentToDelete(payment)}>Delete Payment</Button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </DialogBody>
            </Dialog>
            {paymentToDelete ? (
                <DeleteConfirmationDialog
                    open={Boolean(paymentToDelete)}
                    onClose={closeDeleteDialog}
                    title='Delete Payment'
                    description={<>This will permanently delete the {formatMoney(paymentToDelete.amount_cents)} {paymentToDelete.method_label} payment from {formatDate(paymentToDelete.paid_at)}. Type DELETE to confirm.</>}
                    action={deletePaymentAction.bind(null, orderId, paymentToDelete.id)}
                    submitLabel='Delete Payment'
                />
            ) : null}
        </>
    );
}
