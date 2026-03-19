import { useState, useCallback, useRef, useEffect } from "react";
import toast from "react-hot-toast";
import * as Sentry from "@sentry/nextjs";
import { Modal, inputClass, selectClass } from "./Modal";
import { supabase } from "../lib/supabase";
import { createEstimate, useClients } from "../lib/store";
import type { Estimate } from "@proestimate/shared/types";
import { ALL_PROJECT_TYPES, UNIT_OPTIONS } from "./estimate-editor/types";

// ── Types ──

interface QuickLineItem {
  _key: string;
  description: string;
  quantity: number;
  unit: string;
  price: number;
}

interface QuickEstimateProps {
  open: boolean;
  onClose: () => void;
  onCreated?: (estimate: Estimate) => void;
  onExpandToFull?: (estimate: Estimate) => void;
}

// ── Helpers ──

let _keyCounter = 0;
function nextKey(): string {
  return `qe-${++_keyCounter}-${Date.now()}`;
}

function emptyRow(): QuickLineItem {
  return { _key: nextKey(), description: "", quantity: 1, unit: "each", price: 0 };
}

function fmtCurrency(n: number): string {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 });
}

// ── Component ──

export function QuickEstimate({ open, onClose, onCreated, onExpandToFull }: QuickEstimateProps) {
  // Section 1: Basics
  const [projectType, setProjectType] = useState("General");
  const [clientName, setClientName] = useState("");
  const [tier, setTier] = useState<"budget" | "midrange" | "high_end">("midrange");

  // Section 2: Line Items
  const [lines, setLines] = useState<QuickLineItem[]>([emptyRow()]);
  const [applyOverhead, setApplyOverhead] = useState(true);
  const [applyContingency, setApplyContingency] = useState(true);
  const [applyTax, setApplyTax] = useState(false);

  // State
  const [saving, setSaving] = useState(false);
  const lastDescRef = useRef<HTMLInputElement | null>(null);
  const { data: clients } = useClients();

  // ── Calculations ──

  const subtotal = lines.reduce((sum, l) => sum + l.quantity * l.price, 0);
  const overheadAmount = applyOverhead ? subtotal * 0.15 : 0;
  const contingencyAmount = applyContingency ? subtotal * 0.05 : 0;
  const taxableBase = subtotal + overheadAmount + contingencyAmount;
  const taxAmount = applyTax ? taxableBase * 0.08 : 0;
  const grandTotal = taxableBase + taxAmount;

  // ── Line item handlers ──

  const updateLine = useCallback((key: string, field: keyof QuickLineItem, value: string | number) => {
    setLines((prev) => {
      const updated = prev.map((l) =>
        l._key === key ? { ...l, [field]: value } : l
      );
      // Auto-add row when typing description in the last row
      const last = updated[updated.length - 1];
      if (last && field === "description" && value && last._key === key) {
        updated.push(emptyRow());
      }
      return updated;
    });
  }, []);

  const removeLine = useCallback((key: string) => {
    setLines((prev) => {
      const filtered = prev.filter((l) => l._key !== key);
      return filtered.length === 0 ? [emptyRow()] : filtered;
    });
  }, []);

  const addRow = useCallback(() => {
    setLines((prev) => [...prev, emptyRow()]);
    // Focus the new row's description after render
    requestAnimationFrame(() => {
      lastDescRef.current?.focus();
    });
  }, []);

  // ── Reset ──

  const reset = useCallback(() => {
    setProjectType("General");
    setClientName("");
    setTier("midrange");
    setLines([emptyRow()]);
    setApplyOverhead(true);
    setApplyContingency(true);
    setApplyTax(false);
    setSaving(false);
  }, []);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

  // ── DB tier mapping (UI uses budget/midrange/high_end, DB uses good/better/best) ──

  function tierToDb(t: string): string {
    if (t === "budget") return "good";
    if (t === "midrange") return "better";
    if (t === "high_end") return "best";
    return "better";
  }

  // ── Save ──

  const handleSave = useCallback(async (mode: "draft" | "send" | "expand") => {
    const validLines = lines.filter((l) => l.description.trim());
    if (validLines.length === 0) {
      toast.error("Add at least one line item");
      return;
    }

    setSaving(true);
    try {
      // 1. Create the estimate
      const est = await createEstimate();
      if (!est || !supabase) {
        setSaving(false);
        return;
      }

      // 2. Update estimate fields
      const { error: updateError } = await supabase.from("estimates").update({
        project_type: projectType,
        tier: tierToDb(tier),
        overhead_profit: overheadAmount,
        contingency: contingencyAmount,
        tax: taxAmount,
        grand_total: grandTotal,
        retail_total: subtotal,
        actual_total: subtotal,
      }).eq("id", est.id);

      if (updateError) {
        Sentry.captureException(updateError);
        toast.error("Failed to save estimate details");
      }

      // 3. Find or skip client lookup (Quick Estimate uses name, not client_id)
      if (clientName.trim()) {
        // Check if there's a matching client
        const match = clients?.find(
          (c) => c.full_name.toLowerCase() === clientName.trim().toLowerCase()
        );
        if (match) {
          await supabase.from("estimates").update({ client_id: match.id }).eq("id", est.id);
        }
        // If no match, client can be linked later via "Expand to Full Estimate"
      }

      // 4. Insert line items
      const lineItemsPayload = validLines.map((l, i) => ({
        estimate_id: est.id,
        line_number: i + 1,
        category: "material",
        description: l.description,
        quantity: l.quantity,
        unit: l.unit,
        unit_price: l.price,
        extended_price: l.quantity * l.price,
        retail_price: l.quantity * l.price,
        material_cost: l.quantity * l.price,
        labor_cost: 0,
      }));

      const { error: lineError } = await supabase
        .from("estimate_line_items")
        .insert(lineItemsPayload);

      if (lineError) {
        Sentry.captureException(lineError);
        toast.error("Failed to save line items");
      }

      // 5. Re-fetch the full estimate for callbacks
      const { data: fullEst } = await supabase
        .from("estimates")
        .select("*")
        .eq("id", est.id)
        .single();

      const finalEstimate = (fullEst as Estimate) ?? est;

      setSaving(false);
      reset();
      onClose();

      if (mode === "expand") {
        onExpandToFull?.(finalEstimate);
      } else {
        onCreated?.(finalEstimate);
      }

      if (mode === "send") {
        toast.success("Estimate saved — opening send dialog...");
      }
    } catch (err) {
      Sentry.captureException(err);
      toast.error("Failed to create estimate");
      setSaving(false);
    }
  }, [lines, projectType, tier, clientName, clients, overheadAmount, contingencyAmount, taxAmount, grandTotal, subtotal, reset, onClose, onCreated, onExpandToFull]);

  // ── Keyboard shortcut: Cmd+Enter to save ──

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        handleSave("draft");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, handleSave]);

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Quick Estimate"
      description="Get a price in 60 seconds"
      width="w-full max-w-[820px]"
    >
      <div className="px-6 py-4 space-y-4">
        {/* ── Section 1: Basics ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="mb-1 block text-[12px] font-medium text-[var(--secondary)]">Project Type</label>
            <select value={projectType} onChange={(e) => setProjectType(e.target.value)} className={selectClass}>
              {ALL_PROJECT_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[12px] font-medium text-[var(--secondary)]">Client</label>
            <input
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="Optional"
              className={inputClass}
              list="quick-estimate-clients"
            />
            <datalist id="quick-estimate-clients">
              {clients?.map((c) => (
                <option key={c.id} value={c.full_name} />
              ))}
            </datalist>
          </div>
          <div>
            <label className="mb-1 block text-[12px] font-medium text-[var(--secondary)]">Pricing Tier</label>
            <div className="flex rounded-lg bg-[var(--gray5)] p-0.5">
              {([["budget", "Budget"], ["midrange", "Midrange"], ["high_end", "High End"]] as const).map(([val, label]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setTier(val)}
                  className={`flex-1 rounded-md py-2 text-[12px] font-medium transition-all ${
                    tier === val
                      ? "bg-[var(--card)] text-[var(--label)] shadow-sm"
                      : "text-[var(--secondary)]"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Section 2: Line Items Table ── */}
        <div>
          {/* Table header */}
          <div className="grid grid-cols-[1fr_70px_100px_100px_100px_32px] gap-1.5 mb-1.5 px-1">
            <span className="text-[11px] font-medium text-[var(--secondary)]">Description</span>
            <span className="text-[11px] font-medium text-[var(--secondary)]">Qty</span>
            <span className="text-[11px] font-medium text-[var(--secondary)]">Unit</span>
            <span className="text-[11px] font-medium text-[var(--secondary)]">Price</span>
            <span className="text-[11px] font-medium text-[var(--secondary)] text-right">Total</span>
            <span />
          </div>

          {/* Rows */}
          <div className="space-y-1 max-h-[320px] overflow-y-auto">
            {lines.map((line, idx) => {
              const lineTotal = line.quantity * line.price;
              const isLast = idx === lines.length - 1;
              return (
                <div key={line._key} className="grid grid-cols-[1fr_70px_100px_100px_100px_32px] gap-1.5 items-center">
                  <input
                    ref={isLast ? lastDescRef : undefined}
                    value={line.description}
                    onChange={(e) => updateLine(line._key, "description", e.target.value)}
                    placeholder={idx === 0 ? "e.g. Framing lumber" : ""}
                    className="rounded-lg border border-[var(--sep)] bg-[var(--bg)] px-2.5 py-2 text-[13px] outline-none placeholder:text-[var(--gray3)] focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/10 transition-all"
                  />
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={line.quantity || ""}
                    onChange={(e) => updateLine(line._key, "quantity", parseFloat(e.target.value) || 0)}
                    className="rounded-lg border border-[var(--sep)] bg-[var(--bg)] px-2 py-2 text-[13px] text-center outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/10 transition-all"
                  />
                  <select
                    value={line.unit}
                    onChange={(e) => updateLine(line._key, "unit", e.target.value)}
                    className="rounded-lg border border-[var(--sep)] bg-[var(--bg)] px-1.5 py-2 text-[12px] outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/10 transition-all appearance-none cursor-pointer"
                  >
                    {UNIT_OPTIONS.map((u) => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                  <div className="relative">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[12px] text-[var(--gray3)]">$</span>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={line.price || ""}
                      onChange={(e) => updateLine(line._key, "price", parseFloat(e.target.value) || 0)}
                      className="w-full rounded-lg border border-[var(--sep)] bg-[var(--bg)] pl-5 pr-2 py-2 text-[13px] outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/10 transition-all"
                    />
                  </div>
                  <p className="text-[13px] font-medium text-right tabular-nums pr-1">
                    {lineTotal > 0 ? fmtCurrency(lineTotal) : "--"}
                  </p>
                  <button
                    type="button"
                    onClick={() => removeLine(line._key)}
                    className="flex items-center justify-center rounded-md p-1 text-[var(--gray3)] transition-colors hover:bg-[var(--bg)] hover:text-[var(--red)]"
                    aria-label="Remove line"
                  >
                    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <path d="M18 6 6 18M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              );
            })}
          </div>

          {/* Add Row */}
          <button
            type="button"
            onClick={addRow}
            className="mt-2 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-medium text-[var(--accent)] transition-colors hover:bg-[var(--accent)]/5"
          >
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Add Row
          </button>
        </div>

        {/* ── Totals ── */}
        <div className="rounded-xl border border-[var(--sep)] bg-[var(--bg)] p-4 space-y-2">
          {/* Subtotal */}
          <div className="flex items-center justify-between">
            <span className="text-[13px] text-[var(--secondary)]">Subtotal</span>
            <span className="text-[13px] font-medium tabular-nums">{fmtCurrency(subtotal)}</span>
          </div>

          {/* Overhead */}
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={applyOverhead}
                onChange={(e) => setApplyOverhead(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-[var(--sep)] accent-[var(--accent)]"
              />
              <span className="text-[13px] text-[var(--secondary)]">Overhead & Profit (15%)</span>
            </label>
            <span className="text-[13px] tabular-nums">{applyOverhead ? fmtCurrency(overheadAmount) : "--"}</span>
          </div>

          {/* Contingency */}
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={applyContingency}
                onChange={(e) => setApplyContingency(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-[var(--sep)] accent-[var(--accent)]"
              />
              <span className="text-[13px] text-[var(--secondary)]">Contingency (5%)</span>
            </label>
            <span className="text-[13px] tabular-nums">{applyContingency ? fmtCurrency(contingencyAmount) : "--"}</span>
          </div>

          {/* Tax */}
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={applyTax}
                onChange={(e) => setApplyTax(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-[var(--sep)] accent-[var(--accent)]"
              />
              <span className="text-[13px] text-[var(--secondary)]">Tax (8%)</span>
            </label>
            <span className="text-[13px] tabular-nums">{applyTax ? fmtCurrency(taxAmount) : "--"}</span>
          </div>

          {/* Grand Total */}
          <div className="flex items-center justify-between border-t border-[var(--sep)] pt-2 mt-2">
            <span className="text-[15px] font-bold">Grand Total</span>
            <span className="text-[22px] font-bold tracking-tight tabular-nums">{fmtCurrency(grandTotal)}</span>
          </div>
        </div>
      </div>

      {/* ── Section 3: Actions ── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 border-t border-[var(--sep)] px-6 py-3">
        <button
          type="button"
          onClick={() => handleSave("expand")}
          disabled={saving}
          className="rounded-lg border border-[var(--sep)] px-4 py-2 text-[13px] font-medium transition-colors hover:bg-[var(--bg)] disabled:opacity-50"
        >
          Expand to Full Estimate
        </button>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg border border-[var(--sep)] px-4 py-2 text-[13px] font-medium transition-colors hover:bg-[var(--bg)]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => handleSave("send")}
            disabled={saving}
            className="rounded-lg border border-[var(--accent)] px-4 py-2 text-[13px] font-medium text-[var(--accent)] transition-all hover:bg-[var(--accent)]/5 active:scale-[0.97] disabled:opacity-50"
          >
            Save & Send
          </button>
          <button
            type="button"
            onClick={() => handleSave("draft")}
            disabled={saving}
            className="rounded-lg bg-[var(--accent)] px-4 py-2 text-[13px] font-medium text-white transition-all active:scale-[0.97] disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save as Draft"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
