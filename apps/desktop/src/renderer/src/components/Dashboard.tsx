import { useEstimates, createEstimate } from "../lib/store";
import { isConnected } from "../lib/supabase";
import type { Estimate } from "@proestimate/shared/types";

interface DashboardProps {
  onNavigate?: (page: string) => void;
  onCallAlex?: () => void;
}

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft", in_review: "In Review", approved: "Approved",
  sent: "Sent", accepted: "Accepted", declined: "Declined",
  revision_requested: "Revision", expired: "Expired",
};

const STATUS_STYLE: Record<string, string> = {
  draft: "bg-[var(--gray5)] text-[var(--gray1)]",
  in_review: "bg-[#fff3e0] text-[#e65100]",
  approved: "bg-[#e3f2fd] text-[#1565c0]",
  sent: "bg-[#f3e5f5] text-[#7b1fa2]",
  accepted: "bg-[#e8f5e9] text-[#2e7d32]",
  declined: "bg-[#ffebee] text-[#c62828]",
  revision_requested: "bg-[#fff8e1] text-[#f57f17]",
  expired: "bg-[var(--gray5)] text-[var(--gray1)]",
};

export function Dashboard({ onNavigate, onCallAlex }: DashboardProps) {
  const { data: estimates, loading, refresh } = useEstimates();

  const sent = estimates.filter((e) => e.status === "sent" || e.status === "approved");
  const accepted = estimates.filter((e) => e.status === "accepted");
  const drafts = estimates.filter((e) => e.status === "draft" || e.status === "in_review");
  const totalPipeline = sent.reduce((sum, e) => sum + Number(e.grand_total), 0);
  const totalWon = accepted.reduce((sum, e) => sum + Number(e.grand_total), 0);
  const avgMargin = estimates.length
    ? estimates.reduce((sum, e) => sum + Number(e.gross_margin_pct ?? 0), 0) / estimates.length
    : 0;

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <header className="px-8 pt-6 pb-1">
        <h1 className="text-[24px] font-bold tracking-tight">Dashboard</h1>
        <p className="text-[12px] text-[var(--secondary)]">
          {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          {!isConnected() && " — Supabase not connected"}
        </p>
      </header>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-3 px-8 py-4">
        <Metric label="Pipeline" value={fmt(totalPipeline)} sub={`${sent.length} pending`} />
        <Metric label="Won" value={fmt(totalWon)} sub={`${accepted.length} accepted`} />
        <Metric label="Avg Margin" value={avgMargin ? `${avgMargin.toFixed(1)}%` : "—"} sub="Target 35–42%" />
        <Metric label="Drafts" value={drafts.length.toString()} sub="In progress" />
      </div>

      <div className="grid flex-1 grid-cols-5 gap-4 px-8 pb-6">
        {/* Recent estimates */}
        <div className="col-span-3 flex flex-col">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[13px] font-semibold">Recent Estimates</p>
          </div>
          <div className="flex-1 overflow-y-auto rounded-xl border border-[var(--sep)] bg-[var(--card)]">
            {loading ? (
              <LoadingRows count={4} />
            ) : estimates.length === 0 ? (
              <div className="flex h-full items-center justify-center py-16">
                <p className="text-[13px] text-[var(--secondary)]">No estimates yet</p>
              </div>
            ) : (
              estimates.slice(0, 8).map((est, i, arr) => (
                <EstimateRow key={est.id} estimate={est} last={i === arr.length - 1} />
              ))
            )}
          </div>
        </div>

        {/* Pipeline breakdown */}
        <div className="col-span-2 flex flex-col gap-4">
          <div>
            <p className="mb-2 text-[13px] font-semibold">Pipeline</p>
            <div className="rounded-xl border border-[var(--sep)] bg-[var(--card)] p-4">
              <p className="text-[22px] font-bold tracking-tight">{fmt(totalPipeline)}</p>
              <p className="mb-4 text-[11px] text-[var(--secondary)]">Total pending value</p>
              <div className="space-y-2">
                <PipelineRow label="Draft" count={estimates.filter((e) => e.status === "draft").length} total={estimates.length} />
                <PipelineRow label="In Review" count={estimates.filter((e) => e.status === "in_review").length} total={estimates.length} />
                <PipelineRow label="Sent" count={estimates.filter((e) => e.status === "sent").length} total={estimates.length} />
                <PipelineRow label="Approved" count={estimates.filter((e) => e.status === "approved").length} total={estimates.length} />
                <PipelineRow label="Accepted" count={accepted.length} total={estimates.length} />
              </div>
            </div>
          </div>

          <div className="flex-1">
            <p className="mb-2 text-[13px] font-semibold">Quick Actions</p>
            <div className="space-y-2">
              <ActionButton label="New Estimate" desc="Start from scratch" onClick={async () => { await createEstimate(); await refresh(); onNavigate?.("estimates"); }} />
              <ActionButton label="Quick Ballpark" desc="Voice or manual entry" onClick={() => onCallAlex?.()} />
              <ActionButton label="Upload Invoice" desc="Add supplier pricing" onClick={() => onNavigate?.("invoices")} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-xl border border-[var(--sep)] bg-[var(--card)] p-4">
      <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--secondary)]">{label}</p>
      <p className="mt-1 text-[22px] font-bold tracking-tight">{value}</p>
      <p className="text-[11px] text-[var(--secondary)]">{sub}</p>
    </div>
  );
}

