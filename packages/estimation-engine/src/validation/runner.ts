import { VALIDATION_CHECKS } from "@proestimate/shared/constants";
import type { Estimate, EstimateLineItem } from "@proestimate/shared/types";
import type { ValidationResult } from "@proestimate/shared/types";

interface ValidationInput {
  estimate: Estimate;
  lineItems: EstimateLineItem[];
}

export function runValidation(input: ValidationInput): ValidationResult[] {
  const { estimate, lineItems } = input;
  const results: ValidationResult[] = [];

  for (const check of VALIDATION_CHECKS) {
    const result = evaluateCheck(check.id, estimate, lineItems);
    results.push({
      check_id: check.id,
      name: check.name,
      status: result.passed ? "PASS" : check.severity,
      message: result.message,
    });
  }

  return results;
}

function evaluateCheck(
  checkId: number,
  estimate: Estimate,
  lineItems: EstimateLineItem[],
): { passed: boolean; message: string } {
  const categories = lineItems.map((li) => li.category.toLowerCase());
  const descriptions = lineItems.map((li) => li.description.toLowerCase());

  switch (checkId) {
    case 1: // Demo & haul-away
      return {
        passed: categories.includes("demo") || categories.includes("demolition"),
        message: categories.includes("demo") || categories.includes("demolition")
          ? "Demo costs included"
          : "No demo/haul-away line items found",
      };

    case 2: { // Waste factor applied (10-15%)
      const materialItems = lineItems.filter((li) =>
        li.category.toLowerCase().includes("material"),
      );
      const hasWaste = materialItems.some(
        (li) => li.notes?.toLowerCase().includes("waste") || li.description.toLowerCase().includes("waste"),
      );
      return {
        passed: hasWaste || materialItems.length === 0,
        message: hasWaste ? "Waste factor noted on materials" : "No waste factor found on material line items",
      };
    }

    case 3: { // Labor contingency (10-25%)
      const laborTotal = estimate.labor_subtotal;
      const contingencyPct = laborTotal > 0 ? estimate.contingency / laborTotal : 0;
      const hasLabor = laborTotal > 0;
      return {
        passed: !hasLabor || contingencyPct >= 0.10,
        message: hasLabor
          ? `Labor contingency: ${(contingencyPct * 100).toFixed(1)}%`
          : "No labor costs to check",
      };
    }

    case 4: { // Permit costs included
      const hasPermits = estimate.permits_fees > 0;
      return {
        passed: hasPermits,
        message: hasPermits
          ? `Permits/fees: $${estimate.permits_fees.toFixed(2)}`
          : "No permit costs included",
      };
    }

    case 5: { // Lead times noted
      const hasLeadTimeNotes = lineItems.some(
        (li) => li.notes?.toLowerCase().includes("lead time") || li.notes?.toLowerCase().includes("lead-time"),
      );
      return {
        passed: hasLeadTimeNotes,
        message: hasLeadTimeNotes
          ? "Lead times noted in line items"
          : "No lead time notes found on any line items",
      };
    }

    case 6: { // Final cleanup
      const hasCleanup = categories.includes("cleanup") ||
        descriptions.some((d) => d.includes("cleanup") || d.includes("clean up") || d.includes("final clean"));
      return {
        passed: hasCleanup,
        message: hasCleanup ? "Final cleanup included" : "No final cleanup line item found",
      };
    }

    case 7: // Contingency for remodels
      return {
        passed: estimate.contingency > 0,
        message: estimate.contingency > 0
          ? `Contingency: $${estimate.contingency.toFixed(2)}`
          : "No contingency applied",
      };

    case 8: { // Price freshness < 90 days
      const staleItems = lineItems.filter((li) => {
        if (!li.price_date) return false;
        const age = Date.now() - new Date(li.price_date).getTime();
        return age > 90 * 24 * 60 * 60 * 1000;
      });
      return {
        passed: staleItems.length === 0,
        message: staleItems.length === 0
          ? "All pricing within 90 days"
          : `${staleItems.length} line item(s) have pricing older than 90 days`,
      };
    }

    case 9: { // Mobilization/travel costs
      const hasMobilization = categories.includes("mobilization") ||
        descriptions.some((d) => d.includes("mobilization") || d.includes("travel") || d.includes("setup"));
      return {
        passed: hasMobilization,
        message: hasMobilization ? "Mobilization costs included" : "No mobilization/travel costs found",
      };
    }

    case 10: { // Disposal/dumpster costs for demo
      const hasDemo = categories.includes("demo") || categories.includes("demolition");
      const hasDisposal = descriptions.some(
        (d) => d.includes("dumpster") || d.includes("disposal") || d.includes("haul"),
      );
      return {
        passed: !hasDemo || hasDisposal,
        message: hasDemo
          ? hasDisposal ? "Disposal costs included" : "Demo project missing dumpster/disposal costs"
          : "No demo scope — disposal check not applicable",
      };
    }

    case 11: { // Paint prep labor >= 60% of paint labor
      const paintItems = lineItems.filter((li) => li.category.toLowerCase().includes("paint"));
      const prepItems = paintItems.filter((li) => li.description.toLowerCase().includes("prep"));
      const paintTotal = paintItems.reduce((sum, li) => sum + (li.extended_price ?? 0), 0);
      const prepTotal = prepItems.reduce((sum, li) => sum + (li.extended_price ?? 0), 0);
      const hasPaint = paintItems.length > 0;
      const ratio = paintTotal > 0 ? prepTotal / paintTotal : 0;
      return {
        passed: !hasPaint || ratio >= 0.60,
        message: hasPaint
          ? `Paint prep is ${(ratio * 100).toFixed(0)}% of paint labor`
          : "No paint line items — check not applicable",
      };
    }

    case 12: { // Transitions & trim for flooring
      const hasFlooring = categories.includes("flooring") ||
        descriptions.some((d) => d.includes("flooring") || d.includes("floor"));
      const hasTransitions = descriptions.some(
        (d) => d.includes("transition") || d.includes("trim") || d.includes("molding") || d.includes("threshold"),
      );
      return {
        passed: !hasFlooring || hasTransitions,
        message: hasFlooring
          ? hasTransitions ? "Transitions/trim included" : "Flooring project missing transitions/trim"
          : "No flooring scope — check not applicable",
      };
    }

    case 13: { // Access difficulty factor
      const hasAccessNote = lineItems.some(
        (li) =>
          li.notes?.toLowerCase().includes("access") ||
          li.notes?.toLowerCase().includes("multi-story") ||
          li.notes?.toLowerCase().includes("difficult") ||
          li.description.toLowerCase().includes("access"),
      );
      return {
        passed: hasAccessNote,
        message: hasAccessNote
          ? "Access difficulty noted"
          : "No access difficulty factor noted on any line items",
      };
    }

    case 14: { // Small fixtures for bathroom
      const isBathroom = estimate.project_type.toLowerCase().includes("bathroom");
      const hasFixtures = descriptions.some(
        (d) =>
          d.includes("fixture") || d.includes("accessory") || d.includes("towel") ||
          d.includes("mirror") || d.includes("hardware") || d.includes("toilet paper"),
      );
      return {
        passed: !isBathroom || hasFixtures,
        message: isBathroom
          ? hasFixtures ? "Fixtures/accessories itemized" : "Bathroom project missing fixture/accessory line items"
          : "Not a bathroom project — check not applicable",
      };
    }

    case 15: // Exclusions populated
      return {
        passed: estimate.scope_exclusions.length > 0,
        message: estimate.scope_exclusions.length > 0
          ? `${estimate.scope_exclusions.length} exclusions defined`
          : "Exclusions section is empty",
      };

    default:
      return { passed: true, message: "Unknown check" };
  }
}
