import "server-only";

import { FieldValue } from "firebase-admin/firestore";
import { db } from "@/lib/firebase/admin";
import type {
  AuthenticatedUser,
  CompanyData,
  ContactData,
  FirestoreRecord,
  InteractionData,
  InteractionEntryData,
  InteractionMethod,
  PreferredCommunicationMethod,
  SocialLinks,
} from "@/lib/domain/types";
import { PREFERRED_COMMUNICATION_METHODS } from "@/lib/domain/constants";
import { companySlugBase, uniqueCompanySlug } from "@/lib/domain/company-slug";
import { getDocument, listCollection, millis, now } from "./firestore";
import { userDirectory } from "./profiles";

const COMPANIES = "companies";

type CompanyInput = {
  company_name: string;
  license_number: string;
  facility_type: CompanyData["facility_type"];
  address_street: string;
  address_city: string;
  address_state: string;
  address_postal_code: string;
  website_url: string;
  social_facebook: string;
  social_instagram: string;
  social_x: string;
  social_threads: string;
};

type ContactInput = {
  name: string;
  title: string;
  email: string;
  phone: string;
  preferred_communication: PreferredCommunicationMethod | "Instagram";
  instagram_handle: string;
  x_handle: string;
  social_facebook: string;
  is_primary: boolean;
};

type ContactDefaultsInput = Partial<Omit<ContactData, "preferred_communication">> & {
  preferred_communication?: PreferredCommunicationMethod | "Instagram";
};

function socialLinks(input: CompanyInput): Required<SocialLinks> {
  return {
    facebook: input.social_facebook,
    instagram: input.social_instagram,
    x: input.social_x,
    threads: input.social_threads,
  };
}

function companySlugFromInput(input: CompanyInput): string {
  return companySlugBase(input.company_name, input.address_city);
}

function companySlugFromRecord(company: FirestoreRecord<CompanyData>): string {
  return company.data.slug?.trim() || companySlugBase(company.data.company_name, company.data.address?.city ?? "");
}

function usedCompanySlugs(companies: FirestoreRecord<CompanyData>[], currentCompanyId?: string): string[] {
  return companies.flatMap((company) => company.id === currentCompanyId ? [] : [companySlugFromRecord(company)]).filter(Boolean);
}

function nextCompanySlug(input: CompanyInput, companies: FirestoreRecord<CompanyData>[], currentCompanyId?: string): string {
  return uniqueCompanySlug(companySlugFromInput(input), usedCompanySlugs(companies, currentCompanyId));
}

function socialProfileUrl(handle: string, baseUrl: string): string {
  const trimmed = handle.trim();
  if (!trimmed) {
    return "";
  }

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }

  return `${baseUrl}${trimmed.replace(/^[@/]+/, "")}`;
}

function companyInstagram(companyData: Partial<CompanyData>): string {
  return companyData.social_links?.instagram?.trim() ?? "";
}

function companyFacebook(companyData: Partial<CompanyData>): string {
  return companyData.social_links?.facebook?.trim() ?? "";
}

function preferredCommunication(input: Partial<ContactInput>, companyData: Partial<CompanyData>): PreferredCommunicationMethod {
  const preferred = input.preferred_communication;
  if (preferred === "Instagram") {
    return companyInstagram(companyData) ? "Company IG" : "Personal IG";
  }

  if (preferred && PREFERRED_COMMUNICATION_METHODS.includes(preferred as PreferredCommunicationMethod)) {
    return preferred as PreferredCommunicationMethod;
  }

  if (input.email?.trim()) {
    return "Email";
  }

  if (companyInstagram(companyData)) {
    return "Company IG";
  }

  if (input.instagram_handle?.trim()) {
    return "Personal IG";
  }

  if (input.phone?.trim()) {
    return "Phone";
  }

  if (companyFacebook(companyData)) {
    return "Facebook";
  }

  return "Email";
}

function contactSocialLinks(input: ContactInput): Omit<SocialLinks, "threads"> {
  return {
    facebook: input.social_facebook,
    instagram: socialProfileUrl(input.instagram_handle, "https://www.instagram.com/"),
    x: socialProfileUrl(input.x_handle, "https://x.com/"),
  };
}

