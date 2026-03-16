import { useState, useEffect, useMemo, useCallback } from "react";
import toast from "react-hot-toast";
import { Modal } from "./Modal";
import { supabase } from "../lib/supabase";
import { useLineItems, useClients, useCurrentUser, useCompanySettings, useChangeOrders } from "../lib/store";
import { generateEstimatePDF, generateEstimatePDFBase64 } from "./EstimatePDF";
import type { Estimate, EstimateChangeOrder } from "@proestimate/shared/types";

import { EstimateHeaderSection } from "./estimate-editor/EstimateHeaderSection";
import { EstimateLineItemsSection } from "./estimate-editor/EstimateLineItemsSection";
import { EstimateSummarySection } from "./estimate-editor/EstimateSummarySection";
import { EstimateValidationPanel } from "./estimate-editor/EstimateValidationPanel";
import { useEstimateValidation } from "./estimate-editor/EstimateValidation";
import { StatusBanner } from "./estimate-editor/StatusBanner";
import { EditorFooter } from "./estimate-editor/EditorFooter";
import { TIERS, type DraftLine, type TabKey, type TierKey, type EstimateCategory, type FoundationType, type ValidationResult } from "./estimate-editor/types";
import { PhotoCapture, type CapturedPhoto } from "./PhotoCapture";
import { DigitalSignature } from "./DigitalSignature";
import { ChangeOrders } from "./ChangeOrders";

let keyCounter = 0;
const nextKey = () => `draft-${++keyCounter}-${Date.now()}`;
const emptyLine = (category: string): DraftLine => ({
  _key: nextKey(),
  category,
  description: "",
  quantity: 1,
  unit: "each",
  unit_price: 0,
  material_cost: 0,
  labor_cost: 0,
  retail_price: 0,
});
const normalizeTier = (t: string): TierKey => {
  const map: Record<string, TierKey> = { good: "budget", better: "midrange", best: "high_end" };
  return map[t] ?? (TIERS.includes(t as TierKey) ? (t as TierKey) : "midrange");
};

