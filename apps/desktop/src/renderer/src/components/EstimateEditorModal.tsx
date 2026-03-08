import { useState, useEffect, useMemo, useCallback } from "react";
import { Modal, Field, inputClass, selectClass, textareaClass } from "./Modal";
import { supabase } from "../lib/supabase";
import { useLineItems, useClients } from "../lib/store";
import { runValidation } from "@proestimate/estimation-engine";
import type { Estimate } from "@proestimate/shared/types";

interface ValidationResult {
  check_id: number;
  name: string;
  status: "PASS" | "WARN" | "FAIL";
  message: string;
}

/* ── Types ── */

interface DraftLine {
  _key: string;
  id?: string;
  category: string;
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
}

interface EstimateEditorModalProps {
  open: boolean;
  onClose: () => void;
  estimate: Estimate | null;
}

/* ── Constants ── */

const PROJECT_TYPES = [
  "General",
  "Kitchen Remodel",
  "Bathroom Remodel",
  "Flooring",
  "Roofing",
  "Painting",
  "Siding",
  "Deck / Patio",
  "Addition",
  "Full Renovation",
];

const UNIT_OPTIONS = [
  "sq ft",
  "lin ft",
  "each",
  "bundle",
  "gallon",
  "sheet",
  "box",
  "roll",
  "bag",
  "ton",
  "hour",
  "day",
  "lot",
];

const TIERS = ["budget", "midrange", "high_end"] as const;
const TIER_LABELS: Record<string, string> = { budget: "Budget", midrange: "Midrange", high_end: "High End" };
const TIER_DESC: Record<string, string> = {
  budget: "Economy-grade materials, basic finishes, cost-effective labor",
  midrange: "Quality brand-name materials, standard upgrades, professional finishes",
  high_end: "Premium designer-grade materials, custom craftsmanship, luxury finishes",
};

