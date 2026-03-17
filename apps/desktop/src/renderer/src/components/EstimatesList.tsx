import { useState, useMemo } from "react";
import { useEstimates, useClients, createEstimate } from "../lib/store";
import { supabase } from "../lib/supabase";
import { EmptyState } from "./EmptyState";
import { StatusBadge } from "@proestimate/ui/components";
import type { Estimate } from "@proestimate/shared/types";

const FILTERS = ["All", "Draft", "In Review", "Sent", "Approved", "Accepted", "Declined"];
const FILTER_MAP: Record<string, string> = {
  All: "", Draft: "draft", "In Review": "in_review", Sent: "sent",
  Approved: "approved", Accepted: "accepted", Declined: "declined",
};

const PAGE_SIZE = 25;

const PIPELINE_STATUSES = new Set(["draft", "in_review", "sent", "approved"]);

function formatCurrency(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toLocaleString()}`;
}

function formatFullCurrency(n: number): string {
  return `$${Number(n).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function EstimatesList({ onModal, onEditEstimate }: { onNavigate?: (page: string) => void; onCallAlex?: () => void; onModal?: (m: string) => void; onEditEstimate?: (estimate: any) => void }) {
  const { data: estimates, loading } = useEstimates();
  const { data: clients } = useClients();
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [page, setPage] = useState(0);

  // Build client lookup map
  const clientMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of clients) {
      map.set(c.id, c.full_name);
    }
    return map;
  }, [clients]);

  // Compute stats
  const stats = useMemo(() => {
    const total = estimates.length;
    const pipelineValue = estimates
      .filter((e) => PIPELINE_STATUSES.has(e.status))
      .reduce((sum, e) => sum + Number(e.grand_total), 0);
    const accepted = estimates.filter((e) => e.status === "accepted").length;
    const declined = estimates.filter((e) => e.status === "declined").length;
    const closedTotal = accepted + declined;
    const winRate = closedTotal > 0 ? (accepted / closedTotal) * 100 : 0;
    const avgValue = total > 0
      ? estimates.reduce((sum, e) => sum + Number(e.grand_total), 0) / total
      : 0;

    return { total, pipelineValue, winRate, closedTotal, avgValue };
  }, [estimates]);

  const filtered = estimates.filter((e) => {
    if (filter !== "All" && e.status !== FILTER_MAP[filter]) return false;
    if (search) {
      const q = search.toLowerCase();
      const clientName = e.client_id ? (clientMap.get(e.client_id) ?? "") : "";
      return (
        e.estimate_number.toLowerCase().includes(q) ||
        e.project_type.toLowerCase().includes(q) ||
        (e.project_address ?? "").toLowerCase().includes(q) ||
        clientName.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const paged = filtered.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  const detail = selected ? estimates.find((e) => e.id === selected) : null;

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <header className="px-8 pt-6 pb-4 slide-up">
        <div className="flex items-end justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="h-4 w-1 rounded-full bg-[var(--accent)]" />
              <p className="caps">Estimates</p>
            </div>
            <h1 className="text-[20px] font-extrabold tight">{estimates.length} Total Estimates</h1>
          </div>
          <button onClick={() => onModal?.("new-estimate")} className="flex items-center gap-1.5 rounded-xl bg-[var(--accent)] px-4 py-2 text-[12px] font-semibold text-white shadow-sm shadow-[var(--accent)]/20 transition-all hover:bg-[var(--accent-hover)] active:scale-[0.97]">
            <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
            New Estimate
          </button>
        </div>
      </header>

      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-3 px-8 pt-4 pb-2">
        <StatCard
          label="Total Estimates"
          value={String(stats.total)}
          subtitle={`${filtered.length} shown`}
          delay={0}
        />
        <StatCard
          label="Pipeline Value"
          value={formatCurrency(stats.pipelineValue)}
          subtitle="Draft through Approved"
          delay={1}
          accentTop
        />
        <StatCard
          label="Win Rate"
          value={stats.closedTotal > 0 ? `${stats.winRate.toFixed(0)}%` : "--"}
          subtitle={stats.closedTotal > 0 ? `${stats.closedTotal} closed` : "No closed estimates"}
          delay={2}
          indicator={
            stats.closedTotal > 0
              ? stats.winRate >= 60 ? "green" : stats.winRate >= 40 ? "orange" : "red"
              : undefined
          }
        />
        <StatCard
          label="Avg Value"
          value={stats.total > 0 ? formatCurrency(stats.avgValue) : "--"}
          subtitle="Per estimate"
          delay={3}
        />
      </div>

      {/* Search + Filters */}
      <div className="px-8 py-3 slide-up" style={{ animationDelay: "80ms" }}>
        <div className="relative mb-2">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="var(--gray2)" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="text"
            placeholder="Search by number, type, address, or client..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-[var(--sep)] bg-[var(--card)] py-2.5 pl-9 pr-3 text-[13px] outline-none placeholder:text-[var(--gray3)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/10 shadow-sm shadow-black/[0.02] transition-all"
          />
        </div>

        {/* Segmented control */}
        <div className="flex rounded-lg bg-[var(--gray5)] p-0.5">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => { setFilter(f); setPage(0); }}
              className={`flex-1 rounded-md px-1 py-1.5 text-[11px] font-medium transition-all ${
                filter === f ? "bg-[var(--card)] text-[var(--label)] shadow-sm" : "text-[var(--secondary)]"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* List + Detail */}
      <div className="flex flex-1 gap-0 overflow-hidden px-8 pb-6">
        <div className={`flex flex-col overflow-y-auto surface-elevated ${detail ? "w-[55%]" : "w-full"}`}>
          {loading ? (
            <LoadingRows />
          ) : filtered.length === 0 ? (
            <RichEmptyState
              hasFilters={search !== "" || filter !== "All"}
              onNewEstimate={() => onModal?.("new-estimate")}
            />
          ) : (
            <>
              {/* Table Header */}
              <div className={`grid items-center gap-3 px-4 py-2.5 border-b border-[var(--sep)] bg-[var(--bg)]/50 ${detail ? "grid-cols-[1fr_120px_100px_100px_80px_70px]" : "grid-cols-[1fr_140px_140px_100px_120px_80px_80px]"}`}>
                <p className="caps">Estimate</p>
                {!detail && <p className="caps">Client</p>}
                <p className="caps">Type</p>
                <p className="caps">Status</p>
                <p className="caps text-right">Total</p>
                <p className="caps text-right">Margin</p>
                <p className="caps text-right">Date</p>
              </div>

              {/* Table Rows */}
              {paged.map((est, i, arr) => {
                const isSelected = est.id === selected;
                const clientName = est.client_id ? (clientMap.get(est.client_id) ?? null) : null;
                return (
                  <button
                    key={est.id}
                    onClick={() => setSelected(est.id === selected ? null : est.id)}
                    className={`grid items-center gap-3 px-4 py-3 text-left transition-all ${
                      detail
                        ? "grid-cols-[1fr_120px_100px_100px_80px_70px]"
                        : "grid-cols-[1fr_140px_140px_100px_120px_80px_80px]"
                    } ${
                      isSelected
                        ? "bg-[var(--accent)]/5 border-l-2 border-l-[var(--accent)]"
                        : "border-l-2 border-l-transparent hover:bg-[var(--bg)] hover:border-l-[var(--gray4)]"
                    } ${i < arr.length - 1 ? "border-b border-[var(--sep)]" : ""}`}
                  >
                    {/* Estimate Number */}
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold truncate">{est.estimate_number}</p>
                      <p className="text-[11px] text-[var(--tertiary)] truncate">{est.project_address || "No address"}</p>
                    </div>

                    {/* Client */}
                    {!detail && (
                      <p className={`text-[12px] truncate ${clientName ? "text-[var(--secondary)]" : "text-[var(--tertiary)] italic"}`}>
                        {clientName || "No client"}
                      </p>
                    )}

                    {/* Project Type */}
                    <p className="text-[12px] text-[var(--secondary)] truncate">{est.project_type}</p>

                    {/* Status */}
                    <div>
                      <StatusBadge status={est.status} />
                    </div>

                    {/* Total */}
                    <p className="text-[13px] font-semibold tabular-nums text-right">
                      {formatFullCurrency(Number(est.grand_total))}
                    </p>

                    {/* Margin */}
                    <div className="flex items-center justify-end gap-1.5">
                      {est.gross_margin_pct != null ? (
                        <>
                          <span className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${
                            Number(est.gross_margin_pct) >= 35 ? "bg-[var(--green)]" :
                            Number(est.gross_margin_pct) >= 25 ? "bg-[var(--orange)]" :
                            "bg-[var(--red)]"
                          }`} />
                          <p className={`text-[11px] font-medium tabular-nums ${
                            Number(est.gross_margin_pct) >= 35 ? "text-[var(--green)]" :
                            Number(est.gross_margin_pct) >= 25 ? "text-[var(--orange)]" :
                            "text-[var(--red)]"
                          }`}>{Number(est.gross_margin_pct).toFixed(1)}%</p>
                        </>
                      ) : (
                        <p className="text-[11px] text-[var(--tertiary)]">--</p>
                      )}
                    </div>

                    {/* Date */}
                    <p className="text-[11px] text-[var(--tertiary)] tabular-nums text-right">
                      {formatDate(est.created_at)}
                    </p>
                  </button>
                );
              })}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-[var(--sep)] px-4 py-2.5">
                  <p className="text-[11px] text-[var(--secondary)]">
                    {safePage * PAGE_SIZE + 1}–{Math.min((safePage + 1) * PAGE_SIZE, filtered.length)} of {filtered.length}
                  </p>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setPage(Math.max(0, safePage - 1))}
                      disabled={safePage === 0}
                      className="rounded-md px-2 py-1 text-[11px] font-medium transition-colors hover:bg-[var(--bg)] disabled:opacity-30"
                    >
                      Prev
                    </button>
                    {Array.from({ length: totalPages }).map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setPage(i)}
                        className={`h-6 w-6 rounded-md text-[11px] font-medium transition-colors ${
                          i === safePage ? "bg-[var(--accent)] text-white" : "hover:bg-[var(--bg)]"
                        }`}
                      >
                        {i + 1}
                      </button>
                    ))}
                    <button
                      onClick={() => setPage(Math.min(totalPages - 1, safePage + 1))}
                      disabled={safePage >= totalPages - 1}
                      className="rounded-md px-2 py-1 text-[11px] font-medium transition-colors hover:bg-[var(--bg)] disabled:opacity-30"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {detail && (
          <div className="ml-3 w-[45%] overflow-y-auto surface-elevated p-6">
            <DetailPanel estimate={detail} clientName={detail.client_id ? (clientMap.get(detail.client_id) ?? null) : null} onClose={() => setSelected(null)} onEditEstimate={onEditEstimate} />
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Stat Card ── */

function StatCard({ label, value, subtitle, delay, indicator, accentTop }: {
  label: string;
  value: string;
  subtitle: string;
  delay: number;
  indicator?: "green" | "orange" | "red";
  accentTop?: boolean;
}) {
  return (
    <div
      className={`surface px-4 py-3 slide-up ${accentTop ? "border-t-2 border-t-[var(--accent)]" : ""}`}
      style={{ animationDelay: `${delay * 40}ms` }}
    >
      <p className="caps mb-1">{label}</p>
      <div className="flex items-center gap-2">
        {indicator && (
          <span className={`h-2 w-2 rounded-full flex-shrink-0 ${
            indicator === "green" ? "bg-[var(--green)]" :
            indicator === "orange" ? "bg-[var(--orange)]" :
            "bg-[var(--red)]"
          }`} />
        )}
        <p className="text-[20px] font-bold tabular-nums tight">{value}</p>
      </div>
      <p className="text-[11px] text-[var(--tertiary)] mt-0.5">{subtitle}</p>
    </div>
  );
}

/* ── Rich Empty State ── */

function RichEmptyState({ hasFilters, onNewEstimate }: { hasFilters: boolean; onNewEstimate: () => void }) {
  if (hasFilters) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center py-16 px-8">
        <div className="w-12 h-12 rounded-full bg-[var(--gray5)] flex items-center justify-center mb-4">
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="var(--gray2)" strokeWidth="1.5" strokeLinecap="round">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
        </div>
        <p className="text-[15px] font-semibold tight mb-1">No matching estimates</p>
        <p className="text-[13px] text-[var(--secondary)] text-center max-w-[280px]">
          Try adjusting your search terms or filters to find what you are looking for.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center py-16 px-8">
      <div className="w-16 h-16 rounded-2xl bg-[var(--accent)]/8 flex items-center justify-center mb-5">
        <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
          <path d="M14 2v6h6" />
          <path d="M12 18v-6" />
          <path d="M9 15h6" />
        </svg>
      </div>
      <p className="text-[17px] font-bold tight mb-1.5">No estimates yet</p>
      <p className="text-[13px] text-[var(--secondary)] text-center max-w-[300px] mb-5">
        Create your first estimate to start building your project pipeline and tracking revenue.
      </p>
      <button
        onClick={onNewEstimate}
        className="flex items-center gap-1.5 rounded-xl bg-[var(--accent)] px-5 py-2.5 text-[13px] font-semibold text-white shadow-sm shadow-[var(--accent)]/20 transition-all hover:bg-[var(--accent-hover)] active:scale-[0.97]"
      >
        <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
        Create First Estimate
      </button>
    </div>
  );
}

/* ── Detail Panel ── */

function DetailPanel({ estimate, clientName, onClose, onEditEstimate }: { estimate: Estimate; clientName: string | null; onClose: () => void; onEditEstimate?: (estimate: any) => void }) {
  const [duplicating, setDuplicating] = useState(false);

  const handleDuplicate = async () => {
    if (!supabase || duplicating) return;
    setDuplicating(true);
    try {
      // Create a new estimate (gets next estimate number)
      const newEst = await createEstimate();
      if (!newEst) { setDuplicating(false); return; }

      // Copy fields from the original estimate (excluding id, estimate_number, status, created_at, updated_at)
      const {
        id: _id, estimate_number: _num, status: _status,
        created_at: _ca, updated_at: _ua,
        ...copyFields
      } = estimate;

      await supabase.from("estimates").update({
        ...copyFields,
        status: "draft",
      }).eq("id", newEst.id);

      // Copy line items from the original estimate
      const { data: lineItems } = await supabase
        .from("estimate_line_items")
        .select("*")
        .eq("estimate_id", estimate.id)
        .order("line_number");

      if (lineItems && lineItems.length > 0) {
        const copiedItems = lineItems.map((item: any) => {
          const { id: _itemId, estimate_id: _estId, created_at: _itemCa, updated_at: _itemUa, ...rest } = item;
          return { ...rest, estimate_id: newEst.id };
        });
        await supabase.from("estimate_line_items").insert(copiedItems);
      }
    } finally {
      setDuplicating(false);
    }
  };

  return (
    <div>
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-[11px] text-[var(--secondary)]">{estimate.estimate_number}</p>
          <h2 className="text-[18px] font-bold tight">{estimate.project_type}</h2>
          <div className="flex items-center gap-2 mt-1">
            <StatusBadge status={estimate.status} />
            {clientName && (
              <p className="text-[11px] text-[var(--secondary)]">{clientName}</p>
            )}
          </div>
        </div>
        <button onClick={onClose} className="rounded-md p-1 hover:bg-[var(--bg)]">
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="var(--gray1)" strokeWidth="2" strokeLinecap="round">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      <Section title="Details">
        <Row label="Address" value={estimate.project_address ?? "—"} />
        <Row label="Client" value={clientName ?? "—"} />
        <Row label="Tier" value={({ budget: "Budget", midrange: "Midrange", high_end: "High End", good: "Budget", better: "Midrange", best: "High End" } as Record<string, string>)[estimate.tier] ?? estimate.tier} />
        <Row label="Source" value={estimate.source} />
      </Section>

      <Section title="Financials">
        <Row label="Materials" value={`$${Number(estimate.materials_subtotal).toLocaleString()}`} />
        <Row label="Labor" value={`$${Number(estimate.labor_subtotal).toLocaleString()}`} />
        <Row label="Subcontractors" value={`$${Number(estimate.subcontractor_total).toLocaleString()}`} />
        <Row label="Permits & Fees" value={`$${Number(estimate.permits_fees).toLocaleString()}`} />
        <Row label="Overhead & Profit" value={`$${Number(estimate.overhead_profit).toLocaleString()}`} />
        <Row label="Contingency" value={`$${Number(estimate.contingency).toLocaleString()}`} />
        <Row label="Tax" value={`$${Number(estimate.tax).toLocaleString()}`} />
        <Row label="Gross Margin" value={estimate.gross_margin_pct != null ? `${Number(estimate.gross_margin_pct).toFixed(1)}%` : "—"} color={
          estimate.gross_margin_pct != null
            ? Number(estimate.gross_margin_pct) >= 35 ? "var(--green)" : Number(estimate.gross_margin_pct) >= 25 ? "var(--orange)" : "var(--red)"
            : undefined
        } />
        <Row label="Grand Total" value={`$${Number(estimate.grand_total).toLocaleString()}`} bold />
      </Section>

      <Section title="Validation">
        <Row label="Passed" value={estimate.validation_passed ? "Yes" : "No"} />
      </Section>

      <Section title="Timeline">
        <Row label="Created" value={new Date(estimate.created_at).toLocaleDateString()} />
        <Row label="Updated" value={new Date(estimate.updated_at).toLocaleDateString()} />
        {estimate.valid_through && <Row label="Valid Through" value={new Date(estimate.valid_through).toLocaleDateString()} />}
      </Section>

      <div className="mt-5 space-y-2">
        <button onClick={() => onEditEstimate?.(estimate)} className="w-full rounded-xl bg-[var(--accent)] py-2.5 text-[13px] font-semibold text-white shadow-sm shadow-[var(--accent)]/20 transition-all hover:bg-[var(--accent-hover)] active:scale-[0.97]">
          Open Estimate
        </button>
        <div className="flex gap-2">
          <button
            onClick={handleDuplicate}
            disabled={duplicating}
            className="flex-1 rounded-xl border border-[var(--sep)] py-2.5 text-[13px] font-medium transition-all hover:bg-[var(--bg)] hover:border-[var(--gray3)] disabled:opacity-50"
          >
            {duplicating ? "Duplicating..." : "Duplicate"}
          </button>
          <button className="flex-1 rounded-xl border border-[var(--sep)] py-2.5 text-[13px] font-medium transition-all hover:bg-[var(--bg)] hover:border-[var(--gray3)]">Export PDF</button>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <p className="caps mb-2">{title}</p>
      <div className="surface divide-y divide-[var(--sep)]">{children}</div>
    </div>
  );
}

function Row({ label, value, bold, color }: { label: string; value: string; bold?: boolean; color?: string }) {
  return (
    <div className="flex items-center justify-between px-3 py-2">
      <p className="text-[12px] text-[var(--secondary)]">{label}</p>
      <p className={`text-[12px] tabular-nums ${bold ? "font-bold text-[15px]" : "font-medium"}`} style={color ? { color } : undefined}>{value}</p>
    </div>
  );
}

function LoadingRows() {
  return (
    <div className="p-4 space-y-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <div className="h-3 w-28 animate-pulse rounded bg-[var(--gray5)]" />
          <div className="h-2.5 w-40 animate-pulse rounded bg-[var(--gray5)]" />
        </div>
      ))}
    </div>
  );
}
