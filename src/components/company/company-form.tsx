import { COMPANY_STATUSES, FACILITY_TYPES, US_STATE_ABBREVIATIONS } from "@/lib/domain/constants";
import type { CompanyData } from "@/lib/domain/types";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";

export type CompanyFormValues = Pick<CompanyData, "company_name" | "license_number" | "status" | "facility_type" | "address" | "website_url" | "social_links">;

const socialIconClasses = "size-5 sm:size-4";

function defaultState(value: string | undefined): string {
  const state = value?.trim().toUpperCase() ?? "";
  return US_STATE_ABBREVIATIONS.includes(state as (typeof US_STATE_ABBREVIATIONS)[number]) ? state : "NY";
}

function isCompanyStatus(value: string | undefined): value is CompanyData["status"] {
  return COMPANY_STATUSES.some((status) => status === value);
}

function defaultCompanyStatus(value: string | undefined): CompanyData["status"] {
  return isCompanyStatus(value) ? value : "Lead";
}

export function FacebookIcon(props: React.SVGProps<SVGSVGElement>): React.ReactElement {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103.446.053.84.12 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036 26.805 26.805 0 0 0-.733-.009c-.707 0-1.259.096-1.675.309a1.686 1.686 0 0 0-.679.622c-.258.42-.374.995-.374 1.752v1.297h3.919l-.386 3.667h-3.533v7.98H9.101Z" />
    </svg>
  );
}

export function InstagramIcon(props: React.SVGProps<SVGSVGElement>): React.ReactElement {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M7.8 2h8.4C19.4 2 22 4.6 22 7.8v8.4a5.8 5.8 0 0 1-5.8 5.8H7.8C4.6 22 2 19.4 2 16.2V7.8A5.8 5.8 0 0 1 7.8 2Zm-.2 2A3.6 3.6 0 0 0 4 7.6v8.8C4 18.39 5.61 20 7.6 20h8.8a3.6 3.6 0 0 0 3.6-3.6V7.6C20 5.61 18.39 4 16.4 4H7.6Zm9.65 1.5A1.25 1.25 0 1 1 16 6.75a1.25 1.25 0 0 1 1.25-1.25ZM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z" />
    </svg>
  );
}

export function XIcon(props: React.SVGProps<SVGSVGElement>): React.ReactElement {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932Zm-1.291 19.49h2.039L6.486 3.24H4.298Z" />
    </svg>
  );
}

export function ThreadsIcon(props: React.SVGProps<SVGSVGElement>): React.ReactElement {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.598.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.016-2.91.022-5.11.936-6.54 2.717-1.329 1.656-2.016 4.063-2.04 7.153.024 3.087.711 5.493 2.04 7.153 1.43 1.781 3.63 2.695 6.54 2.717 2.623-.02 4.358-.631 5.8-2.045 1.647-1.613 1.618-3.593 1.076-4.795-.31-.689-.873-1.262-1.622-1.68-.185 1.325-.61 2.42-1.278 3.253-.874 1.09-2.112 1.68-3.681 1.756-1.188.065-2.35-.225-3.267-.813-1.085-.697-1.716-1.736-1.775-2.922-.047-.955.326-1.852 1.05-2.526.87-.81 2.19-1.25 3.706-1.235 1.092.008 2.117.14 3.061.393-.125-.74-.375-1.321-.755-1.735-.52-.568-1.334-.86-2.42-.868h-.03c-.878 0-2.062.242-2.78 1.386l-1.79-1.126c.93-1.48 2.537-2.294 4.526-2.294h.044c3.04.019 4.899 1.88 5.05 4.974.107.048.212.099.315.152 1.489.767 2.583 1.927 3.166 3.354.82 2.005.866 5.06-1.588 7.464C17.999 23.165 15.827 23.974 12.186 24Zm.477-10.499c-.88 0-1.651.242-2.126.684-.275.256-.407.565-.389.91.042.844.979 1.384 2.136 1.332 1.003-.052 1.754-.39 2.23-1.003.452-.581.742-1.385.866-2.395-.821-.345-1.744-.52-2.717-.528Z" />
    </svg>
  );
}

