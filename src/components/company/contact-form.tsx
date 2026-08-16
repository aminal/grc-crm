import { PREFERRED_COMMUNICATION_METHODS } from "@/lib/domain/constants";
import type { ContactData } from "@/lib/domain/types";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";

export type ContactFormValues = Pick<ContactData, "name" | "title" | "email" | "phone" | "preferred_communication" | "instagram_handle" | "x_handle" | "social_links">;

type ContactFormProps = {
  contact?: ContactFormValues;
  action: (formData: FormData) => void | Promise<void>;
  submitLabel: string;
  footerStart?: React.ReactNode;
  footerEnd?: React.ReactNode;
};

export function ContactForm({ contact, action, submitLabel, footerStart, footerEnd }: ContactFormProps): React.ReactElement {
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <Field label="Name">
        <Input name="name" defaultValue={contact?.name ?? ""} required />
      </Field>
      <Field label="Title">
        <Input name="title" defaultValue={contact?.title ?? ""} />
      </Field>
      <Field label="Email">
        <Input name="email" type="email" defaultValue={contact?.email ?? ""} />
      </Field>
      <Field label="Phone">
        <Input name="phone" defaultValue={contact?.phone ?? ""} />
      </Field>
      <Field label="Preferred communication">
        <Select name="preferred_communication" defaultValue={contact?.preferred_communication ?? "Email"}>
          {PREFERRED_COMMUNICATION_METHODS.map((method) => <option key={method} value={method}>{method}</option>)}
        </Select>
      </Field>
      <Field label="Instagram handle">
        <Input name="instagram_handle" defaultValue={contact?.instagram_handle ?? ""} />
      </Field>
      <Field label="X handle">
        <Input name="x_handle" defaultValue={contact?.x_handle ?? ""} />
      </Field>
      <Field label="Facebook URL">
        <Input name="social_facebook" defaultValue={contact?.social_links.facebook ?? ""} />
      </Field>
      {footerStart ? (
        <div className="flex flex-col gap-3 sm:col-span-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex">{footerStart}</div>
          <div className="flex gap-3">
            {footerEnd}
            <Button type="submit" color="purple">{submitLabel}</Button>
          </div>
        </div>
      ) : (
        <div className="flex justify-end gap-3 sm:col-span-2">
          {footerEnd}
          <Button type="submit" color="purple">{submitLabel}</Button>
        </div>
      )}
    </form>
  );
}
