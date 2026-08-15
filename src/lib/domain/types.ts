import type { FieldValue, Timestamp } from "firebase-admin/firestore";
import type {
  FACILITY_TYPES,
  INTERACTION_METHODS,
  ORDER_STATUSES,
  ORDER_STATES,
  ORDER_TERMS,
  PAYMENT_METHODS,
  PREFERRED_COMMUNICATION_METHODS,
} from "./constants";

export type FirestoreDate = Timestamp | FieldValue | Date | string | null;
export type FacilityType = (typeof FACILITY_TYPES)[number];
export type InteractionMethod = (typeof INTERACTION_METHODS)[number];
export type PreferredCommunicationMethod = (typeof PREFERRED_COMMUNICATION_METHODS)[number];
export type OrderStatus = (typeof ORDER_STATUSES)[number];
export type OrderState = (typeof ORDER_STATES)[number];
export type OrderTerms = (typeof ORDER_TERMS)[number];
export type PaymentMethod = keyof typeof PAYMENT_METHODS;

export type FirestoreRecord<T> = {
  id: string;
  data: T;
};

export type UserRole = "Guest" | "Employee" | "Manager" | "Admin";

export type AuthenticatedUser = {
  uid: string;
  email: string;
  name: string | null;
  picture: string | null;
  role: UserRole;
  title: string | null;
};

export type UserProfileData = {
  email?: string;
  display_name?: string;
  picture?: string;
  role?: UserRole;
  title?: string;
  updated_at?: FirestoreDate;
};

export type Address = {
  street: string;
  city: string;
  state: string;
  postal_code: string;
};

export type SocialLinks = {
  facebook: string;
  instagram: string;
  x: string;
  threads?: string;
};

export type CompanyData = {
  company_name: string;
  slug?: string;
  license_number: string;
  facility_type: FacilityType;
  primary_contact_id: string | null;
  address: Address;
  website_url: string;
  social_links: Required<SocialLinks>;
  last_interaction_at?: FirestoreDate;
  last_interaction_method?: string | null;
  interaction_count?: number | null;
  created_at: FirestoreDate;
  updated_at: FirestoreDate;
};

export type ContactData = {
  name: string;
  title: string;
  email: string;
  phone: string;
  preferred_communication: PreferredCommunicationMethod;
  instagram_handle: string;
  x_handle: string;
  social_links: Omit<SocialLinks, "threads">;
  created_at?: FirestoreDate;
  updated_at?: FirestoreDate;
};

export type InteractionData = {
  contact_date_time: FirestoreDate;
  interaction_method: InteractionMethod;
  discussion_notes: string;
  salesperson_user_id: string;
  salesperson_email: string;
  salesperson_name: string;
  salesperson_picture: string;
  created_at: FirestoreDate;
};

export type InteractionEntryData = Omit<InteractionData, "interaction_method">;

export type InteractionRecord = FirestoreRecord<InteractionData> & {
  entries: FirestoreRecord<InteractionEntryData>[];
};

export type PackageData = {
  package_tag: string;
  product_id?: string;
  strain: string;
  source_harvest: string;
  source_packages: string;
  original_source_package_label: string;
  source_processing_jobs: string;
  location: string;
  sublocation: string;
  item: string;
  category: string;
  quantity: number;
  unit_of_measure: string;
  production_batch_number: string;
  source_production_batch: string;
  lab_testing_status: string;
  finished_goods: string;
  administrative_hold: string;
  administrative_recall: string;
  packaged_date: string;
  received: string;
  expiration_date: string;
  sell_by_date: string;
  lab_test_expiration: string;
  active: boolean;
  status: "active" | "inactive";
  package_status?: "available" | "pending" | "sold" | "inactive";
  sold_order_id?: string;
  last_synced_at: FirestoreDate;
  created_at?: FirestoreDate;
  updated_at: FirestoreDate;
  deactivated_at?: FirestoreDate;
};

export type ParsedPackageData = Pick<PackageData,
  | "package_tag"
  | "strain"
  | "source_harvest"
  | "source_packages"
  | "original_source_package_label"
  | "source_processing_jobs"
  | "location"
  | "sublocation"
  | "item"
  | "category"
  | "quantity"
  | "unit_of_measure"
  | "production_batch_number"
  | "source_production_batch"
  | "lab_testing_status"
  | "finished_goods"
  | "administrative_hold"
  | "administrative_recall"
  | "packaged_date"
  | "received"
  | "expiration_date"
  | "sell_by_date"
  | "lab_test_expiration"
>;

