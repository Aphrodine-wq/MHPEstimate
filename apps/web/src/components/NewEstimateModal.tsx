import { useState } from "react";
import toast from "react-hot-toast";
import * as Sentry from "@sentry/nextjs";
import { Modal, Field, inputClass, selectClass, textareaClass } from "./Modal";
import { supabase } from "../lib/supabase";
import { createEstimate, useClients } from "../lib/store";
import type { Estimate } from "@proestimate/shared/types";
import { ALL_PROJECT_TYPES, ESTIMATE_CATEGORIES, FOUNDATION_OPTIONS, type EstimateCategory, type FoundationType } from "./estimate-editor/types";

interface NewEstimateModalProps {
  open: boolean;
  onClose: () => void;
  onCreated?: (estimate: Estimate) => void;
}

export function NewEstimateModal({ open, onClose, onCreated }: NewEstimateModalProps) {
  const [projectType, setProjectType] = useState("General");
  const [address, setAddress] = useState("");
  const [clientId, setClientId] = useState("");
  const [tier, setTier] = useState("midrange");
  const [notes, setNotes] = useState("");
  const [validThrough, setValidThrough] = useState("");
  const [scopeInclusions, setScopeInclusions] = useState("");
  const [scopeExclusions, setScopeExclusions] = useState("");
  const [saving, setSaving] = useState(false);
  const { data: clients } = useClients();

  // New fields
  const [estimateCategory, setEstimateCategory] = useState<EstimateCategory>("building");
  const [foundationType, setFoundationType] = useState<FoundationType | null>("raised_slab");
  const [foundationBlockHeight, setFoundationBlockHeight] = useState(3);
  const [squareFootage, setSquareFootage] = useState("");

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const est = await createEstimate();
      if (est && supabase) {
        const { error } = await supabase.from("estimates").update({
          project_type: projectType,
          project_address: address || null,
          client_id: clientId || null,
          tier,
          site_conditions: notes || null,
          valid_through: validThrough || null,
          scope_inclusions: scopeInclusions ? scopeInclusions.split("\n").filter(Boolean) : [],
          scope_exclusions: scopeExclusions ? scopeExclusions.split("\n").filter(Boolean) : [],
          estimate_category: estimateCategory,
          foundation_type: estimateCategory === "building" ? foundationType : null,
          foundation_block_height: foundationType === "raised_slab" ? foundationBlockHeight : null,
          square_footage: squareFootage ? parseFloat(squareFootage) : null,
        }).eq("id", est.id);
        if (error) { Sentry.captureException(error); toast.error("Failed to save estimate details"); }
      }
      setSaving(false);
      resetAndClose();
      if (est) onCreated?.(est);
    } catch (err) {
      Sentry.captureException(err);
      toast.error("Failed to create estimate");
      setSaving(false);
    }
  };

  const resetAndClose = () => {
    setProjectType("General");
    setAddress("");
    setClientId("");
    setTier("midrange");
    setNotes("");
    setValidThrough("");
    setScopeInclusions("");
    setScopeExclusions("");
    setEstimateCategory("building");
    setFoundationType("raised_slab");
    setFoundationBlockHeight(3);
    setSquareFootage("");
    onClose();
  };

  return (
    <Modal open={open} onClose={resetAndClose} title="New Estimate" description="Create a new construction estimate">
      <div className="space-y-4 px-6 py-5">
        {/* Estimate Category Toggle */}
        <Field label="Estimate Type">
          <div className="flex rounded-lg bg-[var(--gray5)] p-0.5">
            {ESTIMATE_CATEGORIES.map((cat) => (
              <button
                key={cat.key}
                type="button"
                onClick={() => {
                  setEstimateCategory(cat.key);
                  if (cat.key === "infrastructure") {
                    setProjectType("Infrastructure (Site/Utility)");
                  } else if (projectType === "Infrastructure (Site/Utility)") {
                    setProjectType("General");
                  }
                }}
                className={`flex-1 rounded-md py-1.5 text-[12px] font-medium transition-all ${
                  estimateCategory === cat.key
                    ? "bg-[var(--card)] text-[var(--label)] shadow-sm"
                    : "text-[var(--secondary)]"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-[11px] text-[var(--secondary)]">
            {estimateCategory === "infrastructure"
              ? "Land setup, utilities, well, septic — billed as separate contract to keep building $/sqft accurate"
              : "Structure, finishes, and MEP — the main building contract"
            }
          </p>
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Project Type">
            <select value={projectType} onChange={(e) => setProjectType(e.target.value)} className={selectClass}>
              {ALL_PROJECT_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </Field>
          <Field label="Client">
            <select value={clientId} onChange={(e) => setClientId(e.target.value)} className={selectClass}>
              <option value="">— No client —</option>
              {clients?.map((c) => (
                <option key={c.id} value={c.id}>{c.full_name}</option>
              ))}
            </select>
          </Field>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Field label="Project Address">
            <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="123 Main St, City, State" className={inputClass} />
          </Field>
          <Field label="Valid Through">
            <input type="date" value={validThrough} onChange={(e) => setValidThrough(e.target.value)} className={inputClass} />
          </Field>
          <Field label="Square Footage">
            <input
              type="number"
              min="0"
              value={squareFootage}
              onChange={(e) => setSquareFootage(e.target.value)}
              placeholder="e.g. 2200"
              className={inputClass}
            />
            {estimateCategory === "building" && (
              <p className="mt-1 text-[10px] text-[var(--tertiary)]">Target: $185–$205/sqft</p>
            )}
          </Field>
        </div>

        {/* Foundation Type (building only) */}
        {estimateCategory === "building" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Foundation Type">
              <select
                value={foundationType ?? ""}
                onChange={(e) => setFoundationType(e.target.value as FoundationType || null)}
                className={selectClass}
              >
                <option value="">Select foundation...</option>
                {FOUNDATION_OPTIONS.map((f) => (
                  <option key={f.key} value={f.key}>{f.label}</option>
                ))}
              </select>
              {foundationType && (
                <p className="mt-1 text-[10px] text-[var(--tertiary)]">
                  {FOUNDATION_OPTIONS.find((f) => f.key === foundationType)?.desc}
                </p>
              )}
            </Field>
            {foundationType === "raised_slab" && (
              <Field label="Block Height (courses)">
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="2"
                    max="6"
                    step="1"
                    value={foundationBlockHeight}
                    onChange={(e) => setFoundationBlockHeight(parseInt(e.target.value) || 3)}
                    className={inputClass}
                  />
                  <span className="text-[11px] text-[var(--tertiary)] whitespace-nowrap">
                    blocks ({foundationBlockHeight * 8}″ stem wall)
                  </span>
                </div>
              </Field>
            )}
          </div>
        )}

        <Field label="Pricing Tier">
          <div className="flex rounded-lg bg-[var(--gray5)] p-0.5">
            {([["budget", "Budget"], ["midrange", "Midrange"], ["high_end", "High End"]] as const).map(([val, label]) => (
              <button key={val} onClick={() => setTier(val)} className={`flex-1 rounded-md py-1.5 text-[12px] font-medium transition-all ${tier === val ? "bg-[var(--card)] text-[var(--label)] shadow-sm" : "text-[var(--secondary)]"}`}>
                {label}
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-[11px] text-[var(--secondary)]">
            {tier === "budget" && "Economy-grade materials, basic finishes, cost-effective labor. Best for rental properties, quick flips, or tight budgets."}
            {tier === "midrange" && "Quality brand-name materials, standard upgrades, professional finishes. The most popular choice for homeowner renovations."}
            {tier === "high_end" && "Premium and designer-grade materials, custom craftsmanship, luxury finishes. For high-end homes and clients who want the best."}
          </p>
        </Field>
        <Field label="Scope Inclusions">
          <textarea value={scopeInclusions} onChange={(e) => setScopeInclusions(e.target.value)} placeholder="One per line: Material supply and installation..." rows={2} className={textareaClass} />
        </Field>
        <Field label="Scope Exclusions">
          <textarea value={scopeExclusions} onChange={(e) => setScopeExclusions(e.target.value)} placeholder="One per line: Structural modifications..." rows={2} className={textareaClass} />
        </Field>
        <Field label="Site Conditions / Notes">
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any special conditions..." rows={2} className={textareaClass} />
        </Field>
      </div>
      <div className="flex justify-end gap-2 border-t border-[var(--sep)] px-6 py-3">
        <button onClick={resetAndClose} className="rounded-lg border border-[var(--sep)] px-4 py-2 text-[13px] font-medium transition-colors hover:bg-[var(--bg)]">Cancel</button>
        <button onClick={handleSubmit} disabled={saving} className="rounded-lg bg-[var(--accent)] px-4 py-2 text-[13px] font-medium text-white transition-all active:scale-[0.97] disabled:opacity-50">
          {saving ? "Creating..." : "Create Estimate"}
        </button>
      </div>
    </Modal>
  );
}
