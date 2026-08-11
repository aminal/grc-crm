export function isAllowedEmailForDomain(email: string | null | undefined, emailVerified: boolean | null | undefined, allowedDomain: string): boolean {
  if (!email || emailVerified !== true) {
    return false;
  }

  const [, domain = ""] = email.toLowerCase().split("@");
  return domain === allowedDomain.trim().toLowerCase();
}
