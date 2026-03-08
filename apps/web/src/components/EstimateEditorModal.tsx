import { useState, useEffect, useMemo, useCallback } from "react";
import toast from "react-hot-toast";
import { Modal } from "./Modal";
import { supabase } from "../lib/supabase";
import { useLineItems, useClients } from "../lib/store";
import { runValidation } from "@proestimate/estimation-engine";
import { generateEstimatePDF } from "./EstimatePDF";
import type { Estimate } from "@proestimate/shared/types";

import { EstimateHeaderSection } from "./estimate-editor/EstimateHeaderSection";
import { EstimateLineItemsSection } from "./estimate-editor/EstimateLineItemsSection";
import { EstimateSummarySection } from "./estimate-editor/EstimateSummarySection";
import { EstimateValidationPanel } from "./estimate-editor/EstimateValidationPanel";
import { TIERS, type DraftLine, type TabKey, type TierKey, type ValidationResult } from "./estimate-editor/types";

let keyCounter = 0;
const nextKey = () => `draft-${++keyCounter}-${Date.now()}`;
const emptyLine = (category: string): DraftLine => ({ _key: nextKey(), category, description: "", quantity: 1, unit: "each", unit_price: 0 });
const normalizeTier = (t: string): TierKey => {
  const map: Record<string, TierKey> = { good: "budget", better: "midrange", best: "high_end" };
  return map[t] ?? (TIERS.includes(t as TierKey) ? (t as TierKey) : "midrange");
};
const btnClass = "rounded-lg border border-[var(--sep)] px-4 py-2 text-[13px] font-medium transition-colors hover:bg-[var(--bg)] disabled:opacity-50";

