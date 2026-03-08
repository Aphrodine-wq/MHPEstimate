import { useState } from "react";
import { useEstimates, createEstimate } from "../lib/store";
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

export function EstimatesList({ onModal, onEditEstimate }: { onNavigate?: (page: string) => void; onCallAlex?: () => void; onModal?: (m: string) => void; onEditEstimate?: (estimate: any) => void }) {
  const { data: estimates, loading } = useEstimates();
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [page, setPage] = useState(0);

  const filtered = estimates.filter((e) => {
    if (filter !== "All" && e.status !== FILTER_MAP[filter]) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        e.estimate_number.toLowerCase().includes(q) ||
        e.project_type.toLowerCase().includes(q) ||
        (e.project_address ?? "").toLowerCase().includes(q)
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
      <header className="flex items-center justify-between px-8 pt-4 pb-1">
        <p className="text-[12px] text-[var(--secondary)]">{estimates.length} total estimates</p>
        <button onClick={() => onModal?.("new-estimate")} className="rounded-lg bg-[var(--accent)] px-3.5 py-1.5 text-[12px] font-semibold text-white shadow-sm shadow-[var(--accent)]/20 transition-all hover:brightness-110 active:scale-[0.98]">
          New Estimate
        </button>
      </header>

      {/* Search */}
      <div className="px-8 py-3">
        <div className="relative mb-2">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="var(--gray2)" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="text"
            placeholder="Search by number, type, or address..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-[var(--sep)] bg-[var(--card)] py-2 pl-9 pr-3 text-[13px] outline-none placeholder:text-[var(--gray3)] focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/20"
          />
        </div>

        {/* Segmented control */}
        <div className="flex rounded-lg bg-[var(--gray5)] p-0.5">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
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
        <div className={`flex flex-col overflow-y-auto rounded-xl border border-[var(--sep)] bg-[var(--card)] ${detail ? "w-[55%]" : "w-full"}`}>
          {loading ? (
            <LoadingRows />
          ) : filtered.length === 0 ? (
            <EmptyState
              title="No estimates found"
              description={search || filter !== "All" ? "Try adjusting your filters" : "Create your first estimate to get started"}
              action={!search && filter === "All" ? "New Estimate" : undefined}
              onAction={() => onModal?.("new-estimate")}
            />
          ) : (
            <>
              {paged.map((est, i, arr) => (
                <button
                  key={est.id}
                  onClick={() => setSelected(est.id === selected ? null : est.id)}
                  className={`flex items-center gap-3 px-4 py-3.5 text-left transition-colors ${
                    est.id === selected ? "bg-[var(--accent)]/5" : "hover:bg-[var(--bg)]"
                  } ${i < arr.length - 1 ? "border-b border-[var(--sep)]" : ""}`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-[13px] font-medium truncate">{est.estimate_number}</p>
                      <StatusBadge status={est.status} />
                    </div>
                    <p className="text-[12px] text-[var(--secondary)] truncate">{est.project_type}</p>
                    <p className="text-[11px] text-[var(--tertiary)] truncate">{est.project_address}</p>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <p className="text-[14px] font-semibold">${Number(est.grand_total).toLocaleString()}</p>
                    {est.gross_margin_pct != null && (
                      <p className="text-[11px] text-[var(--secondary)]">{Number(est.gross_margin_pct).toFixed(1)}%</p>
                    )}
                  </div>
                </button>
              ))}
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
          <div className="ml-3 w-[45%] overflow-y-auto rounded-xl border border-[var(--sep)] bg-[var(--card)] p-5">
            <DetailPanel estimate={detail} onClose={() => setSelected(null)} onEditEstimate={onEditEstimate} />
          </div>
        )}
      </div>
    </div>
  );
}

function DetailPanel({ estimate, onClose, onEditEstimate }: { estimate: Estimate; onClose: () => void; onEditEstimate?: (estimate: any) => void }) {
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
          <h2 className="text-[18px] font-bold">{estimate.project_type}</h2>
          <StatusBadge status={estimate.status} className="mt-1 inline-block" />
        </div>
        <button onClick={onClose} className="rounded-md p-1 hover:bg-[var(--bg)]">
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="var(--gray1)" strokeWidth="2" strokeLinecap="round">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      <Section title="Details">
        <Row label="Address" value={estimate.project_address ?? "—"} />
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

      <div className="mt-4 space-y-2">
        <button onClick={() => onEditEstimate?.(estimate)} className="w-full rounded-lg bg-[var(--accent)] py-2.5 text-[13px] font-medium text-white transition-all active:scale-[0.99]">
          Open Estimate
        </button>
        <div className="flex gap-2">
          <button
            onClick={handleDuplicate}
            disabled={duplicating}
            className="flex-1 rounded-lg border border-[var(--sep)] py-2.5 text-[13px] font-medium transition-all hover:bg-[var(--bg)] disabled:opacity-50"
          >
            {duplicating ? "Duplicating..." : "Duplicate"}
          </button>
          <button className="flex-1 rounded-lg border border-[var(--sep)] py-2.5 text-[13px] font-medium transition-all hover:bg-[var(--bg)]">PDF</button>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-[var(--secondary)]">{title}</p>
      <div className="rounded-lg border border-[var(--sep)] divide-y divide-[var(--sep)]">{children}</div>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between px-3 py-2">
      <p className="text-[12px] text-[var(--secondary)]">{label}</p>
      <p className={`text-[12px] ${bold ? "font-bold" : "font-medium"}`}>{value}</p>
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
