/**
 * Trade-Specific Labor Rates
 *
 * Base hourly rates by construction trade, sourced from BLS Occupational
 * Employment and Wage Statistics (OEWS) and calibrated against MHP's
 * actual SE US subcontractor invoices.
 *
 * These are JOURNEYMAN rates (fully burdened: wages + benefits + insurance).
 * Baseline: SE US (MS/AL) — same baseline as regional-pricing.ts.
 */

export interface TradeRate {
  socCode: string;
  trade: string;
  label: string;
  hourlyRate: number;
  apprenticeRate: number;
  foremanRate: number;
  typicalCrewSize: number;
  annualGrowthPct: number;
  lastVerified: string;
  categories: string[];
}

export const TRADE_LABOR_RATES: Record<string, TradeRate> = {
  general_labor: { socCode: "47-2061", trade: "Construction Laborers", label: "General Labor", hourlyRate: 22.00, apprenticeRate: 15.00, foremanRate: 28.00, typicalCrewSize: 2, annualGrowthPct: 4.2, lastVerified: "2026-01", categories: ["general_conditions", "demolition", "cleanup"] },
  carpenter: { socCode: "47-2031", trade: "Carpenters", label: "Carpenter", hourlyRate: 28.00, apprenticeRate: 18.00, foremanRate: 35.00, typicalCrewSize: 2, annualGrowthPct: 4.5, lastVerified: "2026-01", categories: ["framing", "trim_carpentry", "cabinetry_countertops", "doors_windows"] },
  framer: { socCode: "47-2031", trade: "Carpenters (Framing Specialist)", label: "Framer", hourlyRate: 26.00, apprenticeRate: 17.00, foremanRate: 33.00, typicalCrewSize: 3, annualGrowthPct: 4.5, lastVerified: "2026-01", categories: ["framing", "structural"] },
  electrician: { socCode: "47-2111", trade: "Electricians", label: "Electrician", hourlyRate: 35.00, apprenticeRate: 20.00, foremanRate: 45.00, typicalCrewSize: 2, annualGrowthPct: 5.8, lastVerified: "2026-01", categories: ["electrical", "low_voltage"] },
  plumber: { socCode: "47-2152", trade: "Plumbers, Pipefitters, and Steamfitters", label: "Plumber", hourlyRate: 34.00, apprenticeRate: 19.00, foremanRate: 44.00, typicalCrewSize: 2, annualGrowthPct: 5.5, lastVerified: "2026-01", categories: ["plumbing", "gas_line"] },
  hvac: { socCode: "49-9021", trade: "HVAC Mechanics and Installers", label: "HVAC Tech", hourlyRate: 33.00, apprenticeRate: 19.00, foremanRate: 42.00, typicalCrewSize: 2, annualGrowthPct: 5.2, lastVerified: "2026-01", categories: ["hvac", "mechanical"] },
  roofer: { socCode: "47-2181", trade: "Roofers", label: "Roofer", hourlyRate: 25.00, apprenticeRate: 16.00, foremanRate: 32.00, typicalCrewSize: 4, annualGrowthPct: 4.0, lastVerified: "2026-01", categories: ["roofing"] },
  painter: { socCode: "47-2141", trade: "Painters, Construction and Maintenance", label: "Painter", hourlyRate: 23.00, apprenticeRate: 15.00, foremanRate: 29.00, typicalCrewSize: 2, annualGrowthPct: 3.8, lastVerified: "2026-01", categories: ["painting", "interior_finish"] },
  tile_setter: { socCode: "47-2044", trade: "Tile and Stone Setters", label: "Tile Setter", hourlyRate: 30.00, apprenticeRate: 18.00, foremanRate: 38.00, typicalCrewSize: 2, annualGrowthPct: 4.2, lastVerified: "2026-01", categories: ["flooring", "tile"] },
  flooring_installer: { socCode: "47-2042", trade: "Floor Layers", label: "Flooring Installer", hourlyRate: 26.00, apprenticeRate: 16.00, foremanRate: 33.00, typicalCrewSize: 2, annualGrowthPct: 3.5, lastVerified: "2026-01", categories: ["flooring"] },
  concrete_mason: { socCode: "47-2051", trade: "Cement Masons and Concrete Finishers", label: "Concrete / Mason", hourlyRate: 27.00, apprenticeRate: 17.00, foremanRate: 34.00, typicalCrewSize: 3, annualGrowthPct: 4.0, lastVerified: "2026-01", categories: ["concrete_hardscape", "foundation", "masonry"] },
  drywall: { socCode: "47-2081", trade: "Drywall and Ceiling Tile Installers", label: "Drywall", hourlyRate: 25.00, apprenticeRate: 16.00, foremanRate: 32.00, typicalCrewSize: 2, annualGrowthPct: 3.8, lastVerified: "2026-01", categories: ["drywall", "interior_finish"] },
  insulation: { socCode: "47-2131", trade: "Insulation Workers", label: "Insulation", hourlyRate: 24.00, apprenticeRate: 16.00, foremanRate: 30.00, typicalCrewSize: 2, annualGrowthPct: 3.5, lastVerified: "2026-01", categories: ["insulation"] },
  siding_installer: { socCode: "47-2031", trade: "Carpenters (Siding Specialist)", label: "Siding", hourlyRate: 26.00, apprenticeRate: 17.00, foremanRate: 33.00, typicalCrewSize: 2, annualGrowthPct: 4.0, lastVerified: "2026-01", categories: ["siding", "exterior"] },
  fence_deck: { socCode: "47-2031", trade: "Carpenters (Fence & Deck)", label: "Fence / Deck", hourlyRate: 25.00, apprenticeRate: 16.00, foremanRate: 32.00, typicalCrewSize: 2, annualGrowthPct: 4.0, lastVerified: "2026-01", categories: ["fencing", "deck"] },
  excavation: { socCode: "47-2073", trade: "Operating Engineers (Excavation)", label: "Excavation / Grading", hourlyRate: 30.00, apprenticeRate: 20.00, foremanRate: 38.00, typicalCrewSize: 2, annualGrowthPct: 4.0, lastVerified: "2026-01", categories: ["site_work", "excavation", "grading"] },
  landscaper: { socCode: "37-3011", trade: "Landscaping and Groundskeeping Workers", label: "Landscaper", hourlyRate: 20.00, apprenticeRate: 14.00, foremanRate: 26.00, typicalCrewSize: 3, annualGrowthPct: 3.5, lastVerified: "2026-01", categories: ["landscaping", "irrigation"] },
};

