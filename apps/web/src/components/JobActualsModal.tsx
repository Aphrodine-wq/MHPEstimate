import { useState, useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import toast from "react-hot-toast";
import { Modal } from "./Modal";
import { supabase } from "../lib/supabase";
import { useJobActuals } from "../lib/store";
import type { Estimate, JobActual } from "@proestimate/shared/types";

interface JobActualsModalProps {
  open: boolean;
  onClose: () => void;
  estimate: Estimate;
}

function VariancePill({ variance }: { variance: number | null }) {
  if (variance === null) return <span className="text-[12px] text-[var(--secondary)]">—</span>;
  const isOver = variance > 0;
  const isUnder = variance < 0;
  const color = isUnder
    ? "text-[#22c55e]"
    : isOver
    ? "text-[#ef4444]"
    : "text-[var(--secondary)]";
  const prefix = isOver ? "+" : "";
  return (
    <span className={`text-[12px] font-semibold ${color}`}>
      {prefix}${Math.abs(variance).toLocaleString()}
      {isOver ? " over" : isUnder ? " under" : " on target"}
    </span>
  );
}

function ActualRow({
  label,
  estimated,
  value,
  onChange,
}: {
  label: string;
  estimated: number;
  value: string;
  onChange: (v: string) => void;
}) {
  const actual = parseFloat(value) || 0;
  const variance = value !== "" ? actual - estimated : null;

  return (
    <div className="grid grid-cols-[1fr_1fr_1fr_1fr] gap-3 items-center py-2.5 border-b border-[var(--sep)] last:border-b-0">
      <p className="text-[13px] font-medium">{label}</p>
      <p className="text-[13px] text-[var(--secondary)]">${estimated.toLocaleString()}</p>
      <div className="relative">
        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[12px] text-[var(--secondary)]">$</span>
        <input
          type="number"
          step="0.01"
          min="0"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="0.00"
          className="w-full rounded-md border border-[var(--sep)] bg-[var(--bg)] py-1.5 pl-6 pr-2 text-[12px] outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/20"
        />
      </div>
      <VariancePill variance={variance} />
    </div>
  );
}

export function JobActualsModal({ open, onClose, estimate }: JobActualsModalProps) {
  const { actuals, loading } = useJobActuals(estimate.id);

  const [materials, setMaterials] = useState("");
  const [labor, setLabor] = useState("");
  const [subs, setSubs] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  // Populate form when existing actuals load
  useEffect(() => {
    if (actuals) {
      setMaterials(actuals.actual_materials != null ? String(actuals.actual_materials) : "");
      setLabor(actuals.actual_labor != null ? String(actuals.actual_labor) : "");
      setSubs(actuals.actual_subs != null ? String(actuals.actual_subs) : "");
      setNotes(actuals.notes ?? "");
    }
  }, [actuals]);

  // Reset when modal closes
  useEffect(() => {
    if (!open) {
      setMaterials("");
      setLabor("");
      setSubs("");
      setNotes("");
    }
  }, [open]);

  const actualMaterials = parseFloat(materials) || 0;
  const actualLabor = parseFloat(labor) || 0;
  const actualSubs = parseFloat(subs) || 0;
  const actualTotal = actualMaterials + actualLabor + actualSubs;

  const estimatedCost = estimate.materials_subtotal + estimate.labor_subtotal + estimate.subcontractor_total;
  const totalVariance = materials !== "" || labor !== "" || subs !== ""
    ? actualTotal - estimatedCost
    : null;

  const actualMarginPct = actualTotal > 0 && estimate.grand_total > 0
    ? ((estimate.grand_total - actualTotal) / estimate.grand_total) * 100
    : null;

  const handleSave = async () => {
    if (!supabase) return;
    setSaving(true);

    const payload = {
      estimate_id: estimate.id,
      actual_materials: actualMaterials || null,
      actual_labor: actualLabor || null,
      actual_subs: actualSubs || null,
      actual_total: actualTotal || null,
      actual_margin_pct: actualMarginPct,
      variance_materials: materials !== "" ? actualMaterials - estimate.materials_subtotal : null,
      variance_labor: labor !== "" ? actualLabor - estimate.labor_subtotal : null,
      variance_total: totalVariance,
      notes: notes || null,
    };

    try {
      let error;
      if (actuals?.id) {
        // Update existing
        ({ error } = await supabase
          .from("job_actuals")
          .update(payload)
          .eq("id", actuals.id));
      } else {
        // Insert new
        ({ error } = await supabase.from("job_actuals").insert(payload));
      }

      if (error) {
        Sentry.captureException(error);
        toast.error("Failed to save actuals");
      } else {
        toast.success("Job actuals saved");
        onClose();
      }
    } catch (err) {
      Sentry.captureException(err);
      toast.error("Failed to save actuals");
    }

    setSaving(false);
  };

  return (
    <Modal open={open} onClose={onClose} title="Job Actuals" description={`Track real costs for ${estimate.estimate_number}`}>
      <div className="px-6 py-5">
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-[var(--sep)] border-t-[var(--accent)]" />
          </div>
        ) : (
          <>
            {/* Column headers */}
            <div className="grid grid-cols-[1fr_1fr_1fr_1fr] gap-3 mb-1 pb-2 border-b border-[var(--sep)]">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--secondary)]">Category</p>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--secondary)]">Estimated</p>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--secondary)]">Actual</p>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--secondary)]">Variance</p>
            </div>

            <ActualRow
              label="Materials"
              estimated={estimate.materials_subtotal}
              value={materials}
              onChange={setMaterials}
            />
            <ActualRow
              label="Labor"
              estimated={estimate.labor_subtotal}
              value={labor}
              onChange={setLabor}
            />
            <ActualRow
              label="Subs"
              estimated={estimate.subcontractor_total}
              value={subs}
              onChange={setSubs}
            />

            {/* Total row */}
            <div className="mt-3 rounded-lg bg-[var(--bg)] px-3 py-2.5">
              <div className="grid grid-cols-[1fr_1fr_1fr_1fr] gap-3 items-center">
                <p className="text-[13px] font-bold">Total</p>
                <p className="text-[13px] font-bold">${estimatedCost.toLocaleString()}</p>
                <p className="text-[13px] font-bold">
                  {(materials !== "" || labor !== "" || subs !== "")
                    ? `$${actualTotal.toLocaleString()}`
                    : "—"}
                </p>
                <VariancePill variance={totalVariance} />
              </div>
              {actualMarginPct !== null && (
                <p className="mt-1.5 text-[11px] text-[var(--secondary)]">
                  Actual margin: <span className={`font-semibold ${actualMarginPct >= 35 ? "text-[#22c55e]" : actualMarginPct >= 25 ? "text-[#f59e0b]" : "text-[#ef4444]"}`}>
                    {actualMarginPct.toFixed(1)}%
                  </span>
                  {estimate.gross_margin_pct != null && (
                    <> vs estimated {Number(estimate.gross_margin_pct).toFixed(1)}%</>
                  )}
                </p>
              )}
            </div>

            {/* Notes */}
            <div className="mt-4">
              <p className="mb-1.5 text-[12px] font-medium text-[var(--secondary)]">Notes</p>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any notes about actual costs, overruns, savings..."
                rows={3}
                className="w-full rounded-lg border border-[var(--sep)] bg-[var(--bg)] px-3 py-2 text-[12px] outline-none resize-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/20"
              />
            </div>

            {actuals && (
              <p className="mt-2 text-[11px] text-[var(--secondary)]">
                Last recorded: {new Date(actuals.created_at).toLocaleDateString()}
              </p>
            )}
          </>
        )}
      </div>

      <div className="flex justify-end gap-2 border-t border-[var(--sep)] px-6 py-3">
        <button
          onClick={onClose}
          className="rounded-lg border border-[var(--sep)] px-4 py-2 text-[13px] font-medium transition-colors hover:bg-[var(--bg)]"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving || loading}
          className="rounded-lg bg-[var(--accent)] px-4 py-2 text-[13px] font-medium text-white transition-all active:scale-[0.97] disabled:opacity-50"
        >
          {saving ? "Saving…" : actuals ? "Update Actuals" : "Save Actuals"}
        </button>
      </div>
    </Modal>
  );
}