export function socialHandleFromValue(value: string | undefined, hosts: string[]): string {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) {
    return "";
  }

  const candidate = trimmed.replace(/^https?:\/\//i, "");
  const isProfileUrl = hosts.some((host) => candidate.toLowerCase().startsWith(`${host}/`) || candidate.toLowerCase().startsWith(`www.${host}/`));
  if (isProfileUrl) {
    try {
      const url = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${candidate}`);
      const segment = url.pathname.split("/").filter(Boolean)[0];
      return segment?.replace(/^@+/, "") ?? "";
    } catch {
      return trimmed.replace(/^@+/, "");
    }
  }

  return trimmed.replace(/^@+/, "");
}

export function CompanyForm({ company, action, submitLabel, footerStart, footerEnd }: { company?: CompanyFormValues; action: (formData: FormData) => void | Promise<void>; submitLabel: string; footerStart?: React.ReactNode; footerEnd?: React.ReactNode }): React.ReactElement {
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-6">
      <div className="sm:col-span-4">
        <Field label="Company name">
          <Input name="company_name" defaultValue={company?.company_name ?? ""} required />
        </Field>
      </div>
      <div className="sm:col-span-2">
        <Field label="Facility type">
          <Select name="facility_type" defaultValue={company?.facility_type ?? "Dispensary"} required>
            {FACILITY_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
          </Select>
        </Field>
      </div>
      <div className="sm:col-span-2">
        <Field label="Status">
          <Select name="status" defaultValue={defaultCompanyStatus(company?.status)} required>
            {COMPANY_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
          </Select>
        </Field>
      </div>
      <div className="sm:col-span-2">
        <Field label="License number">
          <Input name="license_number" defaultValue={company?.license_number ?? ""} />
        </Field>
      </div>
      <div className="sm:col-span-4">
        <Field label="Website">
          <Input name="website_url" type="url" defaultValue={company?.website_url ?? ""} />
        </Field>
      </div>
      <div className="sm:col-span-6">
        <Field label="Street">
          <Input name="address_street" defaultValue={company?.address.street ?? ""} />
        </Field>
      </div>
      <div className="sm:col-span-3">
        <Field label="City">
          <Input name="address_city" defaultValue={company?.address.city ?? ""} required />
        </Field>
      </div>
      <div className="sm:col-span-1">
        <Field label="State">
          <Select name="address_state" defaultValue={defaultState(company?.address.state)} required>
            {US_STATE_ABBREVIATIONS.map((state) => <option key={state} value={state}>{state}</option>)}
          </Select>
        </Field>
      </div>
      <div className="sm:col-span-2">
        <Field label="Postal code">
          <Input name="address_postal_code" defaultValue={company?.address.postal_code ?? ""} />
        </Field>
      </div>
      <div className="sm:col-span-3">
        <Field label="Facebook URL">
          <Input name="social_facebook" defaultValue={company?.social_links.facebook ?? ""} leadingIcon={<FacebookIcon className={socialIconClasses} aria-hidden="true" />} />
        </Field>
      </div>
      <div className="sm:col-span-3">
        <Field label="Instagram handle">
          <Input name="social_instagram" defaultValue={socialHandleFromValue(company?.social_links.instagram, ["instagram.com"])} leadingIcon={<InstagramIcon className={socialIconClasses} aria-hidden="true" />} />
        </Field>
      </div>
      <div className="sm:col-span-3">
        <Field label="X handle">
          <Input name="social_x" defaultValue={socialHandleFromValue(company?.social_links.x, ["x.com", "twitter.com"])} leadingIcon={<XIcon className={socialIconClasses} aria-hidden="true" />} />
        </Field>
      </div>
      <div className="sm:col-span-3">
        <Field label="Threads handle">
          <Input name="social_threads" defaultValue={socialHandleFromValue(company?.social_links.threads, ["threads.net"])} leadingIcon={<ThreadsIcon className={socialIconClasses} aria-hidden="true" />} />
        </Field>
      </div>
      {footerStart ? (
        <div className="flex flex-col gap-3 sm:col-span-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex">{footerStart}</div>
          <div className="flex gap-3">
            {footerEnd}
            <Button type="submit" color="purple">{submitLabel}</Button>
          </div>
        </div>
      ) : (
        <div className="flex gap-3 sm:col-span-6 sm:justify-end">
          {footerEnd}
          <Button type="submit" color="purple">{submitLabel}</Button>
        </div>
      )}
    </form>
  );
}
