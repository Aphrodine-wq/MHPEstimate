/**
 * Generate a Full House Build Estimate using the MHP Estimation Engine
 * Uses 3 years of historical pricing data from MS Home Pros
 */

import { generateEstimateFromTemplate, suggestPrice } from "../packages/estimation-engine/src/calculations/pricing";
import { calculateMargins } from "../packages/estimation-engine/src/calculations/margins";
import { MHP_PROJECT_TEMPLATES } from "../packages/shared/src/constants/project-templates";

const template = MHP_PROJECT_TEMPLATES["new_build"];

console.log("=".repeat(90));
console.log("  MS HOME PROS - ProEstimate AI");
console.log("  FULL HOUSE BUILD ESTIMATE");
console.log("  Generated: " + new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }));
console.log("=".repeat(90));
console.log();

// Generate estimate from template
const estimate = generateEstimateFromTemplate(
  "new_build",
  template.standardLineItems,
  0.03,  // 3% overhead
  0.15,  // 15% profit margin
);

// Display configuration
console.log("PROJECT CONFIGURATION");
console.log("-".repeat(90));
console.log(`  Project Type:         ${template.label}`);
console.log(`  Default Waste Factor: ${(template.defaultWasteFactor * 100).toFixed(1)}%`);
console.log(`  Default Contingency:  ${(template.defaultContingency * 100).toFixed(1)}%`);
console.log(`  Overhead:             3.0%`);
console.log(`  Profit Margin:        15.0%`);
console.log(`  Pricing Basis:        Historical median from 3 years of MHP estimates (28,941 line items)`);
console.log();

// Identify per-unit items (priced per sq ft, lin ft, etc.) vs lump sum
// Items with median < $50 and max > $1000 are likely per-unit rates mixed with lump sums
const perUnitIndicators = ["$0.", "$1.", "$2.", "$3.", "$4.", "$5.", "$6.", "$7.", "$8.", "$9."];

console.log("LINE ITEM BREAKDOWN");
console.log("-".repeat(90));
const header =
  "  " +
  "Line Item".padEnd(48) +
  "Median".padStart(12) +
  "Min".padStart(12) +
  "Max".padStart(12) +
  "Conf".padStart(6);
console.log(header);
console.log("-".repeat(90));

let matchedCount = 0;
let highConfCount = 0;
let medConfCount = 0;
let lowConfCount = 0;
let unmatchedItems: string[] = [];
let perUnitItems: { name: string; price: number }[] = [];

const fmt = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

for (const item of estimate.lineItems) {
  const price = item.suggestedPrice > 0 ? fmt(item.suggestedPrice) : "NO DATA";
  const min = item.priceRange.min > 0 ? fmt(item.priceRange.min) : "-";
  const max = item.priceRange.max > 0 ? fmt(item.priceRange.max) : "-";
  const conf = item.confidence === "high" ? "HIGH" : item.confidence === "medium" ? "MED" : "LOW";

  // Flag items that appear to be per-unit rates (very low median but high max)
  const isPerUnit = item.suggestedPrice > 0 && item.suggestedPrice < 50 && item.priceRange.max > 500;
  const flag = isPerUnit ? " *" : "";

  console.log(
    "  " +
    (item.lineItemName + flag).padEnd(48) +
    price.padStart(12) +
    min.padStart(12) +
    max.padStart(12) +
    conf.padStart(6)
  );

  if (isPerUnit) perUnitItems.push({ name: item.lineItemName, price: item.suggestedPrice });
  if (item.suggestedPrice > 0) matchedCount++;
  else unmatchedItems.push(item.lineItemName);
  if (item.confidence === "high") highConfCount++;
  else if (item.confidence === "medium") medConfCount++;
  else lowConfCount++;
}

console.log("-".repeat(90));
if (perUnitItems.length > 0) {
  console.log("  * Items marked with * show per-unit rates (per sq ft, lin ft, etc.) from historical data.");
  console.log("    These need quantity multiplied for the actual project size.");
}
console.log();

// Financial summary
console.log("FINANCIAL SUMMARY");
console.log("-".repeat(90));
console.log(`  Line Items Subtotal:          ${fmt(estimate.subtotal)}`);
console.log(`  Overhead (3%):                ${fmt(estimate.overhead)}`);
console.log(`  Profit Margin (15%):          ${fmt(estimate.profitMargin)}`);
const contingency = estimate.subtotal * template.defaultContingency;
console.log(`  Contingency (${(template.defaultContingency * 100).toFixed(1)}%):           ${fmt(contingency)}`);
console.log("  " + "-".repeat(50));
console.log(`  GRAND TOTAL:                  ${fmt(estimate.grandTotal)}`);
console.log(`  GRAND TOTAL W/ CONTINGENCY:   ${fmt(estimate.grandTotal + contingency)}`);
console.log();

