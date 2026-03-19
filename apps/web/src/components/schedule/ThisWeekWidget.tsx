import { useState, useEffect } from "react";
import { useAppContext } from "../AppContext";

interface UpcomingPhase {
  id: string;
  estimateNumber: string;
  name: string;
  startDate: string;
  status: string;
}

export function ThisWeekWidget() {
  const { onNavigate } = useAppContext();
  const [phases, setPhases] = useState<UpcomingPhase[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPhases() {
      try {
        const res = await fetch("/api/schedule/upcoming?days=7");
        if (res.ok) { const data = await res.json(); setPhases((data.phases || []).slice(0, 5)); }
      } catch { /* ignore */ }
      setLoading(false);
    }
    fetchPhases();
  }, []);

  return (
    <div className="bg-[var(--card)] rounded-xl shadow-[var(--shadow-card)] border border-[var(--sep)] p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[14px] font-semibold">This Week</h2>
        <button onClick={() => onNavigate?.("schedule")} className="text-[11px] font-medium text-[var(--accent)] hover:underline">View all</button>
      </div>
      {loading ? (
        <div className="space-y-2">{[1, 2, 3].map((i) => (<div key={i} className="h-8 animate-pulse rounded-lg bg-[var(--gray5)]" />))}</div>
      ) : phases.length === 0 ? (
        <p className="text-[12px] text-[var(--secondary)] py-4 text-center">No phases this week</p>
      ) : (
        <div className="space-y-1.5">
          {phases.map((phase) => {
            const date = new Date(phase.startDate);
            const dayStr = date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
            return (
              <div key={phase.id} className="flex items-center gap-3 rounded-lg px-2.5 py-2 transition-colors hover:bg-[var(--fill)]">
                <span className="flex-shrink-0 text-[10px] font-medium text-[var(--accent)] w-16">{dayStr}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] text-[var(--label)] truncate">{phase.name}</p>
                  <p className="text-[10px] text-[var(--tertiary)]">{phase.estimateNumber}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
