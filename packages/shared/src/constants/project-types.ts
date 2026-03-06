export const PROJECT_TYPES = {
  kitchen_remodel: {
    label: "Kitchen Remodel",
    defaultWasteFactor: 0.125,
    defaultContingency: 0.175,
  },
  bathroom_renovation: {
    label: "Bathroom Renovation",
    defaultWasteFactor: 0.15,
    defaultContingency: 0.175,
  },
  flooring: {
    label: "Flooring",
    defaultWasteFactor: 0.10,
    defaultContingency: 0.10,
  },
  painting: {
    label: "Painting",
    defaultWasteFactor: 0.10,
    defaultContingency: 0.10,
  },
  roofing: {
    label: "Roofing",
    defaultWasteFactor: 0.05,
    defaultContingency: 0.125,
  },
  windows_doors: {
    label: "Windows & Doors",
    defaultWasteFactor: 0,
    defaultContingency: 0.10,
  },
  deck_patio: {
    label: "Deck / Patio",
    defaultWasteFactor: 0.10,
    defaultContingency: 0.125,
  },
  siding: {
    label: "Siding",
    defaultWasteFactor: 0.10,
    defaultContingency: 0.10,
  },
  basement_finishing: {
    label: "Basement Finishing",
    defaultWasteFactor: 0.10,
    defaultContingency: 0.20,
  },
} as const;

export type ProjectType = keyof typeof PROJECT_TYPES;
