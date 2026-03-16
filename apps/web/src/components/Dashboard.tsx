import { useEstimates, useClients, useInvoices, useActivityFeed } from "../lib/store";
import type { ActivityEntry } from "../lib/store";
import { isConnected } from "../lib/supabase";
import { StatusBadge } from "@proestimate/ui/components";
import { useAppContext } from "./AppContext";
import type { Estimate } from "@proestimate/shared/types";

const QUOTES = [
  { text: "The bitterness of poor quality remains long after the sweetness of low price is forgotten.", author: "Benjamin Franklin" },
  { text: "Quality means doing it right when no one is looking.", author: "Henry Ford" },
  { text: "Measure twice, cut once.", author: "Proverb" },
  { text: "The best time to plant a tree was 20 years ago. The second best time is now.", author: "Chinese Proverb" },
  { text: "Success is not final, failure is not fatal: it is the courage to continue that counts.", author: "Winston Churchill" },
  { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
  { text: "In the middle of difficulty lies opportunity.", author: "Albert Einstein" },
  { text: "Excellence is not a skill. It is an attitude.", author: "Ralph Marston" },
  { text: "The details are not the details. They make the design.", author: "Charles Eames" },
  { text: "Build your reputation by helping other people build theirs.", author: "Anthony J. D'Angelo" },
  { text: "A good plan today is better than a perfect plan tomorrow.", author: "George S. Patton" },
  { text: "Price is what you pay. Value is what you get.", author: "Warren Buffett" },
  { text: "The foundation of every state is the education of its youth.", author: "Diogenes" },
  { text: "Vision without execution is hallucination.", author: "Thomas Edison" },
  { text: "Do what you can, with what you have, where you are.", author: "Theodore Roosevelt" },
  { text: "Building a house is about dreaming and finding a way to build that dream with your own hands.", author: "Kevin McCloud" },
  { text: "Construction is a team sport.", author: "Matt Stevens" },
  { text: "Safety is not a gadget but a state of mind.", author: "Eleanor Everet" },
  { text: "Every accomplishment starts with the decision to try.", author: "John F. Kennedy" },
  { text: "The strength of the team is each individual member.", author: "Phil Jackson" },
  { text: "Simplicity is the ultimate sophistication.", author: "Leonardo da Vinci" },
  { text: "Well done is better than well said.", author: "Benjamin Franklin" },
  { text: "Your most unhappy customers are your greatest source of learning.", author: "Bill Gates" },
  { text: "Success usually comes to those who are too busy to be looking for it.", author: "Henry David Thoreau" },
  { text: "It always seems impossible until it's done.", author: "Nelson Mandela" },
  { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
  { text: "Don't count the days, make the days count.", author: "Muhammad Ali" },
  { text: "Innovation distinguishes between a leader and a follower.", author: "Steve Jobs" },
  { text: "You miss 100% of the shots you don't take.", author: "Wayne Gretzky" },
  { text: "The way to get started is to quit talking and begin doing.", author: "Walt Disney" },
];

const ACTIVITY_COLORS: Record<ActivityEntry["type"], string> = {
  estimate: "bg-[var(--accent)]",
  client: "bg-[var(--green)]",
  invoice: "bg-[var(--purple)]",
  call: "bg-[var(--orange)]",
};

const ACTIVITY_TYPE_LABEL: Record<ActivityEntry["type"], string> = {
  estimate: "Estimate",
  client: "Client",
  invoice: "Invoice",
  call: "Call",
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export function Dashboard() {
  const { onNavigate, onCallAlex, onModal } = useAppContext();
  const { data: estimates, loading } = useEstimates();
  const { data: clients } = useClients();
  const { data: invoices } = useInvoices();
  const activityEntries = useActivityFeed();

  const todayQuote = QUOTES[Math.floor(Date.now() / 86400000) % QUOTES.length]!;

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
      <header className="flex items-center justify-between px-4 md:px-8 pt-5 pb-1">
        <div>
          <p className="text-[12px] text-[var(--secondary)]">
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
            {!isConnected() && " — Supabase not connected"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => onModal?.("new-estimate")} className="rounded-lg bg-[var(--accent)] px-3.5 py-1.5 text-[12px] font-semibold text-white shadow-sm shadow-[var(--accent)]/20 transition-all hover:brightness-110 active:scale-[0.98]">
            New Estimate
          </button>
        </div>
      </header>

      {/* KPIs row: 4 metrics + quote of the day */}
      <div className="grid grid-cols-1 lg:grid-cols-7 gap-3 px-4 md:px-8 py-4">
        <div className="col-span-1 lg:col-span-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Metric label="Pipeline" value={fmt(totalPipeline)} sub={`${sent.length} pending`} />
          <Metric label="Won" value={fmt(totalWon)} sub={`${accepted.length} accepted`} />
          <Metric label="Clients" value={clients.length.toString()} sub={`${clients.length === 1 ? "1 client" : `${clients.length} total`}`} />
          <Metric label="Avg Margin" value={avgMargin ? `${avgMargin.toFixed(1)}%` : "—"} sub="Target 35–42%" />
        </div>
        <div className="col-span-1 lg:col-span-2 flex flex-col rounded-xl border border-[var(--sep)] bg-[var(--card)] p-4">
          <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--secondary)]">Quote of the Day</p>
          <div className="mt-2 flex flex-1 items-start gap-2">
            <div className="mt-0.5 h-full w-[3px] flex-shrink-0 rounded-full bg-[var(--accent)]" />
            <div className="min-w-0">
              <p className="text-[13px] italic leading-snug text-[var(--label)]">{todayQuote.text}</p>
              <p className="mt-1 text-[11px] text-[var(--secondary)]">— {todayQuote.author}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main content: left (estimates + actions/pipeline) + right (activity feed) */}
      <div className="grid flex-1 grid-cols-1 lg:grid-cols-7 gap-4 px-4 md:px-8 pb-6">
        {/* Left column */}
        <div className="col-span-1 lg:col-span-5 flex flex-col gap-4">
          {/* Recent estimates */}
          <div className="flex flex-1 flex-col">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[13px] font-semibold">Recent Estimates</p>
              {estimates.length > 5 && (
                <button onClick={() => onNavigate?.("estimates")} className="text-[12px] font-medium text-[var(--accent)] hover:underline">
                  View all
                </button>
              )}
            </div>
            <div className="flex-1 overflow-y-auto rounded-xl border border-[var(--sep)] bg-[var(--card)]">
              {loading ? (
                <LoadingRows count={4} />
              ) : estimates.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-3 py-16">
                  <p className="text-[13px] text-[var(--secondary)]">No estimates yet</p>
                  <button onClick={() => onModal?.("new-estimate")} className="rounded-lg bg-[var(--accent)] px-4 py-2 text-[12px] font-semibold text-white shadow-sm shadow-[var(--accent)]/20 transition-all hover:brightness-110">
                    Create First Estimate
                  </button>
                </div>
              ) : (
                estimates.slice(0, 8).map((est, i, arr) => (
                  <EstimateRow key={est.id} estimate={est} last={i === arr.length - 1} onNavigate={onNavigate} />
                ))
              )}
            </div>
          </div>

          {/* Quick Actions + Pipeline Breakdown */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="mb-2 text-[13px] font-semibold">Quick Actions</p>
              <div className="space-y-2">
                <ActionButton label="New Estimate" desc="Start from scratch" onClick={() => onModal?.("new-estimate")} />
                <ActionButton label="Add Client" desc="Add a new client" onClick={() => onModal?.("add-client")} />
                <ActionButton label="Quick Ballpark" desc="Voice or manual entry" onClick={() => onCallAlex?.()} />
                <ActionButton label="Upload Invoice" desc="Add supplier pricing" onClick={() => onModal?.("upload-invoice")} />
                <ActionButton label="View Analytics" desc="Reports & insights" onClick={() => onNavigate?.("analytics")} />
              </div>
            </div>
            <div>
              <p className="mb-2 text-[13px] font-semibold">Estimate Tracker</p>
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
          </div>
        </div>

        {/* Right column: Activity Feed */}
        <div className="col-span-1 lg:col-span-2 flex flex-col">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[13px] font-semibold">Activity Feed</p>
          </div>
          <div className="flex-1 overflow-y-auto rounded-xl border border-[var(--sep)] bg-[var(--card)]">
            <ActivityFeed entries={activityEntries} />
          </div>
        </div>
      </div>
    </div>
  );
}

