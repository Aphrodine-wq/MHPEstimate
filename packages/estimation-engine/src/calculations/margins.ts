import { MARGIN_GUARDRAILS } from "@proestimate/shared/constants";

interface MarginInput {
  materialsCost: number;
  laborCost: number;
  subcontractorCost: number;
  permitsFees: number;
  overheadProfit: number;
  contingency: number;
}

interface MarginResult {
  totalCost: number;
  grandTotal: number;
  grossMarginPct: number;
  alerts: MarginAlert[];
}

interface MarginAlert {
  metric: string;
  value: number;
  threshold: number;
  message: string;
}

export function calculateMargins(input: MarginInput): MarginResult {
  const totalCost = input.materialsCost + input.laborCost + input.subcontractorCost + input.permitsFees;
  const grandTotal = totalCost + input.overheadProfit + input.contingency;
  const grossMarginPct = grandTotal > 0 ? (grandTotal - totalCost) / grandTotal : 0;

  const alerts: MarginAlert[] = [];

  if (grossMarginPct < MARGIN_GUARDRAILS.grossMargin.alertBelow) {
    alerts.push({
      metric: "Gross Margin",
      value: grossMarginPct,
      threshold: MARGIN_GUARDRAILS.grossMargin.alertBelow,
      message: `Gross margin ${(grossMarginPct * 100).toFixed(1)}% is below minimum threshold of ${(MARGIN_GUARDRAILS.grossMargin.alertBelow * 100).toFixed(0)}%`,
    });
  }

  return {
    totalCost: Math.round(totalCost * 100) / 100,
    grandTotal: Math.round(grandTotal * 100) / 100,
    grossMarginPct: Math.round(grossMarginPct * 10000) / 10000,
    alerts,
  };
}
