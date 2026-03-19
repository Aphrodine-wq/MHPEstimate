"use client";

import type { ReactNode } from "react";
import { useOrg } from "@/lib/org-context";
import type { FeatureFlags } from "@proestimate/shared/feature-flags";
import { UpgradePrompt } from "./UpgradePrompt";

/** Human-readable labels for feature flag keys */
const FEATURE_LABELS: Record<keyof FeatureFlags, string> = {
  voice_ai: "Voice AI (Alex)",
  dark_mode: "Dark Mode",
  ml_pricing: "ML Pricing Suggestions",
  ocr_invoices: "OCR Invoice Processing",
  mobile_app: "Mobile App",
  multi_tier: "Multi-Tier Estimates",
  realtime_collab: "Real-Time Collaboration",
  document_export: "Document Export",
  analytics: "Analytics Dashboard",
  change_orders: "Change Orders",
  portal_access: "Client Portal",
  auto_estimate: "Auto-Estimate Generation",
  photo_estimate: "Photo-to-Estimate",
  win_prediction: "Win/Loss Prediction",
  quickbooks_integration: "QuickBooks Integration",
  material_cart_links: "Material Cart Links",
  job_scheduling: "Job Scheduling",
  docusign_integration: "DocuSign E-Signature",
};

interface FeatureGateProps {
  /** The feature flag to check */
  feature: keyof FeatureFlags;
  /** Content to render when the feature is enabled */
  children: ReactNode;
  /** Optional custom fallback; defaults to UpgradePrompt */
  fallback?: ReactNode;
}

/**
 * Wrapper component that conditionally renders children based on whether
 * a feature is enabled for the current organization's plan.
 *
 * If the feature is disabled, renders the fallback or a default UpgradePrompt.
 */
export function FeatureGate({ feature, children, fallback }: FeatureGateProps) {
  const { isFeatureEnabled, loading } = useOrg();

  // While loading, render nothing to avoid flash of upgrade prompt
  if (loading) {
    return null;
  }

  if (isFeatureEnabled(feature)) {
    return <>{children}</>;
  }

  // Feature is not enabled -- show fallback or default upgrade prompt
  if (fallback !== undefined) {
    return <>{fallback}</>;
  }

  return <UpgradePrompt feature={FEATURE_LABELS[feature] ?? String(feature)} />;
}
