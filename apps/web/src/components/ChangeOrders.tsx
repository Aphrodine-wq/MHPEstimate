import { useState, useEffect, useCallback, useMemo } from "react";
import toast from "react-hot-toast";
import * as Sentry from "@sentry/nextjs";
import { supabase } from "../lib/supabase";
import type { EstimateChangeOrder } from "@proestimate/shared/types";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-50 text-yellow-700 border-yellow-200",
  approved: "bg-green-50 text-green-700 border-green-200",
  rejected: "bg-red-50 text-red-700 border-red-200",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
};

/** Statuses where adding a new change order makes sense */
const CAN_ADD_STATUSES = ["approved", "sent", "accepted"];

interface ChangeOrdersProps {
  estimateId: string;
  estimateStatus: string;
  onTotalChanged?: () => void;
}

export function ChangeOrders({ estimateId, estimateStatus, onTotalChanged }: ChangeOrdersProps) {
  const [changeOrders, setChangeOrders] = useState<EstimateChangeOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [description, setDescription] = useState("");
  const [costImpact, setCostImpact] = useState("");
  const [timelineImpact, setTimelineImpact] = useState("");

  const canAdd = CAN_ADD_STATUSES.includes(estimateStatus);

  const fetchChangeOrders = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("estimate_change_orders")
        .select("*")
        .eq("estimate_id", estimateId)
        .order("change_number", { ascending: true });
      if (error) throw error;
      setChangeOrders((data as EstimateChangeOrder[]) ?? []);
    } catch (err) {
      Sentry.captureException(err);
      toast.error("Failed to load change orders. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [estimateId]);

  useEffect(() => {
    fetchChangeOrders();
  }, [fetchChangeOrders]);

  const resetForm = () => {
    setDescription("");
    setCostImpact("");
    setTimelineImpact("");
    setShowForm(false);
    setEditingId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || !description.trim() || costImpact === "") return;

    const parsedCost = parseFloat(costImpact);
    if (isNaN(parsedCost)) {
      toast.error("Cost impact must be a valid number");
      return;
    }

    setSubmitting(true);
    try {
      if (editingId) {
        // Update existing pending change order
        const res = await fetch(`/api/estimates/${estimateId}/change-orders`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            change_order_id: editingId,
            description: description.trim(),
            cost_impact: parsedCost,
            timeline_impact: timelineImpact.trim() || null,
          }),
        });
        if (!res.ok) {
          const { error } = await res.json() as { error?: string };
          throw new Error(error ?? "Failed to update");
        }
        toast.success("Change order updated");
      } else {
        // Get the next change number
        const { data: existing } = await supabase
          .from("estimate_change_orders")
          .select("change_number")
          .eq("estimate_id", estimateId)
          .order("change_number", { ascending: false })
          .limit(1);

        const nextNumber = (existing?.[0]?.change_number ?? 0) + 1;

        const { error } = await supabase.from("estimate_change_orders").insert({
          estimate_id: estimateId,
          change_number: nextNumber,
          description: description.trim(),
          cost_impact: parsedCost,
          timeline_impact: timelineImpact.trim() || null,
          status: "pending",
          client_signed: false,
        });

        if (error) throw error;
        toast.success(`Change Order #${nextNumber} created`);
      }

      resetForm();
      await fetchChangeOrders();
    } catch (err) {
      Sentry.captureException(err);
      toast.error(editingId ? "Failed to update change order. Please try again." : "Failed to create change order. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: "approved" | "rejected") => {
    if (!supabase) return;
    setUpdatingId(id);
    try {
      const { error } = await supabase
        .from("estimate_change_orders")
        .update({ status: newStatus })
        .eq("id", id);
      if (error) throw error;

      // When approving, add the cost_impact to the estimate's grand_total
      if (newStatus === "approved") {
        const co = changeOrders.find((c) => c.id === id);
        if (co) {
          // Fetch the current estimate grand_total
          const { data: estimateData, error: fetchErr } = await supabase
            .from("estimates")
            .select("grand_total")
            .eq("id", estimateId)
            .single();
          if (!fetchErr && estimateData) {
            const newTotal = Number(estimateData.grand_total) + Number(co.cost_impact);
            const { error: updateErr } = await supabase
              .from("estimates")
              .update({ grand_total: newTotal })
              .eq("id", estimateId);
            if (updateErr) {
              Sentry.captureException(updateErr);
              toast.error("Change order approved but failed to update estimate total.");
            } else {
              onTotalChanged?.();
            }
          }
        }
      }

      toast.success(`Change order ${newStatus}`);
      await fetchChangeOrders();
    } catch (err) {
      Sentry.captureException(err);
      toast.error(`Failed to ${newStatus} change order. Please try again.`);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleToggleClientSigned = async (co: EstimateChangeOrder) => {
    if (!supabase) return;
    setUpdatingId(co.id);
    try {
      const newSigned = !co.client_signed;
      const { error } = await supabase
        .from("estimate_change_orders")
        .update({
          client_signed: newSigned,
          signed_at: newSigned ? new Date().toISOString() : null,
        })
        .eq("id", co.id);
      if (error) throw error;
      toast.success(newSigned ? "Marked as client signed" : "Signature removed");
      await fetchChangeOrders();
    } catch (err) {
      Sentry.captureException(err);
      toast.error("Failed to update signature status. Please try again.");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleEdit = (co: EstimateChangeOrder) => {
    setEditingId(co.id);
    setDescription(co.description);
    setCostImpact(String(co.cost_impact));
    setTimelineImpact(co.timeline_impact ?? "");
    setShowForm(true);
  };

  const handleDelete = async (co: EstimateChangeOrder) => {
    if (!window.confirm(`Delete Change Order #${co.change_number}? This cannot be undone.`)) return;
    setDeletingId(co.id);
    try {
      const res = await fetch(`/api/estimates/${estimateId}/change-orders`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ change_order_id: co.id }),
      });
      if (!res.ok) {
        const { error } = await res.json() as { error?: string };
        throw new Error(error ?? "Failed to delete");
      }
      toast.success(`Change Order #${co.change_number} deleted`);
      await fetchChangeOrders();
    } catch (err) {
      Sentry.captureException(err);
      toast.error("Failed to delete change order. Please try again.");
    } finally {
      setDeletingId(null);
    }
  };

  const costSummary = useMemo(() => {
    const approved = changeOrders.filter((co) => co.status === "approved");
    const pending = changeOrders.filter((co) => co.status === "pending");
    const approvedTotal = approved.reduce((s, co) => s + Number(co.cost_impact), 0);
    const pendingTotal = pending.reduce((s, co) => s + Number(co.cost_impact), 0);
    return { approvedCount: approved.length, pendingCount: pending.length, approvedTotal, pendingTotal };
  }, [changeOrders]);

  return (
    <div className="rounded-xl border border-[var(--sep)] bg-[var(--card)] p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-[14px] font-semibold">Change Orders</h3>
          <p className="text-[11px] text-[var(--secondary)]">
            {changeOrders.length} change order{changeOrders.length !== 1 ? "s" : ""}
          </p>
        </div>
        {canAdd && !showForm && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-3 py-1.5 text-[12px] font-medium text-white transition-all hover:brightness-110 active:scale-[0.98]"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Add Change Order
          </button>
        )}
      </div>

      {/* Cost Summary Banner */}
      {changeOrders.length > 0 && (
        <div className="mb-4 grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2.5">
            <p className="text-[10px] font-medium uppercase tracking-wide text-green-700">Approved Impact</p>
            <p className="mt-0.5 text-[16px] font-bold text-green-800">
              {costSummary.approvedTotal >= 0 ? "+" : ""}${Math.abs(costSummary.approvedTotal).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-[10px] text-green-600">{costSummary.approvedCount} approved</p>
          </div>
          {costSummary.pendingCount > 0 && (
            <div className="rounded-lg border border-yellow-200 bg-yellow-50 px-3 py-2.5">
              <p className="text-[10px] font-medium uppercase tracking-wide text-yellow-700">Pending Impact</p>
              <p className="mt-0.5 text-[16px] font-bold text-yellow-800">
                {costSummary.pendingTotal >= 0 ? "+" : ""}${Math.abs(costSummary.pendingTotal).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className="text-[10px] text-yellow-600">{costSummary.pendingCount} pending</p>
            </div>
          )}
        </div>
      )}

      {/* Add Change Order Form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="mb-4 rounded-lg border border-[var(--accent)]/30 bg-[var(--accent)]/5 p-4 space-y-3"
        >
          <p className="text-[12px] font-semibold text-[var(--label)]">{editingId ? "Edit Change Order" : "New Change Order"}</p>

          <div className="space-y-1">
            <label className="text-[11px] font-medium text-[var(--secondary)]">Description *</label>
            <textarea
              required
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the scope change..."
              className="w-full rounded-lg border border-[var(--sep)] bg-[var(--card)] px-3 py-2 text-[13px] outline-none placeholder:text-[var(--gray3)] focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/20 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-[var(--secondary)]">Cost Impact ($) *</label>
              <input
                required
                type="number"
                step="0.01"
                value={costImpact}
                onChange={(e) => setCostImpact(e.target.value)}
                placeholder="e.g. 1500 or -250"
                className="w-full rounded-lg border border-[var(--sep)] bg-[var(--card)] px-3 py-2 text-[13px] outline-none placeholder:text-[var(--gray3)] focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/20"
              />
              <p className="text-[10px] text-[var(--tertiary)]">Positive = increase, negative = decrease</p>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-medium text-[var(--secondary)]">Timeline Impact (optional)</label>
              <input
                type="text"
                value={timelineImpact}
                onChange={(e) => setTimelineImpact(e.target.value)}
                placeholder="e.g. +3 days"
                className="w-full rounded-lg border border-[var(--sep)] bg-[var(--card)] px-3 py-2 text-[13px] outline-none placeholder:text-[var(--gray3)] focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/20"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={resetForm}
              className="flex-1 rounded-lg border border-[var(--sep)] py-2 text-[13px] font-medium transition-colors hover:bg-[var(--bg)]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !description.trim() || costImpact === ""}
              className="flex-1 rounded-lg bg-[var(--accent)] py-2 text-[13px] font-medium text-white transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {submitting ? (editingId ? "Saving…" : "Creating…") : (editingId ? "Save Changes" : "Create Change Order")}
            </button>
          </div>
        </form>
      )}

      {/* Change Orders List */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-[var(--gray5)]" />
          ))}
        </div>
      ) : changeOrders.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-[var(--sep)] py-8 text-center">
          <p className="text-[13px] font-medium text-[var(--label)]">No change orders</p>
          <p className="mt-1 text-[12px] text-[var(--secondary)]">
            {canAdd
              ? "Click \"Add Change Order\" to document scope changes after approval."
              : "Change orders can be added once the estimate is approved, sent, or accepted."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {changeOrders.map((co) => (
            <div
              key={co.id}
              className="rounded-lg border border-[var(--sep)] bg-[var(--bg)] p-4 space-y-3"
            >
              {/* Change order header */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] font-semibold text-[var(--secondary)]">CO #{co.change_number}</span>
                  <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${STATUS_COLORS[co.status] ?? "bg-gray-50 text-gray-700 border-gray-200"}`}>
                    {STATUS_LABELS[co.status] ?? co.status}
                  </span>
                  {co.client_signed && (
                    <span className="inline-flex items-center gap-0.5 rounded-full bg-[var(--green)]/10 px-2 py-0.5 text-[10px] font-medium text-[var(--green)] border border-[var(--green)]/20">
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
                      Client Signed
                    </span>
                  )}
                </div>
                <span className={`text-[13px] font-semibold tabular-nums flex-shrink-0 ${co.cost_impact >= 0 ? "text-[var(--label)]" : "text-[var(--red)]"}`}>
                  {co.cost_impact >= 0 ? "+" : ""}${Number(co.cost_impact).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              {/* Description */}
              <p className="text-[13px] text-[var(--label)] leading-snug">{co.description}</p>

              {/* Timeline impact */}
              {co.timeline_impact && (
                <p className="text-[11px] text-[var(--secondary)]">
                  <span className="font-medium">Timeline:</span> {co.timeline_impact}
                </p>
              )}

              {/* Signed at */}
              {co.client_signed && co.signed_at && (
                <p className="text-[10px] text-[var(--tertiary)]">
                  Signed {new Date(co.signed_at).toLocaleDateString()}
                </p>
              )}

              {/* Actions */}
              <div className="flex flex-wrap gap-2 pt-1">
                {co.status === "pending" && (
                  <>
                    <button
                      type="button"
                      disabled={updatingId === co.id}
                      onClick={() => handleUpdateStatus(co.id, "approved")}
                      className="rounded-md bg-[var(--green)] px-3 py-1.5 text-[11px] font-medium text-white transition-all hover:brightness-110 disabled:opacity-50"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      disabled={updatingId === co.id}
                      onClick={() => handleUpdateStatus(co.id, "rejected")}
                      className="rounded-md bg-[var(--red)] px-3 py-1.5 text-[11px] font-medium text-white transition-all hover:brightness-110 disabled:opacity-50"
                    >
                      Reject
                    </button>
                    <button
                      type="button"
                      disabled={updatingId === co.id || deletingId === co.id}
                      onClick={() => handleEdit(co)}
                      className="rounded-md border border-[var(--sep)] px-3 py-1.5 text-[11px] font-medium transition-colors hover:bg-[var(--card)] disabled:opacity-50"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      disabled={updatingId === co.id || deletingId === co.id}
                      onClick={() => handleDelete(co)}
                      className="rounded-md border border-[var(--red)]/40 px-3 py-1.5 text-[11px] font-medium text-[var(--red)] transition-colors hover:bg-[var(--red)]/10 disabled:opacity-50"
                    >
                      {deletingId === co.id ? "Deleting…" : "Delete"}
                    </button>
                  </>
                )}
                <button
                  type="button"
                  disabled={updatingId === co.id}
                  onClick={() => handleToggleClientSigned(co)}
                  className="rounded-md border border-[var(--sep)] px-3 py-1.5 text-[11px] font-medium transition-colors hover:bg-[var(--card)] disabled:opacity-50"
                >
                  {co.client_signed ? "Remove Signature" : "Mark Client Signed"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
