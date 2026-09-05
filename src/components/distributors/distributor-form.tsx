import { Button } from "@/components/ui/button";
import { DialogActions } from "@/components/ui/dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { US_STATE_ABBREVIATIONS } from "@/lib/domain/constants";
import type { DistributorData } from "@/lib/domain/types";

export type DistributorFormValues = Pick<DistributorData, "name" | "license_number" | "contact_name" | "email" | "phone" | "address" | "notes">;

type DistributorFormProps = {
  distributor?: DistributorFormValues;
  action: (formData: FormData) => void | Promise<void>;
  submitLabel: string;
  pendingLabel: string;
  pending: boolean;
  error: string | null;
  showReason: boolean;
  onCancel: () => void;
  onArchive?: () => void;
};

function defaultState(state: string | undefined): string {
  const normalized = (state ?? "").trim().toUpperCase();
  return US_STATE_ABBREVIATIONS.includes(normalized as (typeof US_STATE_ABBREVIATIONS)[number]) ? normalized : "";
}

export function DistributorForm({
  distributor,
  action,
  submitLabel,
  pendingLabel,
  pending,
  error,
  showReason,
  onCancel,
  onArchive,
}: DistributorFormProps): React.ReactElement {
  return (
    <form action={action} className="space-y-4">
      {error ? <div className="rounded-lg bg-red-500/15 p-3 text-sm/6 font-medium text-red-700 ring-1 ring-red-500/20">{error}</div> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name">
          <Input name="name" defaultValue={distributor?.name ?? ""} required disabled={pending} />
        </Field>
        <Field label="License number">
          <Input name="license_number" defaultValue={distributor?.license_number ?? ""} disabled={pending} />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Contact name">
          <Input name="contact_name" defaultValue={distributor?.contact_name ?? ""} disabled={pending} />
        </Field>
        <Field label="Email">
          <Input name="email" type="email" defaultValue={distributor?.email ?? ""} disabled={pending} />
        </Field>
        <Field label="Phone">
          <Input name="phone" defaultValue={distributor?.phone ?? ""} disabled={pending} />
        </Field>
      </div>
      <Field label="Street">
        <Input name="address_street" defaultValue={distributor?.address.street ?? ""} disabled={pending} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_6rem_8rem]">
        <Field label="City">
          <Input name="address_city" defaultValue={distributor?.address.city ?? ""} disabled={pending} />
        </Field>
        <Field label="State">
          <Select name="address_state" defaultValue={defaultState(distributor?.address.state)} disabled={pending}>
            <option value="">—</option>
            {US_STATE_ABBREVIATIONS.map((state) => <option key={state} value={state}>{state}</option>)}
          </Select>
        </Field>
        <Field label="Postal code">
          <Input name="address_postal_code" defaultValue={distributor?.address.postal_code ?? ""} disabled={pending} />
        </Field>
      </div>
      <Field label="Notes">
        <Textarea name="notes" defaultValue={distributor?.notes ?? ""} rows={4} disabled={pending} />
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
