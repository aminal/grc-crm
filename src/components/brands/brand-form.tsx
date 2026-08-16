import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DialogActions } from "@/components/ui/dialog";
import { Field, Input, Textarea } from "@/components/ui/field";
import { brandAcronymFromName } from "@/lib/domain/brand";
import type { BrandData } from "@/lib/domain/types";

export type BrandFormValues = Pick<BrandData, "name" | "acronym" | "website" | "notes">;

type BrandFormProps = {
  brand?: BrandFormValues;
  action: (formData: FormData) => void | Promise<void>;
  submitLabel: string;
  pendingLabel: string;
  pending: boolean;
  error: string | null;
  showReason: boolean;
  onCancel: () => void;
  onArchive?: () => void;
};

export function BrandForm({
  brand,
  action,
  submitLabel,
  pendingLabel,
  pending,
  error,
  showReason,
  onCancel,
  onArchive,
}: BrandFormProps): React.ReactElement {
  const initialName = brand?.name ?? "";
  const generatedInitialAcronym = brandAcronymFromName(initialName);
  const initialAcronym = brand?.acronym?.trim() ? brand.acronym : generatedInitialAcronym;
  const [name, setName] = useState(initialName);
  const [acronym, setAcronym] = useState(initialAcronym);
  const [acronymEdited, setAcronymEdited] = useState(initialAcronym !== generatedInitialAcronym);

  function handleNameChange(event: React.ChangeEvent<HTMLInputElement>): void {
    const nextName = event.target.value;
    setName(nextName);
    if (!acronymEdited) {
      setAcronym(brandAcronymFromName(nextName));
    }
  }

  function handleAcronymChange(event: React.ChangeEvent<HTMLInputElement>): void {
    setAcronym(event.target.value);
    setAcronymEdited(true);
  }

  return (
    <form action={action} className="space-y-4">
      {error ? <div className="rounded-lg bg-red-500/15 p-3 text-sm/6 font-medium text-red-700 ring-1 ring-red-500/20">{error}</div> : null}
      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_10rem]">
        <Field label="Name">
          <Input name="name" value={name} onChange={handleNameChange} required disabled={pending} />
        </Field>
        <Field label="Acronym">
          <Input name="acronym" value={acronym} onChange={handleAcronymChange} disabled={pending} />
        </Field>
      </div>
      <Field label="Website">
        <Input name="website" type="url" defaultValue={brand?.website ?? ""} placeholder="https://example.com" disabled={pending} />
      </Field>
      <Field label="Notes">
        <Textarea name="notes" defaultValue={brand?.notes ?? ""} rows={4} disabled={pending} />
      </Field>
      {showReason ? (
        <Field label="Reason for edit">
          <Textarea name="reason" rows={3} required disabled={pending} />
        </Field>
      ) : null}
      <DialogActions>
        {onArchive ? <Button type="button" color="red" className="sm:mr-auto" onClick={onArchive} disabled={pending}>Archive</Button> : null}
        <Button type="button" plain onClick={onCancel} disabled={pending}>Cancel</Button>
        <Button type="submit" color="purple" disabled={pending}>{pending ? pendingLabel : submitLabel}</Button>
      </DialogActions>
    </form>
  );
}