export function EstimateEditorModal({ open, onClose, estimate }: { open: boolean; onClose: () => void; estimate: Estimate | null }) {
  const { data: clients } = useClients();
  const { data: existingLines } = useLineItems(estimate?.id ?? null);

  const [projectType, setProjectType] = useState("General");
  const [clientId, setClientId] = useState<string | null>(null);
  const [tier, setTier] = useState<TierKey>("midrange");
  const [projectAddress, setProjectAddress] = useState("");
  const [validThrough, setValidThrough] = useState("");
  const [siteConditions, setSiteConditions] = useState("");
  const [inclusionsText, setInclusionsText] = useState("");
  const [exclusionsText, setExclusionsText] = useState("");
  const [permitsFees, setPermitsFees] = useState(0);
  const [overheadPct, setOverheadPct] = useState(15);
  const [contingencyPct, setContingencyPct] = useState(5);
  const [taxPct, setTaxPct] = useState(8);
  const [lines, setLines] = useState<DraftLine[]>([]);
  const [activeTab, setActiveTab] = useState<TabKey>("material");
  const [saving, setSaving] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([]);
  const [validationOpen, setValidationOpen] = useState(false);
  const [validating, setValidating] = useState(false);

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

  const calcs = useMemo(() => {
    const materialsSubtotal = lines.filter((l) => l.category === "material").reduce((s, l) => s + l.quantity * l.unit_price, 0);
    const laborSubtotal = lines.filter((l) => l.category === "labor").reduce((s, l) => s + l.quantity * l.unit_price, 0);
    const subcontractorTotal = lines.filter((l) => l.category === "subcontractor").reduce((s, l) => s + l.quantity * l.unit_price, 0);
    const base = materialsSubtotal + laborSubtotal + subcontractorTotal;
    const overheadDollar = base * (overheadPct / 100);
    const contingencyDollar = base * (contingencyPct / 100);
    const taxDollar = base * (taxPct / 100);
    const grandTotal = base + permitsFees + overheadDollar + contingencyDollar + taxDollar;
    const grossMarginPct = grandTotal > 0 ? ((grandTotal - base) / grandTotal) * 100 : 0;
    return { materialsSubtotal, laborSubtotal, subcontractorTotal, base, overheadDollar, contingencyDollar, taxDollar, grandTotal, grossMarginPct };
  }, [lines, permitsFees, overheadPct, contingencyPct, taxPct]);

  const updateLine = useCallback((key: string, field: keyof DraftLine, value: string | number) => {
    setLines((prev) => prev.map((l) => (l._key === key ? { ...l, [field]: value } : l)));
  }, []);

  const addLine = useCallback(() => {
    setLines((prev) => [...prev, emptyLine(activeTab)]);
  }, [activeTab]);

  const removeLine = useCallback((key: string) => {
    setLines((prev) => prev.filter((l) => l._key !== key));
  }, []);

  const parseScopes = () => ({
    inclusions: inclusionsText.split("\n").map((s) => s.trim()).filter(Boolean),
    exclusions: exclusionsText.split("\n").map((s) => s.trim()).filter(Boolean),
  });

  const headerFields = () => ({
    project_type: projectType, client_id: clientId || null, tier,
    project_address: projectAddress || null, valid_through: validThrough || null,
    site_conditions: siteConditions || null,
  });

  const financialFields = () => ({
    materials_subtotal: calcs.materialsSubtotal, labor_subtotal: calcs.laborSubtotal,
    subcontractor_total: calcs.subcontractorTotal, permits_fees: permitsFees,
    overhead_profit: calcs.overheadDollar, contingency: calcs.contingencyDollar,
    tax: calcs.taxDollar, grand_total: calcs.grandTotal, gross_margin_pct: calcs.grossMarginPct,
  });

  const buildLineItems = () => lines.filter((l) => l.description.trim() !== "").map((l, i) => ({
    id: l.id ?? "", estimate_id: estimate!.id, line_number: i + 1, category: l.category,
    description: l.description, quantity: l.quantity, unit: l.unit, unit_price: l.unit_price,
    extended_price: l.quantity * l.unit_price, notes: null, product_id: null, price_source: null,
    price_date: null, created_at: new Date().toISOString(),
  }));

  const buildEstimateSnapshot = useCallback(() => {
    const { inclusions, exclusions } = parseScopes();
    const snapshot: Estimate = { ...estimate!, ...headerFields(), ...financialFields(), scope_inclusions: inclusions, scope_exclusions: exclusions };
    return { estimate: snapshot, lineItems: buildLineItems() };
  }, [estimate, projectType, clientId, tier, projectAddress, validThrough, siteConditions, inclusionsText, exclusionsText, permitsFees, calcs, lines]);

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

  const handleDownloadPDF = useCallback(async () => {
    if (!estimate || generatingPdf) return;
    setGeneratingPdf(true);
    try {
      const { estimate: snap, lineItems } = buildEstimateSnapshot();
      let client = null;
      if (snap.client_id && supabase) {
        const { data: clientData } = await supabase.from("clients").select("*").eq("id", snap.client_id).single();
        client = clientData;
      }
      await generateEstimatePDF(snap, lineItems, client);
    } finally {
      setGeneratingPdf(false);
    }
  }, [estimate, generatingPdf, buildEstimateSnapshot]);

  const handleSave = useCallback(async (sendAfter: boolean) => {
    if (!supabase || !estimate) return;
    setSaving(true);
    try {
      const { inclusions, exclusions } = parseScopes();
      const { estimate: snap, lineItems: snapLines } = buildEstimateSnapshot();

      let results: ValidationResult[] = validationResults;
      try { results = await runValidation({ estimate: snap, lineItems: snapLines }); setValidationResults(results); } catch { /* proceed */ }

      const updatePayload: Record<string, unknown> = {
        ...headerFields(), ...financialFields(),
        scope_inclusions: inclusions, scope_exclusions: exclusions,
        validation_results: results, validation_passed: results.length > 0 && results.every((r) => r.status === "PASS"),
        updated_at: new Date().toISOString(),
        ...(sendAfter ? { status: "sent", sent_at: new Date().toISOString() } : {}),
      };

      const { error: updateError } = await supabase.from("estimates").update(updatePayload).eq("id", estimate.id);
      if (updateError) throw updateError;
      const { error: deleteError } = await supabase.from("estimate_line_items").delete().eq("estimate_id", estimate.id);
      if (deleteError) throw deleteError;

      const toInsert = lines.filter((l) => l.description.trim() !== "").map((l, i) => ({
        estimate_id: estimate.id, line_number: i + 1, category: l.category,
        description: l.description, quantity: l.quantity, unit: l.unit,
        unit_price: l.unit_price, extended_price: l.quantity * l.unit_price,
      }));
      if (toInsert.length > 0) {
        const { error: insertError } = await supabase.from("estimate_line_items").insert(toInsert);
        if (insertError) throw insertError;
      }
      toast.success("Estimate saved");
      onClose();
    } catch (err) { console.error("Failed to save estimate:", err); toast.error("Failed to save estimate"); }
    finally { setSaving(false); }
  }, [estimate, projectType, clientId, tier, projectAddress, validThrough, siteConditions, inclusionsText, exclusionsText, permitsFees, calcs, lines, onClose, buildEstimateSnapshot, validationResults]);

  const lineCount = lines.filter((l) => l.description.trim() !== "").length;
  const marginColor = calcs.grossMarginPct >= 35 ? "text-[var(--green)]" : calcs.grossMarginPct >= 25 ? "text-[var(--orange)]" : "text-[var(--red)]";

  if (!estimate) return null;

  return (
    <Modal open={open} onClose={onClose} title={`Edit ${estimate.estimate_number}`} description={estimate.project_type} width="w-full max-w-[960px]">
      <div className="px-6 py-5 space-y-5">
        <EstimateHeaderSection
          projectType={projectType} setProjectType={setProjectType}
          clientId={clientId} setClientId={setClientId}
          tier={tier} setTier={setTier}
          projectAddress={projectAddress} setProjectAddress={setProjectAddress}
          validThrough={validThrough} setValidThrough={setValidThrough}
          clients={clients}
        />

        <EstimateLineItemsSection
          lines={lines} activeTab={activeTab} setActiveTab={setActiveTab}
          updateLine={updateLine} addLine={addLine} removeLine={removeLine}
        />

        <EstimateSummarySection
          siteConditions={siteConditions} setSiteConditions={setSiteConditions}
          inclusionsText={inclusionsText} setInclusionsText={setInclusionsText}
          exclusionsText={exclusionsText} setExclusionsText={setExclusionsText}
          permitsFees={permitsFees} setPermitsFees={setPermitsFees}
          overheadPct={overheadPct} setOverheadPct={setOverheadPct}
          contingencyPct={contingencyPct} setContingencyPct={setContingencyPct}
          taxPct={taxPct} setTaxPct={setTaxPct}
          calcs={calcs} marginColor={marginColor}
        />
      </div>

      <EstimateValidationPanel
        validationResults={validationResults}
        validationOpen={validationOpen}
        setValidationOpen={setValidationOpen}
      />

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-t border-[var(--sep)] px-6 py-3">
        <span className="text-[11px] text-[var(--tertiary)]">{lineCount} line item{lineCount !== 1 ? "s" : ""}</span>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={handleDownloadPDF} disabled={generatingPdf} className={btnClass}>{generatingPdf ? "Generating..." : "Download PDF"}</button>
          <button type="button" onClick={handleRunValidation} disabled={validating} className={btnClass}>{validating ? "Validating..." : "Run Validation"}</button>
          <button type="button" onClick={onClose} className={btnClass}>Cancel</button>
          <button type="button" disabled={saving} onClick={() => handleSave(false)} className={btnClass}>{saving ? "Saving..." : "Save Draft"}</button>
          <button type="button" disabled={saving} onClick={() => handleSave(true)} className="rounded-lg bg-[var(--accent)] px-4 py-2 text-[13px] font-medium text-white transition-all active:scale-[0.97] disabled:opacity-50">{saving ? "Sending..." : "Save & Send"}</button>
        </div>
      </div>
    </Modal>
  );
}
