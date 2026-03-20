// ── Multi-Tenant ──

export type OrgMemberRole = "owner" | "admin" | "estimator" | "pm" | "field_tech" | "sales";

export type SubscriptionStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "unpaid"
  | "incomplete";

export type BillingPlanId = "free" | "pro" | "enterprise" | "apprentice" | "journeyman" | "master" | "gc";

export interface Organization {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
  phone: string | null;
  email: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  website: string | null;
  logo_url: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  billing_email: string | null;
  created_at: string;
  updated_at: string;
}

export interface BillingPlan {
  id: BillingPlanId;
  name: string;
  stripe_price_id: string | null;
  max_team_members: number | null;
  max_estimates_per_month: number | null;
  features: Record<string, boolean>;
  call_hunter_minutes_per_month: number | null;
  price_monthly_cents: number;
  created_at: string;
}

export interface Subscription {
  id: string;
  organization_id: string;
  plan_id: BillingPlanId;
  stripe_subscription_id: string | null;
  status: SubscriptionStatus;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  trial_end: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrgMember {
  id: string;
  organization_id: string;
  user_id: string;
  role: OrgMemberRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ── Team & Auth ──

export type TeamRole = "estimator" | "pm" | "field_tech" | "sales" | "admin" | "owner";

export interface TeamMember {
  id: string;
  auth_id: string | null;
  full_name: string;
  email: string;
  phone: string | null;
  role: TeamRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ── Clients ──

export interface Client {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  notes: string | null;
  source: string | null;
  created_at: string;
  updated_at: string;
}

// ── Estimates ──

export type EstimateStatus =
  | "draft"
  | "in_review"
  | "revision_requested"
  | "approved"
  | "sent"
  | "accepted"
  | "declined"
  | "expired";

export type EstimateTier = "budget" | "midrange" | "high_end" | "good" | "better" | "best";
export type EstimateSource = "manual" | "voice" | "template" | "auto" | "photo";

export type EstimateCategory = "building" | "infrastructure";

export type FoundationType = "raised_slab" | "monolithic_slab" | "crawlspace" | "pier_beam";

export interface Estimate {
  id: string;
  estimate_number: string;
  organization_id?: string | null;
  client_id: string | null;
  estimator_id: string | null;
  reviewer_id: string | null;
  project_type: string;
  estimate_category: EstimateCategory;
  foundation_type: FoundationType | null;
  foundation_block_height: number | null;
  square_footage: number | null;
  project_address: string | null;
  status: EstimateStatus;
  scope_inclusions: string[];
  scope_exclusions: string[];
  site_conditions: string | null;
  materials_subtotal: number;
  labor_subtotal: number;
  subcontractor_total: number;
  retail_total: number;
  actual_total: number;
  permits_fees: number;
  overhead_profit: number;
  contingency: number;
  tax: number;
  grand_total: number;
  cost_per_sqft: number | null;
  gross_margin_pct: number | null;
  estimated_start: string | null;
  estimated_end: string | null;
  valid_through: string | null;
  tier: EstimateTier;
  source: EstimateSource;
  call_id: string | null;
  validation_results: Record<string, unknown> | null;
  validation_passed: boolean;
  pdf_path: string | null;
  docx_path: string | null;
  version: number;
  parent_estimate_id: string | null;
  created_at: string;
  updated_at: string;
  sent_at: string | null;
  accepted_at: string | null;
  declined_at: string | null;
}

export interface EstimateLineItem {
  id: string;
  estimate_id: string;
  line_number: number;
  category: string;
  description: string;
  quantity: number | null;
  unit: string | null;
  unit_price: number | null;
  extended_price: number | null;
  material_cost: number | null;
  labor_cost: number | null;
  retail_price: number | null;
  notes: string | null;
  product_id: string | null;
  price_source: string | null;
  price_date: string | null;
  created_at: string;
}

export interface EstimateChangeOrder {
  id: string;
  estimate_id: string;
  change_number: number;
  description: string;
  cost_impact: number;
  timeline_impact: string | null;
  status: "pending" | "approved" | "rejected";
  client_signed: boolean;
  signed_at: string | null;
  created_at: string;
}

// ── Pricing & Products ──

export type ProductTier = "budget" | "mid" | "premium";
export type PriceSource = "home_depot" | "lowes" | "invoice" | "manual";
export type PriceFreshness = "green" | "yellow" | "orange" | "red" | "gray";

export interface Product {
  id: string;
  name: string;
  category: string;
  subcategory: string | null;
  brand: string | null;
  sku_hd: string | null;
  sku_lowes: string | null;
  sku_internal: string | null;
  unit: string;
  specifications: Record<string, unknown>;
  tier: ProductTier | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PricingHistory {
  id: string;
  product_id: string;
  source: PriceSource;
  price: number;
  unit: string | null;
  store_location: string | null;
  supplier_name: string | null;
  invoice_id: string | null;
  observed_at: string;
}

export interface UnifiedPricing {
  product_id: string;
  unified_price: number;
  hd_price: number | null;
  lowes_price: number | null;
  invoice_price: number | null;
  freshness: PriceFreshness;
  last_updated: string;
}

// ── Invoices ──

export type InvoiceStatus = "pending" | "processing" | "review" | "confirmed" | "error";

export interface Invoice {
  id: string;
  supplier_name: string | null;
  invoice_number: string | null;
  invoice_date: string | null;
  file_path: string;
  ocr_raw_text: string | null;
  parsed_data: Record<string, unknown> | null;
  status: InvoiceStatus;
  uploaded_by: string | null;
  reviewed_by: string | null;
  created_at: string;
}

// ── Voice Calls ──

export type VoiceCallSource = "twilio" | "in_app";

export interface VoiceCall {
  id: string;
  caller_id: string | null;
  twilio_call_sid: string | null;
  source: VoiceCallSource;
  duration_sec: number | null;
  transcript: string | null;
  extracted_data: Record<string, unknown> | null;
  recording_path: string | null;
  estimates_created: string[];
  started_at: string;
  ended_at: string | null;
}

// ── Learning System ──

export interface JobActual {
  id: string;
  estimate_id: string;
  actual_materials: number | null;
  actual_labor: number | null;
  actual_subs: number | null;
  actual_total: number | null;
  actual_duration_days: number | null;
  actual_margin_pct: number | null;
  variance_materials: number | null;
  variance_labor: number | null;
  variance_total: number | null;
  notes: string | null;
  completed_at: string | null;
  created_at: string;
}

// ── Company Settings ──

export interface CompanySetting {
  key: string;
  value: Record<string, unknown>;
  updated_at: string;
}

// ── Audit Log ──

export type AuditActionType =
  | "estimate_created"
  | "estimate_updated"
  | "estimate_status_changed"
  | "estimate_sent"
  | "estimate_accepted"
  | "estimate_declined"
  | "estimate_viewed"
  | "estimate_cloned"
  | "line_item_added"
  | "line_item_updated"
  | "line_item_removed"
  | "change_order_created"
  | "change_order_approved"
  | "change_order_rejected"
  | "change_order_signed"
  | "client_created"
  | "client_updated"
  | "client_deleted"
  | "team_member_invited"
  | "team_member_updated"
  | "team_member_deactivated"
  | "invoice_uploaded"
  | "invoice_confirmed"
  | "voice_call_started"
  | "voice_call_ended"
  | "job_actual_recorded"
  | "version_snapshot_created"
  | "reminder_scheduled"
  | "reminder_cancelled"
  | "settings_updated"
  | "estimate_pdf_generated"
  | "estimate_shared"
  | "estimate_signed"
  | "payment_link_created"
  | "estimate_exported"
  | "estimate_reminder_deleted"
  | "change_order_client_approved"
  | "change_order_client_rejected"
  | "change_order_notification_sent"
  | "auto_estimate_generated"
  | "photo_estimate_generated"
  | "purchase_order_created"
  | "po_items_received"
  | "selection_sheet_created"
  | "selection_item_selected"
  | "schedule_generated"
  | "schedule_updated"
  | "schedule_exported"
  | "quickbooks_connected"
  | "quickbooks_disconnected"
  | "material_cart_generated"
  | "time_entry_clock_in"
  | "time_entry_clock_out"
  | "subcontractor_created"
  | "win_score_calculated"
  | "sub_bid_created"
  | "sub_bid_updated"
  | "purchase_order_status_changed"
  | "purchase_order_updated"
  | "selection_sheet_status_changed"
  | "selection_sheet_updated";

export type AuditEntityType =
  | "estimate"
  | "estimate_line_item"
  | "estimate_change_order"
  | "client"
  | "team_member"
  | "invoice"
  | "voice_call"
  | "job_actual"
  | "estimate_version"
  | "estimate_reminder"
  | "company_settings"
  | "purchase_order"
  | "selection_sheet"
  | "selection_item"
  | "job_phase"
  | "integration_connection"
  | "time_entry"
  | "subcontractor"
  | "sub_bid"
  | "product";

export interface AuditLog {
  id: string;
  user_id: string;
  action_type: AuditActionType;
  entity_type: AuditEntityType;
  entity_id: string | null;
  metadata: Record<string, unknown>;
  ip_address: string | null;
  created_at: string;
}

// ── Estimate Versions ──

export interface EstimateVersion {
  id: string;
  estimate_id: string;
  version_number: number;
  snapshot: Record<string, unknown>;
  change_summary: string | null;
  created_by: string;
  created_at: string;
}

// ── Estimate Reminders ──

export type ReminderType = "follow_up" | "expiry_warning" | "custom";
export type ReminderStatus = "scheduled" | "sent" | "cancelled" | "failed";

export interface EstimateReminder {
  id: string;
  estimate_id: string;
  reminder_type: ReminderType;
  scheduled_for: string;
  sent_at: string | null;
  status: ReminderStatus;
  message: string | null;
  created_by: string;
  created_at: string;
}

// ── Job Scheduling ──

export type JobPhaseStatus = "not_started" | "in_progress" | "completed" | "blocked" | "skipped" | "pending";

export interface JobPhase {
  id: string;
  organization_id: string;
  estimate_id: string;
  phase_name: string;
  sort_order: number;
  start_date: string | null;
  end_date: string | null;
  duration_days: number | null;
  status: JobPhaseStatus;
  crew_assigned: string[];
  notes: string | null;
  milestone_id: string | null;
  color: string | null;
  dependencies: string[];
  actual_start: string | null;
  actual_end: string | null;
  created_at: string;
  updated_at: string;
}

// ── Schedule Templates ──

export interface ScheduleTemplate {
  id: string;
  organization_id: string;
  project_type: string;
  phases: { name: string; duration_days: number; offset_days: number; dependencies: string[] }[];
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ── Estimate Templates ──

export interface EstimateTemplate {
  id: string;
  organization_id: string;
  name: string;
  project_type: string;
  description: string | null;
  line_items: Record<string, unknown>[];
  template_data: Record<string, unknown> | null;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ── Labor Rates ──

export interface LaborRatePreset {
  id: string;
  organization_id: string;
  trade: string;
  role: string;
  hourly_rate: number;
  overtime_rate: number | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

// ── Subcontractors & Bids ──

export type SubBidStatus = "draft" | "requested" | "received" | "accepted" | "rejected" | "expired";

export interface Subcontractor {
  id: string;
  organization_id: string;
  company_name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  trades: string[];
  license_number: string | null;
  insurance_expiry: string | null;
  rating: number | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SubBid {
  id: string;
  organization_id: string;
  estimate_id: string;
  subcontractor_id: string | null;
  trade: string;
  scope_description: string | null;
  due_date: string | null;
  bid_amount: number | null;
  status: SubBidStatus;
  requested_at: string | null;
  received_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// ── Purchase Orders ──

export type PurchaseOrderStatus = "draft" | "sent" | "confirmed" | "partial" | "fulfilled" | "cancelled";

export interface PurchaseOrder {
  id: string;
  organization_id: string;
  estimate_id: string;
  po_number: string;
  vendor_name: string;
  vendor_contact: string | null;
  vendor_phone: string | null;
  vendor_email: string | null;
  status: PurchaseOrderStatus;
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
  order_date: string | null;
  expected_delivery: string | null;
  delivery_address: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface POLineItem {
  id: string;
  purchase_order_id: string;
  estimate_line_item_id: string | null;
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  received_qty: number;
  status: "pending" | "received";
  notes: string | null;
  created_at: string;
}

// ── Time Tracking ──

export interface TimeEntry {
  id: string;
  organization_id: string;
  estimate_id: string;
  phase_id: string | null;
  worker_name: string;
  trade: string | null;
  hourly_rate: number | null;
  clock_in: string;
  clock_out: string | null;
  break_minutes: number;
  total_hours: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// ── Field Operations ──

export type PhotoCategory = "before" | "during" | "after" | "issue" | "progress" | "material" | "inspection" | "safety" | "other";

export interface JobPhoto {
  id: string;
  organization_id: string;
  estimate_id: string;
  phase_id: string | null;
  storage_path: string;
  thumbnail_path: string | null;
  file_name: string;
  file_size_bytes: number | null;
  mime_type: string;
  category: PhotoCategory;
  caption: string | null;
  tags: string[];
  room: string | null;
  gps_lat: number | null;
  gps_lng: number | null;
  taken_by: string | null;
  taken_by_name: string | null;
  taken_at: string;
  created_at: string;
}

export type WeatherCondition = "clear" | "cloudy" | "rain" | "snow" | "wind" | "extreme_heat" | "extreme_cold";

export interface DailyLog {
  id: string;
  organization_id: string;
  estimate_id: string;
  log_date: string;
  weather: WeatherCondition | null;
  temperature_f: number | null;
  crew_count: number;
  hours_on_site: number | null;
  work_performed: string | null;
  materials_used: string | null;
  deliveries: string | null;
  visitors: string | null;
  issues: string | null;
  safety_notes: string | null;
  delay_reason: string | null;
  delay_hours: number | null;
  created_by: string | null;
  created_by_name: string | null;
  updated_at: string;
}

// ── Takeoff & Selections ──

export type MeasurementType = "linear" | "area" | "count" | "volume";

export interface TakeoffMeasurement {
  id: string;
  organization_id: string;
  estimate_id: string;
  page_number: number;
  plan_image_path: string | null;
  measurement_type: MeasurementType | null;
  label: string;
  value: number;
  unit: string;
  color: string;
  points: unknown[];
  linked_line_item_id: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

export type SelectionSheetStatus = "draft" | "sent" | "in_progress" | "completed" | "approved";

export interface SelectionSheet {
  id: string;
  organization_id: string;
  estimate_id: string;
  name: string;
  status: SelectionSheetStatus;
  due_date: string | null;
  notes: string | null;
  sent_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SelectionItem {
  id: string;
  sheet_id: string;
  category: string;
  item_name: string;
  room: string | null;
  budget_amount: number | null;
  options: { name: string; price: number; thumbnail?: string }[];
  selected_option: number | null;
  actual_amount: number | null;
  status: "pending" | "selected" | "ordered" | "installed";
  sort_order: number | null;
  client_notes: string | null;
  created_at: string;
  updated_at: string;
}

// ── Warranty ──

export type WarrantyStatus = "active" | "claimed" | "in_progress" | "resolved" | "expired" | "voided";
export type WarrantyCategory = "labor" | "material" | "structural" | "plumbing" | "electrical" | "hvac" | "roofing" | "flooring" | "painting" | "appliance" | "other";

export interface WarrantyItem {
  id: string;
  organization_id: string;
  estimate_id: string;
  client_id: string | null;
  item_description: string;
  category: WarrantyCategory | null;
  warranty_start: string;
  warranty_end: string;
  status: WarrantyStatus;
  claim_description: string | null;
  resolution: string | null;
  cost_to_repair: number | null;
  callback_date: string | null;
  callback_notes: string | null;
  photos: string[];
  created_at: string;
  updated_at: string;
}

// ── Integrations ──

export type IntegrationProvider = "quickbooks" | "stripe" | "twilio";

export interface IntegrationConnection {
  id: string;
  user_id: string;
  provider: IntegrationProvider;
  realm_id: string | null;
  access_token_encrypted: string;
  refresh_token_encrypted: string | null;
  token_expires_at: string | null;
  refresh_token_expires_at: string | null;
  is_active: boolean;
  connected_at: string;
  disconnected_at: string | null;
  created_at: string;
  updated_at: string;
}
