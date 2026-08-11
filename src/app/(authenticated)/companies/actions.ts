"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import {
  createCompany,
  createContact,
  createInteraction,
  createInteractionEntry,
  deleteCompany,
  deleteContact,
  findCompany,
  setPrimaryContact,
  updateCompany,
  updateContact,
} from "@/lib/data/crm";
import { companyPath } from "@/lib/domain/company-slug";
import { companySchema, contactSchema, formEntries, interactionEntrySchema, interactionSchema } from "@/lib/domain/schemas";

export async function createCompanyAction(formData: FormData): Promise<void> {
  await requireUser();
  const input = companySchema.parse(formEntries(formData));
  const company = await createCompany(input);
  revalidatePath("/companies");
  redirect(companyPath(company));
}

export async function updateCompanyAction(companyId: string, formData: FormData): Promise<void> {
  await requireUser();
  const input = companySchema.parse(formEntries(formData));
  const currentCompany = await findCompany(companyId);
  const company = await updateCompany(companyId, input);
  revalidatePath("/companies");
  if (currentCompany) {
    revalidatePath(companyPath(currentCompany));
  }
  revalidatePath(companyPath(company));
  redirect(companyPath(company));
}

export async function deleteCompanyAction(companyId: string, formData: FormData): Promise<void> {
  await requireUser();
  if (formData.get("confirmation") !== "DELETE") {
    throw new Error("Type DELETE to confirm company deletion.");
  }
  const currentCompany = await findCompany(companyId);
  await deleteCompany(companyId);
  revalidatePath("/companies");
  if (currentCompany) {
    revalidatePath(companyPath(currentCompany));
  }
  redirect("/companies");
}

export async function createContactAction(companyId: string, formData: FormData): Promise<void> {
  await requireUser();
  const input = contactSchema.parse(formEntries(formData));
  await createContact(companyId, input);
  const path = await companyBasePath(companyId);
  revalidatePath(path);
  redirect(`${path}/contacts`);
}

export async function updateContactAction(companyId: string, contactId: string, formData: FormData): Promise<void> {
  await requireUser();
  const input = contactSchema.parse(formEntries(formData));
  await updateContact(companyId, contactId, input);
  const path = await companyBasePath(companyId);
  revalidatePath(path);
  redirect(`${path}/contacts`);
}

export async function deleteContactAction(companyId: string, contactId: string, formData: FormData): Promise<void> {
  await requireUser();
  if (formData.get("confirmation") !== "DELETE") {
    throw new Error("Type DELETE to confirm contact deletion.");
  }
  await deleteContact(companyId, contactId);
  const path = await companyBasePath(companyId);
  revalidatePath(path);
  redirect(`${path}/contacts`);
}

export async function setPrimaryContactAction(companyId: string, contactId: string): Promise<void> {
  await requireUser();
  await setPrimaryContact(companyId, contactId);
  const path = await companyBasePath(companyId);
  revalidatePath(path);
  redirect(`${path}/contacts`);
}

export async function createInteractionAction(companyId: string, formData: FormData): Promise<void> {
  const user = await requireUser();
  const input = interactionSchema.parse(formEntries(formData));
  await createInteraction(companyId, input, user);
  const path = await companyBasePath(companyId);
  revalidatePath(path);
  redirect(`${path}/activity`);
}

export async function createInteractionEntryAction(companyId: string, interactionId: string, formData: FormData): Promise<void> {
  const user = await requireUser();
  const input = interactionEntrySchema.parse(formEntries(formData));
  await createInteractionEntry(companyId, interactionId, input, user);
  const path = await companyBasePath(companyId);
  revalidatePath(path);
  redirect(`${path}/activity`);
}

async function companyBasePath(companyId: string): Promise<string> {
  const company = await findCompany(companyId);
  return company ? companyPath(company) : `/companies/${companyId}`;
}
