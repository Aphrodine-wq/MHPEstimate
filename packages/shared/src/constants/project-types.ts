export const PROJECT_TYPES = {
  porch: {
    label: "Porch / Screened Porch",
    defaultWasteFactor: 0.10,
    defaultContingency: 0.125,
  },
  deck: {
    label: "Deck / Outdoor Area",
    defaultWasteFactor: 0.10,
    defaultContingency: 0.125,
  },
  kitchen_renovation: {
    label: "Kitchen Renovation",
    defaultWasteFactor: 0.125,
    defaultContingency: 0.175,
  },
  bathroom_renovation: {
    label: "Bathroom Renovation",
    defaultWasteFactor: 0.15,
    defaultContingency: 0.175,
  },
  addition_remodel: {
    label: "Home Addition / Remodel",
    defaultWasteFactor: 0.125,
    defaultContingency: 0.175,
  },
  guest_house: {
    label: "Guest House / ADU",
    defaultWasteFactor: 0.10,
    defaultContingency: 0.175,
  },
  new_build: {
    label: "New Home Build",
    defaultWasteFactor: 0.10,
    defaultContingency: 0.15,
  },
  garage_carport: {
    label: "Garage / Carport",
    defaultWasteFactor: 0.10,
    defaultContingency: 0.125,
  },
  retaining_wall: {
    label: "Retaining Wall",
    defaultWasteFactor: 0.10,
    defaultContingency: 0.15,
  },
  fencing: {
    label: "Fencing",
    defaultWasteFactor: 0.05,
    defaultContingency: 0.10,
  },
  roofing: {
    label: "Roofing",
    defaultWasteFactor: 0.05,
    defaultContingency: 0.125,
  },
  concrete_hardscape: {
    label: "Concrete / Hardscape",
    defaultWasteFactor: 0.05,
    defaultContingency: 0.10,
  },
  door_window: {
    label: "Door / Window Replacement",
    defaultWasteFactor: 0.0,
    defaultContingency: 0.10,
  },
  painting: {
    label: "Painting (Interior/Exterior)",
    defaultWasteFactor: 0.10,
    defaultContingency: 0.10,
  },
  bonus_room: {
    label: "Bonus Room Buildout",
    defaultWasteFactor: 0.10,
    defaultContingency: 0.15,
  },
  commercial: {
    label: "Commercial Buildout / Renovation",
    defaultWasteFactor: 0.10,
    defaultContingency: 0.15,
  },
  infrastructure: {
    label: "Infrastructure (Site/Utility)",
    defaultWasteFactor: 0.10,
    defaultContingency: 0.15,
  },
} as const;

export type ProjectType = keyof typeof PROJECT_TYPES;

/** Foundation types for raised slab construction (2-4 blocks typical in MS) */
export const FOUNDATION_TYPES = {
  raised_slab: {
    label: "Raised Foundation Slab",
    description: "CMU block stem wall with poured slab (2-4 blocks tall typical)",
    defaultBlockHeight: 3,
    minBlockHeight: 2,
    maxBlockHeight: 6,
  },
  monolithic_slab: {
    label: "Monolithic Slab",
    description: "Single-pour slab on grade with thickened edge",
  },
  crawlspace: {
    label: "Crawlspace",
    description: "Raised foundation with accessible crawl space below",
  },
  pier_beam: {
    label: "Pier & Beam",
    description: "Concrete piers with wood or steel beams",
  },
} as const;

export type FoundationType = keyof typeof FOUNDATION_TYPES;

/** Target cost per square foot range for MHP builds */
export const SQFT_PRICING_TARGET = {
  min: 185,
  max: 205,
  sweet_spot: 195,
  label: "$185 – $205 / sq ft",
} as const;

/** Infrastructure estimate divisions */
export const INFRASTRUCTURE_DIVISIONS = [
  "land_setup",
  "utility_setup",
  "well",
  "septic",
  "plumbing",
  "electrical",
] as const;

export type InfrastructureDivision = (typeof INFRASTRUCTURE_DIVISIONS)[number];

export const INFRASTRUCTURE_DIVISION_LABELS: Record<InfrastructureDivision, string> = {
  land_setup: "Land Setup",
  utility_setup: "Utility Setup",
  well: "Well",
  septic: "Septic",
  plumbing: "Plumbing",
  electrical: "Electrical",
};
