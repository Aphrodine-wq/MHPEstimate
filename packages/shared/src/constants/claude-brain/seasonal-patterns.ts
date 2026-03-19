/**
 * Claude Brain — Seasonal Patterns
 *
 * Monthly demand, material pricing, labor availability, and weather
 * patterns that affect construction scheduling and estimation in the
 * southeastern United States. Claude uses this to time estimates,
 * warn about seasonal factors, and advise on optimal scheduling.
 *
 * All month arrays are 1-indexed (1 = January, 12 = December).
 * Demand/availability ratings: 1 = very low, 5 = very high.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MonthlyDemandPattern {
  projectType: string;
  /** 12-element array, index 0 = January. Rating 1-5 (1=very low, 5=very high). */
  monthlyDemand: [number, number, number, number, number, number, number, number, number, number, number, number];
  peakReason: string;
  troughReason: string;
  notes: string;
}

export interface MaterialSeasonality {
  material: string;
  /** Month numbers (1-12) when prices are typically lowest */
  bestBuyMonths: number[];
  /** Month numbers (1-12) when prices are typically highest */
  worstBuyMonths: number[];
  savingsPotentialPct: number;
  notes: string;
}

export interface LaborAvailability {
  /** 12-element array, index 0 = January. Rating 1-5 (1=scarce, 5=readily available). */
  monthlyAvailability: [number, number, number, number, number, number, number, number, number, number, number, number];
  tradeType: string;
  notes: string;
}

export interface WeatherImpact {
  month: number;
  monthName: string;
  avgHighF: number;
  avgLowF: number;
  avgRainfallInches: number;
  avgRainyDays: number;
  hurricaneRisk: "none" | "low" | "moderate" | "high";
  exteriorWorkRating: 1 | 2 | 3 | 4 | 5;
  notes: string;
}

export interface HolidayScheduling {
  holiday: string;
  typicalDates: string;
  impactDays: number;
  notes: string;
}

// ─── Data ─────────────────────────────────────────────────────────────────────