function ActivityFeed({ entries }: { entries: ActivityEntry[] }) {
  if (entries.length === 0) {
    return (
      <div className="flex h-full items-center justify-center py-16">
        <p className="text-[13px] text-[var(--secondary)]">No recent activity</p>
      </div>
    );
  }

  return (
    <div role="list" aria-label="Activity feed">
      {entries.map((entry, i) => (
        <div
          key={entry.id}
          role="listitem"
          className={`flex items-start gap-3 px-4 py-3 ${i < entries.length - 1 ? "border-b border-[var(--sep)]" : ""}`}
        >
          <div className="mt-1.5 flex-shrink-0">
            <div className={`h-2 w-2 rounded-full ${ACTIVITY_COLORS[entry.type]}`} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] leading-snug truncate">{entry.description}</p>
            <div className="mt-0.5 flex items-center gap-2">
              <span className="text-[11px] text-[var(--secondary)]">{ACTIVITY_TYPE_LABEL[entry.type]}</span>
              <span className="text-[11px] text-[var(--tertiary)]">{entry.action}</span>
            </div>
          </div>
          <p className="flex-shrink-0 text-[11px] text-[var(--secondary)]">{timeAgo(entry.timestamp)}</p>
        </div>
      ))}
    </div>
  );
}

function Metric({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-xl border border-[var(--sep)] bg-[var(--card)] p-4" aria-label={`${label}: ${value}, ${sub}`}>
      <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--secondary)]">{label}</p>
      <p className="mt-1 text-[22px] font-bold tracking-tight">{value}</p>
      <p className="text-[11px] text-[var(--secondary)]">{sub}</p>
    </div>
  );
}

function EstimateRow({ estimate, last, onNavigate }: { estimate: Estimate; last: boolean; onNavigate?: (page: string) => void }) {
  return (
    <button
      onClick={() => onNavigate?.("estimates")}
      className={`flex w-full items-center gap-3 px-4 py-3 text-left cursor-pointer transition-colors hover:bg-[var(--bg)] ${!last ? "border-b border-[var(--sep)]" : ""}`}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-[13px] font-medium truncate">{estimate.estimate_number}</p>
          <StatusBadge status={estimate.status} />
        </div>
        <p className="text-[12px] text-[var(--secondary)] truncate">{estimate.project_type}</p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-[13px] font-semibold">{fmt(Number(estimate.grand_total))}</p>
        {estimate.gross_margin_pct != null && (
          <p className="text-[11px] text-[var(--secondary)]">{Number(estimate.gross_margin_pct).toFixed(1)}%</p>
        )}
      </div>
    </button>
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
