import { z } from "zod";
import {
  DUE_TERMS,
  FACILITY_TYPES,
  INTERACTION_METHODS,
  PAYMENT_METHODS,
  PREFERRED_COMMUNICATION_METHODS,
  US_STATE_ABBREVIATIONS,
} from "./constants";
import { e164Phone } from "./phone";

const optionalString = z.preprocess((value) => (typeof value === "string" ? value.trim() : value), z.string()).optional().default("");
const requiredString = z.preprocess((value) => (typeof value === "string" ? value.trim() : value), z.string().min(1));
const requiredShortString = requiredString.pipe(z.string().max(255));
const optionalLongString = optionalString.pipe(z.string().max(5000));
const requiredLongString = requiredString.pipe(z.string().max(5000));
const optionalUrl = optionalString.refine((value) => value === "" || /^https?:\/\//i.test(value), "Enter a valid http or https URL.");
const optionalInstagramHandle = optionalString.transform((value) => socialHandleFromInput(value, ["instagram.com"]));
const optionalXHandle = optionalString.transform((value) => socialHandleFromInput(value, ["x.com", "twitter.com"]));
const optionalThreadsHandle = optionalString.transform((value) => socialHandleFromInput(value, ["threads.net"]));
const optionalEmail = optionalString.refine((value) => value === "" || z.email().safeParse(value).success, "Enter a valid email address.");
const optionalDialablePhone = optionalString.refine((value) => value === "" || e164Phone(value) !== null, "Enter a dialable phone number.");
const requiredState = z.preprocess((value) => typeof value === "string" ? value.trim().toUpperCase() : value, z.enum(US_STATE_ABBREVIATIONS));
const centsFromMoney = z.preprocess((value) => {
  if (typeof value !== "string" && typeof value !== "number") {
    return value;
  }

  const clean = String(value).replace(/[^0-9.-]/g, "");
  if (!clean) {
    return Number.NaN;
  }

  return Math.round(Number(clean) * 100);
}, z.number().int().min(1, "Amount must be at least $0.01."));

function socialHandleFromInput(value: string, hosts: string[]): string {
  const trimmed = value.trim();
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

export const companySchema = z.object({
  company_name: requiredShortString,
  license_number: optionalString,
  facility_type: z.enum(FACILITY_TYPES),
  address_street: optionalString,
  address_city: requiredShortString,
  address_state: requiredState,
  address_postal_code: optionalString,
  website_url: optionalUrl,
  social_facebook: optionalUrl,
  social_instagram: optionalInstagramHandle,
  social_x: optionalXHandle,
  social_threads: optionalThreadsHandle,
});

export const contactSchema = z.object({
  name: requiredShortString,
  title: optionalString,
  email: optionalEmail,
  phone: optionalDialablePhone,
  preferred_communication: z.enum(PREFERRED_COMMUNICATION_METHODS).optional().default("Email"),
  instagram_handle: optionalString,
  x_handle: optionalString,
  social_facebook: optionalUrl,
  is_primary: z.coerce.boolean().optional().default(false),
});

export const interactionSchema = z.object({
  contact_date_time: optionalString,
  interaction_method: z.enum(INTERACTION_METHODS),
  discussion_notes: requiredString.pipe(z.string().max(5000)),
});

export const interactionEntrySchema = z.object({
  discussion_notes: requiredString.pipe(z.string().max(5000)),
});

export const profileSchema = z.object({
  display_name: requiredShortString,
  google_voice_number: z.preprocess((value) => {
    if (typeof value !== "string") {
      return value;
    }

    const trimmed = value.trim();
    if (!trimmed) {
      return "";
    }

    return e164Phone(trimmed) ?? trimmed;
  }, z.string().refine((value) => value === "" || /^\+[1-9]\d{7,14}$/.test(value), "Enter a valid phone number.")),
});

export const createOrderSchema = z.object({
  company_id: requiredString,
  package_tags: z.array(requiredString).min(1, "Choose at least one package."),
  package_prices: z.record(z.string(), centsFromMoney),
}).superRefine((value, context) => {
  for (const tag of value.package_tags) {
    if (value.package_prices[tag] === undefined) {
      context.addIssue({
        code: "custom",
        path: ["package_prices", tag],
        message: `Enter a price for package ${tag}.`,
      });
    }
  }
});

export const dueTermsSchema = z.object({
  due_terms: z.enum(Object.keys(DUE_TERMS) as [keyof typeof DUE_TERMS, ...(keyof typeof DUE_TERMS)[]]),
});

export const deliverySchema = z.object({
  delivered_at: optionalString,
});

export const paymentSchema = z.object({
  amount: centsFromMoney,
  method: z.enum(Object.keys(PAYMENT_METHODS) as [keyof typeof PAYMENT_METHODS, ...(keyof typeof PAYMENT_METHODS)[]]),
  check_number: optionalString,
  paid_at: requiredString,
}).superRefine((value, context) => {
  if (value.method === "check" && !value.check_number) {
    context.addIssue({
      code: "custom",
      path: ["check_number"],
      message: "A check number is required for check payments.",
    });
  }
});

export const addPackagesSchema = z.object({
  package_tags: z.array(requiredString).min(1),
  package_prices: z.record(z.string(), centsFromMoney),
}).superRefine((value, context) => {
  for (const tag of value.package_tags) {
    if (value.package_prices[tag] === undefined) {
      context.addIssue({
        code: "custom",
        path: ["package_prices", tag],
        message: `Enter a price for package ${tag}.`,
      });
    }
  }
});

export const removePackagesSchema = z.object({
  package_tags: z.array(requiredString).min(1),
});

export const brandCreateSchema = z.object({
  name: requiredShortString,
  website: optionalUrl,
  notes: optionalLongString,
});

export const brandUpdateSchema = brandCreateSchema;

export const productCreateSchema = z.object({
  name: requiredShortString,
  brand_id: requiredString,
  category: optionalString.pipe(z.string().max(255)),
  sku: optionalString.pipe(z.string().max(255)),
  notes: optionalLongString,
});

export const productUpdateSchema = productCreateSchema;

export const editReasonSchema = z.object({
  reason: requiredLongString,
});

export function formEntries(formData: FormData): Record<string, FormDataEntryValue | FormDataEntryValue[]> {
  const output: Record<string, FormDataEntryValue | FormDataEntryValue[]> = {};

  for (const [key, value] of formData.entries()) {
    const existing = output[key];
    if (existing === undefined) {
      output[key] = value;
    } else if (Array.isArray(existing)) {
      existing.push(value);
    } else {
      output[key] = [existing, value];
    }
  }

  return output;
}

export function packageTagsFromForm(formData: FormData): string[] {
  return formData.getAll("package_tags").map(String).map((tag) => tag.trim()).filter(Boolean);
}

export function packagePricesFromForm(formData: FormData): Record<string, string> {
  const prices: Record<string, string> = {};

  for (const [key, value] of formData.entries()) {
    const match = key.match(/^package_prices\[(.+)]$/);
    const price = String(value).trim();
    if (match?.[1] && price !== "") {
      prices[match[1]] = price;
    }
  }

  return prices;
}

export function validationMessage(error: unknown): string {
  if (error instanceof z.ZodError) {
    return error.issues[0]?.message ?? "Invalid input.";
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Something went wrong.";
}
