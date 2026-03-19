/**
 * Claude Brain — Construction Best Practices
 *
 * Domain knowledge for residential and light commercial construction
 * in the southeastern United States. Covers common scope mistakes,
 * trade sequencing, permits, durations, warranty language, change orders,
 * and safety / liability notes.
 *
 * This is the knowledge that separates a good estimate from a great one.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ScopeMistake {
  projectType: string;
  mistake: string;
  consequence: string;
  prevention: string;
}

export interface TradeSequence {
  trade: string;
  order: number;
  dependsOn: string[];
  notes: string;
}

export interface PermitRequirement {
  projectType: string;
  permitRequired: boolean;
  permitTypes: string[];
  typicalCost: string;
  typicalTimeline: string;
  notes: string;
}

export interface ProjectDuration {
  projectType: string;
  sizeCategory: "small" | "medium" | "large";
  sizeDescription: string;
  durationWeeks: { min: number; max: number };
  notes: string;
}

export interface ChangeOrderPractice {
  rule: string;
  explanation: string;
}

// ─── Data ─────────────────────────────────────────────────────────────────────

export const CONSTRUCTION_BEST_PRACTICES = {
  /**
   * Common scope mistakes by project type.
   * These are the items estimators forget that cause change orders and margin erosion.
   */
  commonScopeMistakes: [
    // ── Kitchen ─────────────────────────────────────────────────────────
    {
      projectType: "kitchen_renovation",
      mistake: "Forgetting to include electrical updates for new appliance loads",
      consequence: "Dedicated 20A circuits for dishwasher, disposal, microwave needed. Electrician return trip adds $800-$1,500.",
      prevention: "Always include an electrical allowance line item for kitchen remodels. Verify panel capacity.",
    },
    {
      projectType: "kitchen_renovation",
      mistake: "Not accounting for plumbing relocation when changing layout",
      consequence: "Moving a sink or dishwasher even 3 feet requires re-routing supply and drain lines — $1,200-$3,000.",
      prevention: "If layout changes, add plumbing rough-in line item. Confirm slab vs. crawlspace access.",
    },
    {
      projectType: "kitchen_renovation",
      mistake: "Missing countertop templating and lead time",
      consequence: "Stone fabrication requires template AFTER cabinets are installed — adds 2-3 weeks to schedule.",
      prevention: "Include templating as a separate line item and note the scheduling dependency.",
    },
    {
      projectType: "kitchen_renovation",
      mistake: "Omitting demolition and disposal costs",
      consequence: "Demo of existing cabinets, countertops, flooring, and backsplash generates 2-3 dumpster loads — $600-$1,200.",
      prevention: "Always include a demo/disposal line item. Add dumpster rental at $400-$600 per pull.",
    },
    {
      projectType: "kitchen_renovation",
      mistake: "Forgetting soffit removal or modification",
      consequence: "42-inch upper cabinets require soffit removal. May contain HVAC ducts or wiring — $500-$2,000.",
      prevention: "Inspect soffits during site visit. Note contents and include removal if client wants taller uppers.",
    },
    // ── Bathroom ────────────────────────────────────────────────────────
    {
      projectType: "bathroom_renovation",
      mistake: "Not including backer board / waterproofing in tile shower",
      consequence: "Kerdi or RedGard waterproofing is mandatory for tile showers. Omitting causes moisture damage within 2 years.",
      prevention: "Always include waterproofing membrane line item for any tile shower/tub surround.",
    },
    {
      projectType: "bathroom_renovation",
      mistake: "Forgetting exhaust fan upgrade to meet code",
      consequence: "Most bathroom remodels trigger code requirement for proper ventilation — 50 CFM minimum for a standard bath.",
      prevention: "Include exhaust fan replacement in every bathroom renovation scope.",
    },
    {
      projectType: "bathroom_renovation",
      mistake: "Missing GFCI outlet requirements",
      consequence: "All bathroom outlets must be GFCI protected. Older homes often need circuit upgrades.",
      prevention: "Include GFCI outlet allowance. Verify circuit capacity for heated floors, towel warmers.",
    },
    {
      projectType: "bathroom_renovation",
      mistake: "Underestimating tile waste for complex patterns",
      consequence: "Herringbone and diagonal patterns generate 15-20% waste vs. 10% for straight lay.",
      prevention: "Adjust waste factor based on tile pattern. Herringbone = 20%, diagonal = 15%, straight = 10%.",
    },
    // ── Deck ────────────────────────────────────────────────────────────
    {
      projectType: "deck",
      mistake: "Not accounting for footer depth requirements",
      consequence: "SE US frost line is shallow (6-12 inches) but footer depth still depends on soil type and load.",
      prevention: "Verify local footer depth requirements. Clay soils in MS/AL may need 18-24 inch piers.",
    },
    {
      projectType: "deck",
      mistake: "Forgetting ledger board flashing",
      consequence: "Improperly flashed ledger boards are the #1 cause of deck failures and water intrusion into the house.",
      prevention: "Always include ledger board flashing as a line item. Specify self-adhered membrane + Z-flashing.",
    },
    {
      projectType: "deck",
      mistake: "Missing permits for decks over 30 inches above grade",
      consequence: "Decks >30 inches above grade require permits and engineered railing in most SE jurisdictions.",
      prevention: "Measure grade drop during site visit. Include permit cost and railing engineering if applicable.",
    },
    // ── Roofing ─────────────────────────────────────────────────────────
    {
      projectType: "roofing",
      mistake: "Not including ice and water shield in valleys and penetrations",
      consequence: "Valleys, skylights, vents, and wall transitions are leak-prone. Ice/water shield is code-required in many areas.",
      prevention: "Include ice and water shield for all valleys, penetrations, eaves, and wall transitions.",
    },
    {
      projectType: "roofing",
      mistake: "Ignoring decking condition under existing shingles",
      consequence: "Rotten or delaminated decking found during tear-off requires replacement at $2-$4/sqft — unpredictable scope.",
      prevention: "Include a decking replacement allowance (typically 5-10% of roof area for homes 20+ years old).",
    },
    {
      projectType: "roofing",
      mistake: "Missing drip edge and starter strip",
      consequence: "Drip edge is code-required per IRC. Missing it causes fascia rot and shingle edge failure.",
      prevention: "Always include drip edge and starter strip as line items — not optional.",
    },
    // ── Concrete ────────────────────────────────────────────────────────
    {
      projectType: "concrete_hardscape",
      mistake: "Not including base preparation (grading, compaction, gravel)",
      consequence: "Concrete poured on unprepared subgrade will crack and settle. Base prep is 15-25% of total cost.",
      prevention: "Always include excavation, gravel base, compaction, and vapor barrier line items.",
    },
    {
      projectType: "concrete_hardscape",
      mistake: "Forgetting control joints",
      consequence: "Unjointed slabs crack unpredictably. Control joints guide cracks to planned locations.",
      prevention: "Specify control joint spacing (typically 8-12 ft for 4-inch slab) in the scope.",
    },
    // ── Addition / Remodel ──────────────────────────────────────────────
    {
      projectType: "addition_remodel",
      mistake: "Not accounting for tying new construction into existing structure",
      consequence: "Matching existing rooflines, siding, and floor levels adds complexity. Transition work costs 10-20% of addition cost.",
      prevention: "Include tie-in line items: roofline transition, siding match, floor level transition, paint blending.",
    },
    {
      projectType: "addition_remodel",
      mistake: "Missing HVAC extension for additional square footage",
      consequence: "New rooms need conditioned air. Existing system may not have capacity — could need new zone or unit.",
      prevention: "Include HVAC load calculation and specify whether extending existing system or adding a mini-split.",
    },
    {
      projectType: "addition_remodel",
      mistake: "Forgetting temporary weather protection during construction",
      consequence: "Opening a wall or roof exposes the home to weather damage. Tarp and protection is essential in SE rainy season.",
      prevention: "Include temporary weather protection (tarping, board-up) in the scope for any envelope work.",
    },
    // ── Painting ────────────────────────────────────────────────────────
    {
      projectType: "painting",
      mistake: "Not including prep work (scraping, caulking, priming) for exterior",
      consequence: "Paint over failing substrate peels within 1-2 years. Prep is 60-70% of a quality exterior paint job.",
      prevention: "Break out prep as a separate line item: scraping, sanding, caulking, priming, wood repair.",
    },
    {
      projectType: "painting",
      mistake: "Forgetting to include trim and ceiling in interior paint scope",
      consequence: "Client expects full room painting; scope only covers walls. Scope dispute on final walkthrough.",
      prevention: "Explicitly list walls, ceiling, trim, doors in scope. Call out what is and is not included.",
    },
  ] as ScopeMistake[],

  /**
   * Standard trade sequencing for residential construction.
   * Order reflects typical dependencies in SE US new construction and major remodels.
   */
  tradeSequencing: [
    { trade: "Site Work / Grading", order: 1, dependsOn: [], notes: "Clear, grade, establish drainage. Must happen before any foundation work." },
    { trade: "Foundation / Concrete", order: 2, dependsOn: ["Site Work / Grading"], notes: "Footings, stem walls, slab pour. Plumbing rough-under happens during this phase for slab-on-grade." },
    { trade: "Plumbing Rough-Under", order: 2.5, dependsOn: ["Site Work / Grading"], notes: "Sewer and water lines under slab. Must happen BEFORE slab pour. Parallel with foundation." },
    { trade: "Framing", order: 3, dependsOn: ["Foundation / Concrete"], notes: "Walls, roof trusses, sheathing, house wrap. Order trusses 4-6 weeks ahead." },
    { trade: "Roofing", order: 4, dependsOn: ["Framing"], notes: "Get the house dried in ASAP. Weather exposure is the biggest risk at this stage." },
    { trade: "Windows & Exterior Doors", order: 5, dependsOn: ["Framing", "Roofing"], notes: "Install after roofing to keep building weather-tight. Flash properly." },
    { trade: "Plumbing Rough-In", order: 6, dependsOn: ["Framing"], notes: "Supply and drain lines within walls and floors. Schedule before insulation." },
    { trade: "Electrical Rough-In", order: 7, dependsOn: ["Framing"], notes: "Wiring, boxes, panel. Runs parallel with plumbing rough-in. Schedule inspection before insulation." },
    { trade: "HVAC Rough-In", order: 8, dependsOn: ["Framing"], notes: "Ductwork, line sets, equipment pad. Coordinate with framing for chase locations." },
    { trade: "Insulation", order: 9, dependsOn: ["Plumbing Rough-In", "Electrical Rough-In", "HVAC Rough-In"], notes: "After ALL rough-ins pass inspection. Do not insulate over uninspected work." },
    { trade: "Drywall", order: 10, dependsOn: ["Insulation"], notes: "Hang, tape, mud, sand. Allow 5-7 days for full cycle including dry time between coats." },
    { trade: "Interior Trim / Millwork", order: 11, dependsOn: ["Drywall"], notes: "Base, crown, casing, built-ins. Precision work — schedule after drywall is fully cured." },
    { trade: "Cabinets", order: 12, dependsOn: ["Drywall"], notes: "Install after drywall, before countertops. Verify level and plumb." },
    { trade: "Countertop Template & Install", order: 13, dependsOn: ["Cabinets"], notes: "Template AFTER cabinets are installed and leveled. 2-3 week fabrication lead time." },
    { trade: "Tile / Flooring", order: 14, dependsOn: ["Drywall", "Cabinets"], notes: "Some contractors prefer flooring before cabinets — discuss with client. Tile goes before vanities in baths." },
    { trade: "Painting", order: 15, dependsOn: ["Interior Trim / Millwork"], notes: "After trim install. Prime and paint walls, then trim. Touch-up at final." },
    { trade: "Plumbing Fixtures", order: 16, dependsOn: ["Countertop Template & Install", "Tile / Flooring"], notes: "Faucets, toilets, disposals. After countertops and tile are complete." },
    { trade: "Electrical Fixtures", order: 17, dependsOn: ["Painting"], notes: "Light fixtures, switches, outlets, covers. After painting to avoid overspray." },
    { trade: "HVAC Trim-Out", order: 18, dependsOn: ["Painting"], notes: "Registers, thermostats, equipment startup. After painting." },
    { trade: "Appliance Install", order: 19, dependsOn: ["Plumbing Fixtures", "Electrical Fixtures", "Countertop Template & Install"], notes: "Last major install. Protect finished flooring." },
    { trade: "Final Grading & Landscaping", order: 20, dependsOn: ["Roofing", "Windows & Exterior Doors"], notes: "After exterior work is complete. Establish final drainage and grade." },
    { trade: "Final Clean & Punch List", order: 21, dependsOn: ["Appliance Install", "Electrical Fixtures", "HVAC Trim-Out"], notes: "Professional cleaning, walkthrough, punch list. Budget 1-2 days." },
  ] as TradeSequence[],

  /**
   * Permit requirements by project type in SE US jurisdictions.
   * Varies by municipality — these are common patterns for MS, AL, TN, LA, GA, FL.
   */
  permitRequirements: [
    {
      projectType: "kitchen_renovation",
      permitRequired: true,
      permitTypes: ["building", "plumbing", "electrical"],
      typicalCost: "$200 – $600",
      typicalTimeline: "1-3 weeks for approval",
      notes: "Required if moving walls, changing plumbing/electrical. Cosmetic-only kitchens (paint, counters, no layout change) may not require permits.",
    },
    {
      projectType: "bathroom_renovation",
      permitRequired: true,
      permitTypes: ["building", "plumbing"],
      typicalCost: "$150 – $400",
      typicalTimeline: "1-2 weeks for approval",
      notes: "Required if moving fixtures or changing plumbing. Tile and cosmetic work alone may not need permits.",
    },
    {
      projectType: "deck",
      permitRequired: true,
      permitTypes: ["building"],
      typicalCost: "$100 – $350",
      typicalTimeline: "1-2 weeks for approval",
      notes: "Required for any attached deck or freestanding deck >200 sqft or >30 inches above grade. Requires site plan.",
    },
    {
      projectType: "roofing",
      permitRequired: true,
      permitTypes: ["building"],
      typicalCost: "$100 – $300",
      typicalTimeline: "Same day to 1 week",
      notes: "Required for re-roofing in most SE jurisdictions. Usually fast-tracked. Verify shingle wind rating for coastal zones.",
    },
    {
      projectType: "addition_remodel",
      permitRequired: true,
      permitTypes: ["building", "plumbing", "electrical", "mechanical"],
      typicalCost: "$500 – $2,000",
      typicalTimeline: "2-6 weeks for approval",
      notes: "Requires engineered plans in most jurisdictions. Multiple inspections throughout construction. Check setback requirements.",
    },
    {
      projectType: "new_build",
      permitRequired: true,
      permitTypes: ["building", "plumbing", "electrical", "mechanical", "grading", "septic/sewer"],
      typicalCost: "$2,000 – $8,000",
      typicalTimeline: "4-12 weeks for approval",
      notes: "Full permitting process. Requires stamped plans, survey, soil test (if septic), utility coordination. Impact fees vary widely.",
    },
    {
      projectType: "fencing",
      permitRequired: false,
      permitTypes: [],
      typicalCost: "$0 – $100",
      typicalTimeline: "N/A",
      notes: "Most SE jurisdictions do not require fence permits for residential under 6 feet. Check HOA restrictions and setbacks. Always call 811 for utility locates.",
    },
    {
      projectType: "painting",
      permitRequired: false,
      permitTypes: [],
      typicalCost: "$0",
      typicalTimeline: "N/A",
      notes: "No permit required for painting. Check HOA color restrictions if applicable.",
    },
    {
      projectType: "concrete_hardscape",
      permitRequired: false,
      permitTypes: [],
      typicalCost: "$0 – $200",
      typicalTimeline: "N/A or 1 week",
      notes: "Driveways and patios typically exempt. Retaining walls >4 feet or structures with footings may require permits. Check local rules.",
    },
    {
      projectType: "retaining_wall",
      permitRequired: true,
      permitTypes: ["building"],
      typicalCost: "$150 – $500",
      typicalTimeline: "1-3 weeks for approval",
      notes: "Required for walls >4 feet in most jurisdictions. May require engineering for walls >4 feet or with surcharge loads.",
    },
    {
      projectType: "door_window",
      permitRequired: false,
      permitTypes: [],
      typicalCost: "$0 – $150",
      typicalTimeline: "N/A or same day",
      notes: "Same-size replacement: no permit. New openings or size changes: building permit required (structural header changes).",
    },
    {
      projectType: "garage_carport",
      permitRequired: true,
      permitTypes: ["building", "electrical"],
      typicalCost: "$200 – $800",
      typicalTimeline: "2-4 weeks for approval",
      notes: "New construction requires permits. Verify setback requirements — garages often have different setback rules than the house.",
    },
  ] as PermitRequirement[],

  /**
   * Typical project durations by project type and size.
   * Based on MHP's project history in SE US.
   */
  projectDurations: [
    { projectType: "kitchen_renovation", sizeCategory: "small", sizeDescription: "Cosmetic refresh (paint, counters, hardware)", durationWeeks: { min: 1, max: 2 }, notes: "No layout change, no plumbing/electrical." },
    { projectType: "kitchen_renovation", sizeCategory: "medium", sizeDescription: "Full remodel with new cabinets, counters, backsplash", durationWeeks: { min: 4, max: 8 }, notes: "Layout stays similar. Countertop fabrication is the critical path." },
    { projectType: "kitchen_renovation", sizeCategory: "large", sizeDescription: "Full gut with layout change, walls moved", durationWeeks: { min: 8, max: 14 }, notes: "Structural changes, permit inspections, and finish selections all add time." },

    { projectType: "bathroom_renovation", sizeCategory: "small", sizeDescription: "Cosmetic refresh (vanity, paint, fixtures)", durationWeeks: { min: 1, max: 2 }, notes: "No tile work, no plumbing moves." },
    { projectType: "bathroom_renovation", sizeCategory: "medium", sizeDescription: "Full remodel with tile shower, new vanity, flooring", durationWeeks: { min: 3, max: 5 }, notes: "Tile work and waterproofing cure time drive the schedule." },
    { projectType: "bathroom_renovation", sizeCategory: "large", sizeDescription: "Master bath gut with layout change, freestanding tub", durationWeeks: { min: 5, max: 8 }, notes: "Plumbing rerouting and custom tile work are critical path items." },

    { projectType: "deck", sizeCategory: "small", sizeDescription: "Under 200 sqft, ground level", durationWeeks: { min: 1, max: 2 }, notes: "Simple builds can be done in a week with good weather." },
    { projectType: "deck", sizeCategory: "medium", sizeDescription: "200-500 sqft, single level", durationWeeks: { min: 2, max: 3 }, notes: "Footer cure time is the bottleneck." },
    { projectType: "deck", sizeCategory: "large", sizeDescription: "500+ sqft, multi-level or screened", durationWeeks: { min: 3, max: 6 }, notes: "Screening, electrical for fans/lights, and multi-level framing add complexity." },

    { projectType: "roofing", sizeCategory: "small", sizeDescription: "Under 15 squares", durationWeeks: { min: 0.5, max: 1 }, notes: "Simple ranch roof, 1-2 day tear-off and install." },
    { projectType: "roofing", sizeCategory: "medium", sizeDescription: "15-30 squares", durationWeeks: { min: 1, max: 2 }, notes: "Standard residential. Weather days are the variable." },
    { projectType: "roofing", sizeCategory: "large", sizeDescription: "30+ squares, complex roofline", durationWeeks: { min: 2, max: 3 }, notes: "Multiple ridges, valleys, dormers add time. Steep pitch requires safety setup." },

    { projectType: "addition_remodel", sizeCategory: "small", sizeDescription: "Under 300 sqft (sunroom, bump-out)", durationWeeks: { min: 6, max: 10 }, notes: "Even small additions require full permitting and inspections." },
    { projectType: "addition_remodel", sizeCategory: "medium", sizeDescription: "300-800 sqft (room addition, master suite)", durationWeeks: { min: 10, max: 16 }, notes: "Foundation, framing, and tie-in to existing structure are critical path." },
    { projectType: "addition_remodel", sizeCategory: "large", sizeDescription: "800+ sqft (major addition, second story)", durationWeeks: { min: 16, max: 28 }, notes: "Second story additions require structural engineering and temporary shoring." },

    { projectType: "new_build", sizeCategory: "small", sizeDescription: "Under 1,500 sqft", durationWeeks: { min: 16, max: 24 }, notes: "Cottage, starter home, or ADU. Permit timeline is often the longest phase." },
    { projectType: "new_build", sizeCategory: "medium", sizeDescription: "1,500-3,000 sqft", durationWeeks: { min: 24, max: 36 }, notes: "Standard SE US residential. Weather delays add 2-4 weeks on average." },
    { projectType: "new_build", sizeCategory: "large", sizeDescription: "3,000+ sqft", durationWeeks: { min: 36, max: 52 }, notes: "Custom homes with complex features. Selection delays are the hidden schedule killer." },

    { projectType: "painting", sizeCategory: "small", sizeDescription: "1-3 rooms interior", durationWeeks: { min: 0.5, max: 1 }, notes: "Prep, prime, 2 coats. Furniture moving adds time." },
    { projectType: "painting", sizeCategory: "medium", sizeDescription: "Whole house interior or exterior", durationWeeks: { min: 1, max: 2 }, notes: "Exterior depends on weather windows. SE humidity affects dry times." },
    { projectType: "painting", sizeCategory: "large", sizeDescription: "Full interior + exterior", durationWeeks: { min: 2, max: 4 }, notes: "Exterior scraping and prep on older homes is the time driver." },

    { projectType: "concrete_hardscape", sizeCategory: "small", sizeDescription: "Under 500 sqft (walkway, small patio)", durationWeeks: { min: 0.5, max: 1 }, notes: "Pour and finish in one day. Cure time is 7 days before full use." },
    { projectType: "concrete_hardscape", sizeCategory: "medium", sizeDescription: "500-1,500 sqft (driveway, large patio)", durationWeeks: { min: 1, max: 2 }, notes: "Base prep is the time driver. May require multiple pours." },
    { projectType: "concrete_hardscape", sizeCategory: "large", sizeDescription: "1,500+ sqft (full driveway + walkways + patio)", durationWeeks: { min: 2, max: 4 }, notes: "Phased pours to manage concrete truck logistics." },

    { projectType: "fencing", sizeCategory: "small", sizeDescription: "Under 100 linear feet", durationWeeks: { min: 0.5, max: 1 }, notes: "Post hole digging and concrete set time are the bottleneck." },
    { projectType: "fencing", sizeCategory: "medium", sizeDescription: "100-300 linear feet", durationWeeks: { min: 1, max: 2 }, notes: "Standard residential lot perimeter." },
    { projectType: "fencing", sizeCategory: "large", sizeDescription: "300+ linear feet", durationWeeks: { min: 2, max: 3 }, notes: "Large lots or acreage. Gate fabrication adds 1-2 days." },
  ] as ProjectDuration[],

  /**
   * Standard warranty language recommendations.
   */
  warrantyGuidance: {
    workmanship: {
      standardYears: 1,
      description:
        "One-year workmanship warranty covering defects in installation and construction. " +
        "Does not cover normal wear and tear, homeowner modifications, or Acts of God.",
      notes:
        "This is the industry standard for residential construction in SE US. " +
        "Some contractors offer 2 years for competitive advantage. " +
        "Always specify what IS and IS NOT covered.",
    },
    structural: {
      standardYears: 10,
      description:
        "Ten-year structural warranty covering load-bearing elements: foundation, " +
        "framing, and roof structure. Requires homeowner maintenance per specifications.",
      notes:
        "For new builds and major additions. Some states have implied warranty statutes. " +
        "Consider third-party structural warranty programs (2-10 HBW, StrucSure).",
    },
    materials: {
      description:
        "Material warranties are manufacturer-provided and passed through to the homeowner. " +
        "The contractor does not warrant manufacturer defects but will assist with claims.",
      commonWarranties: {
        shingles: "25-50 years (manufacturer)",
        windows: "10-20 years (manufacturer)",
        cabinets: "1-5 years (manufacturer)",
        countertops: "1-15 years depending on material",
        appliances: "1 year (manufacturer)",
        paint: "Varies by product (typically 10-15 year exterior)",
        flooring: "10-25 years (manufacturer, residential use)",
      },
      notes: "Always provide manufacturer warranty documentation to the homeowner at project close.",
    },
    exclusions: [
      "Normal wear and tear",
      "Damage from homeowner modifications or misuse",
      "Acts of God (flood, hurricane, tornado, earthquake)",
      "Settling cracks in concrete (hairline cracks under 1/8 inch are normal)",
      "Wood movement and seasonal expansion/contraction",
      "Color fading or weathering of exterior materials",
      "Landscaping and grading changes made by homeowner",
      "Damage from failure to maintain (e.g., clogged gutters causing water damage)",
    ],
  },

  /**
   * Change order best practices.
   */
  changeOrderPractices: [
    {
      rule: "Document every change before executing",
      explanation:
        "No work should be performed on a change until the change order is signed by the client. " +
        "This is the #1 cause of payment disputes in residential construction.",
    },
    {
      rule: "Include time impact in every change order",
      explanation:
        "Every change order should state how many days it adds to the schedule. " +
        "Clients accept cost changes more easily when they understand the time tradeoff.",
    },
    {
      rule: "Price change orders at contract rates, not time-and-material",
      explanation:
        "Whenever possible, price changes using the same unit rates from the original estimate. " +
        "T&M change orders invite disputes. If T&M is necessary, set a not-to-exceed cap.",
    },
    {
      rule: "Batch small changes into weekly change orders",
      explanation:
        "Multiple small change orders create administrative burden and client fatigue. " +
        "Group minor changes into weekly summaries unless the change requires immediate approval.",
    },
    {
      rule: "Maintain a running change order log",
      explanation:
        "Track all change orders (approved, pending, and rejected) in a single log with running " +
        "totals. Share this with the client regularly so the total project cost is never a surprise.",
    },
    {
      rule: "Set a contingency threshold for owner notification",
      explanation:
        "Agree at contract signing that the contractor can execute changes under a certain amount " +
        "(e.g., $500) from the contingency without separate approval, but must notify the owner. " +
        "This prevents project delays for minor field decisions.",
    },
  ] as ChangeOrderPractice[],

  /**
   * Safety and liability notes for estimates and scope documents.
   */
  safetyAndLiability: {
    standardDisclosures: [
      "All work will be performed in accordance with applicable local building codes and manufacturer specifications.",
      "The contractor will maintain general liability insurance and workers' compensation coverage throughout the project.",
      "The homeowner is responsible for clearing and securing the work area of personal belongings, pets, and valuables.",
      "The contractor is not responsible for pre-existing conditions discovered during construction (e.g., mold, asbestos, termite damage, faulty wiring).",
      "Lead-based paint disclosure and EPA RRP compliance are required for homes built before 1978.",
      "The homeowner should plan for alternative living arrangements during major kitchen or bathroom renovations.",
    ],
    hazardousMaterials: {
      asbestos:
        "Homes built before 1980: assume popcorn ceilings, 9x9 floor tiles, pipe insulation, and siding may contain asbestos. " +
        "Testing costs $25-$50 per sample. Abatement is $5-$15/sqft. Always include a testing allowance in the scope for pre-1980 homes.",
      leadPaint:
        "Homes built before 1978: EPA RRP Rule requires lead-safe work practices. Certified renovator must be on-site. " +
        "Add 10-15% to labor costs for containment, HEPA vacuuming, and documentation.",
      mold:
        "In SE US, mold is common in bathrooms, crawlspaces, and behind siding. If discovered, stop work and test. " +
        "Remediation must be performed by a licensed mold remediation firm before construction continues.",
    },
    seUsSpecific: [
      "Termite treatment: All new construction and additions should include pre-treatment. Common providers: Terminix, Orkin, local pest control.",
      "Hurricane straps and tie-downs: Required in coastal zones. Verify local wind speed requirements.",
      "Flood zone considerations: Check FEMA flood maps. Flood zone construction requires elevation certificates and specific foundation types.",
      "High humidity: All wood materials should be acclimated on-site before installation. Allow 3-5 days for flooring acclimation in SE US.",
      "Red clay soil: Common in MS/AL/GA. Expansive clay requires proper drainage and may affect foundation design.",
    ],
  },
} as const;
