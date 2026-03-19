"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Badge, Modal, Field, inputClass, textareaClass, selectClass } from "@proestimate/ui";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface WarrantyItem {
  id: string;
  estimate_id: string;
  client_id: string | null;
  item_description: string;
  category: string | null;
  warranty_start: string;
  warranty_end: string;
  status: string;
  claimed_at: string | null;
  claim_description: string | null;
  resolution: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  cost_to_repair: number | null;
  callback_date: string | null;
  callback_notes: string | null;
  photos: string[];
  created_at: string;
  updated_at: string;
}

interface WarrantyTrackerProps {
  estimateId?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CATEGORY_LABELS: Record<string, string> = {
  labor: "Labor",
  material: "Material",
  structural: "Structural",
  plumbing: "Plumbing",
  electrical: "Electrical",
  hvac: "HVAC",
  roofing: "Roofing",
  flooring: "Flooring",
  painting: "Painting",
  appliance: "Appliance",
  other: "Other",
};

const STATUS_COLORS: Record<string, string> = {
  active: "bg-emerald-500/15 text-emerald-400",
  claimed: "bg-amber-500/15 text-amber-400",
  in_progress: "bg-blue-500/15 text-blue-400",
  resolved: "bg-[var(--secondary)]/15 text-[var(--secondary)]",
  expired: "bg-red-500/15 text-red-400",
  voided: "bg-[var(--secondary)]/10 text-[var(--secondary)]",
};

const STATUS_LABELS: Record<string, string> = {
  active: "Active",
  claimed: "Claimed",
  in_progress: "In Progress",
  resolved: "Resolved",
  expired: "Expired",
  voided: "Voided",
};

const CATEGORIES = [
  "labor", "material", "structural", "plumbing", "electrical",
  "hvac", "roofing", "flooring", "painting", "appliance", "other",
] as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function daysRemaining(endDate: string): number {
  const end = new Date(endDate + "T00:00:00");
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function formatDate(d: string): string {
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function fmt(n: number): string {
  return n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

// ---------------------------------------------------------------------------
// Stat Card
// ---------------------------------------------------------------------------

function StatCard({ label, value, accent }: { label: string; value: string | number; accent?: string }) {
  return (
    <div className="rounded-xl border border-[var(--sep)] bg-[var(--card)] p-5 shadow-[var(--shadow-card)]">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--secondary)] mb-1">{label}</p>
      <p className={`text-[28px] font-bold tabular-nums leading-tight ${accent ?? ""}`}>{value}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Warranty Card
// ---------------------------------------------------------------------------

function WarrantyCard({
  item,
  onClaim,
  onResolve,
}: {
  item: WarrantyItem;
  onClaim: (item: WarrantyItem) => void;
  onResolve: (item: WarrantyItem) => void;
}) {
  const days = daysRemaining(item.warranty_end);
  const isExpiringSoon = days > 0 && days <= 30;
  const isExpired = days <= 0;

  return (
    <div
      className={`rounded-xl border bg-[var(--card)] p-4 shadow-[var(--shadow-card)] transition-colors ${
        isExpired
          ? "border-red-500/30"
          : isExpiringSoon
          ? "border-amber-500/30"
          : "border-[var(--sep)]"
      }`}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-semibold leading-snug mb-1">{item.item_description}</p>
          <div className="flex items-center gap-2 flex-wrap">
            {item.category && (
              <Badge className="text-[10px] bg-[var(--fill)] text-[var(--secondary)] px-2 py-0.5 rounded-full">
                {CATEGORY_LABELS[item.category] ?? item.category}
              </Badge>
            )}
            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[item.status] ?? ""}`}>
              {STATUS_LABELS[item.status] ?? item.status}
            </span>
          </div>
        </div>
        {/* Days remaining badge */}
        {item.status === "active" && (
          <div
            className={`shrink-0 text-center rounded-lg px-3 py-1.5 ${
              isExpired
                ? "bg-red-500/15 text-red-400"
                : isExpiringSoon
                ? "bg-amber-500/15 text-amber-400"
                : "bg-emerald-500/15 text-emerald-400"
            }`}
          >
            <p className="text-[18px] font-bold tabular-nums leading-tight">
              {isExpired ? 0 : days}
            </p>
            <p className="text-[9px] uppercase tracking-wide font-medium">
              {isExpired ? "Expired" : "days left"}
            </p>
          </div>
        )}
      </div>

      {/* Period */}
      <div className="flex items-center gap-1.5 text-[12px] text-[var(--secondary)] mb-2">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
        <span>{formatDate(item.warranty_start)}</span>
        <span className="text-[var(--secondary)]/60">&rarr;</span>
        <span>{formatDate(item.warranty_end)}</span>
      </div>

      {/* Callback */}
      {item.callback_date && (
        <div className="flex items-center gap-1.5 text-[12px] text-amber-400 mb-2">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72" />
          </svg>
          <span>Callback: {formatDate(item.callback_date)}</span>
        </div>
      )}

      {/* Claim description if claimed */}
      {item.claim_description && (
        <p className="text-[12px] text-[var(--secondary)] mt-2 bg-[var(--fill)] rounded-lg p-2.5">
          <span className="font-semibold text-[var(--text)]">Claim:</span> {item.claim_description}
        </p>
      )}

      {/* Resolution if resolved */}
      {item.resolution && (
        <p className="text-[12px] text-[var(--secondary)] mt-2 bg-emerald-500/5 rounded-lg p-2.5">
          <span className="font-semibold text-emerald-400">Resolved:</span> {item.resolution}
          {item.cost_to_repair != null && item.cost_to_repair > 0 && (
            <span className="ml-2 text-[var(--text)]">(${fmt(item.cost_to_repair)})</span>
          )}
        </p>
      )}

      {/* Actions */}
      {(item.status === "active" || item.status === "claimed" || item.status === "in_progress") && (
        <div className="flex gap-2 mt-3 pt-3 border-t border-[var(--sep)]">
          {item.status === "active" && (
            <button
              onClick={() => onClaim(item)}
              className="text-[12px] font-medium px-3 py-1.5 rounded-lg bg-amber-500/15 text-amber-400 hover:bg-amber-500/25 transition-colors"
            >
              File Claim
            </button>
          )}
          {(item.status === "claimed" || item.status === "in_progress") && (
            <button
              onClick={() => onResolve(item)}
              className="text-[12px] font-medium px-3 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 transition-colors"
            >
              Resolve
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function WarrantyTracker({ estimateId }: WarrantyTrackerProps) {
  const [warranties, setWarranties] = useState<WarrantyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");

  // Modal states
  const [claimModal, setClaimModal] = useState<WarrantyItem | null>(null);
  const [resolveModal, setResolveModal] = useState<WarrantyItem | null>(null);
  const [createModal, setCreateModal] = useState(false);

  // Claim form
  const [claimDescription, setClaimDescription] = useState("");

  // Resolve form
  const [resolution, setResolution] = useState("");
  const [costToRepair, setCostToRepair] = useState("");

  // Create form
  const [newDescription, setNewDescription] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [newStart, setNewStart] = useState("");
  const [newEnd, setNewEnd] = useState("");
  const [newEstimateId, setNewEstimateId] = useState(estimateId ?? "");

  const [saving, setSaving] = useState(false);

  // ── Fetch ──
  const fetchWarranties = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (estimateId) params.set("estimateId", estimateId);
      const res = await fetch(`/api/warranty?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch warranties");
      const data = await res.json();
      setWarranties(data.warranties ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [estimateId]);

  useEffect(() => {
    fetchWarranties();
  }, [fetchWarranties]);

  // ── Actions ──
  const handleFileClaim = async () => {
    if (!claimModal || !claimDescription.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/warranty", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: claimModal.id,
          status: "claimed",
          claim_description: claimDescription.trim(),
        }),
      });
      if (!res.ok) throw new Error("Failed to file claim");
      setClaimModal(null);
      setClaimDescription("");
      fetchWarranties();
    } catch {
      // Handled silently
    } finally {
      setSaving(false);
    }
  };