const TABS = [
  { key: "material", label: "Materials" },
  { key: "labor", label: "Labor" },
  { key: "subcontractor", label: "Subcontractors" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

/* ── Helpers ── */

let keyCounter = 0;
function nextKey(): string {
  return `draft-${++keyCounter}-${Date.now()}`;
}

function emptyLine(category: string): DraftLine {
  return {
    _key: nextKey(),
    category,
    description: "",
    quantity: 1,
    unit: "each",
    unit_price: 0,
  };
}

function fmt(n: number): string {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/* ── Component ── */

export function EstimateEditorModal({ open, onClose, estimate }: EstimateEditorModalProps) {
  const { data: clients } = useClients();
  const { data: existingLines } = useLineItems(estimate?.id ?? null);

  /* Header state */
  const [projectType, setProjectType] = useState("General");
  const [clientId, setClientId] = useState<string | null>(null);
  const [tier, setTier] = useState<(typeof TIERS)[number]>("midrange");
  const normalizeTier = (t: string): (typeof TIERS)[number] => {
    const map: Record<string, (typeof TIERS)[number]> = { good: "budget", better: "midrange", best: "high_end" };
    return map[t] ?? (TIERS.includes(t as any) ? t as (typeof TIERS)[number] : "midrange");
  };
  const [projectAddress, setProjectAddress] = useState("");
  const [validThrough, setValidThrough] = useState("");

  /* Summary fields */
  const [siteConditions, setSiteConditions] = useState("");
  const [inclusionsText, setInclusionsText] = useState("");
  const [exclusionsText, setExclusionsText] = useState("");
  const [permitsFees, setPermitsFees] = useState(0);
  const [overheadPct, setOverheadPct] = useState(15);
  const [contingencyPct, setContingencyPct] = useState(5);
  const [taxPct, setTaxPct] = useState(8);

  /* Line items */
  const [lines, setLines] = useState<DraftLine[]>([]);
  const [activeTab, setActiveTab] = useState<TabKey>("material");
  const [saving, setSaving] = useState(false);

  /* Validation */
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([]);
  const [validationOpen, setValidationOpen] = useState(false);
  const [validating, setValidating] = useState(false);

  /* Sync from estimate prop on open */
  useEffect(() => {
    if (!open || !estimate) return;
    setProjectType(estimate.project_type ?? "General");
    setClientId(estimate.client_id);
    setTier(normalizeTier(estimate.tier ?? "midrange"));
    setProjectAddress(estimate.project_address ?? "");
    setValidThrough(estimate.valid_through ? estimate.valid_through.slice(0, 10) : "");
    setSiteConditions(estimate.site_conditions ?? "");
    setInclusionsText((estimate.scope_inclusions ?? []).join("\n"));
    setExclusionsText((estimate.scope_exclusions ?? []).join("\n"));
    setPermitsFees(Number(estimate.permits_fees) || 0);

    // Back-calculate percentages from stored dollar amounts
    const matSub = Number(estimate.materials_subtotal) || 0;
    const labSub = Number(estimate.labor_subtotal) || 0;
    const subTotal = Number(estimate.subcontractor_total) || 0;
    const base = matSub + labSub + subTotal;
    if (base > 0) {
      setOverheadPct(Math.round((Number(estimate.overhead_profit) / base) * 100) || 15);
      setContingencyPct(Math.round((Number(estimate.contingency) / base) * 100) || 5);
      setTaxPct(Math.round((Number(estimate.tax) / base) * 100) || 8);
    } else {
      setOverheadPct(15);
      setContingencyPct(5);
      setTaxPct(8);
    }
  }, [open, estimate]);

  /* Sync existing line items */
  useEffect(() => {
    if (!open || !estimate) return;
    if (existingLines.length > 0) {
      setLines(
        existingLines.map((li) => ({
          _key: nextKey(),
          id: li.id,
          category: li.category ?? "material",
          description: li.description ?? "",
          quantity: Number(li.quantity) || 1,
          unit: li.unit ?? "each",
          unit_price: Number(li.unit_price) || 0,
        }))
      );
    } else {
      setLines([]);
    }
  }, [open, estimate, existingLines]);

  /* Filtered lines for current tab */
  const tabLines = useMemo(() => lines.filter((l) => l.category === activeTab), [lines, activeTab]);

  /* Calculations */
  const calcs = useMemo(() => {
    const materialsSubtotal = lines
      .filter((l) => l.category === "material")
      .reduce((sum, l) => sum + l.quantity * l.unit_price, 0);
    const laborSubtotal = lines
      .filter((l) => l.category === "labor")
      .reduce((sum, l) => sum + l.quantity * l.unit_price, 0);
    const subcontractorTotal = lines
      .filter((l) => l.category === "subcontractor")
      .reduce((sum, l) => sum + l.quantity * l.unit_price, 0);

    const base = materialsSubtotal + laborSubtotal + subcontractorTotal;
    const overheadDollar = base * (overheadPct / 100);
    const contingencyDollar = base * (contingencyPct / 100);
    const taxDollar = base * (taxPct / 100);
    const grandTotal = base + permitsFees + overheadDollar + contingencyDollar + taxDollar;
    const grossMarginPct = grandTotal > 0 ? ((grandTotal - base) / grandTotal) * 100 : 0;

    return {
      materialsSubtotal,
      laborSubtotal,
      subcontractorTotal,
      base,
      overheadDollar,
      contingencyDollar,
      taxDollar,
      grandTotal,
      grossMarginPct,
    };
  }, [lines, permitsFees, overheadPct, contingencyPct, taxPct]);

  /* Line mutations */
  const updateLine = useCallback((key: string, field: keyof DraftLine, value: string | number) => {
    setLines((prev) =>
      prev.map((l) => (l._key === key ? { ...l, [field]: value } : l))
    );
  }, []);

  const addLine = useCallback(() => {
    setLines((prev) => [...prev, emptyLine(activeTab)]);
  }, [activeTab]);

  const removeLine = useCallback((key: string) => {
    setLines((prev) => prev.filter((l) => l._key !== key));
  }, []);

  /* Build current estimate snapshot for validation */
  const buildEstimateSnapshot = useCallback(() => {
    const inclusions = inclusionsText.split("\n").map((s) => s.trim()).filter(Boolean);
    const exclusions = exclusionsText.split("\n").map((s) => s.trim()).filter(Boolean);
    const snapshot: Estimate = {
      ...estimate!,
      project_type: projectType,
      client_id: clientId || null,
      tier,
      project_address: projectAddress || null,
      valid_through: validThrough || null,
      site_conditions: siteConditions || null,
      scope_inclusions: inclusions,
      scope_exclusions: exclusions,
      materials_subtotal: calcs.materialsSubtotal,
      labor_subtotal: calcs.laborSubtotal,
      subcontractor_total: calcs.subcontractorTotal,
      permits_fees: permitsFees,
      overhead_profit: calcs.overheadDollar,
      contingency: calcs.contingencyDollar,
      tax: calcs.taxDollar,
      grand_total: calcs.grandTotal,
      gross_margin_pct: calcs.grossMarginPct,
    };
    const lineItems = lines
      .filter((l) => l.description.trim() !== "")
      .map((l, i) => ({
        id: l.id ?? "",
        estimate_id: estimate!.id,
        line_number: i + 1,
        category: l.category,
        description: l.description,
        quantity: l.quantity,
        unit: l.unit,
        unit_price: l.unit_price,
        extended_price: l.quantity * l.unit_price,
        notes: null,
        product_id: null,
        price_source: null,
        price_date: null,
        created_at: new Date().toISOString(),
      }));
    return { estimate: snapshot, lineItems };
  }, [estimate, projectType, clientId, tier, projectAddress, validThrough, siteConditions, inclusionsText, exclusionsText, permitsFees, calcs, lines]);

  /* Run validation */
  const handleRunValidation = useCallback(async () => {
    if (!estimate) return;
    setValidating(true);
    try {
      const { estimate: snap, lineItems } = buildEstimateSnapshot();
      const results: ValidationResult[] = await runValidation({ estimate: snap, lineItems });
      setValidationResults(results);
      setValidationOpen(true);
    } finally {
      setValidating(false);
    }
  }, [estimate, buildEstimateSnapshot]);

  /* Validation summary counts */
  const validationCounts = useMemo(() => {
    const pass = validationResults.filter((r) => r.status === "PASS").length;
    const warn = validationResults.filter((r) => r.status === "WARN").length;
    const fail = validationResults.filter((r) => r.status === "FAIL").length;
    return { pass, warn, fail, total: validationResults.length };
  }, [validationResults]);

  const validationAllPassed = validationCounts.fail === 0 && validationCounts.warn === 0;

  /* Save */
  const handleSave = useCallback(
    async (sendAfter: boolean) => {
      if (!supabase || !estimate) return;
      setSaving(true);
      try {
        const inclusions = inclusionsText
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean);
        const exclusions = exclusionsText
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean);

        // Run validation before saving
        const { estimate: snap, lineItems: snapLines } = buildEstimateSnapshot();
        let results: ValidationResult[] = validationResults;
        try {
          results = await runValidation({ estimate: snap, lineItems: snapLines });
          setValidationResults(results);
        } catch {
          // If validation fails, proceed with existing results
        }
        const allPassed = results.length > 0 && results.every((r) => r.status === "PASS");

        const updatePayload: Record<string, unknown> = {
          project_type: projectType,
          client_id: clientId || null,
          tier,
          project_address: projectAddress || null,
          valid_through: validThrough || null,
          site_conditions: siteConditions || null,
          scope_inclusions: inclusions,
          scope_exclusions: exclusions,
          materials_subtotal: calcs.materialsSubtotal,
          labor_subtotal: calcs.laborSubtotal,
          subcontractor_total: calcs.subcontractorTotal,
          permits_fees: permitsFees,
          overhead_profit: calcs.overheadDollar,
          contingency: calcs.contingencyDollar,
          tax: calcs.taxDollar,
          grand_total: calcs.grandTotal,
          gross_margin_pct: calcs.grossMarginPct,
          validation_results: results,
          validation_passed: allPassed,
          updated_at: new Date().toISOString(),
        };

        if (sendAfter) {
          updatePayload.status = "sent";
          updatePayload.sent_at = new Date().toISOString();
        }

        await supabase.from("estimates").update(updatePayload).eq("id", estimate.id);

        // Delete existing line items
        await supabase.from("estimate_line_items").delete().eq("estimate_id", estimate.id);

        // Re-insert non-empty lines
        const toInsert = lines
          .filter((l) => l.description.trim() !== "")
          .map((l, i) => ({
            estimate_id: estimate.id,
            line_number: i + 1,
            category: l.category,
            description: l.description,
            quantity: l.quantity,
            unit: l.unit,
            unit_price: l.unit_price,
            extended_price: l.quantity * l.unit_price,
          }));

        if (toInsert.length > 0) {
          await supabase.from("estimate_line_items").insert(toInsert);
        }

        onClose();
      } finally {
        setSaving(false);
      }
    },
    [
      estimate,
      projectType,
      clientId,
      tier,
      projectAddress,
      validThrough,
      siteConditions,
      inclusionsText,
      exclusionsText,
      permitsFees,
      calcs,
      lines,
      onClose,
      buildEstimateSnapshot,
      validationResults,
    ]
  );

  const lineCount = lines.filter((l) => l.description.trim() !== "").length;

  const marginColor =
    calcs.grossMarginPct >= 35
      ? "text-[var(--green)]"
      : calcs.grossMarginPct >= 25
        ? "text-[var(--orange)]"
        : "text-[var(--red)]";

  if (!estimate) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Edit ${estimate.estimate_number}`}
      description={estimate.project_type}
      width="w-[960px]"
    >
      <div className="px-6 py-5 space-y-5">
        {/* ── Header Section ── */}
        <div className="border-b border-[var(--sep)] pb-5 space-y-3">
          {/* Row 1: Project Type / Client / Tier */}
          <div className="grid grid-cols-3 gap-3">
            <Field label="Project Type">
              <select
                className={selectClass}
                value={projectType}
                onChange={(e) => setProjectType(e.target.value)}
              >
                {PROJECT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Client">
              <select
                className={selectClass}
                value={clientId ?? ""}
                onChange={(e) => setClientId(e.target.value || null)}
              >
                <option value="">No client</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.full_name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Pricing Tier">
              <div className="flex rounded-lg bg-[var(--gray5)] p-0.5">
                {TIERS.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTier(t)}
                    className={`flex-1 rounded-md px-2 py-1.5 text-[12px] font-medium transition-all ${
                      tier === t
                        ? "bg-[var(--card)] text-[var(--label)] shadow-sm"
                        : "text-[var(--secondary)]"
                    }`}
                  >
                    {TIER_LABELS[t]}
                  </button>
                ))}
              </div>
              <p className="mt-1 text-[10px] text-[var(--tertiary)]">{TIER_DESC[tier]}</p>
            </Field>
          </div>

          {/* Row 2: Address / Valid Through */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Project Address">
              <input
                className={inputClass}
                placeholder="123 Main St, City, ST 00000"
                value={projectAddress}
                onChange={(e) => setProjectAddress(e.target.value)}
              />
            </Field>
            <Field label="Valid Through">
              <input
                type="date"
                className={inputClass}
                value={validThrough}
                onChange={(e) => setValidThrough(e.target.value)}
              />
            </Field>
          </div>
        </div>

        {/* ── Line Items Section ── */}
        <div>
          {/* Tab bar + Add button */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex rounded-lg bg-[var(--gray5)] p-0.5">
              {TABS.map((tab) => {
                const count = lines.filter((l) => l.category === tab.key).length;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveTab(tab.key)}
                    className={`rounded-md px-3 py-1.5 text-[12px] font-medium transition-all ${
                      activeTab === tab.key
                        ? "bg-[var(--card)] text-[var(--label)] shadow-sm"
                        : "text-[var(--secondary)]"
                    }`}
                  >
                    {tab.label}
                    {count > 0 && (
                      <span className="ml-1.5 text-[10px] text-[var(--tertiary)]">{count}</span>
                    )}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={addLine}
              className="flex items-center gap-1 rounded-lg border border-[var(--sep)] px-3 py-1.5 text-[12px] font-medium transition-colors hover:bg-[var(--bg)]"
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <path d="M12 5v14M5 12h14" />
              </svg>
              Add Row
            </button>
          </div>

          {/* Table header */}
          <div
            className="grid items-center gap-2 px-2 pb-1.5 text-[11px] font-medium uppercase tracking-wide text-[var(--secondary)]"
            style={{ gridTemplateColumns: "1fr 80px 90px 100px 100px 36px" }}
          >
            <span>Description</span>
            <span className="text-right">Qty</span>
            <span>Unit</span>
            <span className="text-right">Price</span>
            <span className="text-right">Total</span>
            <span />
          </div>

          {/* Table rows */}
          <div className="space-y-1.5 max-h-[240px] overflow-y-auto">
            {tabLines.length === 0 ? (
              <div className="flex items-center justify-center rounded-lg border border-dashed border-[var(--sep)] py-8">
                <p className="text-[12px] text-[var(--tertiary)]">
                  No {TABS.find((t) => t.key === activeTab)?.label.toLowerCase()} line items yet.
                  Click "Add Row" to start.
                </p>
              </div>
            ) : (
              tabLines.map((line) => {
                const total = line.quantity * line.unit_price;
                return (
                  <div
                    key={line._key}
                    className="grid items-center gap-2 rounded-lg border border-[var(--sep)] bg-[var(--bg)] px-2 py-1.5"
                    style={{ gridTemplateColumns: "1fr 80px 90px 100px 100px 36px" }}
                  >
                    <input
                      className="w-full rounded-md border-none bg-transparent px-2 py-1 text-[13px] outline-none placeholder:text-[var(--gray3)]"
                      placeholder="Item description..."
                      value={line.description}
                      onChange={(e) => updateLine(line._key, "description", e.target.value)}
                    />
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className="w-full rounded-md border-none bg-transparent px-2 py-1 text-right text-[13px] outline-none"
                      value={line.quantity}
                      onChange={(e) =>
                        updateLine(line._key, "quantity", parseFloat(e.target.value) || 0)
                      }
                    />
                    <select
                      className="w-full rounded-md border-none bg-transparent px-1 py-1 text-[12px] outline-none"
                      value={line.unit}
                      onChange={(e) => updateLine(line._key, "unit", e.target.value)}
                    >
                      {UNIT_OPTIONS.map((u) => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className="w-full rounded-md border-none bg-transparent px-2 py-1 text-right text-[13px] outline-none"
                      value={line.unit_price}
                      onChange={(e) =>
                        updateLine(line._key, "unit_price", parseFloat(e.target.value) || 0)
                      }
                    />
                    <span className="text-right text-[13px] font-medium tabular-nums pr-1">
                      ${fmt(total)}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeLine(line._key)}
                      className="flex items-center justify-center rounded-md p-1 text-[var(--gray2)] transition-colors hover:bg-[var(--card)] hover:text-[var(--red)]"
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      >
                        <path d="M18 6 6 18M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ── Summary Section ── */}
        <div className="border-t border-[var(--sep)] pt-5 grid grid-cols-2 gap-5">
          {/* Left: conditions + scope */}
          <div className="space-y-3">
            <Field label="Site Conditions">
              <textarea
                className={textareaClass}
                rows={3}
                placeholder="Describe site conditions, access, etc."
                value={siteConditions}
                onChange={(e) => setSiteConditions(e.target.value)}
              />
            </Field>
            <Field label="Scope Inclusions (one per line)">
              <textarea
                className={textareaClass}
                rows={3}
                placeholder="All materials and labor for..."
                value={inclusionsText}
                onChange={(e) => setInclusionsText(e.target.value)}
              />
            </Field>
            <Field label="Scope Exclusions (one per line)">
              <textarea
                className={textareaClass}
                rows={3}
                placeholder="Permit fees not included..."
                value={exclusionsText}
                onChange={(e) => setExclusionsText(e.target.value)}
              />
            </Field>
          </div>

          {/* Right: financial summary */}
          <div className="rounded-xl border border-[var(--sep)] bg-[var(--bg)] p-4 space-y-2">
            <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--secondary)] mb-2">
              Financial Summary
            </p>

            <SummaryRow label="Materials" value={`$${fmt(calcs.materialsSubtotal)}`} />
            <SummaryRow label="Labor" value={`$${fmt(calcs.laborSubtotal)}`} />
            <SummaryRow label="Subcontractors" value={`$${fmt(calcs.subcontractorTotal)}`} />

            <div className="border-t border-[var(--sep)] my-2" />

            {/* Permits & Fees - editable dollar */}
            <div className="flex items-center justify-between">
              <span className="text-[12px] text-[var(--secondary)]">Permits & Fees</span>
              <div className="flex items-center gap-1">
                <span className="text-[12px] text-[var(--secondary)]">$</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="w-[80px] rounded-md border border-[var(--sep)] bg-[var(--card)] px-2 py-0.5 text-right text-[12px] outline-none focus:border-[var(--accent)]"
                  value={permitsFees}
                  onChange={(e) => setPermitsFees(parseFloat(e.target.value) || 0)}
                />
              </div>
            </div>

            {/* Overhead & Profit */}
            <div className="flex items-center justify-between">
              <span className="text-[12px] text-[var(--secondary)]">Overhead & Profit</span>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-0.5">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    className="w-[48px] rounded-md border border-[var(--sep)] bg-[var(--card)] px-1.5 py-0.5 text-right text-[12px] outline-none focus:border-[var(--accent)]"
                    value={overheadPct}
                    onChange={(e) => setOverheadPct(parseFloat(e.target.value) || 0)}
                  />
                  <span className="text-[11px] text-[var(--tertiary)]">%</span>
                </div>
                <span className="text-[12px] font-medium tabular-nums w-[80px] text-right">
                  ${fmt(calcs.overheadDollar)}
                </span>
              </div>
            </div>

            {/* Contingency */}
            <div className="flex items-center justify-between">
              <span className="text-[12px] text-[var(--secondary)]">Contingency</span>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-0.5">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    className="w-[48px] rounded-md border border-[var(--sep)] bg-[var(--card)] px-1.5 py-0.5 text-right text-[12px] outline-none focus:border-[var(--accent)]"
                    value={contingencyPct}
                    onChange={(e) => setContingencyPct(parseFloat(e.target.value) || 0)}
                  />
                  <span className="text-[11px] text-[var(--tertiary)]">%</span>
                </div>
                <span className="text-[12px] font-medium tabular-nums w-[80px] text-right">
                  ${fmt(calcs.contingencyDollar)}
                </span>
              </div>
            </div>

            {/* Tax */}
            <div className="flex items-center justify-between">
              <span className="text-[12px] text-[var(--secondary)]">Tax</span>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-0.5">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    className="w-[48px] rounded-md border border-[var(--sep)] bg-[var(--card)] px-1.5 py-0.5 text-right text-[12px] outline-none focus:border-[var(--accent)]"
                    value={taxPct}
                    onChange={(e) => setTaxPct(parseFloat(e.target.value) || 0)}
                  />
                  <span className="text-[11px] text-[var(--tertiary)]">%</span>
                </div>
                <span className="text-[12px] font-medium tabular-nums w-[80px] text-right">
                  ${fmt(calcs.taxDollar)}
                </span>
              </div>
            </div>

            <div className="border-t border-[var(--sep)] my-2" />

            {/* Grand Total */}
            <div className="flex items-center justify-between">
              <span className="text-[14px] font-bold">Grand Total</span>
              <span className="text-[16px] font-bold tabular-nums">
                ${fmt(calcs.grandTotal)}
              </span>
            </div>

            {/* Gross Margin */}
            <div className="flex items-center justify-between">
              <span className="text-[12px] text-[var(--secondary)]">Gross Margin</span>
              <span className={`text-[13px] font-semibold tabular-nums ${marginColor}`}>
                {calcs.grossMarginPct.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Validation Results Panel ── */}
      {validationResults.length > 0 && (
        <div className="px-6 pb-4">
          <div className="rounded-xl border border-[var(--sep)] bg-[var(--bg)] overflow-hidden">
            {/* Collapsible header */}
            <button
              type="button"
              onClick={() => setValidationOpen((v) => !v)}
              className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-[var(--card)]"
            >
              <div className="flex items-center gap-2">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  className={`transition-transform ${validationOpen ? "rotate-90" : ""}`}
                >
                  <path d="m9 18 6-6-6-6" />
                </svg>
                <span className="text-[12px] font-semibold">Validation Checklist</span>
              </div>
              <div className="flex items-center gap-3">
                {validationCounts.pass > 0 && (
                  <span className="flex items-center gap-1 text-[11px] font-medium text-[var(--green)]">
                    <span className="inline-block h-2 w-2 rounded-full bg-[var(--green)]" />
                    {validationCounts.pass} Pass
                  </span>
                )}
                {validationCounts.warn > 0 && (
                  <span className="flex items-center gap-1 text-[11px] font-medium text-[var(--orange)]">
                    <span className="inline-block h-2 w-2 rounded-full bg-[var(--orange)]" />
                    {validationCounts.warn} Warn
                  </span>
                )}
                {validationCounts.fail > 0 && (
                  <span className="flex items-center gap-1 text-[11px] font-medium text-[var(--red)]">
                    <span className="inline-block h-2 w-2 rounded-full bg-[var(--red)]" />
                    {validationCounts.fail} Fail
                  </span>
                )}
              </div>
            </button>

            {/* Expandable results list */}
            {validationOpen && (
              <div className="border-t border-[var(--sep)] px-4 py-2 space-y-1 max-h-[220px] overflow-y-auto">
                {validationResults.map((r) => {
                  const statusColor =
                    r.status === "PASS"
                      ? "text-[var(--green)]"
                      : r.status === "WARN"
                        ? "text-[var(--orange)]"
                        : "text-[var(--red)]";
                  const dotColor =
                    r.status === "PASS"
                      ? "bg-[var(--green)]"
                      : r.status === "WARN"
                        ? "bg-[var(--orange)]"
                        : "bg-[var(--red)]";
                  return (
                    <div
                      key={r.check_id}
                      className="flex items-start gap-2 rounded-lg px-2 py-1.5 hover:bg-[var(--card)]"
                    >
                      <span className={`mt-1 inline-block h-2 w-2 shrink-0 rounded-full ${dotColor}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[12px] font-medium">{r.name}</span>
                          <span className={`text-[10px] font-semibold uppercase ${statusColor}`}>
                            {r.status}
                          </span>
                        </div>
                        <p className="text-[11px] text-[var(--tertiary)] leading-tight">{r.message}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Footer ── */}
      <div className="flex items-center justify-between border-t border-[var(--sep)] px-6 py-3">
        <span className="text-[11px] text-[var(--tertiary)]">
          {lineCount} line item{lineCount !== 1 ? "s" : ""}
        </span>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleRunValidation}
            disabled={validating}
            className="rounded-lg border border-[var(--sep)] px-4 py-2 text-[13px] font-medium transition-colors hover:bg-[var(--bg)] disabled:opacity-50"
          >
            {validating ? "Validating..." : "Run Validation"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[var(--sep)] px-4 py-2 text-[13px] font-medium transition-colors hover:bg-[var(--bg)]"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => handleSave(false)}
            className="rounded-lg border border-[var(--sep)] px-4 py-2 text-[13px] font-medium transition-all hover:bg-[var(--bg)] disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Draft"}
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => handleSave(true)}
            className="rounded-lg bg-[var(--accent)] px-4 py-2 text-[13px] font-medium text-white transition-all active:scale-[0.97] disabled:opacity-50"
          >
            {saving ? "Sending..." : "Save & Send"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

/* ── Summary Row sub-component ── */

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[12px] text-[var(--secondary)]">{label}</span>
      <span className="text-[12px] font-medium tabular-nums">{value}</span>
    </div>
  );
}
