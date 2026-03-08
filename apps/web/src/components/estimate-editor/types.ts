export interface ValidationResult {
  check_id: number;
  name: string;
  status: "PASS" | "WARN" | "FAIL";
  message: string;
}

export interface DraftLine {
  _key: string;
  id?: string;
  category: string;
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
}

export interface Calculations {
  materialsSubtotal: number;
  laborSubtotal: number;
  subcontractorTotal: number;
  base: number;
  overheadDollar: number;
  contingencyDollar: number;
  taxDollar: number;
  grandTotal: number;
  grossMarginPct: number;
}

export const PROJECT_TYPES = [
  "General",
  "Kitchen Remodel",
  "Bathroom Remodel",
  "Flooring",
  "Roofing",
  "Painting",
  "Siding",
  "Deck / Patio",
  "Addition",
  "Full Renovation",
];

export const UNIT_OPTIONS = [
  "sq ft",
  "lin ft",
  "each",
  "bundle",
  "gallon",
  "sheet",
  "box",
  "roll",
  "bag",
  "ton",
  "hour",
  "day",
  "lot",
];

export const TIERS = ["budget", "midrange", "high_end"] as const;
export const TIER_LABELS: Record<string, string> = { budget: "Budget", midrange: "Midrange", high_end: "High End" };
export const TIER_DESC: Record<string, string> = {
  budget: "Economy-grade materials, basic finishes, cost-effective labor",
  midrange: "Quality brand-name materials, standard upgrades, professional finishes",
  high_end: "Premium designer-grade materials, custom craftsmanship, luxury finishes",
};

export const TABS = [
  { key: "material", label: "Materials" },
  { key: "labor", label: "Labor" },
  { key: "subcontractor", label: "Subcontractors" },
] as const;

export type TabKey = (typeof TABS)[number]["key"];
export type TierKey = (typeof TIERS)[number];

export function fmt(n: number): string {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
