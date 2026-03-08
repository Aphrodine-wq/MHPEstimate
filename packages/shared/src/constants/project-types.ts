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
} as const;

export type ProjectType = keyof typeof PROJECT_TYPES;