export const SEASONAL_PATTERNS = {
  demandByProjectType: [
    {
      projectType: "kitchen_renovation",
      monthlyDemand: [       3,  3,  4,  5,  5,  4,  3,  3,  4,  4,  3,  2 ] as MonthlyDemandPattern["monthlyDemand"],
      peakReason: "Spring is the most popular time to start interior remodels — clients want kitchens done before summer entertaining.",
      troughReason: "December holidays kill kitchen remodel demand. Nobody wants their kitchen torn apart during the holidays.",
      notes: "Kitchen remodels can be done year-round since they are interior work. Spring and early fall are peak demand seasons.",
    },
    {
      projectType: "bathroom_renovation",
      monthlyDemand: [       3,  3,  4,  5,  5,  4,  3,  3,  4,  4,  3,  2 ] as MonthlyDemandPattern["monthlyDemand"],
      peakReason: "Same pattern as kitchens — spring remodel season drives demand.",
      troughReason: "Holiday season slowdown. Clients avoid losing a bathroom during December.",
      notes: "Bathroom remodels follow kitchen demand patterns closely. Pairs well as a slow-season fill project.",
    },
    {
      projectType: "deck",
      monthlyDemand: [       1,  2,  4,  5,  5,  4,  3,  2,  3,  4,  2,  1 ] as MonthlyDemandPattern["monthlyDemand"],
      peakReason: "Clients want decks built in spring to enjoy all summer. March-May is the order window for summer completion.",
      troughReason: "Nobody starts a deck project in winter. Cold/wet weather and short days reduce demand.",
      notes: "Encourage clients to sign deck contracts in January-February for better scheduling and potential material savings.",
    },
    {
      projectType: "roofing",
      monthlyDemand: [       2,  2,  4,  5,  5,  5,  4,  3,  4,  5,  3,  2 ] as MonthlyDemandPattern["monthlyDemand"],
      peakReason: "Spring starts the season. Post-storm demand creates a second peak in late summer/fall after hurricane season.",
      troughReason: "Cold temperatures and rain make winter roofing less ideal, though SE US winters are mild enough to roof year-round.",
      notes: "Roofing crews are most available in January-February. Significant cost savings possible by scheduling re-roofs in the slow season.",
    },
    {
      projectType: "painting",
      monthlyDemand: [       2,  3,  4,  5,  5,  4,  3,  3,  4,  5,  3,  2 ] as MonthlyDemandPattern["monthlyDemand"],
      peakReason: "Exterior painting peaks in spring and fall when temperatures are ideal (50-85F) and humidity is lower.",
      troughReason: "Summer heat and humidity in SE US causes paint adhesion issues for exterior work. Winter rain limits exterior days.",
      notes: "Interior painting can be done year-round. Exterior painting in SE US is best in October-November and March-April.",
    },
    {
      projectType: "new_build",
      monthlyDemand: [       3,  3,  4,  5,  5,  4,  4,  3,  4,  4,  3,  2 ] as MonthlyDemandPattern["monthlyDemand"],
      peakReason: "Spring lot purchases drive new construction starts. Banks push closings before Q2.",
      troughReason: "Holiday season reduces new construction starts. Financing activity slows in December.",
      notes: "Best strategy: start foundations in late fall/winter to have the house dried in before spring rains.",
    },
    {
      projectType: "concrete_hardscape",
      monthlyDemand: [       2,  2,  3,  5,  5,  4,  3,  3,  4,  5,  3,  1 ] as MonthlyDemandPattern["monthlyDemand"],
      peakReason: "Spring and fall offer ideal pour conditions — warm but not hot, lower humidity for proper curing.",
      troughReason: "Summer heat can cause rapid curing and cracking. Winter frost risk is minimal in SE US but cold slows cure.",
      notes: "Concrete work in SE US summer requires early morning pours and curing compounds. Add 5% for hot-weather concrete mix.",
    },
    {
      projectType: "fencing",
      monthlyDemand: [       2,  2,  3,  5,  5,  4,  4,  3,  3,  4,  2,  1 ] as MonthlyDemandPattern["monthlyDemand"],
      peakReason: "Spring home improvement rush. New puppy season drives a surprising amount of fence demand.",
      troughReason: "Holiday season. Shorter days and wet ground reduce installation efficiency.",
      notes: "Fencing is weather-dependent for post-hole digging. Saturated ground in winter/spring can complicate installation.",
    },
    {
      projectType: "addition_remodel",
      monthlyDemand: [       3,  3,  4,  5,  5,  4,  3,  3,  4,  4,  3,  2 ] as MonthlyDemandPattern["monthlyDemand"],
      peakReason: "Families plan additions after tax season when finances are clearest. Spring starts are ideal for summer completion.",
      troughReason: "Holiday spending competes with renovation budgets. Cold weather slows exterior phases.",
      notes: "Large additions benefit from a winter start — foundation and framing in cool weather, then interior trades through spring.",
    },
  ] as MonthlyDemandPattern[],

  materialSeasonality: [
    { material: "Framing lumber (SPF, SYP)", bestBuyMonths: [11, 12, 1], worstBuyMonths: [4, 5, 6], savingsPotentialPct: 15, notes: "Buy lumber in November-January for spring builds. Mill production slows in winter but demand drops more. Store covered and stickered." },
    { material: "Treated lumber", bestBuyMonths: [10, 11, 12], worstBuyMonths: [3, 4, 5], savingsPotentialPct: 12, notes: "Deck and fence season drives spring treated lumber demand. Buy early and store. Acclimate before installation." },
    { material: "Roofing shingles", bestBuyMonths: [12, 1, 2], worstBuyMonths: [4, 5, 9, 10], savingsPotentialPct: 10, notes: "Manufacturers announce annual price increases in January. Buy in December before the increase. Store in dry covered area." },
    { material: "Concrete (ready-mix)", bestBuyMonths: [12, 1, 2], worstBuyMonths: [5, 6, 7], savingsPotentialPct: 5, notes: "Concrete pricing is less seasonal but availability is better in winter. No wait for trucks. Batch plants may offer winter discounts." },
    { material: "Copper wire and pipe", bestBuyMonths: [9, 10, 11], worstBuyMonths: [2, 3, 6, 7], savingsPotentialPct: 20, notes: "Copper is commodity-traded — watch spot prices. Fall tends to be a trough. Lock in pricing with suppliers when copper dips." },
    { material: "Drywall", bestBuyMonths: [11, 12, 1], worstBuyMonths: [4, 5, 6], savingsPotentialPct: 8, notes: "Construction slowdown reduces demand in winter. National Gypsum and Georgia-Pacific run promotions in Q4." },
    { material: "Cabinets (semi-custom)", bestBuyMonths: [7, 8, 9], worstBuyMonths: [1, 2, 3], savingsPotentialPct: 10, notes: "Summer is slow for cabinet orders — manufacturers and dealers run promotions. KraftMaid and Waypoint do summer sales events." },
    { material: "Windows (vinyl/fiberglass)", bestBuyMonths: [11, 12, 1], worstBuyMonths: [3, 4, 5], savingsPotentialPct: 8, notes: "Window manufacturers offer winter promotions to fill production capacity. Order in winter for spring installation." },
    { material: "Paint (exterior)", bestBuyMonths: [1, 2, 11, 12], worstBuyMonths: [4, 5, 6], savingsPotentialPct: 15, notes: "Sherwin-Williams and Benjamin Moore run major sales in January and November. Pro accounts get additional discounts stacked on sales." },
    { material: "Flooring (LVP and hardwood)", bestBuyMonths: [1, 7, 11], worstBuyMonths: [3, 4, 5, 9, 10], savingsPotentialPct: 12, notes: "Black Friday/January clearance and mid-summer sales are the best buying windows. Floor & Decor does frequent pro events." },
  ] as MaterialSeasonality[],

  laborAvailability: [
    { tradeType: "General / Framing", monthlyAvailability: [4, 4, 3, 2, 2, 2, 3, 3, 2, 2, 3, 4] as LaborAvailability["monthlyAvailability"], notes: "Framing crews are most booked in spring and fall. Winter and mid-summer heat offer better availability." },
    { tradeType: "Electrical", monthlyAvailability: [3, 3, 2, 2, 1, 2, 2, 2, 2, 2, 3, 3] as LaborAvailability["monthlyAvailability"], notes: "Electricians are the scarcest trade in SE US. Chronic shortage — book 2-4 weeks ahead year-round." },
    { tradeType: "Plumbing", monthlyAvailability: [3, 3, 2, 2, 2, 2, 2, 3, 2, 2, 3, 3] as LaborAvailability["monthlyAvailability"], notes: "Plumbers are in high demand due to labor shortage. New construction competes with renovation work for the same crews." },
    { tradeType: "HVAC", monthlyAvailability: [3, 3, 2, 2, 2, 1, 1, 1, 2, 3, 3, 3] as LaborAvailability["monthlyAvailability"], notes: "HVAC crews are slammed in summer (repair and replacement season). Best to schedule new installs in spring or fall." },
    { tradeType: "Roofing", monthlyAvailability: [4, 4, 3, 2, 1, 2, 2, 2, 2, 1, 3, 4] as LaborAvailability["monthlyAvailability"], notes: "Roofing crews are fully booked spring through fall. Post-storm demand makes fall unpredictable. January-February is the window." },
    { tradeType: "Painting", monthlyAvailability: [4, 4, 3, 2, 2, 2, 3, 3, 2, 2, 3, 4] as LaborAvailability["monthlyAvailability"], notes: "Interior painters are available year-round. Exterior crews track the weather windows — spring and fall are booked solid." },
    { tradeType: "Tile / Flooring", monthlyAvailability: [4, 3, 3, 2, 2, 2, 3, 3, 2, 2, 3, 4] as LaborAvailability["monthlyAvailability"], notes: "Good tile installers are always in demand. Book 2-3 weeks ahead. Quality varies widely — vet tile crews carefully." },
    { tradeType: "Concrete", monthlyAvailability: [4, 3, 3, 2, 1, 2, 2, 2, 2, 2, 3, 4] as LaborAvailability["monthlyAvailability"], notes: "Concrete crews are booked in spring and early fall. Commercial work competes heavily for the same crews." },
  ] as LaborAvailability[],

  weatherBySoutheastMonth: [
    { month: 1, monthName: "January", avgHighF: 55, avgLowF: 35, avgRainfallInches: 5.2, avgRainyDays: 10, hurricaneRisk: "none", exteriorWorkRating: 3, notes: "Cool and wet. Good for interior work. Exterior concrete can cure if temps stay above 40F." },
    { month: 2, monthName: "February", avgHighF: 59, avgLowF: 38, avgRainfallInches: 5.0, avgRainyDays: 9, hurricaneRisk: "none", exteriorWorkRating: 3, notes: "Transitioning to spring. Soil saturated from winter rains — not ideal for excavation." },
    { month: 3, monthName: "March", avgHighF: 67, avgLowF: 45, avgRainfallInches: 5.5, avgRainyDays: 9, hurricaneRisk: "none", exteriorWorkRating: 4, notes: "Great building weather starts. Tornado season begins in SE US. Monitor severe weather." },
    { month: 4, monthName: "April", avgHighF: 75, avgLowF: 53, avgRainfallInches: 5.3, avgRainyDays: 8, hurricaneRisk: "none", exteriorWorkRating: 5, notes: "Ideal construction weather. Warm, drying out. Prime exterior work month." },
    { month: 5, monthName: "May", avgHighF: 83, avgLowF: 62, avgRainfallInches: 5.0, avgRainyDays: 8, hurricaneRisk: "none", exteriorWorkRating: 5, notes: "Excellent conditions. Last month before summer heat impacts productivity." },
    { month: 6, monthName: "June", avgHighF: 89, avgLowF: 70, avgRainfallInches: 4.8, avgRainyDays: 9, hurricaneRisk: "low", exteriorWorkRating: 3, notes: "Heat and humidity reduce exterior productivity. Afternoon thunderstorms common. Start exterior work early." },
    { month: 7, monthName: "July", avgHighF: 92, avgLowF: 73, avgRainfallInches: 5.5, avgRainyDays: 11, hurricaneRisk: "low", exteriorWorkRating: 2, notes: "Hottest month. Heat index 100F+. OSHA heat illness prevention mandatory. Reduce outdoor hours." },
    { month: 8, monthName: "August", avgHighF: 92, avgLowF: 72, avgRainfallInches: 4.5, avgRainyDays: 9, hurricaneRisk: "moderate", exteriorWorkRating: 2, notes: "Peak heat continues. Hurricane season intensifying. Monitor tropical weather closely." },
    { month: 9, monthName: "September", avgHighF: 87, avgLowF: 66, avgRainfallInches: 3.8, avgRainyDays: 7, hurricaneRisk: "high", exteriorWorkRating: 3, notes: "Peak hurricane risk for SE US. Temperatures improving. Good exterior work when storms are not threatening." },
    { month: 10, monthName: "October", avgHighF: 77, avgLowF: 54, avgRainfallInches: 3.5, avgRainyDays: 5, hurricaneRisk: "moderate", exteriorWorkRating: 5, notes: "Best building month in SE US. Cool, dry, long days. Schedule critical exterior work here." },
    { month: 11, monthName: "November", avgHighF: 66, avgLowF: 43, avgRainfallInches: 4.5, avgRainyDays: 7, hurricaneRisk: "low", exteriorWorkRating: 4, notes: "Good conditions. Shorter days reduce available work hours. Holiday schedule starts impacting crew availability." },
    { month: 12, monthName: "December", avgHighF: 57, avgLowF: 37, avgRainfallInches: 5.3, avgRainyDays: 10, hurricaneRisk: "none", exteriorWorkRating: 2, notes: "Cold and wet. Short days. Holidays reduce available work days. Best for planning and interior work." },
  ] as WeatherImpact[],

  holidayScheduling: [
    { holiday: "New Year's Day", typicalDates: "Jan 1", impactDays: 1, notes: "Most crews take off. Some take Dec 31 – Jan 2." },
    { holiday: "MLK Day", typicalDates: "3rd Monday in January", impactDays: 1, notes: "Government offices closed — no permit inspections. Some crews work." },
    { holiday: "Easter / Spring Break", typicalDates: "March-April (varies)", impactDays: 3, notes: "Good Friday through Easter Monday. Many subs take family vacations. Plan around spring break." },
    { holiday: "Memorial Day", typicalDates: "Last Monday in May", impactDays: 3, notes: "Weekend-long projects lose Thursday-Monday. Marks unofficial start of summer schedule." },
    { holiday: "Independence Day", typicalDates: "Jul 4", impactDays: 2, notes: "Most crews take Jul 3-5 off. If mid-week, expect reduced productivity all week." },
    { holiday: "Labor Day", typicalDates: "1st Monday in September", impactDays: 3, notes: "Summer's last hurrah. 3-day weekend impact. Fall building season restarts after this." },
    { holiday: "Thanksgiving", typicalDates: "4th Thursday in November", impactDays: 4, notes: "Wednesday through Friday are lost days. Some crews take the full week. Plan deliveries around this." },
    { holiday: "Christmas / New Year's", typicalDates: "Dec 23 – Jan 2", impactDays: 8, notes: "Most residential construction shuts down for 1-2 weeks. Factor this into any December-January project timeline." },
    { holiday: "Hunting Season (SE US)", typicalDates: "Nov 15 – Jan 31 (varies by state)", impactDays: 5, notes: "Not a holiday but impacts SE US labor availability significantly. Deer season opening weekend is an unofficial holiday for many trade workers." },
  ] as HolidayScheduling[],

  quarterlyAdvice: {
    Q1: {
      months: "January – March",
      summary: "Slow season transitioning to peak. Best time for planning, permitting, and early material purchases.",
      materialBuying: "Buy lumber, roofing, and windows now before spring price increases.",
      laborTip: "Most trades are available. Lock in crew commitments for spring projects.",
      clientTip: "Encourage clients to sign now for spring start — better crew selection and material pricing.",
    },
    Q2: {
      months: "April – June",
      summary: "Peak building season. Highest demand, highest prices, least crew availability.",
      materialBuying: "Prices are at or near peak for most materials. Buy only what you need when you need it.",
      laborTip: "Crews are booked. Expect 2-4 week lead times for all trades. Schedule aggressively.",
      clientTip: "Set realistic expectations on timeline. Delays are more likely in peak season.",
    },
    Q3: {
      months: "July – September",
      summary: "Summer heat slows exterior work. Hurricane season adds weather risk. Good for interior projects.",
      materialBuying: "Cabinet and flooring sales in July-August. Copper may dip in September.",
      laborTip: "Heat reduces crew productivity by 20-30% for exterior work. HVAC crews are scarce.",
      clientTip: "Great time for interior remodels — kitchens, bathrooms, painting. Avoid starting new exterior projects.",
    },
    Q4: {
      months: "October – December",
      summary: "October is the best building month. November is good. December is dead. Plan accordingly.",
      materialBuying: "November-December is the best buying window for most materials. Stock up for Q1 projects.",
      laborTip: "October crews are booked but November-December opens up. Hunting season thins the workforce.",
      clientTip: "Push for October starts. December is for planning next year's projects.",
    },
  },
} as const;

export function getDemandRating(projectType: string, month: number): number | undefined {
  const pattern = SEASONAL_PATTERNS.demandByProjectType.find((p) => p.projectType === projectType);
  if (!pattern || month < 1 || month > 12) return undefined;
  return pattern.monthlyDemand[month - 1];
}

export function getWeatherForMonth(month: number): WeatherImpact | undefined {
  return SEASONAL_PATTERNS.weatherBySoutheastMonth.find((w) => w.month === month);
}

export function getQuarterlyAdvice(month: number): (typeof SEASONAL_PATTERNS.quarterlyAdvice)[keyof typeof SEASONAL_PATTERNS.quarterlyAdvice] | undefined {
  if (month >= 1 && month <= 3) return SEASONAL_PATTERNS.quarterlyAdvice.Q1;
  if (month >= 4 && month <= 6) return SEASONAL_PATTERNS.quarterlyAdvice.Q2;
  if (month >= 7 && month <= 9) return SEASONAL_PATTERNS.quarterlyAdvice.Q3;
  if (month >= 10 && month <= 12) return SEASONAL_PATTERNS.quarterlyAdvice.Q4;
  return undefined;
}