export type InventoryProductGroup = {
  key: string;
  product_id?: string;
  item: string;
  source_packages: string;
  package_count: number;
  total_quantity: number;
  unit_of_measure: string;
  mixed_units: boolean;
  units: string[];
  expiration_date: string | null;
  expiration_ts: number | null;
  category: string;
  strains: string[];
  lab_statuses: string[];
  search: string;
  packages: FirestoreRecord<PackageData>[];
  status: "available" | "pending" | "sold" | "inactive";
};

export type ActorSnapshot = {
  uid: string;
  email: string;
  name: string;
  picture: string;
};

export type OrderItem = {
  package_id: string;
  package_tag: string;
  product_id?: string;
  strain: string;
  source_harvest: string;
  source_packages: string;
  original_source_package_label: string;
  source_processing_jobs: string;
  location: string;
  sublocation: string;
  item: string;
  category: string;
  quantity: number;
  unit_of_measure: string;
  production_batch_number: string;
  source_production_batch: string;
  lab_testing_status: string;
  finished_goods: string;
  administrative_hold: string;
  administrative_recall: string;
  packaged_date: string;
  received: string;
  expiration_date: string;
  sell_by_date: string;
  lab_test_expiration: string;
  source_package_key: string;
  price_cents: number;
};

export type InvoicePayment = {
  id: string;
  method: PaymentMethod;
  method_label: string;
  amount_cents: number;
  paid_at: string;
  check_number: string;
  recorded_by?: ActorSnapshot;
  updated_by?: ActorSnapshot;
  created_at?: FirestoreDate;
  updated_at?: FirestoreDate;
};

export type InvoiceDiscount = {
  type: "percent" | "amount";
  value: number;
  cents: number;
  applied_by: ActorSnapshot;
  applied_at: FirestoreDate;
};

export type InvoiceData = {
  id: string;
  invoice_number: string;
  order_id: string;
  order_number: number | null;
  company_id: string;
  company_name: string;
  status: "unpaid" | "paid" | "partial" | "void";
  due_date: string | null;
  delivery_confirmed_at: FirestoreDate;
  delivered_at?: FirestoreDate;
  subtotal_cents: number;
  total_cents: number;
  paid_cents: number;
  balance_cents: number;
  payments: InvoicePayment[];
  discount?: InvoiceDiscount | null;
  paid_at?: FirestoreDate;
  issued_by?: ActorSnapshot;
  issued_at?: FirestoreDate;
  voided_at?: FirestoreDate;
  created_by: ActorSnapshot;
  created_at: FirestoreDate;
  updated_at: FirestoreDate;
};

export type OrderData = {
  order_number: number;
  company_id: string;
  company_name: string;
  facility_type: FacilityType;
  salesperson: ActorSnapshot;
  delivery_date: string;
  delivery_date_tbd: boolean;
  terms: OrderTerms;
  terms_notes: string;
  status: OrderStatus;
  state: OrderState;
  items: OrderItem[];
  total_cents: number;
  invoice?: InvoiceData;
  delivered_at?: FirestoreDate;
  created_by: ActorSnapshot;
  created_at: FirestoreDate;
  updated_at: FirestoreDate;
  status_changed_at: FirestoreDate;
};

export type ActivityData = {
  action: string;
  from_status: OrderStatus | null;
  to_status: OrderStatus | "";
  actor_user_id: string;
  actor_email: string;
  actor_name: string;
  actor_picture: string;
  packages?: string[];
  invoice_id?: string;
  invoice_total_cents?: number;
  payment_id?: string;
  payment_amount_cents?: number;
  discount_cents?: number;
  created_at: FirestoreDate;
};

export type BrandData = {
  name: string;
  acronym: string;
  website: string;
  notes: string;
  archived_at?: FirestoreDate;
  created_at: FirestoreDate;
  updated_at: FirestoreDate;
};

export type StrainData = {
  name: string;
  type?: string;
  breeder: string;
  genetics: string;
  sativa_percentage: number;
  notes: string;
  archived_at?: FirestoreDate;
  deleted_at: FirestoreDate;
  created_at: FirestoreDate;
  updated_at: FirestoreDate;
};

export type ProductData = {
  name: string;
  brand_id: string;
  strain_ids: string[];
  category: string;
  unit_base_price_cents: number;
  case_quantity: number;
  sku: string;
  upc: string;
  notes: string;
  archived_at?: FirestoreDate;
  created_at: FirestoreDate;
  updated_at: FirestoreDate;
};

export type FieldChange = {
  field: string;
  previous_value: string;
  next_value: string;
};

export type SettingsActivityAction = "created" | "updated" | "archived" | "deleted";

export type SettingsActivityData = {
  action: SettingsActivityAction;
  reason: string;
  actor_user_id: string;
  actor_email: string;
  actor_name: string;
  actor_picture: string;
  changes: FieldChange[];
  created_at: FirestoreDate;
};