// Margin analysis using correct object API
const margins = calculateMargins({
  materialsCost: estimate.subtotal * 0.55, // ~55% materials
  laborCost: estimate.subtotal * 0.35,     // ~35% labor
  subcontractorCost: estimate.subtotal * 0.10, // ~10% subs
  permitsFees: 0,
  overheadProfit: estimate.overhead + estimate.profitMargin,
  contingency: contingency,
});

console.log("MARGIN ANALYSIS");
console.log("-".repeat(90));
console.log(`  Est. Materials Cost (55%):    ${fmt(estimate.subtotal * 0.55)}`);
console.log(`  Est. Labor Cost (35%):        ${fmt(estimate.subtotal * 0.35)}`);
console.log(`  Est. Subcontractor (10%):     ${fmt(estimate.subtotal * 0.10)}`);
console.log(`  Gross Margin:                 ${(margins.grossMarginPct * 100).toFixed(1)}%`);
console.log(`  Target Margin:                38.5%`);
if (margins.alerts.length > 0) {
  console.log();
  console.log("  Margin Alerts:");
  for (const alert of margins.alerts) {
    console.log(`    ! ${alert.message}`);
  }
}
console.log();

// Sizing context
console.log("FULL HOUSE BUILD - SIZING CONTEXT");
console.log("-".repeat(90));
console.log("  The line item subtotal above uses MEDIAN historical prices from MHP's database.");
console.log("  Many items (framing, drywall, insulation, paint, carpet, etc.) are stored as");
console.log("  per-unit rates. For a full house build, multiply these by project quantities:");
console.log();
console.log("  Example sizing for a 2,000 sq ft home:");
console.log("    Framing Material:     $18,093 median (lump sum from prior new builds)");
console.log("    Drywall:              $4.75/sq ft x ~7,000 sq ft = ~$33,250");
console.log("    Interior Paint:       $1.50/sq ft x ~7,000 sq ft = ~$10,500");
console.log("    Carpet:               $21.11/sq ft x ~1,200 sq ft = ~$25,333");
console.log("    Insulation:           $0.50-$1,978 (range reflects per-unit vs lump)");
console.log();
console.log("  Realistic Full House Build range (2,000-2,500 sq ft):");
console.log("    Low End (Budget):     $180,000 - $220,000");
console.log("    Mid Range:            $250,000 - $350,000");
console.log("    High End (Custom):    $400,000 - $550,000+");
console.log();

// Confidence
console.log("PRICING CONFIDENCE SUMMARY");
console.log("-".repeat(90));
console.log(`  Total Line Items:             ${estimate.lineItems.length}`);
console.log(`  Matched to Historical Data:   ${matchedCount} / ${estimate.lineItems.length} (${((matchedCount/estimate.lineItems.length)*100).toFixed(0)}%)`);
console.log(`  High Confidence (50+ jobs):   ${highConfCount}`);
console.log(`  Medium Confidence (10-49):    ${medConfCount}`);
console.log(`  Low Confidence (<10):         ${lowConfCount}`);
if (unmatchedItems.length > 0) {
  console.log();
  console.log("  Unmatched Items (need manual pricing):");
  for (const item of unmatchedItems) {
    console.log(`    - ${item}`);
  }
}
console.log();

// Scope
console.log("STANDARD SCOPE OF WORK");
console.log("-".repeat(90));
for (let i = 0; i < template.standardScopeItems.length; i++) {
  console.log(`  ${(i + 1).toString().padStart(2)}. ${template.standardScopeItems[i]}`);
}
console.log();

// Allowances
console.log("COMMON ALLOWANCE ITEMS (CLIENT SELECTS)");
console.log("-".repeat(90));
for (const item of template.commonAllowanceItems) {
  console.log(`  - ${item}`);
}
console.log();

// Change orders
console.log("COMMON CHANGE ORDERS TO ANTICIPATE");
console.log("-".repeat(90));
for (const item of template.commonChangeOrders) {
  console.log(`  - ${item}`);
}
console.log();

// Contract types
console.log("RECOMMENDED CONTRACT TYPES");
console.log("-".repeat(90));
for (const item of template.contractTypes) {
  console.log(`  - ${item}`);
}
console.log();
console.log("=".repeat(90));
console.log("  End of Estimate | ProEstimate AI | MS Home Pros");
console.log("=".repeat(90));