export const CATEGORY_TO_TRADE: Record<string, string> = {
  general_conditions: "general_labor", demolition: "general_labor", cleanup: "general_labor", framing: "framer", structural: "framer", trim_carpentry: "carpenter", cabinetry_countertops: "carpenter", doors_windows: "carpenter", electrical: "electrician", low_voltage: "electrician", plumbing: "plumber", gas_line: "plumber", hvac: "hvac", mechanical: "hvac", roofing: "roofer", painting: "painter", interior_finish: "painter", flooring: "flooring_installer", tile: "tile_setter", concrete_hardscape: "concrete_mason", foundation: "concrete_mason", masonry: "concrete_mason", drywall: "drywall", insulation: "insulation", siding: "siding_installer", exterior: "siding_installer", fencing: "fence_deck", deck: "fence_deck", site_work: "excavation", excavation: "excavation", grading: "excavation", landscaping: "landscaper", irrigation: "landscaper",
};

export function getTradeRateForCategory(category: string): TradeRate | null {
  const tradeSlug = CATEGORY_TO_TRADE[category];
  if (!tradeSlug) return null;
  return TRADE_LABOR_RATES[tradeSlug] ?? null;
}

export function getAdjustedTradeRate(tradeSlug: string, zipCode: string, getRegionalMultiplier: (zip: string) => { material: number; labor: number }): { hourlyRate: number; foremanRate: number; apprenticeRate: number } | null {
  const trade = TRADE_LABOR_RATES[tradeSlug];
  if (!trade) return null;
  const regional = getRegionalMultiplier(zipCode);
  return {
    hourlyRate: Math.round(trade.hourlyRate * regional.labor * 100) / 100,
    foremanRate: Math.round(trade.foremanRate * regional.labor * 100) / 100,
    apprenticeRate: Math.round(trade.apprenticeRate * regional.labor * 100) / 100,
  };
}
