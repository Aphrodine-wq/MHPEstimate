/**
 * Feature flag system for gradual rollouts.
 * Flags are stored in company_settings under the key "feature_flags".
 * Default values are defined here for offline/fallback use.
 *
 * In multi-tenant mode, flags are resolved by merging:
 * 1. DEFAULT_FLAGS (baseline)
 * 2. Plan-level features (from billing_plans.features)
 * 3. Org-level overrides (from company_settings)
 */

export interface FeatureFlags {
  /** Voice AI (Call Alex) is enabled */
  voice_ai: boolean;
  /** Dark mode toggle in settings */
  dark_mode: boolean;
  /** ML-based pricing suggestions */
  ml_pricing: boolean;
  /** OCR invoice processing */
  ocr_invoices: boolean;
  /** Mobile app access */
  mobile_app: boolean;
  /** Multi-tier estimate generation */
  multi_tier: boolean;
  /** Real-time collaboration */
  realtime_collab: boolean;
  /** PDF/DOCX export */
  document_export: boolean;
  /** Analytics dashboard */
  analytics: boolean;
  /** Change order workflow */
  change_orders: boolean;
  /** Client portal access */
  portal_access: boolean;
  /** AI-powered auto-estimate generation */
  auto_estimate: boolean;
  /** Photo-to-estimate via Claude Vision */
  photo_estimate: boolean;
  /** Win/loss prediction scoring */
  win_prediction: boolean;
  /** QuickBooks Online integration */
  quickbooks_integration: boolean;
  /** Material cart links to HD/Lowe's */
  material_cart_links: boolean;
  /** Built-in job scheduling */
  job_scheduling: boolean;
  /** DocuSign e-signature integration */
  docusign_integration: boolean;
}

export const DEFAULT_FLAGS: FeatureFlags = {
  voice_ai: true,
  dark_mode: false,
  ml_pricing: false,
  ocr_invoices: true,
  mobile_app: false,
  multi_tier: true,
  realtime_collab: true,
  document_export: true,
  analytics: true,
  change_orders: true,
  portal_access: true,
  auto_estimate: false,
  photo_estimate: false,
  win_prediction: false,
  quickbooks_integration: false,
  material_cart_links: false,
  job_scheduling: false,
  docusign_integration: false,
};

/**
 * Features gated by plan tier. Maps to billing_plans.features in the DB.
 */
export const PLAN_FEATURES: Record<string, Partial<FeatureFlags>> = {
  free: {
    voice_ai: false, analytics: false, change_orders: false,
    document_export: false, ml_pricing: false, portal_access: false,
    auto_estimate: false, photo_estimate: false, win_prediction: false,
    quickbooks_integration: false, material_cart_links: false,
    job_scheduling: false, docusign_integration: false,
  },
  pro: {
    voice_ai: true, analytics: true, change_orders: true,
    document_export: true, portal_access: true,
  },
  enterprise: {
    voice_ai: true, analytics: true, change_orders: true,
    document_export: true, ml_pricing: true, portal_access: true,
  },
  apprentice: {
    voice_ai: false, analytics: false, change_orders: false,
    document_export: false, portal_access: false,
  },
  journeyman: {
    voice_ai: true, analytics: true, change_orders: true,
    document_export: true, portal_access: true,
    auto_estimate: true, material_cart_links: true,
  },
  master: {
    voice_ai: true, analytics: true, change_orders: true,
    document_export: true, portal_access: true,
    auto_estimate: true, photo_estimate: true,
    quickbooks_integration: true, material_cart_links: true,
    job_scheduling: true, docusign_integration: true,
  },
  gc: {
    voice_ai: true, analytics: true, change_orders: true,
    document_export: true, ml_pricing: true, portal_access: true,
    auto_estimate: true, photo_estimate: true, win_prediction: true,
    quickbooks_integration: true, material_cart_links: true,
    job_scheduling: true, docusign_integration: true,
  },
};

/**
 * Merge flags from multiple sources in priority order:
 * 1. DEFAULT_FLAGS (baseline)
 * 2. planFeatures (from billing_plans.features)
 * 3. remote (from company_settings)
 * 4. orgOverrides (optional explicit overrides)
 */
export function resolveFlags(
  remote?: Partial<FeatureFlags>,
  planFeatures?: Partial<FeatureFlags>,
  orgOverrides?: Partial<FeatureFlags>
): FeatureFlags {
  return {
    ...DEFAULT_FLAGS,
    ...planFeatures,
    ...remote,
    ...orgOverrides,
  };
}

/**
 * Check if a specific feature is enabled.
 */
export function isFeatureEnabled(
  flags: FeatureFlags,
  feature: keyof FeatureFlags
): boolean {
  return flags[feature] ?? DEFAULT_FLAGS[feature] ?? false;
}