function EstimateRow({ estimate, last }: { estimate: Estimate; last: boolean }) {
  return (
    <div className={`flex items-center gap-3 px-4 py-3 ${!last ? "border-b border-[var(--sep)]" : ""}`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-[13px] font-medium truncate">{estimate.estimate_number}</p>
          <span className={`flex-shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold ${STATUS_STYLE[estimate.status] ?? STATUS_STYLE.draft}`}>
            {STATUS_LABEL[estimate.status] ?? estimate.status}
          </span>
        </div>
        <p className="text-[12px] text-[var(--secondary)] truncate">{estimate.project_type}</p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-[13px] font-semibold">{fmt(Number(estimate.grand_total))}</p>
        {estimate.gross_margin_pct != null && (
          <p className="text-[11px] text-[var(--secondary)]">{Number(estimate.gross_margin_pct).toFixed(1)}%</p>
        )}
      </div>
    </div>
  );
}

function PipelineRow({ label, count, total }: { label: string; count: number; total: number }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <p className="w-16 text-[11px] text-[var(--secondary)]">{label}</p>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--gray5)]">
        <div className="h-full rounded-full bg-[var(--accent)] transition-all" style={{ width: `${pct}%` }} />
      </div>
      <p className="w-4 text-right text-[11px] font-medium">{count}</p>
    </div>
  );
}

function ActionButton({ label, desc, onClick }: { label: string; desc: string; onClick?: () => void }) {
  return (
    <button onClick={onClick} className="flex w-full items-center justify-between rounded-xl border border-[var(--sep)] bg-[var(--card)] px-4 py-3 text-left transition-colors hover:bg-[var(--bg)] active:scale-[0.99]">
      <div>
        <p className="text-[13px] font-medium">{label}</p>
        <p className="text-[11px] text-[var(--secondary)]">{desc}</p>
      </div>
      <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="var(--gray3)" strokeWidth="2" strokeLinecap="round"><path d="m9 18 6-6-6-6" /></svg>
    </button>
  );
}

function LoadingRows({ count }: { count: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={`flex items-center gap-3 px-4 py-3 ${i < count - 1 ? "border-b border-[var(--sep)]" : ""}`}>
          <div className="flex-1 space-y-2">
            <div className="h-3 w-32 animate-pulse rounded bg-[var(--gray5)]" />
            <div className="h-2.5 w-20 animate-pulse rounded bg-[var(--gray5)]" />
          </div>
          <div className="h-3 w-16 animate-pulse rounded bg-[var(--gray5)]" />
        </div>
      ))}
    </>
  );
}

function fmt(n: number): string {
  if (n === 0) return "$0";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toLocaleString()}`;
}
