/**
 * MHP Package Bundles
 * Pre-defined combinations of project types that are commonly sold together.
 * When Alex builds a "full package" estimate, it pulls from these bundles
 * to automatically include all relevant scope items and line items.
 *
 * Bundle pricing applies a discount to incentivize larger jobs and
 * reduces overhead/mobilization by combining them into a single visit.
 */

export interface PackageBundle {
  id: string;
  label: string;
  description: string;
  /** Project type keys from MHP_PROJECT_TEMPLATES */
  projectTypes: string[];
  /** Discount applied to combined subtotal (e.g., 0.05 = 5% off) */
  bundleDiscount: number;
  /** Override waste factor (averaged across types if not set) */
  overrideWasteFactor?: number;
  /** Override contingency (averaged across types if not set) */
  overrideContingency?: number;
  /** Additional line items specific to the bundle (not in individual templates) */
  bundleSpecificLineItems: string[];
  /** Items to deduplicate across templates (only charge once) */
  deduplicateItems: string[];
  /** Frequency this combination is requested */
  frequency: "HIGH" | "MEDIUM" | "LOW";
}

export const MHP_PACKAGE_BUNDLES: Record<string, PackageBundle> = {
  exterior_refresh: {
    id: "exterior_refresh",
    label: "Exterior Refresh Package",
    description: "Roofing + gutters + exterior painting. The most common full exterior package.",
    projectTypes: ["roofing", "painting"],
    bundleDiscount: 0.05,
    bundleSpecificLineItems: [
      "Gutter Material",
      "Gutter Labor",
      "Fascia Board Repair/Replace",
      "Soffit Repair/Replace",
      "Power Wash - Full Exterior",
    ],
    deduplicateItems: [
      "General Conditions",
      "Project Coordination (Supervision)",
      "Building Permits",
      "Mobilization",
      "Final Cleaning",
      "Waste Management",
    ],
    frequency: "HIGH",
  },

  kitchen_bath_combo: {
    id: "kitchen_bath_combo",
    label: "Kitchen + Bath Renovation",
    description: "Full kitchen renovation paired with a bathroom remodel. Common in whole-home updates.",
    projectTypes: ["kitchen_renovation", "bathroom_renovation"],
    bundleDiscount: 0.07,
    bundleSpecificLineItems: [
      "Whole-Home Water Shutoff Coordination",
      "Temporary Kitchen Setup",
    ],
    deduplicateItems: [
      "General Conditions",
      "Project Coordination (Supervision)",
      "Building Permits",
      "Mobilization",
      "Final Cleaning",
      "Waste Management",
      "Plumbing Material & Labor",
    ],
    frequency: "HIGH",
  },

  outdoor_living: {
    id: "outdoor_living",
    label: "Outdoor Living Package",
    description: "Porch/screened porch + deck + fencing. Complete outdoor living transformation.",
    projectTypes: ["porch", "deck", "fencing"],
    bundleDiscount: 0.06,
    bundleSpecificLineItems: [
      "Landscape Grading Transition",
      "Outdoor Electrical Panel",
    ],
    deduplicateItems: [
      "General Conditions",
      "Project Coordination (Supervision)",
      "Building Permits",
      "Mobilization",
      "Site Prep/Grading",
      "Final Cleaning",
      "Waste Management",
    ],
    frequency: "HIGH",
  },

  full_home_exterior: {
    id: "full_home_exterior",
    label: "Full Home Exterior Package",
    description: "Roofing + painting + doors/windows + concrete. Complete exterior overhaul.",
    projectTypes: ["roofing", "painting", "door_window", "concrete_hardscape"],
    bundleDiscount: 0.08,
    bundleSpecificLineItems: [
      "Scaffolding Rental",
      "Power Wash - Full Exterior",
      "Gutter Material",
      "Gutter Labor",
      "Fascia Board Repair/Replace",
    ],
    deduplicateItems: [
      "General Conditions",
      "Project Coordination (Supervision)",
      "Building Permits",
      "Mobilization",
      "Structure Demolition",
      "Final Cleaning",
      "Waste Management",
    ],
    frequency: "MEDIUM",
  },

  addition_with_kitchen: {
    id: "addition_with_kitchen",
    label: "Addition + Kitchen Package",
    description: "Home addition with full kitchen buildout. For growing families or in-law suites.",
    projectTypes: ["addition_remodel", "kitchen_renovation"],
    bundleDiscount: 0.05,
    bundleSpecificLineItems: [
      "Structural Engineering Review",
      "Foundation Tie-In Inspection",
    ],
    deduplicateItems: [
      "General Conditions",
      "Project Coordination (Supervision)",
      "Architectural Plans",
      "Building Permits",
      "Engineering (Site Surveys)",
      "Mobilization",
      "Final Cleaning",
      "Waste Management",
      "Framing Material",
      "Framing Labor",
      "Drywall",
      "Electrical Material",
      "Electrical Labor",
    ],
    frequency: "MEDIUM",
  },

  deck_and_fence: {
    id: "deck_and_fence",
    label: "Deck + Fence Package",
    description: "New deck with matching fencing. Popular for backyard renovations.",
    projectTypes: ["deck", "fencing"],
    bundleDiscount: 0.05,
    bundleSpecificLineItems: [
      "Gate Installation (Deck-to-Fence Transition)",
    ],
    deduplicateItems: [
      "General Conditions",
      "Mobilization",
      "Site Prep/Grading",
      "Final Cleaning",
      "Waste Management",
    ],
    frequency: "MEDIUM",
  },

  garage_and_driveway: {
    id: "garage_and_driveway",
    label: "Garage + Driveway Package",
    description: "New garage or carport with concrete driveway/hardscape.",
    projectTypes: ["garage_carport", "concrete_hardscape"],
    bundleDiscount: 0.05,
    bundleSpecificLineItems: [
      "Driveway-to-Garage Transition Slab",
    ],
    deduplicateItems: [
      "General Conditions",
      "Project Coordination (Supervision)",
      "Building Permits",
      "Mobilization",
      "Site Prep/Grading",
      "Slab Material",
      "Slab Labor",
      "Final Cleaning",
      "Waste Management",
    ],
    frequency: "MEDIUM",
  },

  whole_home_renovation: {
    id: "whole_home_renovation",
    label: "Whole Home Renovation",
    description: "Kitchen + bathroom + painting + flooring. Major interior overhaul.",
    projectTypes: ["kitchen_renovation", "bathroom_renovation", "painting", "bonus_room"],
    bundleDiscount: 0.10,
    bundleSpecificLineItems: [
      "Whole-Home Protection (Floor/Furniture Covering)",
      "Temporary Kitchen Setup",
      "Whole-Home Water Shutoff Coordination",
      "HVAC Ductwork Cleaning",
    ],
    deduplicateItems: [
      "General Conditions",
      "Project Coordination (Supervision)",
      "Building Permits",
      "Mobilization",
      "Structure Demolition",
      "Interior Paint Material",
      "Interior Paint Labor",
      "Electrical Material",
      "Electrical Labor",
      "Final Cleaning",
      "Waste Management",
    ],
    frequency: "LOW",
  },
};

/** Get a package bundle by ID */
export function getPackageBundle(id: string): PackageBundle | undefined {
  return MHP_PACKAGE_BUNDLES[id];
}

/** Get all available package bundles */
export function getAvailableBundles(): Array<{ id: string; label: string; description: string; projectTypes: string[] }> {
  return Object.values(MHP_PACKAGE_BUNDLES).map((b) => ({
    id: b.id,
    label: b.label,
    description: b.description,
    projectTypes: b.projectTypes,
  }));
}

/** Find bundles that include a specific project type */
export function findBundlesForProjectType(projectType: string): PackageBundle[] {
  return Object.values(MHP_PACKAGE_BUNDLES).filter((b) =>
    b.projectTypes.includes(projectType)
  );
}