function contactDataWithDefaults(input: ContactDefaultsInput, companyData: Partial<CompanyData>): ContactData {
  return {
    name: input.name ?? "",
    title: input.title ?? "",
    email: input.email ?? "",
    phone: input.phone ?? "",
    preferred_communication: preferredCommunication(input, companyData),
    instagram_handle: input.instagram_handle?.trim() ?? "",
    x_handle: input.x_handle?.trim() ?? "",
    social_links: {
      facebook: input.social_links?.facebook ?? "",
      instagram: input.social_links?.instagram ?? "",
      x: input.social_links?.x ?? "",
    },
  };
}

function resolveSalesperson<T extends InteractionData | InteractionEntryData>(data: T, directory: Record<string, { name: string | null; picture: string | null }>): T {
  const user = directory[data.salesperson_user_id];
  return {
    ...data,
    salesperson_name: user?.name ?? data.salesperson_name,
    salesperson_picture: user?.picture ?? data.salesperson_picture,
  };
}

export async function listCompanies(): Promise<FirestoreRecord<CompanyData>[]> {
  const companies = await listCollection<CompanyData>(COMPANIES);
  return companies.sort((a, b) => a.data.company_name.localeCompare(b.data.company_name));
}

export async function findCompany(companyId: string): Promise<FirestoreRecord<CompanyData> | null> {
  return getDocument<CompanyData>(`${COMPANIES}/${companyId}`);
}

export async function findCompanyBySlug(companySlug: string): Promise<FirestoreRecord<CompanyData> | null> {
  const snapshot = await db.collection(COMPANIES).where("slug", "==", companySlug).limit(1).get();
  const doc = snapshot.docs[0];
  if (doc) {
    return { id: doc.id, data: doc.data() as CompanyData };
  }

  return findCompany(companySlug);
}

export async function createCompany(input: CompanyInput): Promise<FirestoreRecord<CompanyData>> {
  const ref = db.collection(COMPANIES).doc();

  await db.runTransaction(async (transaction) => {
    const companiesSnapshot = await transaction.get(db.collection(COMPANIES));
    const companies = companiesSnapshot.docs.map((doc) => ({ id: doc.id, data: doc.data() as CompanyData }));
    const payload = {
      company_name: input.company_name,
      slug: nextCompanySlug(input, companies),
      license_number: input.license_number,
      facility_type: input.facility_type,
      primary_contact_id: null,
      address: {
        street: input.address_street,
        city: input.address_city,
        state: input.address_state,
        postal_code: input.address_postal_code,
      },
      website_url: input.website_url,
      social_links: socialLinks(input),
      last_interaction_at: null,
      last_interaction_method: null,
      interaction_count: 0,
      created_at: now(),
      updated_at: now(),
    } satisfies CompanyData;

    transaction.create(ref, payload);
  });

  const doc = await ref.get();
  return { id: ref.id, data: doc.data() as CompanyData };
}

export async function updateCompany(companyId: string, input: CompanyInput): Promise<FirestoreRecord<CompanyData>> {
  const ref = db.doc(`${COMPANIES}/${companyId}`);

  await db.runTransaction(async (transaction) => {
    const companySnapshot = await transaction.get(ref);
    if (!companySnapshot.exists) {
      throw new Error("Company not found.");
    }

    const companiesSnapshot = await transaction.get(db.collection(COMPANIES));
    const companies = companiesSnapshot.docs.map((doc) => ({ id: doc.id, data: doc.data() as CompanyData }));
    const currentCompany = { id: companyId, data: companySnapshot.data() as CompanyData };
    const currentBaseSlug = companySlugBase(currentCompany.data.company_name, currentCompany.data.address?.city ?? "");
    const nextBaseSlug = companySlugFromInput(input);
    const currentSlug = currentCompany.data.slug?.trim();
    const slug = !currentSlug || currentBaseSlug !== nextBaseSlug ? nextCompanySlug(input, companies, companyId) : currentSlug;

    transaction.set(
      ref,
      {
        company_name: input.company_name,
        slug,
        license_number: input.license_number,
        facility_type: input.facility_type,
        address: {
          street: input.address_street,
          city: input.address_city,
          state: input.address_state,
          postal_code: input.address_postal_code,
        },
        website_url: input.website_url,
        social_links: socialLinks(input),
        updated_at: now(),
      },
      { merge: true },
    );
  });

  const doc = await ref.get();
  return { id: ref.id, data: doc.data() as CompanyData };
}

