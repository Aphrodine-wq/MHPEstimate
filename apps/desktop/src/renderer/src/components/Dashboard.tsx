import { useMemo } from "react";
import { useEstimates, useCurrentUser, useActivityFeed } from "../lib/store";
import type { ActivityEntry } from "../lib/store";
import { isConnected } from "../lib/supabase";
import { StatusBadge } from "@proestimate/ui/components";
import type { Estimate } from "@proestimate/shared/types";

interface DashboardProps {
  onNavigate?: (page: string) => void;
  onCallAlex?: () => void;
  onModal?: (m: string) => void;
  onEditEstimate?: (estimate: any) => void;
  onSignOut?: () => void;
}

// ── Helpers ──

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function fmt(n: number): string {
  if (n === 0) return "$0";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toLocaleString()}`;
}

function fmtFull(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function getFirstName(fullName: string): string {
  return fullName.split(" ")[0] ?? fullName;
}

function marginColor(pct: number): string {
  if (pct >= 35) return "var(--green)";
  if (pct >= 25) return "var(--orange)";
  return "var(--red)";
}

const ACTIVITY_COLORS: Record<ActivityEntry["type"], string> = {
  estimate: "var(--accent)",
  client: "var(--green)",
  invoice: "var(--purple)",
  call: "var(--orange)",
};

const ACTIVITY_TYPE_LABEL: Record<ActivityEntry["type"], string> = {
  estimate: "Estimate",
  client: "Client",
  invoice: "Invoice",
  call: "Call",
};

const STATUS_DOT_COLORS: Record<string, string> = {
  draft: "var(--gray3)",
  in_review: "#3B82F6",
  sent: "#F59E0B",
  approved: "var(--green)",
  accepted: "var(--accent)",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  in_review: "In Review",
  sent: "Sent",
  approved: "Approved",
  accepted: "Accepted",
};

// ── Mini Bar Chart ──

function MiniBarChart({ data }: { data: { label: string; value: number }[] }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="flex items-end gap-1.5" style={{ height: 48 }}>
      {data.map((d, i) => (
        <div key={d.label} className="flex-1 flex flex-col items-center gap-1">
          <div
            className="w-full rounded-sm transition-all"
            style={{
              height: `${(d.value / max) * 100}%`,
              minHeight: d.value > 0 ? 4 : 0,
              backgroundColor:
                i === data.length - 1 ? "var(--accent)" : "var(--gray4)",
            }}
          />
          <span className="text-[8px] text-[var(--tertiary)]">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

// ── Main Component ──

export function Dashboard({ onNavigate, onCallAlex, onModal }: DashboardProps) {
  const { data: estimates, loading } = useEstimates();
  const { user } = useCurrentUser();
  const activityEntries = useActivityFeed();

  // ── Derived data ──
  const sent = estimates.filter((e) => e.status === "sent" || e.status === "approved");
  const accepted = estimates.filter((e) => e.status === "accepted");
  const drafts = estimates.filter((e) => e.status === "draft" || e.status === "in_review");
  const pending = estimates.filter(
    (e) => e.status === "draft" || e.status === "in_review" || e.status === "sent" || e.status === "approved"
  );
  const totalPipeline = sent.reduce((sum, e) => sum + Number(e.grand_total), 0);
  const totalWon = accepted.reduce((sum, e) => sum + Number(e.grand_total), 0);
  const avgMargin = estimates.length
    ? estimates.reduce((sum, e) => sum + Number(e.gross_margin_pct ?? 0), 0) / estimates.length
    : 0;

  const firstName = user?.full_name ? getFirstName(user.full_name) : "there";

  const statusGroups = {
    draft: estimates.filter((e) => e.status === "draft"),
    in_review: estimates.filter((e) => e.status === "in_review"),
    sent: estimates.filter((e) => e.status === "sent"),
    approved: estimates.filter((e) => e.status === "approved"),
    accepted: estimates.filter((e) => e.status === "accepted"),
  };

  // ── Monthly estimate counts (last 6 months) ──
  const monthlyData = useMemo(() => {
    const now = new Date();
    const months: { label: string; value: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = d.toLocaleDateString("en-US", { month: "short" });
      const count = estimates.filter((e) => {
        const ed = new Date(e.created_at);
        return ed.getMonth() === d.getMonth() && ed.getFullYear() === d.getFullYear();
      }).length;
      months.push({ label, value: count });
    }
    return months;
  }, [estimates]);

  // ── Pipeline total for bar proportions ──
  const maxStatusAmount = Math.max(
    ...Object.values(statusGroups).map((g) =>
      g.reduce((s, e) => s + Number(e.grand_total), 0)
    ),
    1
  );

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      {/* ── Header Section ── */}
      <header className="px-8 pt-7 pb-4 slide-up">
        <div className="flex items-end justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="h-4 w-1 rounded-full bg-[var(--accent)]" />
              <p className="caps">Dashboard</p>
            </div>
            <h1 className="text-[26px] font-extrabold tight text-[var(--label)]">
              {getGreeting()}, {firstName}
            </h1>
            <p className="mt-1 text-[14px] text-[var(--secondary)]">
              {pending.length > 0 ? (
                <>
                  You have <span className="font-semibold text-[var(--label)]">{pending.length}</span> pending estimate{pending.length !== 1 ? "s" : ""} worth <span className="font-semibold text-[var(--label)]">{fmt(pending.reduce((s, e) => s + Number(e.grand_total), 0))}</span>
                </>
              ) : (
                "No pending estimates — create one to get started"
              )}
              {!isConnected() && (
                <span className="ml-3 inline-flex items-center gap-1.5 text-[var(--orange)]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[var(--orange)] status-live" />
                  Offline
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-4">
            {/* Pipeline value callout */}
            <div className="text-right">
              <p className="caps mb-0.5">Pipeline</p>
              <p className="text-[32px] font-extrabold tight tabular text-[var(--label)] leading-none">{fmt(totalPipeline)}</p>
              <div className="mt-1.5 ml-auto h-[2px] w-12 rounded-full bg-[var(--accent)]" />
            </div>
            <div className="h-10 w-px bg-[var(--sep)]" />
            {/* Mini stats */}
            <div className="flex gap-5">
              <MiniStat label="Won" value={fmt(totalWon)} />
              <MiniStat label="Margin" value={avgMargin ? `${avgMargin.toFixed(1)}%` : "--"} color={avgMargin >= 35 ? "var(--green)" : avgMargin >= 25 ? "var(--orange)" : avgMargin > 0 ? "var(--red)" : undefined} />
              <MiniStat label="Drafts" value={drafts.length.toString()} />
            </div>
          </div>
        </div>
      </header>

      {/* ── Main Content — 2-column layout ── */}
      <div
        className="grid flex-1 gap-5 px-8 pt-5 pb-4"
        style={{
          gridTemplateColumns: "1fr 340px",
          minHeight: 0,
        }}
      >
        {/* ── LEFT COLUMN: Recent Estimates Table ── */}
        <div className="flex flex-col slide-up" style={{ animationDelay: "60ms" }}>
          <div className="mb-2.5 flex items-center justify-between">
            <p className="text-[13px] font-semibold text-[var(--label)]">
              Recent Estimates
            </p>
            <button
              onClick={() => onNavigate?.("estimates")}
              className="text-[12px] font-medium text-[var(--accent)] transition-colors hover:text-[var(--accent-hover)]"
            >
              View All
            </button>
          </div>
          <div className="flex-1 overflow-hidden surface-elevated">
            {loading ? (
              <LoadingRows count={6} />
            ) : estimates.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center py-16 gap-3">
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-2xl"
                  style={{ backgroundColor: "rgba(196, 30, 58, 0.06)" }}
                >
                  <svg
                    width="24"
                    height="24"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="var(--accent)"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="12" y1="18" x2="12" y2="12" />
                    <line x1="9" y1="15" x2="15" y2="15" />
                  </svg>
                </div>
                <p className="text-[14px] font-semibold">No estimates yet</p>
                <p className="text-[12px] text-[var(--secondary)]">
                  Create your first estimate to get started
                </p>
                <button
                  onClick={() => onModal?.("new-estimate")}
                  className="mt-1 rounded-lg bg-[var(--accent)] px-4 py-2 text-[12px] font-semibold text-white transition-all hover:bg-[var(--accent-hover)] active:scale-[0.97]"
                >
                  Create Estimate
                </button>
              </div>
            ) : (
              <div className="flex h-full flex-col">
                {/* Table header */}
                <div className="flex items-center border-b border-[var(--sep)] px-4 py-2.5">
                  <span className="w-[100px] text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--secondary)]">
                    #
                  </span>
                  <span className="w-[80px] text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--secondary)]">
                    Type
                  </span>
                  <span className="flex-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--secondary)]">
                    Client
                  </span>
                  <span className="w-[80px] text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--secondary)]">
                    Status
                  </span>
                  <span className="w-[90px] text-right text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--secondary)]">
                    Total
                  </span>
                  <span className="w-[60px] text-right text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--secondary)]">
                    Margin
                  </span>
                </div>
                {/* Table rows */}
                <div className="flex-1 overflow-y-auto">
                  {estimates.slice(0, 6).map((est, i, arr) => (
                    <EstimateRow
                      key={est.id}
                      estimate={est}
                      last={i === arr.length - 1}
                      onNavigate={onNavigate}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT COLUMN: Actions + Status + Chart ── */}
        <div className="flex flex-col gap-4 overflow-y-auto scroll-thin slide-up" style={{ animationDelay: "120ms" }}>
          {/* Quick Actions — compact row */}
          <div className="flex gap-2">
            <button onClick={() => onModal?.("new-estimate")} className="flex-1 flex items-center gap-2 surface px-3 py-2.5 text-left transition-all hover:shadow-[var(--shadow-md)] active:scale-[0.98]">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ backgroundColor: "rgba(196, 30, 58, 0.08)" }}>
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
              </div>
              <div><p className="text-[11px] font-semibold">New Estimate</p></div>
            </button>
            <button onClick={() => onCallAlex?.()} className="flex-1 flex items-center gap-2 surface px-3 py-2.5 text-left transition-all hover:shadow-[var(--shadow-md)] active:scale-[0.98]">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ backgroundColor: "rgba(34, 197, 94, 0.08)" }}>
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="var(--green)" strokeWidth="2" strokeLinecap="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.09.6.28 1.2.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c1.61.42 2.21.61 2.81.7A2 2 0 0122 16.92z" /></svg>
              </div>
              <div><p className="text-[11px] font-semibold">Call Hunter</p></div>
            </button>
            <button onClick={() => onModal?.("upload-invoice")} className="flex-1 flex items-center gap-2 surface px-3 py-2.5 text-left transition-all hover:shadow-[var(--shadow-md)] active:scale-[0.98]">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ backgroundColor: "rgba(139, 92, 246, 0.08)" }}>
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="var(--purple)" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
              </div>
              <div><p className="text-[11px] font-semibold">Upload Invoice</p></div>
            </button>
          </div>

          {/* Pipeline Status Board */}
          {/* Pipeline Funnel */}
          <div className="surface-elevated p-4 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--secondary)] mb-4">
              Status Board
            </p>
            <div className="space-y-3">
              {(["draft", "in_review", "sent", "approved", "accepted"] as const).map(
                (key) => {
                  const group = statusGroups[key];
                  const amount = group.reduce((s, e) => s + Number(e.grand_total), 0);
                  const barPct =
                    maxStatusAmount > 0 ? (amount / maxStatusAmount) * 100 : 0;
                  return (
                    <div key={key}>
                      <div className="flex items-center gap-2 mb-1">
                        <div
                          className="h-[7px] w-[7px] rounded-full flex-shrink-0"
                          style={{ backgroundColor: STATUS_DOT_COLORS[key] }}
                        />
                        <span className="text-[11px] font-medium text-[var(--label)] flex-1">
                          {STATUS_LABELS[key]}
                        </span>
                        <span
                          className="text-[10px] font-semibold text-[var(--secondary)]"
                          style={{ fontVariantNumeric: "tabular-nums" }}
                        >
                          {group.length}
                        </span>
                        <span
                          className="text-[10px] text-[var(--secondary)] w-[48px] text-right"
                          style={{ fontVariantNumeric: "tabular-nums" }}
                        >
                          {fmt(amount)}
                        </span>
                      </div>
                      {/* Proportional bar */}
                      <div className="h-[5px] w-full overflow-hidden rounded-full bg-[var(--gray5)]">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.max(barPct, group.length > 0 ? 3 : 0)}%`,
                            backgroundColor: STATUS_DOT_COLORS[key],
                          }}
                        />
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          </div>

          {/* Monthly Chart */}
          <div className="surface-elevated p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--secondary)] mb-3">
              Monthly Estimates
            </p>
            <MiniBarChart data={monthlyData} />
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════
          BOTTOM ROW — Recent Activity (3 compact cards)
          ══════════════════════════════════════════════ */}
      {activityEntries.length > 0 && (
        <div className="px-8 pb-6 slide-up" style={{ animationDelay: "240ms" }}>
          <p className="mb-2 text-[13px] font-semibold text-[var(--label)]">
            Recent Activity
          </p>
          <div className="grid grid-cols-3 gap-3">
            {activityEntries.slice(0, 3).map((entry) => (
              <ActivityCard key={entry.id} entry={entry} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Mini Stat ──

function MiniStat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="text-right">
      <p className="caps mb-0.5">{label}</p>
      <p className="text-[16px] font-bold tight tabular leading-tight" style={color ? { color } : undefined}>
        {value}
      </p>
    </div>
  );
}

// ── Estimate Table Row ──

function EstimateRow({
  estimate,
  last,
  onNavigate,
}: {
  estimate: Estimate;
  last: boolean;
  onNavigate?: (page: string) => void;
}) {
  const margin =
    estimate.gross_margin_pct != null ? Number(estimate.gross_margin_pct) : null;

  return (
    <button
      onClick={() => onNavigate?.("estimates")}
      className={`flex w-full items-center px-4 py-3 text-left cursor-pointer transition-colors hover:bg-[var(--bg)] ${
        !last ? "border-b border-[var(--sep)]" : ""
      }`}
    >
      {/* # */}
      <span
        className="w-[100px] text-[13px] font-semibold truncate"
        style={{ fontVariantNumeric: "tabular-nums" }}
      >
        {estimate.estimate_number}
      </span>
      {/* Type */}
      <span className="w-[80px] text-[11px] text-[var(--secondary)] truncate">
        {estimate.estimate_category === "building" ? "Building" : "Infrastructure"}
      </span>
      {/* Client / Project */}
      <span className="flex-1 text-[12px] text-[var(--secondary)] truncate">
        {estimate.project_type}
      </span>
      {/* Status */}
      <span className="w-[80px]">
        <StatusBadge status={estimate.status} />
      </span>
      {/* Total */}
      <span
        className="w-[90px] text-right text-[13px] font-semibold"
        style={{ fontVariantNumeric: "tabular-nums" }}
      >
        {fmtFull(Number(estimate.grand_total))}
      </span>
      {/* Margin */}
      <span className="w-[60px] flex items-center justify-end gap-1.5">
        {margin != null ? (
          <>
            <span
              className="inline-block h-[6px] w-[6px] rounded-full"
              style={{ backgroundColor: marginColor(margin) }}
            />
            <span
              className="text-[12px] text-[var(--secondary)]"
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              {margin.toFixed(1)}%
            </span>
          </>
        ) : (
          <span className="text-[12px] text-[var(--tertiary)]">--</span>
        )}
      </span>
    </button>
  );
}

// ── Activity Card (horizontal) ──

function ActivityCard({ entry }: { entry: ActivityEntry }) {
  return (
    <div className="surface flex items-start gap-3 px-4 py-3.5 transition-all hover:shadow-[var(--shadow-md)]">
      <div
        className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg"
        style={{ backgroundColor: `${ACTIVITY_COLORS[entry.type]}12` }}
      >
        <div
          className="h-2 w-2 rounded-full"
          style={{ backgroundColor: ACTIVITY_COLORS[entry.type] }}
        />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[12px] font-medium leading-snug truncate">
          {entry.description}
        </p>
        <div className="mt-0.5 flex items-center gap-2">
          <span className="text-[10px] font-semibold text-[var(--secondary)]">
            {ACTIVITY_TYPE_LABEL[entry.type]}
          </span>
          <span className="text-[10px] text-[var(--tertiary)]">{entry.action}</span>
        </div>
      </div>
      <p className="flex-shrink-0 text-[10px] text-[var(--tertiary)]">
        {timeAgo(entry.timestamp)}
      </p>
    </div>
  );
}

// ── Loading Skeleton ──

function LoadingRows({ count }: { count: number }) {
  return (
    <div>
      {/* Skeleton header */}
      <div className="flex items-center border-b border-[var(--sep)] px-4 py-2.5">
        <div className="h-2.5 w-16 animate-pulse rounded bg-[var(--gray5)]" />
        <div className="ml-4 h-2.5 w-14 animate-pulse rounded bg-[var(--gray5)]" />
        <div className="ml-4 h-2.5 w-24 flex-1 animate-pulse rounded bg-[var(--gray5)]" />
        <div className="ml-4 h-2.5 w-14 animate-pulse rounded bg-[var(--gray5)]" />
        <div className="ml-4 h-2.5 w-16 animate-pulse rounded bg-[var(--gray5)]" />
      </div>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`flex items-center gap-3 px-4 py-3 ${
            i < count - 1 ? "border-b border-[var(--sep)]" : ""
          }`}
        >
          <div className="w-[100px]">
            <div className="h-3 w-20 animate-pulse rounded bg-[var(--gray5)]" />
          </div>
          <div className="w-[80px]">
            <div className="h-2.5 w-14 animate-pulse rounded bg-[var(--gray5)]" />
          </div>
          <div className="flex-1">
            <div className="h-2.5 w-28 animate-pulse rounded bg-[var(--gray5)]" />
          </div>
          <div className="w-[80px]">
            <div className="h-4 w-12 animate-pulse rounded bg-[var(--gray5)]" />
          </div>
          <div className="w-[90px] flex justify-end">
            <div className="h-3 w-16 animate-pulse rounded bg-[var(--gray5)]" />
          </div>
          <div className="w-[60px] flex justify-end">
            <div className="h-3 w-10 animate-pulse rounded bg-[var(--gray5)]" />
          </div>
        </div>
      ))}
    </div>
  );
}
