export function normalizePhoneNumber(raw: string | null | undefined): string | null {
  const trimmed = (raw ?? "").trim();
  if (!trimmed) {
    return null;
  }

  const startsWithPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/\D+/g, "");

  if (startsWithPlus) {
    return digits.length >= 8 && digits.length <= 15 ? `+${digits}` : null;
  }

  if (digits.length === 10) {
    return `+1${digits}`;
  }

  if (digits.length === 11 && digits.startsWith("1")) {
    return `+${digits}`;
  }

  return null;
}

export function formatPhoneNumber(raw: string | null | undefined): string | null {
  const trimmed = (raw ?? "").trim();
  if (!trimmed) {
    return null;
  }

  const normalized = normalizePhoneNumber(trimmed);
  if (!normalized) {
    return trimmed;
  }

  if (normalized.length === 12 && normalized.startsWith("+1")) {
    return `(${normalized.slice(2, 5)}) ${normalized.slice(5, 8)}-${normalized.slice(8)}`;
  }

  return normalized;
}
