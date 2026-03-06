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
export type EstimateSource = "manual" | "voice" | "template";

export interface Estimate {
  id: string;
  estimate_number: string;
  client_id: string | null;
  estimator_id: string | null;
  reviewer_id: string | null;
  project_type: string;
  project_address: string | null;
  status: EstimateStatus;
  scope_inclusions: string[];
  scope_exclusions: string[];
  site_conditions: string | null;
  materials_subtotal: number;
  labor_subtotal: number;
  subcontractor_total: number;
  permits_fees: number;
  overhead_profit: number;
  contingency: number;
  tax: number;
  grand_total: number;
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
export type PriceFreshness = "green" | "yellow" | "orange" | "red";

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
