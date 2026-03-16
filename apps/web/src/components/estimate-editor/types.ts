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
  material_cost: number;
  labor_cost: number;
  retail_price: number;
}

export interface Calculations {
  materialsSubtotal: number;
  laborSubtotal: number;
  subcontractorTotal: number;
  base: number;
  retailTotal: number;
  actualTotal: number;
  overheadDollar: number;
  contingencyDollar: number;
  taxDollar: number;
  grandTotal: number;
  grossMarginPct: number;
  costPerSqft: number | null;
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
  "New Home Build",
  "Guest House / ADU",
  "Porch / Screened Porch",
  "Garage / Carport",
  "Bonus Room Buildout",
  "Commercial Buildout",
];

export const INFRASTRUCTURE_PROJECT_TYPES = [
  "Infrastructure (Site/Utility)",
];

export const ALL_PROJECT_TYPES = [...PROJECT_TYPES, ...INFRASTRUCTURE_PROJECT_TYPES];

export const UNIT_OPTIONS = [
  "sq ft",
  "lin ft",
  "bd ft",
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
  "cu yd",
  "block",
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

export type EstimateCategory = "building" | "infrastructure";

export const ESTIMATE_CATEGORIES = [
  { key: "building" as const, label: "Building Estimate", desc: "Structure, finishes, MEP" },
  { key: "infrastructure" as const, label: "Infrastructure Estimate", desc: "Land, utilities, well, septic" },
];

export const FOUNDATION_OPTIONS = [
  { key: "raised_slab", label: "Raised Foundation Slab", desc: "CMU block stem wall (2-4 blocks typical)" },
  { key: "monolithic_slab", label: "Monolithic Slab", desc: "Single-pour slab on grade" },
  { key: "crawlspace", label: "Crawlspace", desc: "Raised with accessible space below" },
  { key: "pier_beam", label: "Pier & Beam", desc: "Concrete piers with beams" },
] as const;

export type FoundationType = (typeof FOUNDATION_OPTIONS)[number]["key"];

export const INFRASTRUCTURE_DIVISIONS = [
  { key: "land_setup", label: "Land Setup" },
  { key: "utility_setup", label: "Utility Setup" },
  { key: "well", label: "Well" },
  { key: "septic", label: "Septic" },
  { key: "plumbing", label: "Plumbing" },
  { key: "electrical", label: "Electrical" },
] as const;

/** Target $/sqft for MHP builds */
export const SQFT_TARGET = { min: 185, max: 205, sweet: 195 };

export function fmt(n: number): string {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Drywall is measured in board feet — helper label */
export const DRYWALL_UNIT = "bd ft";
export const DRYWALL_HINT = "Drywall measured in board feet (4×8 sheet = 32 bd ft)";