export function EstimateEditorModal({ open, onClose, estimate }: { open: boolean; onClose: () => void; estimate: Estimate | null }) {
  const { data: clients } = useClients();
  const { data: existingLines } = useLineItems(estimate?.id ?? null);
  const { user } = useCurrentUser();
  const { data: companySettings } = useCompanySettings();
  const { changeOrders } = useChangeOrders(estimate?.id ?? "");

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
  const [sending, setSending] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [approving, setApproving] = useState(false);
  const [sitePhotos, setSitePhotos] = useState<CapturedPhoto[]>([]);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);

  // New fields
  const [estimateCategory, setEstimateCategory] = useState<EstimateCategory>("building");
  const [foundationType, setFoundationType] = useState<FoundationType | null>(null);
  const [foundationBlockHeight, setFoundationBlockHeight] = useState<number | null>(3);
  const [squareFootage, setSquareFootage] = useState<number | null>(null);

  const isAdmin = user?.role === "admin" || user?.role === "owner";
  const status = estimate?.status ?? "draft";

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
    setEstimateCategory((estimate as any).estimate_category ?? "building");
    setFoundationType((estimate as any).foundation_type ?? null);
    setFoundationBlockHeight((estimate as any).foundation_block_height ?? 3);
    setSquareFootage((estimate as any).square_footage ?? null);

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
          material_cost: Number((li as any).material_cost) || 0,
          labor_cost: Number((li as any).labor_cost) || 0,
          retail_price: Number((li as any).retail_price) || Number(li.unit_price) || 0,
        }))
      );
    } else {
      setLines([]);
    }
  }, [open, estimate, existingLines]);

  const calcs = useMemo(() => {
    const materialsSubtotal = lines.filter((l) => l.category === "material").reduce((s, l) => s + l.quantity * l.retail_price, 0);
    const laborSubtotal = lines.filter((l) => l.category === "labor").reduce((s, l) => s + l.quantity * l.retail_price, 0);
    const subcontractorTotal = lines.filter((l) => l.category === "subcontractor").reduce((s, l) => s + l.quantity * l.retail_price, 0);

    const totalMaterialCost = lines.reduce((s, l) => s + l.quantity * l.material_cost, 0);
    const totalLaborCost = lines.reduce((s, l) => s + l.quantity * l.labor_cost, 0);
    const actualTotal = totalMaterialCost + totalLaborCost;

    const retailTotal = lines.reduce((s, l) => s + l.quantity * l.retail_price, 0);
    const base = materialsSubtotal + laborSubtotal + subcontractorTotal;
    const overheadDollar = base * (overheadPct / 100);
    const contingencyDollar = base * (contingencyPct / 100);
    const taxDollar = base * (taxPct / 100);
    const grandTotal = base + permitsFees + overheadDollar + contingencyDollar + taxDollar;
    const grossMarginPct = grandTotal > 0 ? ((grandTotal - actualTotal) / grandTotal) * 100 : 0;
    const costPerSqft = squareFootage && squareFootage > 0 ? grandTotal / squareFootage : null;

    return {
      materialsSubtotal, laborSubtotal, subcontractorTotal,
      base, retailTotal, actualTotal,
      overheadDollar, contingencyDollar, taxDollar,
      grandTotal, grossMarginPct, costPerSqft,
    };
  }, [lines, permitsFees, overheadPct, contingencyPct, taxPct, squareFootage]);

  const updateLine = useCallback((key: string, field: keyof DraftLine, value: string | number) => {
    setLines((prev) => prev.map((l) => (l._key === key ? { ...l, [field]: value } : l)));
  }, []);

  const addLine = useCallback(() => {
    setLines((prev) => [...prev, emptyLine(estimateCategory === "infrastructure" ? "material" : activeTab)]);
  }, [activeTab, estimateCategory]);

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
    estimate_category: estimateCategory,
    foundation_type: foundationType,
    foundation_block_height: foundationBlockHeight,
    square_footage: squareFootage,
  });

  const financialFields = () => ({
    materials_subtotal: calcs.materialsSubtotal, labor_subtotal: calcs.laborSubtotal,
    subcontractor_total: calcs.subcontractorTotal, permits_fees: permitsFees,
    overhead_profit: calcs.overheadDollar, contingency: calcs.contingencyDollar,
    tax: calcs.taxDollar, grand_total: calcs.grandTotal, gross_margin_pct: calcs.grossMarginPct,
    retail_total: calcs.retailTotal, actual_total: calcs.actualTotal,
    cost_per_sqft: calcs.costPerSqft,
  });

  const buildLineItems = () => lines.filter((l) => l.description.trim() !== "").map((l, i) => ({
    id: l.id ?? "", estimate_id: estimate!.id, line_number: i + 1, category: l.category,
    description: l.description, quantity: l.quantity, unit: l.unit, unit_price: l.retail_price,
    extended_price: l.quantity * l.retail_price,
    material_cost: l.material_cost, labor_cost: l.labor_cost, retail_price: l.retail_price,
    notes: null, product_id: null, price_source: null,
    price_date: null, created_at: new Date().toISOString(),
  }));

  const buildEstimateSnapshot = useCallback(() => {
    const { inclusions, exclusions } = parseScopes();
    const snapshot: Estimate = { ...estimate!, ...headerFields(), ...financialFields(), scope_inclusions: inclusions, scope_exclusions: exclusions };
    return { estimate: snapshot, lineItems: buildLineItems() };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estimate, projectType, clientId, tier, projectAddress, validThrough, siteConditions, inclusionsText, exclusionsText, permitsFees, calcs, lines, estimateCategory, foundationType, foundationBlockHeight, squareFootage]);

  // Validation hook
  const {
    validationResults,
    validationOpen,
    setValidationOpen,
    validating,
    handleRunValidation,
    runAndReturn,
  } = useEstimateValidation(estimate, buildEstimateSnapshot);

  /** Persists current edits to the database. Returns true on success. */
  const persistSave = useCallback(async (newStatus?: string): Promise<boolean> => {
    if (!supabase || !estimate) return false;
    const { inclusions, exclusions } = parseScopes();

    let results: ValidationResult[] = await runAndReturn();

    const updatePayload: Record<string, unknown> = {
      ...headerFields(), ...financialFields(),
      scope_inclusions: inclusions, scope_exclusions: exclusions,
      validation_results: results,
      validation_passed: results.length > 0 && results.every((r) => r.status === "PASS"),
      updated_at: new Date().toISOString(),
      ...(newStatus ? { status: newStatus } : {}),
    };

    const { error: updateError } = await supabase.from("estimates").update(updatePayload).eq("id", estimate.id);
    if (updateError) { console.error("Failed to save estimate:", updateError); return false; }

    const { error: deleteError } = await supabase.from("estimate_line_items").delete().eq("estimate_id", estimate.id);
    if (deleteError) { console.error("Failed to delete line items:", deleteError); return false; }

    const toInsert = lines.filter((l) => l.description.trim() !== "").map((l, i) => ({
      estimate_id: estimate.id, line_number: i + 1, category: l.category,
      description: l.description, quantity: l.quantity, unit: l.unit,
      unit_price: l.retail_price, extended_price: l.quantity * l.retail_price,
      material_cost: l.material_cost, labor_cost: l.labor_cost, retail_price: l.retail_price,
    }));
    if (toInsert.length > 0) {
      const { error: insertError } = await supabase.from("estimate_line_items").insert(toInsert);
      if (insertError) { console.error("Failed to insert line items:", insertError); return false; }
    }

    return true;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estimate, projectType, clientId, tier, projectAddress, validThrough, siteConditions, inclusionsText, exclusionsText, permitsFees, calcs, lines, buildEstimateSnapshot, runAndReturn, estimateCategory, foundationType, foundationBlockHeight, squareFootage]);

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
      const company = buildCompanyInfo(companySettings);
      const approvedCOs = changeOrders.filter((co: EstimateChangeOrder) => co.status === "approved");
      await generateEstimatePDF(snap, lineItems, client, company, approvedCOs);
    } finally {
      setGeneratingPdf(false);
    }
  }, [estimate, generatingPdf, buildEstimateSnapshot, companySettings, changeOrders]);

  const handleSaveDraft = useCallback(async () => {
    setSaving(true);
    try {
      const ok = await persistSave();
      if (ok) { toast.success("Estimate saved"); onClose(); }
      else { toast.error("Failed to save estimate"); }
    } finally {
      setSaving(false);
    }
  }, [persistSave, onClose]);

  const handleSubmitForReview = useCallback(async () => {
    if (!estimate || submitting) return;
    const lineCount = lines.filter((l) => l.description.trim() !== "").length;
    if (lineCount === 0) {
      toast.error("Add at least one line item before submitting for review");
      return;
    }
    setSubmitting(true);
    try {
      const ok = await persistSave("in_review");
      if (ok) {
        toast.success("Submitted for review \u2014 an admin must approve before sending");
        onClose();
      } else {
        toast.error("Failed to submit for review");
      }
    } finally {
      setSubmitting(false);
    }
  }, [estimate, submitting, lines, persistSave, onClose]);

  const handleRequestRevision = useCallback(async () => {
    if (!supabase || !estimate) return;
    const { error } = await supabase
      .from("estimates")
      .update({ status: "draft", updated_at: new Date().toISOString() })
      .eq("id", estimate.id);
    if (error) { toast.error("Failed to request revision"); return; }
    toast.success("Returned to draft for revision");
    onClose();
  }, [estimate, onClose]);

  const handleApprove = useCallback(async () => {
    if (!estimate || !isAdmin || approving) return;
    setApproving(true);
    try {
      const ok = await persistSave("approved");
      if (ok) {
        toast.success("Estimate approved \u2014 ready to send to client");
        onClose();
      } else {
        toast.error("Failed to approve estimate");
      }
    } finally {
      setApproving(false);
    }
  }, [estimate, isAdmin, approving, persistSave, onClose]);

  const handleSendToClient = useCallback(async () => {
    if (!estimate || !supabase || sending) return;

    const client = clients.find((c) => c.id === (clientId ?? estimate.client_id));
    if (!client) {
      toast.error("Assign a client to this estimate before sending");
      return;
    }
    if (!client.email) {
      toast.error(`${client.full_name} has no email address on file \u2014 add one in Clients first`);
      return;
    }

    setSending(true);
    try {
      const { estimate: snap, lineItems } = buildEstimateSnapshot();
      const company = buildCompanyInfo(companySettings);
      const pdfBase64 = await generateEstimatePDFBase64(snap, lineItems, client, company);

      const res = await fetch(`/api/estimates/${estimate.id}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pdfBase64,
          clientEmail: client.email,
          clientName: client.full_name,
          estimateNumber: estimate.estimate_number,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to send estimate");
      }

      toast.success(`Estimate sent to ${client.full_name} (${client.email})`);
      onClose();
    } catch (err) {
      console.error("Send failed:", err);
      toast.error(err instanceof Error ? err.message : "Failed to send estimate");
    } finally {
      setSending(false);
    }
  }, [estimate, supabase, sending, clients, clientId, buildEstimateSnapshot, companySettings, onClose]);

  const lineCount = lines.filter((l) => l.description.trim() !== "").length;
  const marginColor = calcs.grossMarginPct >= 35 ? "text-[var(--green)]" : calcs.grossMarginPct >= 25 ? "text-[var(--orange)]" : "text-[var(--red)]";

  if (!estimate) return null;

  const categoryLabel = estimateCategory === "infrastructure" ? "Infrastructure" : "Building";

  return (
    <Modal open={open} onClose={onClose} title={`Edit ${estimate.estimate_number}`} description={`${categoryLabel} \u00B7 ${estimate.project_type}`} width="w-full max-w-[1040px]">
      <StatusBanner status={status} />

      <div className="px-6 py-5 space-y-5">
        <EstimateHeaderSection
          projectType={projectType} setProjectType={setProjectType}
          clientId={clientId} setClientId={setClientId}
          tier={tier} setTier={setTier}
          projectAddress={projectAddress} setProjectAddress={setProjectAddress}
          validThrough={validThrough} setValidThrough={setValidThrough}
          clients={clients}
          estimateCategory={estimateCategory} setEstimateCategory={setEstimateCategory}
          foundationType={foundationType} setFoundationType={setFoundationType}
          foundationBlockHeight={foundationBlockHeight} setFoundationBlockHeight={setFoundationBlockHeight}
          squareFootage={squareFootage} setSquareFootage={setSquareFootage}
          costPerSqft={calcs.costPerSqft}
        />

        <EstimateLineItemsSection
          lines={lines} activeTab={activeTab} setActiveTab={setActiveTab}
          updateLine={updateLine} addLine={addLine} removeLine={removeLine}
          onAddLines={(newLines) => setLines((prev) => [...prev, ...newLines])}
          estimateCategory={estimateCategory}
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
          estimateCategory={estimateCategory}
        />

        {/* Change Orders -- shown for approved/sent/accepted estimates */}
        {["approved", "sent", "accepted"].includes(status) && (
          <ChangeOrders estimateId={estimate.id} estimateStatus={status} />
        )}

        {/* Site Photos */}
        <div>
          <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-[var(--secondary)]">Site Photos</p>
          <PhotoCapture onPhotosChange={setSitePhotos} maxPhotos={5} />
        </div>

        {/* Digital Signature -- show for sent/approved estimates awaiting client acceptance */}
        {["sent", "approved"].includes(status) && (
          <DigitalSignature
            onSign={(dataUrl) => {
              setSignatureDataUrl(dataUrl);
              toast.success("Signature captured");
            }}
            signerName={clients.find((c) => c.id === (clientId ?? estimate?.client_id))?.full_name ?? "Client"}
          />
        )}
      </div>

      <EstimateValidationPanel
        validationResults={validationResults}
        validationOpen={validationOpen}
        setValidationOpen={setValidationOpen}
      />

      <EditorFooter
        estimateId={estimate.id}
        estimateNumber={estimate.estimate_number}
        status={status}
        lineCount={lineCount}
        categoryLabel={categoryLabel}
        grandTotal={calcs.grandTotal}
        isAdmin={isAdmin}
        saving={saving}
        generatingPdf={generatingPdf}
        sending={sending}
        submitting={submitting}
        approving={approving}
        validating={validating}
        onSaveDraft={handleSaveDraft}
        onSubmitForReview={handleSubmitForReview}
        onRequestRevision={handleRequestRevision}
        onApprove={handleApprove}
        onSendToClient={handleSendToClient}
        onDownloadPDF={handleDownloadPDF}
        onRunValidation={handleRunValidation}
        onClose={onClose}
      />
    </Modal>
  );
}

function buildCompanyInfo(settings: Record<string, unknown>) {
  const info = (settings["company_info"] ?? {}) as Record<string, string>;
  return {
    name: info.name || "North MS Home Pros",
    address: info.address || "",
    city_state_zip: info.city_state_zip || "",
    email: info.email || "info@northmshomepros.com",
    phone: info.phone || "",
  };
}
