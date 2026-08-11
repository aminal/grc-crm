import type { CompanyData, FirestoreRecord } from "./types";

export function companySlugBase(companyName: string, city: string): string {
  const segments = [slugSegment(companyName), slugSegment(city)].filter(Boolean);
  return segments.join("-") || "company";
}

export function uniqueCompanySlug(baseSlug: string, usedSlugs: Iterable<string>): string {
  const slug = slugSegment(baseSlug) || "company";
  const used = new Set([...usedSlugs].map(slugSegment).filter(Boolean));
  if (!used.has(slug)) {
    return slug;
  }

  let suffix = 2;
  while (used.has(`${slug}-${suffix}`)) {
    suffix += 1;
  }

  return `${slug}-${suffix}`;
}

export function companyUrlSegment(company: FirestoreRecord<CompanyData>): string {
  return company.data.slug?.trim() || company.id;
}

export function companyPath(company: FirestoreRecord<CompanyData>): string {
  return `/companies/${companyUrlSegment(company)}`;
}

function slugSegment(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}
