/**
 * Feature flag system for gradual rollouts.
 * Flags are stored in company_settings under the key "feature_flags".
 * Default values are defined here for offline/fallback use.
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
};

/**
 * Merge remote flags (from Supabase company_settings) with defaults.
 * Remote flags take precedence over defaults.
 */
export function resolveFlags(remote?: Partial<FeatureFlags>): FeatureFlags {
  return { ...DEFAULT_FLAGS, ...remote };
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
