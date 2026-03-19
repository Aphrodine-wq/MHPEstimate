/**
 * Claude Brain — Psychology Frameworks
 *
 * Behavioral economics and persuasion principles applied to construction
 * estimation. Each framework includes the psychological principle, how to
 * implement it in the estimation workflow, example language, and the
 * contexts where it applies.
 *
 * These are not manipulation tactics — they are well-documented cognitive
 * biases that every successful contractor already leverages intuitively.
 * Making them explicit lets Claude apply them consistently and ethically.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type PsychologyContext =
  | "tier_presentation"
  | "follow_up"
  | "scope_generation"
  | "estimate_delivery"
  | "change_order"
  | "closing"
  | "objection_handling"
  | "initial_consultation"
  | "proposal_writing";

export interface PsychologyFramework {
  name: string;
  principle: string;
  implementation: string;
  exampleLanguage: string[];
  applicableContexts: PsychologyContext[];
  doNot: string[];
}

// ─── Data ─────────────────────────────────────────────────────────────────────

export const PSYCHOLOGY_FRAMEWORKS: Record<string, PsychologyFramework> = {
  anchoring: {
    name: "Anchoring",
    principle:
      "The first number a person sees becomes the reference point for all subsequent " +
      "comparisons. By presenting the high-end tier first, the mid-range option feels " +
      "like a deal rather than an expense.",
    implementation:
      "Always present tiers in High-End -> Mid-Range -> Budget order. The high-end " +
      "number anchors the client's expectations upward. When the mid-range total appears " +
      "20-30% lower, it triggers a relief response. Budget tier exists as a safety net " +
      "but should never be the first thing they see. In printed/PDF estimates, the " +
      "high-end column should appear on the LEFT (read first in L-to-R cultures).",
    exampleLanguage: [
      "For a designer-level kitchen with custom cabinetry and stone countertops, you're looking at around ${{high_end_total}}.",
      "Most of our clients find that the mid-range option at ${{midrange_total}} gives them about 90% of that designer look at a much better price point.",
      "We also have a budget-friendly option at ${{budget_total}} if you're looking to maximize value.",
      "Here's how the three tiers compare — starting with our premium option.",
    ],
    applicableContexts: ["tier_presentation", "estimate_delivery", "proposal_writing"],
    doNot: [
      "Never present budget first — it becomes the anchor and makes midrange feel expensive",
      "Never skip the high-end option even if client says they want budget — show all three",
      "Do not exaggerate the high-end price to make midrange look artificially good",
    ],
  },

  decoy_effect: {
    name: "Decoy Effect (Asymmetric Dominance)",
    principle:
      "When three options are presented and one is clearly inferior to another but not " +
      "to the third, people gravitate toward the option that dominates the inferior one. " +
      "The budget tier acts as the decoy that makes mid-range look like the smart choice.",
    implementation:
      "Structure the budget tier so that it is missing 2-3 clearly desirable features " +
      "that mid-range includes, while the price difference is relatively small (15-25% less). " +
      "The gap between mid-range and high-end should be larger (30-45%) so the mid-range " +
      "feels like the value sweet spot. Highlight what budget LACKS rather than what it includes.",
    exampleLanguage: [
      "The budget option uses builder-grade materials and standard finishes — it gets the job done but skips the upgraded fixtures and design details.",
      "Mid-range includes the soft-close drawers, upgraded countertops, and designer tile backsplash that most homeowners want.",
      "The difference between budget and mid-range is only ${{price_diff}} — and you get significantly better materials and finishes.",
      "Most of our clients in {{area}} choose mid-range — it's the best balance of quality and value.",
    ],
    applicableContexts: ["tier_presentation", "estimate_delivery", "proposal_writing", "objection_handling"],
    doNot: [
      "Never make budget tier so bad it feels like a joke — it must be a real, viable option",
      "Do not explicitly tell the client they should avoid budget — let the comparison speak",
      "Never price budget so close to midrange that the client feels nickel-and-dimed",
    ],
  },

  loss_aversion: {
    name: "Loss Aversion",
    principle:
      "People feel the pain of losing something about 2x more intensely than the " +
      "pleasure of gaining the same thing. Frame contingency and proper scoping as " +
      "protection against loss rather than an added cost.",
    implementation:
      "When presenting contingency line items, frame them as insurance against specific, " +
      "concrete risks the client can visualize. Quantify what they stand to lose WITHOUT " +
      "the protection. Use real examples from past projects where lack of contingency " +
      "caused costly change orders. Apply this especially in older homes, renovations " +
      "with unknowns, and projects with tight timelines.",
    exampleLanguage: [
      "Without the contingency buffer, you risk ${{risk_amount}} in unexpected costs if we open up that wall and find water damage or outdated wiring — both are common in homes built before {{year}}.",
      "The contingency is {{contingency_pct}}% of the project total. On your last three kitchen remodels in this neighborhood, the average unplanned cost was ${{avg_unplanned}} — this covers that.",
      "Cutting the contingency saves you ${{savings}} today, but if we hit any surprises — and in a {{age}}-year-old home, we usually do — that becomes a change order at a higher rate.",
      "Think of the contingency as your project insurance. It's the difference between a fixed-price experience and an open-ended one.",
    ],
    applicableContexts: ["scope_generation", "estimate_delivery", "objection_handling", "change_order"],
    doNot: [
      "Never use fear tactics or exaggerate risks beyond what is realistic",
      "Do not make the client feel stupid for questioning contingency — validate and explain",
      "Never hide contingency inside other line items — transparency builds trust",
    ],
  },

  social_proof: {
    name: "Social Proof",
    principle:
      "People look to the behavior of others — especially similar others — to determine " +
      "the correct course of action. Showing what most clients choose reduces decision " +
      "anxiety and nudges toward the preferred option.",
    implementation:
      "Reference aggregate data about what other clients choose. Use percentage-based " +
      "claims that sound data-driven. Segment by project type for specificity — 'most " +
      "kitchen remodel clients' is more persuasive than 'most clients.' When possible, " +
      "reference the specific neighborhood or area. Never fabricate statistics.",
    exampleLanguage: [
      "87% of our kitchen remodel clients choose the mid-range tier — it's the sweet spot for resale value.",
      "In the {{neighborhood}} area, most homeowners go with the upgraded fixtures — they hold up better in our humidity.",
      "We've done {{count}} projects similar to yours in the last 12 months, and the average investment was ${{avg_total}}.",
      "The most popular choice for bathroom renovations this year has been the mid-range with the upgraded tile — it's only ${{diff}} more and it really elevates the space.",
      "Homeowners in your price range typically allocate about {{pct}}% of home value to a kitchen remodel.",
    ],
    applicableContexts: [
      "tier_presentation",
      "estimate_delivery",
      "follow_up",
      "closing",
      "initial_consultation",
    ],
    doNot: [
      "Never fabricate statistics — use real data from MHP's estimate history",
      "Do not use social proof to push high-end when the client's budget clearly fits midrange",
      "Never reference competitors' client data — only MHP's own history",
    ],
  },

  scarcity: {
    name: "Scarcity (Urgency)",
    principle:
      "When something is perceived as limited — in time, quantity, or availability — " +
      "its perceived value increases. Legitimate price expiration dates and material " +
      "availability windows create urgency without deception.",
    implementation:
      "Set explicit price validity windows on every estimate based on material volatility. " +
      "For volatile materials (lumber, copper), use 14-30 day windows. For stable materials, " +
      "use 45-60 day windows. Also reference scheduling capacity — if the crew is booking " +
      "out, mention the next available start date. Material lead times are another legitimate " +
      "scarcity lever. Always tie scarcity to real, verifiable facts.",
    exampleLanguage: [
      "This estimate reflects current material pricing, which is guaranteed through {{expiry_date}}. After that, we'll need to re-price the lumber package.",
      "Our next available start date is {{start_date}}. If you'd like to lock that in, we'll need the signed estimate by {{decision_date}}.",
      "The {{material}} you selected has a {{lead_time}}-week lead time right now. To hit your target completion date, we'd need to order by {{order_date}}.",
      "Current lumber pricing is favorable — it typically jumps 15-20% heading into spring building season.",
      "We have two crews available for {{month}}. Once those slots fill, the next opening is {{next_month}}.",
    ],
    applicableContexts: ["estimate_delivery", "follow_up", "closing"],
    doNot: [
      "Never create fake urgency or artificial deadlines",
      "Do not pressure clients with 'today only' language — this is not a car lot",
      "Never lie about scheduling availability or material lead times",
      "Do not use scarcity on every interaction — reserve it for when it is genuinely true",
    ],
  },

  reciprocity: {
    name: "Reciprocity",
    principle:
      "When someone provides something of value, the recipient feels a natural " +
      "obligation to return the favor. A detailed, professional estimate that " +
      "clearly demonstrates expertise creates a sense of indebtedness.",
    implementation:
      "Provide exceptional value in the estimate itself — detailed scope, material " +
      "specifications, trade sequencing, permit guidance, and realistic timelines — " +
      "even before the client has committed. This investment of effort triggers " +
      "reciprocity. Include educational notes that help the client understand what " +
      "they are buying. The more specific and helpful the estimate, the harder it " +
      "is for the client to take it to another contractor.",
    exampleLanguage: [
      "I've included a detailed scope breakdown so you can see exactly what's involved at each phase.",
      "Here's a material specification sheet for the items we discussed — this way you can compare apples-to-apples if you're getting other quotes.",
      "I've noted the permit requirements and typical inspection timeline for {{jurisdiction}} — we handle all of that for you.",
      "I put together a trade sequence timeline so you can see how the project flows week by week.",
      "I included maintenance notes for the materials we're recommending — these will help you protect your investment long-term.",
    ],
    applicableContexts: [
      "scope_generation",
      "estimate_delivery",
      "proposal_writing",
      "initial_consultation",
    ],
    doNot: [
      "Never make the free value feel transactional — 'I did this for you so now you owe me'",
      "Do not overwhelm the client with information to the point of confusion",
      "Never provide a sloppy estimate and expect reciprocity — quality is the trigger",
    ],
  },

  authority: {
    name: "Authority",
    principle:
      "People defer to perceived experts and established authority. Credentials, " +
      "experience metrics, and professional presentation all signal competence " +
      "and reduce the perceived risk of choosing your firm.",
    implementation:
      "Include authority signals in every estimate document: contractor license number, " +
      "years in business, total project count, insurance coverage, and any relevant " +
      "certifications. Reference specific experience with the project type. Use precise " +
      "numbers (not round numbers) for credibility — '847 projects completed' is more " +
      "believable than 'hundreds of projects.' Professional formatting and consistent " +
      "branding reinforce authority subconsciously.",
    exampleLanguage: [
      "ProEstimate | License #{{license}} | {{years}} Years in Business | {{count}} Projects Completed",
      "We carry ${{insurance_amount}} in general liability and are fully bonded — your project is protected.",
      "We've completed {{similar_count}} {{project_type}} projects in the {{region}} area over the past {{years}} years.",
      "Our team includes {{cert_count}} certified specialists in {{specialty}}.",
      "Based on our experience with {{count}} similar projects, here's what to expect.",
    ],
    applicableContexts: [
      "estimate_delivery",
      "proposal_writing",
      "initial_consultation",
      "objection_handling",
    ],
    doNot: [
      "Never inflate credentials or project counts",
      "Do not include expired certifications",
      "Never name-drop clients without permission",
      "Do not be arrogant — authority should feel confident, not condescending",
    ],
  },

  commitment_consistency: {
    name: "Commitment & Consistency",
    principle:
      "Once a person takes a small step in a direction, they feel internal pressure " +
      "to remain consistent with that commitment. Small yeses lead to larger yeses. " +
      "Each micro-commitment makes the final signature feel like a natural next step.",
    implementation:
      "Design the client journey as a series of escalating micro-commitments: " +
      "initial inquiry -> phone consultation -> site visit -> scope review -> tier " +
      "selection -> signed estimate. Each step should feel low-stakes and natural. " +
      "After each commitment, reference it in the next interaction — 'Since you " +
      "mentioned wanting the upgraded tile during our site visit...' This leverages " +
      "their past statements as anchors for future decisions.",
    exampleLanguage: [
      "Based on what you shared during our site visit, I focused the estimate on the features that matter most to you.",
      "You mentioned the soft-close drawers were important — I've included those in both the mid-range and high-end options.",
      "Since you've already picked out the tile at Floor & Decor, we're ready to move forward with final pricing.",
      "The next step is just a quick scope review call — about 15 minutes — to make sure we haven't missed anything.",
      "You're already {{pct}}% of the way through the process — signing off on the final numbers is the last step.",
    ],
    applicableContexts: [
      "follow_up",
      "closing",
      "scope_generation",
      "estimate_delivery",
      "initial_consultation",
    ],
    doNot: [
      "Never use commitment language to trap or guilt a client into signing",
      "Do not reference commitments the client did not actually make",
      "Never make the next step feel larger than it is — keep it genuinely incremental",
      "Do not rush the commitment ladder — let each step breathe",
    ],
  },
} as const;

/**
 * Retrieve frameworks applicable to a given context.
 */
export function getFrameworksForContext(
  context: PsychologyContext,
): PsychologyFramework[] {
  return Object.values(PSYCHOLOGY_FRAMEWORKS).filter((fw) =>
    fw.applicableContexts.includes(context),
  );
}

/**
 * Get a specific framework by key.
 */
export function getFramework(
  key: keyof typeof PSYCHOLOGY_FRAMEWORKS,
): PsychologyFramework | undefined {
  return PSYCHOLOGY_FRAMEWORKS[key];
}
