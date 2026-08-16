'use client';

import * as Headless from '@headlessui/react';
import { X } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogActions, DialogBody, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Field, Input, Select } from '@/components/ui/field';
import { PAYMENT_METHODS } from '@/lib/domain/constants';
import { addPaymentAction } from '../actions';

type RecordPaymentDialogProps = {
    orderId: string;
    balanceCents: number;
    defaultPaidAt: string;
    open?: boolean;
    onClose?: () => void;
    showTrigger?: boolean;
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
            {showTrigger ? <Button type='button' color='emerald' onClick={() => setIsInternalOpen(true)}>Record
                Payment</Button> : null}
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
