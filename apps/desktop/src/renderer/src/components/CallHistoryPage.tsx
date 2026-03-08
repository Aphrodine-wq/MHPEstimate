import { useState } from "react";
import { useVoiceCalls } from "../lib/store";
import { EmptyState } from "./EmptyState";

export function CallHistoryPage() {
  const { data: calls, loading } = useVoiceCalls();
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <header className="px-8 pt-4 pb-1">
        <p className="text-[12px] text-[var(--secondary)]">{calls.length} recorded calls</p>
      </header>

      <div className="flex-1 overflow-y-auto px-8 py-4 pb-6">
        {loading ? (
          <div className="rounded-xl border border-[var(--sep)] bg-[var(--card)] p-4 space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex gap-3"><div className="h-9 w-9 animate-pulse rounded-full bg-[var(--gray5)]" /><div className="flex-1 space-y-1.5"><div className="h-3 w-32 animate-pulse rounded bg-[var(--gray5)]" /><div className="h-2.5 w-20 animate-pulse rounded bg-[var(--gray5)]" /></div></div>
            ))}
          </div>
        ) : calls.length === 0 ? (
          <EmptyState title="No calls yet" description="Voice calls with Alex will appear here with transcripts" />
        ) : (
          <div className="rounded-xl border border-[var(--sep)] bg-[var(--card)]">
            {calls.map((call, i, arr) => (
              <div key={call.id} className={`${i < arr.length - 1 ? "border-b border-[var(--sep)]" : ""}`}>
                <button
                  onClick={() => setExpanded(expanded === call.id ? null : call.id)}
                  className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-[var(--bg)]"
                >
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[var(--gray5)]">
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="var(--gray1)" strokeWidth="1.5" strokeLinecap="round">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-[13px] font-medium">{call.source === "twilio" ? "Phone Call" : "In-App Call"}</p>
                      <span className="rounded px-1.5 py-0.5 text-[10px] font-semibold bg-[var(--gray5)] text-[var(--gray1)]">{call.source}</span>
                    </div>
                    <p className="text-[11px] text-[var(--secondary)]">
                      {call.duration_sec ? `${Math.floor(call.duration_sec / 60)}m ${call.duration_sec % 60}s` : "—"}
                      {call.estimates_created?.length ? ` · ${call.estimates_created.length} estimate(s) created` : ""}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0 flex items-center gap-2">
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
                  <div className="mx-4 mb-3 rounded-lg border border-[var(--sep)] bg-[var(--bg)] p-3">
                    <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-[var(--secondary)]">Transcript</p>
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
