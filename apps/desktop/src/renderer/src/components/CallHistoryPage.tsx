import { useState, useMemo } from "react";
import { useVoiceCalls } from "../lib/store";

interface CallHistoryPageProps {
  onNavigate?: (page: string) => void;
  onCallAlex?: () => void;
  onModal?: (m: string) => void;
}

function formatDuration(totalSeconds: number): string {
  if (totalSeconds <= 0) return "0m";
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export function CallHistoryPage({ onCallAlex }: CallHistoryPageProps) {
  const { data: calls, loading } = useVoiceCalls();
  const [expanded, setExpanded] = useState<string | null>(null);

  /* ── Summary stats ── */
  const stats = useMemo(() => {
    let totalDuration = 0;
    let estimatesCreated = 0;
    for (const call of calls) {
      if (call.duration_sec) totalDuration += call.duration_sec;
      if (call.estimates_created?.length) estimatesCreated += call.estimates_created.length;
    }
    return {
      totalCalls: calls.length,
      totalDuration,
      estimatesCreated,
    };
  }, [calls]);

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      {/* ── Header ── */}
      <header className="px-8 pt-6 pb-4 slide-up">
        <div className="flex items-end justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="h-4 w-1 rounded-full bg-[var(--accent)]" />
              <p className="caps">Calls</p>
            </div>
            <h1 className="text-[20px] font-extrabold tight">Call History</h1>
            <p className="mt-0.5 text-[12px] text-[var(--secondary)]">{calls.length} recorded calls</p>
          </div>
          {onCallAlex && (
            <button
              onClick={onCallAlex}
              className="flex items-center gap-2 rounded-lg bg-[var(--accent)] px-3.5 py-1.5 text-[12px] font-semibold text-white shadow-sm shadow-[var(--accent)]/20 transition-all hover:bg-[var(--accent-hover)] active:scale-[0.98]"
            >
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
              Call Hunter
            </button>
          )}
        </div>
      </header>

      {/* ── Summary Stats ── */}
      <div className="grid grid-cols-3 gap-3 px-8 py-4 slide-up stagger-1">
        <div className="surface rounded-xl p-4">
          <p className="caps mb-1">Total Calls</p>
          <p className="text-[22px] font-bold tight tabular">{stats.totalCalls}</p>
        </div>
        <div className="surface rounded-xl p-4">
          <p className="caps mb-1">Total Duration</p>
          <p className="text-[22px] font-bold tight tabular">
            {stats.totalDuration > 0 ? formatDuration(stats.totalDuration) : "\u2014"}
          </p>
        </div>
        <div className="surface rounded-xl p-4">
          <p className="caps mb-1">Estimates Created</p>
          <p className="text-[22px] font-bold tight tabular">{stats.estimatesCreated}</p>
        </div>
      </div>

      {/* ── Call List ── */}
      <div className="flex-1 overflow-y-auto px-8 pb-6 slide-up stagger-2">
        {loading ? (
          <div className="surface-elevated p-4 space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex gap-3">
                <div className="h-9 w-9 animate-pulse rounded-full bg-[var(--gray5)]" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 w-32 animate-pulse rounded bg-[var(--gray5)]" />
                  <div className="h-2.5 w-20 animate-pulse rounded bg-[var(--gray5)]" />
                </div>
              </div>
            ))}
          </div>
        ) : calls.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24">
            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-[var(--accent)]/8">
              <svg width="40" height="40" fill="none" viewBox="0 0 24 24" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
            </div>
            <p className="text-[18px] font-extrabold tight mb-2">Meet Hunter, Your AI Estimator</p>
            <p className="max-w-[340px] text-center text-[13px] leading-relaxed text-[var(--secondary)] mb-1">
              Call Hunter to create estimates by voice. Describe a project and Hunter builds the line items, applies pricing, and generates a full estimate in minutes.
            </p>
            <div className="flex items-center gap-4 mt-4 mb-6">
              <div className="flex items-center gap-1.5 text-[11px] text-[var(--secondary)]">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--green)]" />
                Voice-to-estimate
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-[var(--secondary)]">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--green)]" />
                Auto line items
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-[var(--secondary)]">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--green)]" />
                Real-time pricing
              </div>
            </div>
            {onCallAlex && (
              <button
                onClick={onCallAlex}
                className="flex items-center gap-2 rounded-xl bg-[var(--accent)] px-6 py-3 text-[14px] font-semibold text-white shadow-sm shadow-[var(--accent)]/20 transition-all hover:bg-[var(--accent-hover)] active:scale-[0.97]"
              >
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
                Call Hunter Now
              </button>
            )}
          </div>
        ) : (
          <div className="surface-elevated">
            {calls.map((call, i, arr) => (
              <div key={call.id} className={`${i < arr.length - 1 ? "border-b border-[var(--sep)]" : ""}`}>
                <button
                  onClick={() => setExpanded(expanded === call.id ? null : call.id)}
                  className="flex w-full items-center gap-3 px-4 py-4 text-left transition-colors hover:bg-[var(--bg)]"
                >
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[var(--green)]/10">
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="var(--green)" strokeWidth="1.5" strokeLinecap="round">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-[13px] font-medium">{call.source === "twilio" ? "Phone Call" : "In-App Call"}</p>
                      <span className="rounded-md border border-[var(--accent)]/20 bg-[var(--accent)]/[0.06] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--accent)]">{call.source}</span>
                    </div>
                    <p className="text-[11px] text-[var(--secondary)]">
                      {call.duration_sec ? `${Math.floor(call.duration_sec / 60)}m ${call.duration_sec % 60}s` : "\u2014"}
                      {call.estimates_created?.length ? ` \u00B7 ${call.estimates_created.length} estimate(s) created` : ""}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0 flex items-center gap-3">
                    {call.duration_sec != null && call.duration_sec > 0 && (
                      <p className="text-[15px] font-bold tabular text-[var(--label)]">
                        {Math.floor(call.duration_sec / 60)}:{String(call.duration_sec % 60).padStart(2, "0")}
                      </p>
                    )}
                    <div>
                      <p className="text-[12px] text-[var(--secondary)]">{new Date(call.started_at).toLocaleDateString()}</p>
                      <p className="text-[11px] text-[var(--tertiary)]">{new Date(call.started_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
                    </div>
                    <svg
                      width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="var(--gray3)" strokeWidth="2.5" strokeLinecap="round"
                      className={`transition-transform ${expanded === call.id ? "rotate-90" : ""}`}
                    >
                      <path d="m9 18 6-6-6-6" />
                    </svg>
                  </div>
                </button>
                {expanded === call.id && (
                  <div className="surface mx-4 mb-3 p-3">
                    <p className="caps mb-1">Transcript</p>
                    {call.transcript ? (
                      <p className="whitespace-pre-wrap text-[12px] text-[var(--label)] leading-relaxed">{call.transcript}</p>
                    ) : (
                      <p className="text-[12px] text-[var(--tertiary)] italic">No transcript available</p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
