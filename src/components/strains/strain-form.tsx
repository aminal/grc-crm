import { StrainCompositionSlider } from "@/components/strains/strain-composition-slider";
import { Button } from "@/components/ui/button";
import { DialogActions } from "@/components/ui/dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { STRAIN_STATUSES } from "@/lib/domain/constants";
import type { StrainData } from "@/lib/domain/types";

export type StrainFormValues = Pick<StrainData, "name" | "breeder" | "genetics" | "status" | "notes"> & Partial<Pick<StrainData, "sativa_percentage">>;

type StrainFormProps = {
  strain?: StrainFormValues;
  action: (formData: FormData) => void | Promise<void>;
  submitLabel: string;
  pendingLabel: string;
  pending: boolean;
  error: string | null;
  showReason: boolean;
  onCancel: () => void;
};

export function StrainForm({
  strain,
  action,
  submitLabel,
  pendingLabel,
  pending,
  error,
  showReason,
  onCancel,
}: StrainFormProps): React.ReactElement {
  return (
    <form action={action} className="space-y-4">
      {error ? <div className="rounded-lg bg-red-500/15 p-3 text-sm/6 font-medium text-red-700 ring-1 ring-red-500/20">{error}</div> : null}
      <Field label="Name">
        <Input name="name" defaultValue={strain?.name ?? ""} required disabled={pending} />
      </Field>
      <Field label="Breeder">
        <Input name="breeder" defaultValue={strain?.breeder ?? ""} disabled={pending} />
      </Field>
      <Field label="Genetics">
        <Input name="genetics" defaultValue={strain?.genetics ?? ""} disabled={pending} />
      </Field>
      <Field label="Composition">
        <StrainCompositionSlider defaultValue={strain?.sativa_percentage ?? 50} disabled={pending} />
      </Field>
      <Field label="Status">
        <Select name="status" defaultValue={strain?.status ?? "Active"} required disabled={pending}>
          {STRAIN_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
        </Select>
      </Field>
      <Field label="Notes">
        <Textarea name="notes" defaultValue={strain?.notes ?? ""} rows={4} disabled={pending} />
      </Field>
      {showReason ? (
        <Field label="Reason for edit">
          <Textarea name="reason" rows={3} required disabled={pending} />
        </Field>
      ) : null}
      <DialogActions>
        <Button type="button" plain onClick={onCancel} disabled={pending}>Cancel</Button>
        <Button type="submit" color="purple" disabled={pending}>{pending ? pendingLabel : submitLabel}</Button>
      </DialogActions>
    </form>
  );
}
