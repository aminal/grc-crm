"use client";

import { useState } from "react";
import { Field, Select, Textarea } from "@/components/ui/field";
import { ORDER_TERMS } from "@/lib/domain/constants";
import type { OrderTerms } from "@/lib/domain/types";

type OrderTermsFieldProps = {
  defaultTerms?: OrderTerms | "";
  defaultTermsNotes?: string;
};

export function OrderTermsField({ defaultTerms = "", defaultTermsNotes = "" }: OrderTermsFieldProps = {}): React.ReactElement {
  const [terms, setTerms] = useState<OrderTerms | "">(defaultTerms);

  return (
    <>
      <Field label="Terms">
        <Select name="terms" value={terms} onChange={(event) => setTerms(event.target.value as OrderTerms)} required>
          <option value="" disabled>Choose terms</option>
          {ORDER_TERMS.map((option) => <option key={option} value={option}>{option}</option>)}
        </Select>
      </Field>
      {terms === "Other" ? (
        <Field label="Terms notes" className="sm:col-span-2 xl:col-span-3">
          <Textarea name="terms_notes" rows={3} placeholder="Add notes for other terms" defaultValue={defaultTermsNotes} />
        </Field>
      ) : null}
    </>
  );
}
