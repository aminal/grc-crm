export const ALLOWED_EMAIL_DOMAIN = "greenroomcannabis.com";
export const SESSION_COOKIE_NAME = "__session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 5;

export const FACILITY_TYPES = [
  "Dispensary",
  "Processor",
  "Distributor",
  "Cultivator",
  "Microbusiness",
] as const;

export const US_STATE_ABBREVIATIONS = [
  "AL",
  "AK",
  "AZ",
  "AR",
  "CA",
  "CO",
  "CT",
  "DE",
  "FL",
  "GA",
  "HI",
  "ID",
  "IL",
  "IN",
  "IA",
  "KS",
  "KY",
  "LA",
  "ME",
  "MD",
  "MA",
  "MI",
  "MN",
  "MS",
  "MO",
  "MT",
  "NE",
  "NV",
  "NH",
  "NJ",
  "NM",
  "NY",
  "NC",
  "ND",
  "OH",
  "OK",
  "OR",
  "PA",
  "RI",
  "SC",
  "SD",
  "TN",
  "TX",
  "UT",
  "VT",
  "VA",
  "WA",
  "WV",
  "WI",
  "WY",
] as const;

export const INTERACTION_METHODS = ["Email", "Text", "Phone", "In-Person"] as const;

export const PREFERRED_COMMUNICATION_METHODS = [
  "Email",
  "Phone",
  "Facebook",
  "Company IG",
  "Personal IG",
] as const;

export const ORDER_STATUSES = [
  "pending",
  "rejected",
  "cancelled",
  "approved",
  "delivered",
  "paid",
  "delivery_rejected",
] as const;

export const DUE_TERMS = {
  net_30_after_delivery: { label: "NET 30", due_days: 30 },
  cod_check: { label: "COD - Check", due_days: 0 },
  cod_ach: { label: "COD - ACH", due_days: 0 },
} as const;

export const PAYMENT_METHODS = {
  ach: "ACH",
  cash: "Cash",
  check: "Check",
} as const;