export async function backfillCompanySlugs(): Promise<number> {
  const snapshot = await db.collection(COMPANIES).get();
  const companies = snapshot.docs.map((doc) => ({ id: doc.id, data: doc.data() as CompanyData, ref: doc.ref }));
  const usedSlugs = new Set<string>();
  let writeCount = 0;
  let batch = db.batch();
  let batchWrites = 0;

  for (const company of companies.sort((a, b) => a.data.company_name.localeCompare(b.data.company_name))) {
    const currentSlug = company.data.slug?.trim();
    const nextSlug = currentSlug && !usedSlugs.has(currentSlug) ? currentSlug : uniqueCompanySlug(companySlugBase(company.data.company_name, company.data.address?.city ?? ""), usedSlugs);
    usedSlugs.add(nextSlug);

    if (currentSlug !== nextSlug) {
      batch.set(company.ref, { slug: nextSlug }, { merge: true });
      writeCount += 1;
      batchWrites += 1;
    }

    if (batchWrites === 450) {
      await batch.commit();
      batch = db.batch();
      batchWrites = 0;
    }
  }

  if (batchWrites > 0) {
    await batch.commit();
  }

  return writeCount;
}

export async function deleteCompany(companyId: string): Promise<void> {
  await db.recursiveDelete(db.doc(`${COMPANIES}/${companyId}`));
}

export async function listContacts(companyId: string): Promise<FirestoreRecord<ContactData>[]> {
  const company = await findCompany(companyId);
  const contacts = await listCollection<ContactData>(`${COMPANIES}/${companyId}/contacts`);
  const primaryContactId = company?.data.primary_contact_id ?? "";

  return contacts
    .map((contact) => ({
      id: contact.id,
      data: contactDataWithDefaults(contact.data, company?.data ?? {}),
    }))
    .sort((a, b) => {
      const aPrimary = primaryContactId && a.id === primaryContactId;
      const bPrimary = primaryContactId && b.id === primaryContactId;
      if (aPrimary !== bPrimary) {
        return aPrimary ? -1 : 1;
      }

      return a.data.name.localeCompare(b.data.name);
    });
}

export async function createContact(companyId: string, input: ContactInput): Promise<FirestoreRecord<ContactData>> {
  const company = await findCompany(companyId);
  if (!company) {
    throw new Error("Company not found.");
  }

  const ref = await db.collection(`${COMPANIES}/${companyId}/contacts`).add({
    ...contactDataWithDefaults(
      {
        name: input.name,
        title: input.title,
        email: input.email,
        phone: input.phone,
        preferred_communication: input.preferred_communication,
        instagram_handle: input.instagram_handle,
        x_handle: input.x_handle,
        social_links: contactSocialLinks(input),
      },
      company.data,
    ),
    created_at: now(),
    updated_at: now(),
  });

  const contacts = await listContacts(companyId);
  if (input.is_primary || contacts.length === 1) {
    await setPrimaryContact(companyId, ref.id);
  }

  const doc = await ref.get();
  return { id: ref.id, data: doc.data() as ContactData };
}

export async function updateContact(companyId: string, contactId: string, input: ContactInput): Promise<void> {
  const company = await findCompany(companyId);
  if (!company) {
    throw new Error("Company not found.");
  }

  await db.doc(`${COMPANIES}/${companyId}/contacts/${contactId}`).set(
    {
      ...contactDataWithDefaults(
        {
          name: input.name,
          title: input.title,
          email: input.email,
          phone: input.phone,
          preferred_communication: input.preferred_communication,
          instagram_handle: input.instagram_handle,
          x_handle: input.x_handle,
          social_links: contactSocialLinks(input),
        },
        company.data,
      ),
      updated_at: now(),
    },
    { merge: true },
  );

  if (input.is_primary) {
    await setPrimaryContact(companyId, contactId);
  }
}

