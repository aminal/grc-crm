import type { CompanyData, FirestoreDate, OrderStatus } from "./types";

export function dateFromFirestore(value: FirestoreDate | undefined): Date | null {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return value;
  }

  if (typeof value === "string") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  if (typeof value === "object" && "toDate" in value && typeof value.toDate === "function") {
    return value.toDate();
  }

  return null;
}

function ordinalSuffix(day: number): string {
  if (day % 100 >= 11 && day % 100 <= 13) {
    return "th";
  }

  switch (day % 10) {
    case 1:
      return "st";
    case 2:
      return "nd";
    case 3:
      return "rd";
    default:
      return "th";
  }
}

function formatDateWithOrdinal(date: Date, options: Intl.DateTimeFormatOptions): string {
  const parts = new Intl.DateTimeFormat("en-US", options).formatToParts(date);

  return parts
    .map((part, index) => {
      if (part.type === "literal" && parts[index - 1]?.type === "day" && parts[index + 1]?.type === "year") {
        return part.value.replace(",", "");
      }

      if (part.type !== "day") {
        return part.value;
      }

      const day = Number(part.value);
      return Number.isNaN(day) ? part.value : `${day}${ordinalSuffix(day)}`;
    })
    .join("");
}

export function formatDate(value: FirestoreDate | undefined, options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" }): string {
  const date = dateFromFirestore(value);
  return date ? formatDateWithOrdinal(date, options) : "—";
}

export function formatDateTime(value: FirestoreDate | undefined): string {
  return formatDate(value, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatMoney(cents: number | null | undefined): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format((cents ?? 0) / 100);
}

export function formatCompanySubheading(company: Pick<CompanyData, "address" | "license_number">): string {
  const location = [company.address.city, company.address.state]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(", ");
  const licenseNumber = company.license_number.trim();

  return [location, licenseNumber || "No license number"].filter(Boolean).join(" · ");
}

export function compactNumber(value: number): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value);
}

export function formatInventoryCategory(value: string | null | undefined): string {
  const category = value?.trim() ?? "";
  return category.toLowerCase() === "bud/flower - each" ? "Flower" : category;
}

export function orderStatusLabel(status: OrderStatus | string | null | undefined): string {
  switch (status) {
    case "pending":
      return "Pending";
    case "rejected":
      return "Rejected";
    case "cancelled":
      return "Cancelled";
    case "approved":
      return "Approved";
    case "delivered":
      return "Delivered";
    case "paid":
      return "Paid";
    case "delivery_rejected":
      return "Delivery Rejected";
    default:
      return "Unknown";
  }
}

export function invoiceStatusLabel(status: string | null | undefined): string {
  switch (status) {
    case "paid":
      return "Paid";
    case "partial":
      return "Partially Paid";
    case "void":
      return "Void";
    default:
      return "Unpaid";
  }
}
