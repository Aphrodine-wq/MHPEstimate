/**
 * seed-estimates.mjs
 * One-off script: inserts 10 diverse construction estimates into Supabase.
 *
 * Auth options (pick one):
 *   SUPABASE_SERVICE_ROLE_KEY=... node scripts/seed-estimates.mjs   (bypasses RLS)
 *   SUPABASE_EMAIL=you@... SUPABASE_PASSWORD=... node scripts/seed-estimates.mjs
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://rkkahijwghvkxeydovjj.supabase.co";
const ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJra2FoaWp3Z2h2a3hleWRvdmpqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4MTcwODksImV4cCI6MjA4ODM5MzA4OX0.HxaV8_O6RapLYrX_UmQ43Z1sNRMrePPXw5mTvHmhjLI";

const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const EMAIL = process.env.SUPABASE_EMAIL;
const PASSWORD = process.env.SUPABASE_PASSWORD;

if (!SERVICE_KEY && (!EMAIL || !PASSWORD)) {
  console.error(
    "❌  Provide SUPABASE_SERVICE_ROLE_KEY  OR  SUPABASE_EMAIL + SUPABASE_PASSWORD"
  );
  process.exit(1);
}

const supabase = createClient(
  SUPABASE_URL,
  SERVICE_KEY ?? ANON_KEY,
  SERVICE_KEY
    ? { auth: { persistSession: false, autoRefreshToken: false } }
    : {}
);

// Sign in if using anon key + credentials
if (!SERVICE_KEY) {
  const { error } = await supabase.auth.signInWithPassword({
    email: EMAIL,
    password: PASSWORD,
  });
  if (error) {
    console.error("❌  Auth failed:", error.message);
    process.exit(1);
  }
  console.log("✅  Signed in as", EMAIL);
}

// ─────────────────────────────────────────────
// DATA: 10 clients
// ─────────────────────────────────────────────
const clients = [
  {
    full_name: "Robert & Linda Hargrove",
    email: "hargrove.family@gmail.com",
    phone: "615-302-4871",
    address_line1: "2241 Magnolia Trace",
    city: "Brentwood",
    state: "TN",
    zip: "37027",
    source: "referral",
  },
  {
    full_name: "Marcus Webb",
    email: "mwebb.builds@outlook.com",
    phone: "615-889-0034",
    address_line1: "509 Old Hickory Blvd",
    city: "Nashville",
    state: "TN",
    zip: "37209",
    source: "website",
  },
  {
    full_name: "Diane Kowalski",
    email: "dianekowalski55@yahoo.com",
    phone: "615-774-2210",
    address_line1: "18 Creekside Dr",
    city: "Franklin",
    state: "TN",
    zip: "37064",
    source: "google",
  },
  {
    full_name: "The Patel Group LLC",
    email: "accounts@patelgrouptn.com",
    phone: "615-555-0199",
    address_line1: "3300 Elm Hill Pike",
    city: "Nashville",
    state: "TN",
    zip: "37214",
    source: "referral",
  },
  {
    full_name: "Sandra & Tom Eckhardt",
    email: "eckhardt.home@icloud.com",
    phone: "615-468-9902",
    address_line1: "76 Chadwick Court",
    city: "Murfreesboro",
    state: "TN",
    zip: "37128",
    source: "nextdoor",
  },
  {
    full_name: "James Calloway",
    email: "jcalloway.contractor@gmail.com",
    phone: "615-300-1145",
    address_line1: "4412 Nolensville Pike",
    city: "Nashville",
    state: "TN",
    zip: "37211",
    source: "repeat_customer",
  },
  {
    full_name: "Maria & Hector Fuentes",
    email: "fuentes.familyhome@gmail.com",
    phone: "615-912-3367",
    address_line1: "831 Volunteer Dr",
    city: "Smyrna",
    state: "TN",
    zip: "37167",
    source: "google",
  },
  {
    full_name: "Oakview Community Church",
    email: "facilities@oakviewchurch.org",
    phone: "615-780-4400",
    address_line1: "1100 Church Street",
    city: "Gallatin",
    state: "TN",
    zip: "37066",
    source: "referral",
  },
  {
    full_name: "Bryan Stafford",
    email: "bstafford.dev@gmail.com",
    phone: "615-229-8851",
    address_line1: "203 Whitfield Lane",
    city: "Hendersonville",
    state: "TN",
    zip: "37075",
    source: "website",
  },
  {
    full_name: "Carol Jennings",
    email: "c.jennings@hotmail.com",
    phone: "615-643-0077",
    address_line1: "5502 Edmondson Pike",
    city: "Nashville",
    state: "TN",
    zip: "37211",
    source: "facebook",
  },
];

// ─────────────────────────────────────────────
// HELPER: build estimate totals from line items
// ─────────────────────────────────────────────
function calcTotals(lines) {
  let materials = 0;
  let labor = 0;
  for (const l of lines) {
    if (l.category.includes("labor") || l.category === "labor") {
      labor += l.extended_price ?? 0;
    } else {
      materials += l.extended_price ?? 0;
    }
  }
  const sub = materials + labor;
  const overhead = Math.round(sub * 0.15 * 100) / 100;
  const contingency = Math.round(sub * 0.05 * 100) / 100;
  const tax = Math.round(materials * 0.0975 * 100) / 100;
  const grand = Math.round((sub + overhead + contingency + tax) * 100) / 100;
  const margin = Math.round(((overhead + contingency) / grand) * 100 * 10) / 10;
  return { materials, labor, sub, overhead, contingency, tax, grand, margin };
}

// ─────────────────────────────────────────────
// DATA: 10 estimate definitions
// Each has: meta + line items
// ─────────────────────────────────────────────
const estimateDefs = [
  // 1 — ROOFING (midrange, sent)
  {
    clientIdx: 0,
    meta: {
      estimate_number: "MHP-2026-0041",
      project_type: "roofing",
      project_address: "2241 Magnolia Trace, Brentwood, TN 37027",
      status: "sent",
      tier: "better",
      source: "manual",
      scope_inclusions: [
        "Full tear-off of existing 2-layer shingle",
        "30-yr architectural shingle installation",
        "New ice & water shield in valleys",
        "Ridge vent installation",
        "Flashing replacement at all penetrations",
      ],
      scope_exclusions: ["Decking replacement unless found damaged"],
      site_conditions: "Moderate pitch (6/12). Two dormers. Minor soffit rot noted on NE corner.",
      estimated_start: "2026-04-07",
      estimated_end: "2026-04-10",
      valid_through: "2026-04-06",
      validation_passed: true,
    },
    lines: [
      { ln: 1, cat: "materials", desc: "Architectural Shingles – GAF Timberline HDZ (Charcoal)", qty: 42, unit: "sq", unit_price: 210, extended_price: 8820 },
      { ln: 2, cat: "materials", desc: "Ice & Water Shield – 2 sq valleys + eaves", qty: 4, unit: "sq", unit_price: 95, extended_price: 380 },
      { ln: 3, cat: "materials", desc: "Synthetic Underlayment – 38 sq", qty: 38, unit: "sq", unit_price: 22, extended_price: 836 },
      { ln: 4, cat: "materials", desc: "Ridge Vent – Air Vent ShingleVent II", qty: 60, unit: "lf", unit_price: 4.5, extended_price: 270 },
      { ln: 5, cat: "materials", desc: "Step & Counter Flashing – Galvanized", qty: 1, unit: "ls", unit_price: 420, extended_price: 420 },
      { ln: 6, cat: "materials", desc: "Roofing Nails, Caps, Misc Fasteners", qty: 1, unit: "ls", unit_price: 180, extended_price: 180 },
      { ln: 7, cat: "labor", desc: "Tear-Off – 2 layers existing shingle", qty: 42, unit: "sq", unit_price: 80, extended_price: 3360 },
      { ln: 8, cat: "labor", desc: "New Shingle Installation", qty: 42, unit: "sq", unit_price: 150, extended_price: 6300 },
      { ln: 9, cat: "labor", desc: "Flashing Installation", qty: 1, unit: "ls", unit_price: 650, extended_price: 650 },
      { ln: 10, cat: "general_conditions", desc: "Dumpster – 15-yd for tear-off debris", qty: 1, unit: "ea", unit_price: 425, extended_price: 425 },
      { ln: 11, cat: "general_conditions", desc: "Project Coordination & Cleanup", qty: 1, unit: "ls", unit_price: 750, extended_price: 750 },
    ],
  },

  // 2 — SIDING (high_end, approved)
  {
    clientIdx: 1,
    meta: {
      estimate_number: "MHP-2026-0042",
      project_type: "siding",
      project_address: "509 Old Hickory Blvd, Nashville, TN 37209",
      status: "approved",
      tier: "best",
      source: "manual",
      scope_inclusions: [
        "Full house re-side with James Hardie fiber cement",
        "Removal and disposal of existing vinyl siding",
        "New house wrap installation (Tyvek HomeWrap)",
        "Primed and pre-painted board & batten accent panels",
        "Aluminum trim around all windows and doors",
      ],
      scope_exclusions: ["Painting – Hardie ColorPlus factory finish"],
      site_conditions: "2-story, 2,200 sf exterior. Some wood rot at window sills to be remediated.",
      estimated_start: "2026-04-21",
      estimated_end: "2026-05-09",
      valid_through: "2026-04-20",
      validation_passed: true,
    },
    lines: [
      { ln: 1, cat: "materials", desc: "James Hardie HardiePlank Lap Siding – Arctic White ColorPlus", qty: 260, unit: "sq ft", unit_price: 4.85, extended_price: 1261 },
      { ln: 2, cat: "materials", desc: "James Hardie Board & Batten – Deep Ocean ColorPlus (accent)", qty: 48, unit: "sq ft", unit_price: 6.2, extended_price: 297.6 },
      { ln: 3, cat: "materials", desc: "Tyvek HomeWrap – full envelope", qty: 1, unit: "ls", unit_price: 1850, extended_price: 1850 },
      { ln: 4, cat: "materials", desc: "Aluminum Window & Door Trim Coil", qty: 1, unit: "ls", unit_price: 980, extended_price: 980 },
      { ln: 5, cat: "materials", desc: "HardieSoffit Panels – vented, 280 lf", qty: 280, unit: "lf", unit_price: 9.5, extended_price: 2660 },
      { ln: 6, cat: "materials", desc: "Nails, caulk, flashing tape, misc", qty: 1, unit: "ls", unit_price: 620, extended_price: 620 },
      { ln: 7, cat: "labor", desc: "Existing Siding Removal & Disposal", qty: 1, unit: "ls", unit_price: 3200, extended_price: 3200 },
      { ln: 8, cat: "labor", desc: "House Wrap Installation", qty: 1, unit: "ls", unit_price: 1400, extended_price: 1400 },
      { ln: 9, cat: "labor", desc: "HardiePlank Installation – main body", qty: 260, unit: "sq ft", unit_price: 7.5, extended_price: 1950 },
      { ln: 10, cat: "labor", desc: "Board & Batten Accent Installation", qty: 48, unit: "sq ft", unit_price: 9, extended_price: 432 },
      { ln: 11, cat: "labor", desc: "Trim & Soffit Installation", qty: 1, unit: "ls", unit_price: 2400, extended_price: 2400 },
      { ln: 12, cat: "labor", desc: "Wood Rot Remediation – window sills (est. 3 windows)", qty: 3, unit: "ea", unit_price: 380, extended_price: 1140 },
      { ln: 13, cat: "general_conditions", desc: "Dumpster – 20-yd", qty: 1, unit: "ea", unit_price: 550, extended_price: 550 },
      { ln: 14, cat: "general_conditions", desc: "Scaffolding Rental – 3 weeks", qty: 3, unit: "wk", unit_price: 450, extended_price: 1350 },
      { ln: 15, cat: "general_conditions", desc: "Building Permit – Metro Nashville", qty: 1, unit: "ea", unit_price: 325, extended_price: 325 },
    ],
  },

  // 3 — WINDOWS (budget, draft)
  {
    clientIdx: 2,
    meta: {
      estimate_number: "MHP-2026-0043",
      project_type: "windows",
      project_address: "18 Creekside Dr, Franklin, TN 37064",
      status: "draft",
      tier: "good",
      source: "voice",
      scope_inclusions: [
        "Replace 9 double-hung windows",
        "3M Low-E glass, vinyl frame",
        "Haul away old windows",
      ],
      scope_exclusions: ["Interior/exterior painting", "Custom window sizes"],
      site_conditions: "Single story. 9 standard 3x5 double-hung, original 1985 aluminum frames.",
      estimated_start: "2026-05-05",
      estimated_end: "2026-05-07",
      valid_through: "2026-05-04",
      validation_passed: false,
    },
    lines: [
      { ln: 1, cat: "materials", desc: "Simonton Reflections 5500 DH Window 36x60 – White Vinyl", qty: 9, unit: "ea", unit_price: 385, extended_price: 3465 },
      { ln: 2, cat: "materials", desc: "Foam Backer Rod & Low-Expansion Foam", qty: 9, unit: "ea", unit_price: 18, extended_price: 162 },
      { ln: 3, cat: "materials", desc: "Exterior Caulk – Sherwin-Williams", qty: 4, unit: "tube", unit_price: 12, extended_price: 48 },
      { ln: 4, cat: "labor", desc: "Window Removal & Installation", qty: 9, unit: "ea", unit_price: 220, extended_price: 1980 },
      { ln: 5, cat: "labor", desc: "Interior & Exterior Trim Touch-up", qty: 9, unit: "ea", unit_price: 45, extended_price: 405 },
      { ln: 6, cat: "general_conditions", desc: "Old Window Haul-Away", qty: 1, unit: "ls", unit_price: 200, extended_price: 200 },
      { ln: 7, cat: "general_conditions", desc: "Project Coordination", qty: 1, unit: "ls", unit_price: 350, extended_price: 350 },
    ],
  },

  // 4 — GUTTERS (midrange, accepted)
  {
    clientIdx: 3,
    meta: {
      estimate_number: "MHP-2026-0044",
      project_type: "gutters",
      project_address: "3300 Elm Hill Pike, Nashville, TN 37214",
      status: "accepted",
      tier: "better",
      source: "template",
      scope_inclusions: [
        "Remove existing 4" gutters (260 lf)",
        "Install new 6" K-style seamless aluminum gutters",
        "Install gutter guards – MicroMesh style",
        "Downspout extensions – 4 locations",
      ],
      scope_exclusions: ["Fascia board repair"],
      site_conditions: "Commercial building, single-story flat roof with parapet. 260 lf of gutter run.",
      estimated_start: "2026-03-24",
      estimated_end: "2026-03-25",
      valid_through: "2026-03-23",
      validation_passed: true,
    },
    lines: [
      { ln: 1, cat: "materials", desc: "6\" K-Style Seamless Aluminum Gutter – Musket Brown", qty: 260, unit: "lf", unit_price: 6.5, extended_price: 1690 },
      { ln: 2, cat: "materials", desc: "MicroMesh Gutter Guard – Valor", qty: 260, unit: "lf", unit_price: 9, extended_price: 2340 },
      { ln: 3, cat: "materials", desc: "3x4 Aluminum Downspout – 4 locations", qty: 40, unit: "lf", unit_price: 5, extended_price: 200 },
      { ln: 4, cat: "materials", desc: "Downspout Extensions – Flex-a-Spout", qty: 4, unit: "ea", unit_price: 28, extended_price: 112 },
      { ln: 5, cat: "materials", desc: "Gutter Screws, Sealant, Hangers", qty: 1, unit: "ls", unit_price: 185, extended_price: 185 },
      { ln: 6, cat: "labor", desc: "Old Gutter Removal & Disposal", qty: 260, unit: "lf", unit_price: 2.5, extended_price: 650 },
      { ln: 7, cat: "labor", desc: "New Gutter & Downspout Installation", qty: 260, unit: "lf", unit_price: 5.5, extended_price: 1430 },
      { ln: 8, cat: "labor", desc: "Gutter Guard Installation", qty: 260, unit: "lf", unit_price: 3, extended_price: 780 },
      { ln: 9, cat: "general_conditions", desc: "Cleanup & Final Inspection", qty: 1, unit: "ls", unit_price: 250, extended_price: 250 },
    ],
  },

  // 5 — EXTERIOR PAINTING (high_end, in_review)
  {
    clientIdx: 4,
    meta: {
      estimate_number: "MHP-2026-0045",
      project_type: "painting_exterior",
      project_address: "76 Chadwick Court, Murfreesboro, TN 37128",
      status: "in_review",
      tier: "best",
      source: "manual",
      scope_inclusions: [
        "Full exterior repaint – body, trim, shutters, doors",
        "Pressure wash entire exterior",
        "Caulk all gaps, cracks, seams",
        "2 coats Sherwin-Williams Emerald Exterior",
      ],
      scope_exclusions: ["Decks/fences", "Interior painting"],
      site_conditions: "2-story craftsman, ~2,800 sf exterior. Previous paint peeling on south side.",
      estimated_start: "2026-04-14",
      estimated_end: "2026-04-20",
      valid_through: "2026-04-13",
      validation_passed: true,
    },
    lines: [
      { ln: 1, cat: "materials", desc: "SW Emerald Exterior Paint – Body color (Accessible Beige)", qty: 14, unit: "gal", unit_price: 85, extended_price: 1190 },
      { ln: 2, cat: "materials", desc: "SW Emerald Exterior Paint – Trim (Extra White)", qty: 5, unit: "gal", unit_price: 85, extended_price: 425 },
      { ln: 3, cat: "materials", desc: "SW Exterior Primer – 5 gal", qty: 2, unit: "gal", unit_price: 62, extended_price: 124 },
      { ln: 4, cat: "materials", desc: "Caulk – Sherwin-Williams Siliconized Acrylic", qty: 12, unit: "tube", unit_price: 9, extended_price: 108 },
      { ln: 5, cat: "materials", desc: "Masking, drop cloths, brushes, rollers", qty: 1, unit: "ls", unit_price: 280, extended_price: 280 },
      { ln: 6, cat: "labor", desc: "Pressure Washing", qty: 1, unit: "ls", unit_price: 650, extended_price: 650 },
      { ln: 7, cat: "labor", desc: "Scraping, Sanding, Surface Prep", qty: 1, unit: "ls", unit_price: 1200, extended_price: 1200 },
      { ln: 8, cat: "labor", desc: "Prime Coat Application – bare/peeling areas", qty: 1, unit: "ls", unit_price: 900, extended_price: 900 },
      { ln: 9, cat: "labor", desc: "Body Paint – 2 coats", qty: 2800, unit: "sf", unit_price: 1.25, extended_price: 3500 },
      { ln: 10, cat: "labor", desc: "Trim, Shutters, Doors – 2 coats", qty: 1, unit: "ls", unit_price: 1800, extended_price: 1800 },
      { ln: 11, cat: "general_conditions", desc: "Project Coordination & Cleanup", qty: 1, unit: "ls", unit_price: 600, extended_price: 600 },
    ],
  },

  // 6 — INSULATION (budget, declined)
  {
    clientIdx: 5,
    meta: {
      estimate_number: "MHP-2026-0046",
      project_type: "insulation",
      project_address: "4412 Nolensville Pike, Nashville, TN 37211",
      status: "declined",
      tier: "good",
      source: "manual",
      scope_inclusions: [
        "Attic blown-in insulation – R-49 target",
        "Air sealing at top plates, penetrations, hatch",
      ],
      scope_exclusions: ["Wall insulation", "Crawl space"],
      site_conditions: "1,650 sf attic. Current R-11. Gas furnace in attic – baffles needed.",
      estimated_start: null,
      estimated_end: null,
      valid_through: "2026-03-31",
      validation_passed: false,
    },
    lines: [
      { ln: 1, cat: "materials", desc: "Owens Corning ProPink L77 Blown Cellulose – 20 bags", qty: 20, unit: "bag", unit_price: 42, extended_price: 840 },
      { ln: 2, cat: "materials", desc: "Soffit Baffles – Accuvent 48pc", qty: 2, unit: "pk", unit_price: 65, extended_price: 130 },
      { ln: 3, cat: "materials", desc: "Foam Sealant – Great Stuff Pro", qty: 6, unit: "can", unit_price: 18, extended_price: 108 },
      { ln: 4, cat: "materials", desc: "Attic Hatch Cover Insulation Kit", qty: 1, unit: "ea", unit_price: 75, extended_price: 75 },
      { ln: 5, cat: "labor", desc: "Air Sealing – top plates & penetrations", qty: 1, unit: "ls", unit_price: 480, extended_price: 480 },
      { ln: 6, cat: "labor", desc: "Blown Insulation Installation – 1,650 sf", qty: 1650, unit: "sf", unit_price: 0.95, extended_price: 1567.5 },
      { ln: 7, cat: "labor", desc: "Baffle Installation", qty: 24, unit: "ea", unit_price: 12, extended_price: 288 },
      { ln: 8, cat: "general_conditions", desc: "Project Coordination", qty: 1, unit: "ls", unit_price: 300, extended_price: 300 },
    ],
  },

  // 7 — DECK (midrange, sent)
  {
    clientIdx: 6,
    meta: {
      estimate_number: "MHP-2026-0047",
      project_type: "deck",
      project_address: "831 Volunteer Dr, Smyrna, TN 37167",
      status: "sent",
      tier: "better",
      source: "manual",
      scope_inclusions: [
        "New 16x20 composite deck – Trex Transcend",
        "Pressure-treated framing on concrete piers",
        "Composite rail system – black aluminum balusters",
        "2 sets of stairs",
        "LED post cap lighting – 6 posts",
      ],
      scope_exclusions: ["Pergola or shade structure", "Electrical for outlets"],
      site_conditions: "Grade slopes 18\" at far edge. Setback from property line OK per survey.",
      estimated_start: "2026-05-12",
      estimated_end: "2026-05-23",
      valid_through: "2026-05-11",
      validation_passed: true,
    },
    lines: [
      { ln: 1, cat: "materials", desc: "Trex Transcend Decking – Havana Gold (320 sf)", qty: 320, unit: "sf", unit_price: 14.5, extended_price: 4640 },
      { ln: 2, cat: "materials", desc: "Pressure Treated Framing Lumber – 2x10 joists, beams, ledger", qty: 1, unit: "ls", unit_price: 2200, extended_price: 2200 },
      { ln: 3, cat: "materials", desc: "Concrete Piers – 8 @ 12\" diameter x 36\" depth", qty: 8, unit: "ea", unit_price: 185, extended_price: 1480 },
      { ln: 4, cat: "materials", desc: "Trex Transcend Rail System – 70 lf", qty: 70, unit: "lf", unit_price: 42, extended_price: 2940 },
      { ln: 5, cat: "materials", desc: "Aluminum Balusters – Black", qty: 140, unit: "ea", unit_price: 6.5, extended_price: 910 },
      { ln: 6, cat: "materials", desc: "Trex LED Post Cap Lights – 6 posts", qty: 6, unit: "ea", unit_price: 75, extended_price: 450 },
      { ln: 7, cat: "materials", desc: "Hidden Fasteners – Trex Hideaway", qty: 1, unit: "ls", unit_price: 480, extended_price: 480 },
      { ln: 8, cat: "materials", desc: "Joist Hangers, Bolts, Hardware", qty: 1, unit: "ls", unit_price: 350, extended_price: 350 },
      { ln: 9, cat: "labor", desc: "Site Prep & Pier Drilling/Forming", qty: 8, unit: "ea", unit_price: 280, extended_price: 2240 },
      { ln: 10, cat: "labor", desc: "Framing Installation", qty: 320, unit: "sf", unit_price: 6.5, extended_price: 2080 },
      { ln: 11, cat: "labor", desc: "Decking Installation", qty: 320, unit: "sf", unit_price: 5.5, extended_price: 1760 },
      { ln: 12, cat: "labor", desc: "Rail & Baluster Installation", qty: 70, unit: "lf", unit_price: 18, extended_price: 1260 },
      { ln: 13, cat: "labor", desc: "Stair Construction – 2 sets", qty: 2, unit: "ea", unit_price: 850, extended_price: 1700 },
      { ln: 14, cat: "labor", desc: "Lighting Installation", qty: 6, unit: "ea", unit_price: 85, extended_price: 510 },
      { ln: 15, cat: "general_conditions", desc: "Building Permit – Rutherford County", qty: 1, unit: "ea", unit_price: 275, extended_price: 275 },
      { ln: 16, cat: "general_conditions", desc: "Dumpster & Site Cleanup", qty: 1, unit: "ls", unit_price: 480, extended_price: 480 },
    ],
  },

  // 8 — CONCRETE / HARDSCAPE (high_end, approved)
  {
    clientIdx: 7,
    meta: {
      estimate_number: "MHP-2026-0048",
      project_type: "concrete_hardscape",
      project_address: "1100 Church Street, Gallatin, TN 37066",
      status: "approved",
      tier: "best",
      source: "manual",
      scope_inclusions: [
        "Demo existing cracked asphalt parking lot (4,200 sf)",
        "New 6\" reinforced concrete – parking lot",
        "Expansion joints at 10' intervals",
        "Handicap-accessible ramps – 2 locations",
        "Restripe – ADA compliant layout",
      ],
      scope_exclusions: ["Landscaping around perimeter"],
      site_conditions: "Commercial church property. Existing utilities marked. Minor grading needed.",
      estimated_start: "2026-06-02",
      estimated_end: "2026-06-13",
      valid_through: "2026-05-31",
      validation_passed: true,
    },
    lines: [
      { ln: 1, cat: "materials", desc: "Ready-Mix Concrete – 4,200 sf x 6\" (77 cy)", qty: 77, unit: "cy", unit_price: 155, extended_price: 11935 },
      { ln: 2, cat: "materials", desc: "#4 Rebar – 10\" o.c. grid", qty: 1, unit: "ls", unit_price: 4200, extended_price: 4200 },
      { ln: 3, cat: "materials", desc: "Wire Mesh – 6x6 W2.9", qty: 4200, unit: "sf", unit_price: 0.45, extended_price: 1890 },
      { ln: 4, cat: "materials", desc: "Expansion Joint Material – Fiber Filler", qty: 420, unit: "lf", unit_price: 1.8, extended_price: 756 },
      { ln: 5, cat: "materials", desc: "ADA Ramp Forms & Hardware", qty: 2, unit: "ea", unit_price: 380, extended_price: 760 },
      { ln: 6, cat: "materials", desc: "Parking Lot Sealer (applied post-cure)", qty: 4200, unit: "sf", unit_price: 0.18, extended_price: 756 },
      { ln: 7, cat: "materials", desc: "Stripe Paint – Epoxy Traffic", qty: 1, unit: "ls", unit_price: 480, extended_price: 480 },
      { ln: 8, cat: "labor", desc: "Asphalt Demo & Haul-Away", qty: 4200, unit: "sf", unit_price: 2.2, extended_price: 9240 },
      { ln: 9, cat: "labor", desc: "Subgrade Grading & Compaction", qty: 4200, unit: "sf", unit_price: 0.85, extended_price: 3570 },
      { ln: 10, cat: "labor", desc: "Form Setting & Rebar/Mesh Placement", qty: 4200, unit: "sf", unit_price: 1.4, extended_price: 5880 },
      { ln: 11, cat: "labor", desc: "Concrete Pour & Finish", qty: 4200, unit: "sf", unit_price: 2.8, extended_price: 11760 },
      { ln: 12, cat: "labor", desc: "ADA Ramp Construction", qty: 2, unit: "ea", unit_price: 1200, extended_price: 2400 },
      { ln: 13, cat: "labor", desc: "Sealing & Striping", qty: 4200, unit: "sf", unit_price: 0.45, extended_price: 1890 },
      { ln: 14, cat: "general_conditions", desc: "Building Permit – Sumner County", qty: 1, unit: "ea", unit_price: 650, extended_price: 650 },
      { ln: 15, cat: "general_conditions", desc: "Traffic Control & Safety Signage", qty: 1, unit: "ls", unit_price: 1200, extended_price: 1200 },
      { ln: 16, cat: "general_conditions", desc: "Dumpster – 40-yd (asphalt haul)", qty: 2, unit: "ea", unit_price: 750, extended_price: 1500 },
    ],
  },

  // 9 — HVAC (midrange, sent)
  {
    clientIdx: 8,
    meta: {
      estimate_number: "MHP-2026-0049",
      project_type: "hvac",
      project_address: "203 Whitfield Lane, Hendersonville, TN 37075",
      status: "sent",
      tier: "better",
      source: "manual",
      scope_inclusions: [
        "Replace 3-ton gas/electric split system",
        "Carrier Performance 17 SEER2 heat pump",
        "New air handler in attic",
        "Replace thermostat – Ecobee SmartThermostat",
        "Disconnect & haul old equipment",
        "Charge system and commission startup",
      ],
      scope_exclusions: ["Ductwork replacement", "Electrical panel upgrade"],
      site_conditions: "2,100 sf home. Existing R-22 system – condemned. Attic air handler on platform.",
      estimated_start: "2026-04-03",
      estimated_end: "2026-04-04",
      valid_through: "2026-04-02",
      validation_passed: true,
    },
    lines: [
      { ln: 1, cat: "materials", desc: "Carrier 24VPA336A003 Performance 17 SEER2 – 3 Ton Heat Pump Condenser", qty: 1, unit: "ea", unit_price: 3850, extended_price: 3850 },
      { ln: 2, cat: "materials", desc: "Carrier Air Handler – 3 Ton, Electric Heat Strip", qty: 1, unit: "ea", unit_price: 2100, extended_price: 2100 },
      { ln: 3, cat: "materials", desc: "Ecobee SmartThermostat Premium", qty: 1, unit: "ea", unit_price: 249, extended_price: 249 },
      { ln: 4, cat: "materials", desc: "Refrigerant Lines – 30' pre-charged line set", qty: 1, unit: "ea", unit_price: 385, extended_price: 385 },
      { ln: 5, cat: "materials", desc: "Condensate Drain Pan & Line", qty: 1, unit: "ls", unit_price: 120, extended_price: 120 },
      { ln: 6, cat: "materials", desc: "Electrical Disconnect, Whip, Misc", qty: 1, unit: "ls", unit_price: 220, extended_price: 220 },
      { ln: 7, cat: "labor", desc: "Old System Removal & Haul-Away", qty: 1, unit: "ls", unit_price: 650, extended_price: 650 },
      { ln: 8, cat: "labor", desc: "Condenser Pad, Placement, Electrical Connection", qty: 1, unit: "ls", unit_price: 850, extended_price: 850 },
      { ln: 9, cat: "labor", desc: "Air Handler Installation (attic)", qty: 1, unit: "ls", unit_price: 1100, extended_price: 1100 },
      { ln: 10, cat: "labor", desc: "Line Set & Refrigerant Connection", qty: 1, unit: "ls", unit_price: 680, extended_price: 680 },
      { ln: 11, cat: "labor", desc: "Thermostat Installation & Programming", qty: 1, unit: "ea", unit_price: 175, extended_price: 175 },
      { ln: 12, cat: "labor", desc: "System Startup, Commissioning & Testing", qty: 1, unit: "ls", unit_price: 350, extended_price: 350 },
      { ln: 13, cat: "general_conditions", desc: "HVAC Permit – Sumner County", qty: 1, unit: "ea", unit_price: 175, extended_price: 175 },
      { ln: 14, cat: "general_conditions", desc: "Project Coordination", qty: 1, unit: "ls", unit_price: 400, extended_price: 400 },
    ],
  },

  // 10 — LANDSCAPING / DRAINAGE (midrange, in_review)
  {
    clientIdx: 9,
    meta: {
      estimate_number: "MHP-2026-0050",
      project_type: "landscaping_drainage",
      project_address: "5502 Edmondson Pike, Nashville, TN 37211",
      status: "in_review",
      tier: "better",
      source: "manual",
      scope_inclusions: [
        "French drain installation – 80 lf rear yard",
        "Dry creek bed – 40 lf decorative + functional",
        "Regrade back yard slope toward drain",
        "Sod install – Zoysia 1,200 sf",
        "Mulch refresh – 12 beds, 4 CY",
      ],
      scope_exclusions: ["Irrigation system", "Tree removal"],
      site_conditions: "Severe ponding after rain events. Heavy clay soil. Large oak provides shade on N side.",
      estimated_start: "2026-04-28",
      estimated_end: "2026-05-02",
      valid_through: "2026-04-27",
      validation_passed: true,
    },
    lines: [
      { ln: 1, cat: "materials", desc: "Perforated French Drain Pipe – 4\"", qty: 80, unit: "lf", unit_price: 4.5, extended_price: 360 },
      { ln: 2, cat: "materials", desc: "Drain Rock – 57 Stone", qty: 8, unit: "ton", unit_price: 55, extended_price: 440 },
      { ln: 3, cat: "materials", desc: "Filter Fabric – 6 oz Geotextile", qty: 250, unit: "sf", unit_price: 0.85, extended_price: 212.5 },
      { ln: 4, cat: "materials", desc: "Dry Creek Bed River Rock – 40 lf x 3' wide", qty: 5, unit: "ton", unit_price: 95, extended_price: 475 },
      { ln: 5, cat: "materials", desc: "Zoysia Sod – 1,200 sf", qty: 1200, unit: "sf", unit_price: 0.65, extended_price: 780 },
      { ln: 6, cat: "materials", desc: "Hardwood Mulch – 4 CY", qty: 4, unit: "cy", unit_price: 75, extended_price: 300 },
      { ln: 7, cat: "materials", desc: "Drain Basin – NDS 9x9 catch basin", qty: 2, unit: "ea", unit_price: 65, extended_price: 130 },
      { ln: 8, cat: "labor", desc: "Excavation – French Drain Trench 80 lf x 12\" x 24\"", qty: 80, unit: "lf", unit_price: 18, extended_price: 1440 },
      { ln: 9, cat: "labor", desc: "French Drain Installation – pipe, rock, fabric", qty: 80, unit: "lf", unit_price: 12, extended_price: 960 },
      { ln: 10, cat: "labor", desc: "Dry Creek Bed Construction", qty: 40, unit: "lf", unit_price: 22, extended_price: 880 },
      { ln: 11, cat: "labor", desc: "Regrading – Bobcat work 4 hrs", qty: 4, unit: "hr", unit_price: 185, extended_price: 740 },
      { ln: 12, cat: "labor", desc: "Sod Installation – 1,200 sf", qty: 1200, unit: "sf", unit_price: 0.55, extended_price: 660 },
      { ln: 13, cat: "labor", desc: "Mulch Installation – 12 beds", qty: 12, unit: "bed", unit_price: 65, extended_price: 780 },
      { ln: 14, cat: "general_conditions", desc: "Equipment Rental – Mini Excavator 2 days", qty: 2, unit: "day", unit_price: 420, extended_price: 840 },
      { ln: 15, cat: "general_conditions", desc: "Dumpster & Site Cleanup", qty: 1, unit: "ls", unit_price: 380, extended_price: 380 },
    ],
  },
];

// ─────────────────────────────────────────────
// MAIN: Insert clients → estimates → line items
// ─────────────────────────────────────────────

console.log("\n🏗️  WALT TEAM SEEDER — MHPEstimate\n");

// Insert clients
console.log("📋  Inserting clients...");
const { data: insertedClients, error: clientErr } = await supabase
  .from("clients")
  .insert(clients)
  .select("id");

if (clientErr) {
  console.error("❌  Client insert failed:", clientErr.message);
  process.exit(1);
}
console.log(`✅  ${insertedClients.length} clients inserted`);

// Insert estimates + line items
let estimateCount = 0;
let lineItemCount = 0;

for (const def of estimateDefs) {
  const client = insertedClients[def.clientIdx];
  const t = calcTotals(def.lines);

  const estimateRow = {
    estimate_number: def.meta.estimate_number,
    client_id: client.id,
    project_type: def.meta.project_type,
    project_address: def.meta.project_address,
    status: def.meta.status,
    tier: def.meta.tier,
    source: def.meta.source,
    scope_inclusions: def.meta.scope_inclusions,
    scope_exclusions: def.meta.scope_exclusions,
    site_conditions: def.meta.site_conditions ?? null,
    materials_subtotal: t.materials,
    labor_subtotal: t.labor,
    subcontractor_total: 0,
    permits_fees: 0,
    overhead_profit: t.overhead,
    contingency: t.contingency,
    tax: t.tax,
    grand_total: t.grand,
    gross_margin_pct: t.margin,
    estimated_start: def.meta.estimated_start ?? null,
    estimated_end: def.meta.estimated_end ?? null,
    valid_through: def.meta.valid_through ?? null,
    validation_passed: def.meta.validation_passed,
    version: 1,
    sent_at: def.meta.status === "sent" ? new Date().toISOString() : null,
    accepted_at: def.meta.status === "accepted" ? new Date().toISOString() : null,
    declined_at: def.meta.status === "declined" ? new Date().toISOString() : null,
  };

  const { data: estData, error: estErr } = await supabase
    .from("estimates")
    .insert(estimateRow)
    .select("id")
    .single();

  if (estErr) {
    console.error(`❌  Estimate ${def.meta.estimate_number} failed:`, estErr.message);
    continue;
  }

  const lineRows = def.lines.map((l) => ({
    estimate_id: estData.id,
    line_number: l.ln,
    category: l.cat,
    description: l.desc,
    quantity: l.qty,
    unit: l.unit,
    unit_price: l.unit_price,
    extended_price: l.extended_price,
    price_source: "manual",
  }));

  const { error: lineErr } = await supabase.from("estimate_line_items").insert(lineRows);
  if (lineErr) {
    console.error(`❌  Line items for ${def.meta.estimate_number} failed:`, lineErr.message);
    continue;
  }

  estimateCount++;
  lineItemCount += lineRows.length;
  const client_name = clients[def.clientIdx].full_name;
  console.log(
    `  ✅  ${def.meta.estimate_number}  ${def.meta.project_type.padEnd(25)}  $${t.grand.toLocaleString().padStart(10)}  [${def.meta.tier}]  → ${client_name}`
  );
}

console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Estimates inserted : ${estimateCount}/10
  Line items inserted: ${lineItemCount}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);
