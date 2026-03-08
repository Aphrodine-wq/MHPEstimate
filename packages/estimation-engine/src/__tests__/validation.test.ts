import { describe, it, expect } from "vitest";
import { runValidation } from "../validation/runner";
import type { Estimate, EstimateLineItem } from "@proestimate/shared/types";

// ─── Helpers ────────────────────────────────────────────────────────

function makeEstimate(overrides: Partial<Estimate> = {}): Estimate {
  return {
    id: "est-1",
    estimate_number: "E-001",
    client_id: null,
    estimator_id: null,
    reviewer_id: null,
    project_type: "addition_remodel",
    project_address: null,
    status: "draft",
    scope_inclusions: [],
    scope_exclusions: [],
    site_conditions: null,
    materials_subtotal: 5000,
    labor_subtotal: 8000,
    subcontractor_total: 2000,
    permits_fees: 500,
    overhead_profit: 3000,
    contingency: 1500,
    tax: 0,
    grand_total: 20000,
    gross_margin_pct: null,
    estimated_start: null,
    estimated_end: null,
    valid_through: null,
    tier: "midrange",
    source: "manual",
    call_id: null,
    validation_results: null,
    validation_passed: false,
    pdf_path: null,
    docx_path: null,
    version: 1,
    parent_estimate_id: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    sent_at: null,
    accepted_at: null,
    declined_at: null,
    ...overrides,
  };
}