  const handleResolve = async () => {
    if (!resolveModal || !resolution.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/warranty", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: resolveModal.id,
          status: "resolved",
          resolution: resolution.trim(),
          cost_to_repair: costToRepair ? parseFloat(costToRepair) : null,
        }),
      });
      if (!res.ok) throw new Error("Failed to resolve");
      setResolveModal(null);
      setResolution("");
      setCostToRepair("");
      fetchWarranties();
    } catch {
      // Handled silently
    } finally {
      setSaving(false);
    }
  };

  const handleCreate = async () => {
    if (!newDescription.trim() || !newStart || !newEnd || !newEstimateId) return;
    setSaving(true);
    try {
      const res = await fetch("/api/warranty", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          estimate_id: newEstimateId,
          item_description: newDescription.trim(),
          category: newCategory || null,
          warranty_start: newStart,
          warranty_end: newEnd,
        }),
      });
      if (!res.ok) throw new Error("Failed to create warranty");
      setCreateModal(false);
      setNewDescription("");
      setNewCategory("");
      setNewStart("");
      setNewEnd("");
      fetchWarranties();
    } catch {
      // Handled silently
    } finally {
      setSaving(false);
    }
  };

  // ── Computed ──
  const now = new Date();
  const thisMonth = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());

  const stats = useMemo(() => {
    const active = warranties.filter((w) => w.status === "active");
    const expiringThisMonth = active.filter((w) => {
      const end = new Date(w.warranty_end + "T00:00:00");
      return end <= thisMonth && end >= now;
    });
    const openClaims = warranties.filter((w) => w.status === "claimed" || w.status === "in_progress");
    const thisYear = now.getFullYear();
    const repairCostThisYear = warranties
      .filter((w) => w.status === "resolved" && w.resolved_at && new Date(w.resolved_at).getFullYear() === thisYear)
      .reduce((sum, w) => sum + (w.cost_to_repair ?? 0), 0);

    return {
      activeCount: active.length,
      expiringCount: expiringThisMonth.length,
      openClaims: openClaims.length,
      repairCost: repairCostThisYear,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [warranties]);

  const filtered = useMemo(() => {
    if (filter === "all") return warranties;
    return warranties.filter((w) => w.status === filter);
  }, [warranties, filter]);

  const { activeItems, expiredItems, claimedItems } = useMemo(() => {
    const activeItems = filtered.filter((w) => w.status === "active").sort((a, b) => a.warranty_end.localeCompare(b.warranty_end));
    const expiredItems = filtered.filter((w) => w.status === "expired");
    const claimedItems = filtered.filter((w) => w.status !== "active" && w.status !== "expired");
    return { activeItems, expiredItems, claimedItems };
  }, [filtered]);

  // ── Loading / Error ──
  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--sep)] border-t-[var(--accent)]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="text-center">
          <p className="text-[15px] font-semibold mb-1 text-red-400">Error loading warranties</p>
          <p className="text-[13px] text-[var(--secondary)]">{error}</p>
          <button onClick={fetchWarranties} className="mt-3 text-[13px] text-[var(--accent)] hover:underline">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto px-6 py-6 space-y-6">
      {/* Dashboard Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Active Warranties" value={stats.activeCount} />
        <StatCard label="Expiring This Month" value={stats.expiringCount} accent={stats.expiringCount > 0 ? "text-amber-400" : ""} />
        <StatCard label="Open Claims" value={stats.openClaims} accent={stats.openClaims > 0 ? "text-blue-400" : ""} />
        <StatCard label="Repair Cost (YTD)" value={`$${fmt(stats.repairCost)}`} />
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          {["all", "active", "claimed", "in_progress", "resolved", "expired"].map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`text-[12px] font-medium px-3 py-1.5 rounded-lg transition-colors ${
                filter === s
                  ? "bg-[var(--accent)] text-white"
                  : "bg-[var(--fill)] text-[var(--secondary)] hover:text-[var(--text)]"
              }`}
            >
              {s === "all" ? "All" : STATUS_LABELS[s] ?? s}
            </button>
          ))}
        </div>
        <button
          onClick={() => setCreateModal(true)}
          className="text-[13px] font-semibold px-4 py-2 rounded-lg bg-[var(--accent)] text-white hover:opacity-90 transition-opacity"
        >
          + Add Warranty
        </button>
      </div>

      {/* Active warranties */}
      {activeItems.length > 0 && (
        <div>
          <h3 className="text-[13px] font-semibold text-[var(--secondary)] uppercase tracking-wide mb-3">
            Active ({activeItems.length})
          </h3>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {activeItems.map((item) => (
              <WarrantyCard key={item.id} item={item} onClaim={setClaimModal} onResolve={setResolveModal} />
            ))}
          </div>
        </div>
      )}

      {/* Claimed / In Progress / Resolved */}
      {claimedItems.length > 0 && (
        <div>
          <h3 className="text-[13px] font-semibold text-[var(--secondary)] uppercase tracking-wide mb-3">
            Claims &amp; Resolved ({claimedItems.length})
          </h3>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {claimedItems.map((item) => (
              <WarrantyCard key={item.id} item={item} onClaim={setClaimModal} onResolve={setResolveModal} />
            ))}
          </div>
        </div>
      )}

      {/* Expired */}
      {expiredItems.length > 0 && (
        <div>
          <h3 className="text-[13px] font-semibold text-red-400 uppercase tracking-wide mb-3">
            Expired ({expiredItems.length})
          </h3>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {expiredItems.map((item) => (
              <WarrantyCard key={item.id} item={item} onClaim={setClaimModal} onResolve={setResolveModal} />
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {warranties.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--secondary)" strokeWidth="1.5" strokeLinecap="round" className="opacity-40 mb-4">
            <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          <p className="text-[15px] font-semibold mb-1">No warranties yet</p>
          <p className="text-[13px] text-[var(--secondary)]">Add warranty items to track coverage and claims.</p>
        </div>
      )}

      {/* ── File Claim Modal ── */}
      <Modal open={!!claimModal} onClose={() => { setClaimModal(null); setClaimDescription(""); }} title="File Warranty Claim">
        <div className="space-y-4 p-1">
          {claimModal && (
            <p className="text-[13px] text-[var(--secondary)]">
              Filing claim for: <span className="font-semibold text-[var(--text)]">{claimModal.item_description}</span>
            </p>
          )}
          <Field label="Claim Description">
            <textarea
              className={textareaClass}
              rows={4}
              value={claimDescription}
              onChange={(e) => setClaimDescription(e.target.value)}
              placeholder="Describe the issue..."
            />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => { setClaimModal(null); setClaimDescription(""); }} className="text-[13px] px-4 py-2 rounded-lg bg-[var(--fill)] text-[var(--secondary)] hover:text-[var(--text)] transition-colors">
              Cancel
            </button>
            <button onClick={handleFileClaim} disabled={saving || !claimDescription.trim()} className="text-[13px] font-semibold px-4 py-2 rounded-lg bg-amber-500 text-white hover:opacity-90 transition-opacity disabled:opacity-50">
              {saving ? "Filing..." : "File Claim"}
            </button>
          </div>
        </div>
      </Modal>

      {/* ── Resolve Modal ── */}
      <Modal open={!!resolveModal} onClose={() => { setResolveModal(null); setResolution(""); setCostToRepair(""); }} title="Resolve Warranty Claim">
        <div className="space-y-4 p-1">
          {resolveModal && (
            <p className="text-[13px] text-[var(--secondary)]">
              Resolving: <span className="font-semibold text-[var(--text)]">{resolveModal.item_description}</span>
            </p>
          )}
          <Field label="Resolution Description">
            <textarea
              className={textareaClass}
              rows={4}
              value={resolution}
              onChange={(e) => setResolution(e.target.value)}
              placeholder="How was this resolved..."
            />
          </Field>
          <Field label="Cost to Repair ($)">
            <input
              type="number"
              className={inputClass}
              value={costToRepair}
              onChange={(e) => setCostToRepair(e.target.value)}
              placeholder="0.00"
              min="0"
              step="0.01"
            />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => { setResolveModal(null); setResolution(""); setCostToRepair(""); }} className="text-[13px] px-4 py-2 rounded-lg bg-[var(--fill)] text-[var(--secondary)] hover:text-[var(--text)] transition-colors">
              Cancel
            </button>
            <button onClick={handleResolve} disabled={saving || !resolution.trim()} className="text-[13px] font-semibold px-4 py-2 rounded-lg bg-emerald-500 text-white hover:opacity-90 transition-opacity disabled:opacity-50">
              {saving ? "Saving..." : "Mark Resolved"}
            </button>
          </div>
        </div>
      </Modal>

      {/* ── Create Warranty Modal ── */}
      <Modal open={createModal} onClose={() => setCreateModal(false)} title="Add Warranty Item">
        <div className="space-y-4 p-1">
          {!estimateId && (
            <Field label="Estimate ID">
              <input
                type="text"
                className={inputClass}
                value={newEstimateId}
                onChange={(e) => setNewEstimateId(e.target.value)}
                placeholder="UUID of the estimate"
              />
            </Field>
          )}
          <Field label="Item Description">
            <textarea
              className={textareaClass}
              rows={3}
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="e.g. Kitchen countertop installation"
            />
          </Field>
          <Field label="Category">
            <select className={selectClass} value={newCategory} onChange={(e) => setNewCategory(e.target.value)}>
              <option value="">Select category...</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
              ))}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Warranty Start">
              <input type="date" className={inputClass} value={newStart} onChange={(e) => setNewStart(e.target.value)} />
            </Field>
            <Field label="Warranty End">
              <input type="date" className={inputClass} value={newEnd} onChange={(e) => setNewEnd(e.target.value)} />
            </Field>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setCreateModal(false)} className="text-[13px] px-4 py-2 rounded-lg bg-[var(--fill)] text-[var(--secondary)] hover:text-[var(--text)] transition-colors">
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={saving || !newDescription.trim() || !newStart || !newEnd || !newEstimateId}
              className="text-[13px] font-semibold px-4 py-2 rounded-lg bg-[var(--accent)] text-white hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {saving ? "Creating..." : "Create"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
