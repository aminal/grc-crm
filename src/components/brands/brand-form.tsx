import { Button } from "@/components/ui/button";
import { DialogActions } from "@/components/ui/dialog";
import { Field, Input, Textarea } from "@/components/ui/field";
import type { BrandData } from "@/lib/domain/types";

export type BrandFormValues = Pick<BrandData, "name" | "website" | "notes">;

type BrandFormProps = {
  brand?: BrandFormValues;
  action: (formData: FormData) => void | Promise<void>;
  submitLabel: string;
  pendingLabel: string;
  pending: boolean;
  error: string | null;
  showReason: boolean;
  onCancel: () => void;
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
}: BrandFormProps): React.ReactElement {
  return (
    <form action={action} className="space-y-4">
      {error ? <div className="rounded-lg bg-red-500/15 p-3 text-sm/6 font-medium text-red-700 ring-1 ring-red-500/20">{error}</div> : null}
      <Field label="Name">
        <Input name="name" defaultValue={brand?.name ?? ""} required disabled={pending} />
      </Field>
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
        <Button type="button" variant="plain" onClick={onCancel} disabled={pending}>Cancel</Button>
        <Button disabled={pending}>{pending ? pendingLabel : submitLabel}</Button>
      </DialogActions>
    </form>
  );
}