export async function deleteContact(companyId: string, contactId: string): Promise<void> {
  const company = await findCompany(companyId);
  await db.doc(`${COMPANIES}/${companyId}/contacts/${contactId}`).delete();

  if (company?.data.primary_contact_id === contactId) {
    await db.doc(`${COMPANIES}/${companyId}`).set({ primary_contact_id: null, updated_at: now() }, { merge: true });
  }
}

export async function setPrimaryContact(companyId: string, contactId: string): Promise<void> {
  await db.doc(`${COMPANIES}/${companyId}`).set({ primary_contact_id: contactId, updated_at: now() }, { merge: true });
}

export async function listInteractions(companyId: string): Promise<FirestormInteractionRecord[]> {
  const directory = await userDirectory();
  const interactions = await listCollection<InteractionData>(`${COMPANIES}/${companyId}/interactions`);
  const sorted = interactions.sort((a, b) => millis(b.data.contact_date_time) - millis(a.data.contact_date_time));

  const rows: FirestormInteractionRecord[] = [];
  for (const interaction of sorted) {
    const entries = await listInteractionEntries(companyId, interaction.id);
    rows.push({
      id: interaction.id,
      data: resolveSalesperson(interaction.data, directory),
      entries: entries.map((entry) => ({
        id: entry.id,
        data: resolveSalesperson(entry.data, directory),
      })),
    });
  }

  return rows;
}

type FirestormInteractionRecord = FirestoreRecord<InteractionData> & {
  entries: FirestoreRecord<InteractionEntryData>[];
};

export async function listInteractionEntries(companyId: string, interactionId: string): Promise<FirestoreRecord<InteractionEntryData>[]> {
  const entries = await listCollection<InteractionEntryData>(`${COMPANIES}/${companyId}/interactions/${interactionId}/entries`);
  return entries.sort((a, b) => millis(a.data.created_at) - millis(b.data.created_at));
}

export async function createInteraction(companyId: string, input: { contact_date_time: string; interaction_method: InteractionMethod; discussion_notes: string }, user: AuthenticatedUser): Promise<void> {
  const contactDateTime = input.contact_date_time ? new Date(input.contact_date_time) : now();
  if (contactDateTime instanceof Date && Number.isNaN(contactDateTime.getTime())) {
    throw new Error("Enter a valid interaction date.");
  }

  const batch = db.batch();
  const interactionRef = db.collection(`${COMPANIES}/${companyId}/interactions`).doc();
  batch.set(interactionRef, {
    contact_date_time: contactDateTime,
    interaction_method: input.interaction_method,
    discussion_notes: input.discussion_notes,
    salesperson_user_id: user.uid,
    salesperson_email: user.email,
    salesperson_name: user.name ?? user.email,
    salesperson_picture: user.picture ?? "",
    created_at: now(),
  });
  batch.set(
    db.doc(`${COMPANIES}/${companyId}`),
    {
      last_interaction_at: contactDateTime,
      last_interaction_method: input.interaction_method,
      interaction_count: FieldValue.increment(1),
      updated_at: now(),
    },
    { merge: true },
  );
  await batch.commit();
}

export async function createInteractionEntry(companyId: string, interactionId: string, input: { discussion_notes: string }, user: AuthenticatedUser): Promise<void> {
  await db.collection(`${COMPANIES}/${companyId}/interactions/${interactionId}/entries`).add({
    contact_date_time: now(),
    discussion_notes: input.discussion_notes,
    salesperson_user_id: user.uid,
    salesperson_email: user.email,
    salesperson_name: user.name ?? user.email,
    salesperson_picture: user.picture ?? "",
    created_at: now(),
  });
}

export async function searchCompanies(query: string): Promise<FirestoreRecord<CompanyData>[]> {
  const normalized = query.trim().toLowerCase();
  const companies = await listCompanies();
  if (!normalized) {
    return companies.slice(0, 25);
  }

  return companies.filter((company) => {
    return [company.data.company_name, company.data.license_number, company.data.facility_type, company.data.address?.city, company.data.slug]
      .join(" ")
      .toLowerCase()
      .includes(normalized);
  });
}
