'use client';

import { useState } from 'react';
import { Field, Input, Select } from '@/components/ui/field';

export function DeliveryDateField(): React.ReactElement {
    const [status, setStatus] = useState('tbd');

    return (
        <>
            <Field label='Delivery'>
                <Select name='delivery_date_status' value={status} onChange={(event) => setStatus(event.target.value)} required>
                    <option value='tbd'>TBD</option>
                    <option value='date'>Select a date</option>
                </Select>
            </Field>
            {status === 'date' ? (
                <Field label='Estimated Delivery Date'>
                    <Input name='delivery_date' type='date' required />
                </Field>
            ) : null}
        </>
    );
}
