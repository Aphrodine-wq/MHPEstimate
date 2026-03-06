import type { ValidationCheck } from "../types/validation";

export const VALIDATION_CHECKS: ValidationCheck[] = [
  { id: 1, name: "Demo & Haul-Away", description: "Demo and haul-away costs included", severity: "FAIL", category: "costs" },
  { id: 2, name: "Waste Factor", description: "Waste factor applied to all material quantities (10-15%)", severity: "WARN", category: "materials" },
  { id: 3, name: "Labor Contingency", description: "Labor contingency applied (10-25% based on project type)", severity: "WARN", category: "labor" },
  { id: 4, name: "Permit Costs", description: "Permit costs included when scope requires permits", severity: "FAIL", category: "costs" },
  { id: 5, name: "Lead Times", description: "Material lead times noted in timeline", severity: "WARN", category: "timeline" },
  { id: 6, name: "Final Cleanup", description: "Final cleanup line item present", severity: "WARN", category: "costs" },
  { id: 7, name: "Contingency", description: "Contingency line item present for remodels", severity: "FAIL", category: "costs" },
  { id: 8, name: "Price Freshness", description: "Material pricing less than 90 days old", severity: "WARN", category: "pricing" },
  { id: 9, name: "Mobilization", description: "Mobilization and travel costs accounted for", severity: "WARN", category: "costs" },
  { id: 10, name: "Disposal Costs", description: "Dumpster/disposal costs included for demo projects", severity: "FAIL", category: "costs" },
  { id: 11, name: "Paint Prep Labor", description: "Paint prep labor adequate (min 60% of paint labor total)", severity: "WARN", category: "labor" },
  { id: 12, name: "Transitions & Trim", description: "Transitions and trim counted for flooring projects", severity: "WARN", category: "materials" },
  { id: 13, name: "Access Difficulty", description: "Access difficulty factor applied (multi-story, tight access)", severity: "WARN", category: "labor" },
  { id: 14, name: "Small Fixtures", description: "Small fixtures/accessories itemized for bathroom projects", severity: "WARN", category: "materials" },
  { id: 15, name: "Exclusions", description: "Exclusions section populated", severity: "FAIL", category: "scope" },
];
