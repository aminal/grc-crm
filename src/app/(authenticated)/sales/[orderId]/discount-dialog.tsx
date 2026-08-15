"use client";

import * as Headless from "@headlessui/react";
import { DollarSign, Percent, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogActions, DialogBody, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Field, Input, Select } from "@/components/ui/field";
import { updateDiscountAction } from "../actions";

type DiscountDialogDiscount = {
  type: "percent" | "amount";
  value: number;
};

type DiscountDialogDiscountType = DiscountDialogDiscount["type"] | "none";

type DiscountDialogProps = {
  orderId: string;
  discount: DiscountDialogDiscount | null;
};

export function DiscountDialog({ orderId, discount }: DiscountDialogProps): React.ReactElement {
  const initialDiscountType = discount?.type ?? "none";
  const initialDiscountValue = discount ? (discount.type === "percent" ? String(discount.value) : (discount.value / 100).toFixed(2)) : "";
  const [isOpen, setIsOpen] = useState(false);
  const [discountType, setDiscountType] = useState<DiscountDialogDiscountType>(initialDiscountType);
  const [discountValue, setDiscountValue] = useState(initialDiscountValue);
  const title = discount ? "Update Discount" : "Apply Discount";

  function open(): void {
    setDiscountType(initialDiscountType);
    setDiscountValue(initialDiscountValue);
    setIsOpen(true);
  }

  function close(): void {
    setIsOpen(false);
  }

  function handleDiscountValueChange(event: React.ChangeEvent<HTMLInputElement>): void {
    setDiscountValue(event.target.value);
  }

  function handleDiscountValueBlur(): void {
    if (discountType !== "none" && isZeroDiscountValue(discountValue)) {
      setDiscountType("none");
    }
  }

  return (
    <>
      <Button type="button" variant="secondary" onClick={open}>{title}</Button>
      <Dialog size="lg" open={isOpen} onClose={close} className="relative">
        <Headless.CloseButton
          className="absolute top-4 right-4 cursor-pointer rounded-lg bg-zinc-100 text-zinc-500 hover:bg-zinc-200! p-2 transition hover:bg-zinc-800 focus:outline-hidden focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-500 dark:bg-zinc-950/40 dark:hover:bg-zinc-950"
          aria-label="Close dialog"
        >
          <X className="size-4" aria-hidden="true" />
        </Headless.CloseButton>
        <DialogTitle className="pr-10">{title}</DialogTitle>
        <DialogDescription>{discount ? "Update the discount for this invoice." : "Apply a discount to this invoice."}</DialogDescription>
        <DialogBody>
          <form action={updateDiscountAction.bind(null, orderId)} className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Discount type">
                <Select
                  name="discount_type"
                  value={discountType}
                  onChange={(event) => setDiscountType(event.target.value as DiscountDialogDiscountType)}
                >
                  <option value="none">No discount</option>
                  <option value="percent">Percent</option>
                  <option value="amount">Amount</option>
                </Select>
              </Field>
              <Field label="Discount value">
                <Input
                  name="discount_value"
                  value={discountValue}
                  onChange={handleDiscountValueChange}
                  onBlur={handleDiscountValueBlur}
                  leadingIcon={discountType === "amount" ? <DollarSign className="size-4" aria-hidden="true" /> : undefined}
                  trailingIcon={discountType === "percent" ? <Percent className="size-4" aria-hidden="true" /> : undefined}
                />
              </Field>
            </div>
            <DialogActions>
              <Button type="button" variant="plain" onClick={close}>Cancel</Button>
              <Button type="submit">{title}</Button>
            </DialogActions>
          </form>
        </DialogBody>
      </Dialog>
    </>
  );
}

function isZeroDiscountValue(value: string): boolean {
  const cleanValue = value.trim().replace(/[^0-9.-]/g, "");

  if (!cleanValue) {
    return false;
  }

  const numberValue = Number(cleanValue);
  return Number.isFinite(numberValue) && numberValue === 0;
}