function makeLineItem(overrides: Partial<EstimateLineItem> = {}): EstimateLineItem {
  return {
    id: "li-1",
    estimate_id: "est-1",
    line_number: 1,
    category: "General",
    description: "General work",
    quantity: 1,
    unit: "ea",
    unit_price: 100,
    extended_price: 100,
    notes: null,
    product_id: null,
    price_source: null,
    price_date: null,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

// ─── Full validation run ────────────────────────────────────────────

describe("runValidation", () => {
  it("returns 15 results (one per check)", () => {
    const results = runValidation({
      estimate: makeEstimate(),
      lineItems: [makeLineItem()],
    });
    expect(results).toHaveLength(15);
  });

  it("each result has required fields", () => {
    const results = runValidation({
      estimate: makeEstimate(),
      lineItems: [makeLineItem()],
    });
    results.forEach((r) => {
      expect(r).toHaveProperty("check_id");
      expect(r).toHaveProperty("name");
      expect(r).toHaveProperty("status");
      expect(r).toHaveProperty("message");
      expect(["PASS", "WARN", "FAIL"]).toContain(r.status);
    });
  });
});

// ─── Check 1: Demo & Haul-Away ──────────────────────────────────────

describe("Check 1: Demo & Haul-Away", () => {
  it("PASS when demo category exists", () => {
    const results = runValidation({
      estimate: makeEstimate(),
      lineItems: [makeLineItem({ category: "demo", description: "Demo work" })],
    });
    const check = results.find((r) => r.check_id === 1)!;
    expect(check.status).toBe("PASS");
  });

  it("PASS when demolition category exists", () => {
    const results = runValidation({
      estimate: makeEstimate(),
      lineItems: [makeLineItem({ category: "demolition", description: "Tear out" })],
    });
    const check = results.find((r) => r.check_id === 1)!;
    expect(check.status).toBe("PASS");
  });

  it("FAIL when no demo line items", () => {
    const results = runValidation({
      estimate: makeEstimate(),
      lineItems: [makeLineItem({ category: "framing", description: "Frame walls" })],
    });
    const check = results.find((r) => r.check_id === 1)!;
    expect(check.status).toBe("FAIL");
  });
});

// ─── Check 2: Waste Factor ──────────────────────────────────────────

describe("Check 2: Waste Factor", () => {
  it("PASS when waste noted in material description", () => {
    const results = runValidation({
      estimate: makeEstimate(),
      lineItems: [
        makeLineItem({
          category: "material",
          description: "Lumber (includes waste factor)",
        }),
      ],
    });
    const check = results.find((r) => r.check_id === 2)!;
    expect(check.status).toBe("PASS");
  });

  it("PASS when waste noted in material notes", () => {
    const results = runValidation({
      estimate: makeEstimate(),
      lineItems: [
        makeLineItem({
          category: "material",
          description: "Lumber",
          notes: "10% waste factor applied",
        }),
      ],
    });
    const check = results.find((r) => r.check_id === 2)!;
    expect(check.status).toBe("PASS");
  });

  it("WARN when no waste factor on materials", () => {
    const results = runValidation({
      estimate: makeEstimate(),
      lineItems: [
        makeLineItem({
          category: "material",
          description: "Lumber",
          notes: null,
        }),
      ],
    });
    const check = results.find((r) => r.check_id === 2)!;
    expect(check.status).toBe("WARN");
  });

  it("PASS when no material line items at all", () => {
    const results = runValidation({
      estimate: makeEstimate(),
      lineItems: [makeLineItem({ category: "labor", description: "Framing labor" })],
    });
    const check = results.find((r) => r.check_id === 2)!;
    expect(check.status).toBe("PASS");
  });
});

// ─── Check 3: Labor Contingency ─────────────────────────────────────

describe("Check 3: Labor Contingency", () => {
  it("PASS when contingency >= 10% of labor", () => {
    const results = runValidation({
      estimate: makeEstimate({ labor_subtotal: 10000, contingency: 1000 }),
      lineItems: [makeLineItem()],
    });
    const check = results.find((r) => r.check_id === 3)!;
    expect(check.status).toBe("PASS");
  });

  it("WARN when contingency < 10% of labor", () => {
    const results = runValidation({
      estimate: makeEstimate({ labor_subtotal: 10000, contingency: 500 }),
      lineItems: [makeLineItem()],
    });
    const check = results.find((r) => r.check_id === 3)!;
    expect(check.status).toBe("WARN");
  });

  it("PASS when no labor costs", () => {
    const results = runValidation({
      estimate: makeEstimate({ labor_subtotal: 0, contingency: 0 }),
      lineItems: [makeLineItem()],
    });
    const check = results.find((r) => r.check_id === 3)!;
    expect(check.status).toBe("PASS");
  });
});

// ─── Check 4: Permit Costs ──────────────────────────────────────────

describe("Check 4: Permit Costs", () => {
  it("PASS when permits > 0", () => {
    const results = runValidation({
      estimate: makeEstimate({ permits_fees: 1200 }),
      lineItems: [makeLineItem()],
    });
    const check = results.find((r) => r.check_id === 4)!;
    expect(check.status).toBe("PASS");
  });

  it("FAIL when permits are 0", () => {
    const results = runValidation({
      estimate: makeEstimate({ permits_fees: 0 }),
      lineItems: [makeLineItem()],
    });
    const check = results.find((r) => r.check_id === 4)!;
    expect(check.status).toBe("FAIL");
  });
});

// ─── Check 5: Lead Times ────────────────────────────────────────────

describe("Check 5: Lead Times", () => {
  it("PASS when lead time noted", () => {
    const results = runValidation({
      estimate: makeEstimate(),
      lineItems: [
        makeLineItem({ notes: "8 week lead time for windows" }),
      ],
    });
    const check = results.find((r) => r.check_id === 5)!;
    expect(check.status).toBe("PASS");
  });

  it("PASS with lead-time (hyphenated)", () => {
    const results = runValidation({
      estimate: makeEstimate(),
      lineItems: [makeLineItem({ notes: "lead-time: 4 weeks" })],
    });
    const check = results.find((r) => r.check_id === 5)!;
    expect(check.status).toBe("PASS");
  });

  it("WARN when no lead time notes", () => {
    const results = runValidation({
      estimate: makeEstimate(),
      lineItems: [makeLineItem({ notes: null })],
    });
    const check = results.find((r) => r.check_id === 5)!;
    expect(check.status).toBe("WARN");
  });
});

// ─── Check 6: Final Cleanup ─────────────────────────────────────────

describe("Check 6: Final Cleanup", () => {
  it("PASS when cleanup category exists", () => {
    const results = runValidation({
      estimate: makeEstimate(),
      lineItems: [makeLineItem({ category: "cleanup", description: "Site cleanup" })],
    });
    const check = results.find((r) => r.check_id === 6)!;
    expect(check.status).toBe("PASS");
  });

  it("PASS when description mentions final clean", () => {
    const results = runValidation({
      estimate: makeEstimate(),
      lineItems: [makeLineItem({ description: "Final clean and punch list" })],
    });
    const check = results.find((r) => r.check_id === 6)!;
    expect(check.status).toBe("PASS");
  });

  it("WARN when no cleanup items", () => {
    const results = runValidation({
      estimate: makeEstimate(),
      lineItems: [makeLineItem({ category: "framing", description: "Frame" })],
    });
    const check = results.find((r) => r.check_id === 6)!;
    expect(check.status).toBe("WARN");
  });
});

// ─── Check 7: Contingency ───────────────────────────────────────────

describe("Check 7: Contingency", () => {
  it("PASS when contingency > 0", () => {
    const results = runValidation({
      estimate: makeEstimate({ contingency: 2000 }),
      lineItems: [makeLineItem()],
    });
    const check = results.find((r) => r.check_id === 7)!;
    expect(check.status).toBe("PASS");
  });

  it("FAIL when contingency is 0", () => {
    const results = runValidation({
      estimate: makeEstimate({ contingency: 0 }),
      lineItems: [makeLineItem()],
    });
    const check = results.find((r) => r.check_id === 7)!;
    expect(check.status).toBe("FAIL");
  });
});

// ─── Check 8: Price Freshness ───────────────────────────────────────

describe("Check 8: Price Freshness", () => {
  it("PASS when all prices are fresh", () => {
    const freshDate = new Date().toISOString();
    const results = runValidation({
      estimate: makeEstimate(),
      lineItems: [makeLineItem({ price_date: freshDate })],
    });
    const check = results.find((r) => r.check_id === 8)!;
    expect(check.status).toBe("PASS");
  });

  it("WARN when price is older than 90 days", () => {
    const oldDate = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString();
    const results = runValidation({
      estimate: makeEstimate(),
      lineItems: [makeLineItem({ price_date: oldDate })],
    });
    const check = results.find((r) => r.check_id === 8)!;
    expect(check.status).toBe("WARN");
    expect(check.message).toContain("older than 90 days");
  });

  it("PASS when price_date is null (not set)", () => {
    const results = runValidation({
      estimate: makeEstimate(),
      lineItems: [makeLineItem({ price_date: null })],
    });
    const check = results.find((r) => r.check_id === 8)!;
    expect(check.status).toBe("PASS");
  });
});

// ─── Check 9: Mobilization ─────────────────────────────────────────

describe("Check 9: Mobilization", () => {
  it("PASS when mobilization category present", () => {
    const results = runValidation({
      estimate: makeEstimate(),
      lineItems: [
        makeLineItem({ category: "mobilization", description: "Site mobilization" }),
      ],
    });
    const check = results.find((r) => r.check_id === 9)!;
    expect(check.status).toBe("PASS");
  });

  it("PASS when description mentions travel", () => {
    const results = runValidation({
      estimate: makeEstimate(),
      lineItems: [makeLineItem({ description: "Travel and setup" })],
    });
    const check = results.find((r) => r.check_id === 9)!;
    expect(check.status).toBe("PASS");
  });

  it("WARN when no mobilization items", () => {
    const results = runValidation({
      estimate: makeEstimate(),
      lineItems: [makeLineItem({ category: "labor", description: "Framing" })],
    });
    const check = results.find((r) => r.check_id === 9)!;
    expect(check.status).toBe("WARN");
  });
});

// ─── Check 10: Disposal Costs ───────────────────────────────────────

describe("Check 10: Disposal Costs", () => {
  it("PASS when no demo scope", () => {
    const results = runValidation({
      estimate: makeEstimate(),
      lineItems: [makeLineItem({ category: "framing", description: "Frame walls" })],
    });
    const check = results.find((r) => r.check_id === 10)!;
    expect(check.status).toBe("PASS");
  });

  it("PASS when demo scope has disposal costs", () => {
    const results = runValidation({
      estimate: makeEstimate(),
      lineItems: [
        makeLineItem({ category: "demo", description: "Tear out kitchen" }),
        makeLineItem({ category: "general", description: "Dumpster rental and disposal" }),
      ],
    });
    const check = results.find((r) => r.check_id === 10)!;
    expect(check.status).toBe("PASS");
  });

  it("FAIL when demo scope has no disposal", () => {
    const results = runValidation({
      estimate: makeEstimate(),
      lineItems: [
        makeLineItem({ category: "demo", description: "Tear out kitchen" }),
      ],
    });
    const check = results.find((r) => r.check_id === 10)!;
    expect(check.status).toBe("FAIL");
  });
});

// ─── Check 11: Paint Prep Labor ─────────────────────────────────────

describe("Check 11: Paint Prep Labor", () => {
  it("PASS when no paint items", () => {
    const results = runValidation({
      estimate: makeEstimate(),
      lineItems: [makeLineItem({ category: "framing", description: "Frame" })],
    });
    const check = results.find((r) => r.check_id === 11)!;
    expect(check.status).toBe("PASS");
  });

  it("PASS when prep is >= 60% of paint total", () => {
    const results = runValidation({
      estimate: makeEstimate(),
      lineItems: [
        makeLineItem({
          id: "p1",
          category: "paint",
          description: "Paint prep - sanding and caulking",
          extended_price: 600,
        }),
        makeLineItem({
          id: "p2",
          category: "paint",
          description: "Paint application",
          extended_price: 400,
        }),
      ],
    });
    const check = results.find((r) => r.check_id === 11)!;
    // prep = 600, total = 1000, ratio = 0.6 = 60%
    expect(check.status).toBe("PASS");
  });

  it("WARN when prep is < 60% of paint total", () => {
    const results = runValidation({
      estimate: makeEstimate(),
      lineItems: [
        makeLineItem({
          id: "p1",
          category: "paint",
          description: "Paint prep",
          extended_price: 200,
        }),
        makeLineItem({
          id: "p2",
          category: "paint",
          description: "Paint application",
          extended_price: 800,
        }),
      ],
    });
    const check = results.find((r) => r.check_id === 11)!;
    // prep = 200, total = 1000, ratio = 0.2 = 20%
    expect(check.status).toBe("WARN");
  });
});

// ─── Check 12: Transitions & Trim ───────────────────────────────────

describe("Check 12: Transitions & Trim", () => {
  it("PASS when no flooring scope", () => {
    const results = runValidation({
      estimate: makeEstimate(),
      lineItems: [makeLineItem({ category: "framing", description: "Frame" })],
    });
    const check = results.find((r) => r.check_id === 12)!;
    expect(check.status).toBe("PASS");
  });

  it("PASS when flooring has transitions", () => {
    const results = runValidation({
      estimate: makeEstimate(),
      lineItems: [
        makeLineItem({ category: "flooring", description: "LVP flooring install" }),
        makeLineItem({ category: "flooring", description: "Transition strips" }),
      ],
    });
    const check = results.find((r) => r.check_id === 12)!;
    expect(check.status).toBe("PASS");
  });

  it("WARN when flooring missing transitions", () => {
    const results = runValidation({
      estimate: makeEstimate(),
      lineItems: [
        makeLineItem({ category: "flooring", description: "LVP flooring install" }),
      ],
    });
    const check = results.find((r) => r.check_id === 12)!;
    expect(check.status).toBe("WARN");
  });
});

// ─── Check 13: Access Difficulty ────────────────────────────────────

describe("Check 13: Access Difficulty", () => {
  it("PASS when access noted", () => {
    const results = runValidation({
      estimate: makeEstimate(),
      lineItems: [makeLineItem({ notes: "Difficult access - multi-story" })],
    });
    const check = results.find((r) => r.check_id === 13)!;
    expect(check.status).toBe("PASS");
  });

  it("PASS when description mentions access", () => {
    const results = runValidation({
      estimate: makeEstimate(),
      lineItems: [makeLineItem({ description: "Access scaffolding setup" })],
    });
    const check = results.find((r) => r.check_id === 13)!;
    expect(check.status).toBe("PASS");
  });

  it("WARN when no access notes", () => {
    const results = runValidation({
      estimate: makeEstimate(),
      lineItems: [makeLineItem({ description: "Standard framing", notes: null })],
    });
    const check = results.find((r) => r.check_id === 13)!;
    expect(check.status).toBe("WARN");
  });
});

// ─── Check 14: Small Fixtures (Bathroom) ────────────────────────────

describe("Check 14: Small Fixtures (Bathroom)", () => {
  it("PASS when not a bathroom project", () => {
    const results = runValidation({
      estimate: makeEstimate({ project_type: "deck" }),
      lineItems: [makeLineItem()],
    });
    const check = results.find((r) => r.check_id === 14)!;
    expect(check.status).toBe("PASS");
  });

  it("PASS when bathroom has fixtures", () => {
    const results = runValidation({
      estimate: makeEstimate({ project_type: "bathroom_renovation" }),
      lineItems: [
        makeLineItem({ description: "Towel bar and mirror installation" }),
      ],
    });
    const check = results.find((r) => r.check_id === 14)!;
    expect(check.status).toBe("PASS");
  });

  it("WARN when bathroom missing fixtures", () => {
    const results = runValidation({
      estimate: makeEstimate({ project_type: "bathroom_renovation" }),
      lineItems: [makeLineItem({ description: "Tile installation" })],
    });
    const check = results.find((r) => r.check_id === 14)!;
    expect(check.status).toBe("WARN");
  });
});

// ─── Check 15: Exclusions ───────────────────────────────────────────

describe("Check 15: Exclusions", () => {
  it("PASS when exclusions are populated", () => {
    const results = runValidation({
      estimate: makeEstimate({
        scope_exclusions: ["Landscaping", "HVAC replacement"],
      }),
      lineItems: [makeLineItem()],
    });
    const check = results.find((r) => r.check_id === 15)!;
    expect(check.status).toBe("PASS");
    expect(check.message).toContain("2 exclusions");
  });

  it("FAIL when exclusions are empty", () => {
    const results = runValidation({
      estimate: makeEstimate({ scope_exclusions: [] }),
      lineItems: [makeLineItem()],
    });
    const check = results.find((r) => r.check_id === 15)!;
    expect(check.status).toBe("FAIL");
    expect(check.message).toContain("empty");
  });
});

// ─── Complete estimate (all pass) ───────────────────────────────────

describe("Complete estimate passes all checks", () => {
  it("all 15 checks PASS with a fully populated estimate", () => {
    const estimate = makeEstimate({
      project_type: "bathroom_renovation",
      permits_fees: 1200,
      contingency: 2000,
      labor_subtotal: 10000,
      scope_exclusions: ["Landscaping", "HVAC"],
    });

    const lineItems = [
      makeLineItem({ id: "1", category: "demo", description: "Demo and haul existing tile" }),
      makeLineItem({
        id: "2",
        category: "material",
        description: "Tile material (waste factor included)",
        notes: "10% waste factor applied",
        price_date: new Date().toISOString(),
      }),
      makeLineItem({
        id: "3",
        category: "cleanup",
        description: "Final cleanup",
      }),
      makeLineItem({
        id: "4",
        category: "mobilization",
        description: "Mobilization and setup",
        notes: "lead time: 2 weeks for tile. Difficult access - multi-story",
      }),
      makeLineItem({
        id: "5",
        category: "general",
        description: "Dumpster and disposal",
      }),
      makeLineItem({
        id: "6",
        category: "paint",
        description: "Paint prep - sanding, caulking, primer",
        extended_price: 700,
      }),
      makeLineItem({
        id: "7",
        category: "paint",
        description: "Paint application - 2 coats",
        extended_price: 300,
      }),
      makeLineItem({
        id: "8",
        category: "flooring",
        description: "Floor tile installation",
      }),
      makeLineItem({
        id: "9",
        category: "flooring",
        description: "Threshold and transition strips",
      }),
      makeLineItem({
        id: "10",
        category: "fixtures",
        description: "Towel bar, mirror, and toilet paper holder",
      }),
    ];

    const results = runValidation({ estimate, lineItems });
    const failing = results.filter((r) => r.status !== "PASS");
    if (failing.length > 0) {
      // Show which checks failed for debugging
      failing.forEach((f) => {
        console.log(`FAILED: [${f.check_id}] ${f.name}: ${f.message}`);
      });
    }
    expect(failing).toHaveLength(0);
  });
});

// ─── Minimal estimate (most fail) ───────────────────────────────────

describe("Minimal estimate fails expected checks", () => {
  it("bare-minimum estimate triggers multiple failures and warnings", () => {
    const estimate = makeEstimate({
      permits_fees: 0,
      contingency: 0,
      labor_subtotal: 5000,
      scope_exclusions: [],
    });

    const lineItems = [
      makeLineItem({ category: "labor", description: "General labor" }),
    ];

    const results = runValidation({ estimate, lineItems });

    const failCount = results.filter((r) => r.status === "FAIL").length;
    const warnCount = results.filter((r) => r.status === "WARN").length;
    const passCount = results.filter((r) => r.status === "PASS").length;

    // Should have multiple failures: demo, permits, contingency, exclusions, disposal(pass - no demo)
    expect(failCount).toBeGreaterThanOrEqual(3);
    // Should have some warnings too
    expect(warnCount).toBeGreaterThanOrEqual(2);
    // Some should still pass (e.g. no flooring scope, no paint scope, no bathroom)
    expect(passCount).toBeGreaterThanOrEqual(1);
  });
});
