export const MARGIN_GUARDRAILS = {
  grossMargin: { min: 0.25, target: 0.385, alertBelow: 0.28 },
  materialMarkup: { min: 0.10, target: 0.175, alertBelow: 0.10 },
  laborMarkup: { min: 0.15, target: 0.25, alertBelow: 0.15 },
  subcontractorMarkup: { min: 0.10, target: 0.125, alertBelow: 0.10 },
  smallJobPremium: { threshold: 2000, min: 0.25, target: 0.325 },
  rushJobPremium: { min: 0.15, target: 0.225 },
} as const;
