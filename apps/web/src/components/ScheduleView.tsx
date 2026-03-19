import { useState, useEffect, useMemo } from "react";
import { StatusBadge } from "@proestimate/ui";
import { useAppContext } from "./AppContext";

interface Phase {
  id: string;
  estimateId: string;
  estimateNumber: string;
  name: string;
  startDate: string;
  endDate: string;
  status: string;
  crew: string[];
}

function useAllUpcomingPhases() {
  const [phases, setPhases] = useState<Phase[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPhases() {
      try {
        const res = await fetch("/api/schedule/upcoming");
        if (res.ok) {
          const data = await res.json();
          setPhases(data.phases || []);
        }
      } catch { /* ignore */ }
      setLoading(false);
    }
    fetchPhases();
  }, []);

  return { phases, loading };
}

export function ScheduleView() {
  const { onEditEstimate } = useAppContext();
  const { phases, loading } = useAllUpcomingPhases();
  const [dateFilter, setDateFilter] = useState<"week" | "month" | "all">("month");

  const filtered = useMemo(() => {
    const now = new Date();
    return phases.filter((p) => {
      const start = new Date(p.startDate);
      if (dateFilter === "week") {
        const weekEnd = new Date(now);
        weekEnd.setDate(weekEnd.getDate() + 7);
        return start <= weekEnd;
      }
      if (dateFilter === "month") {
        const monthEnd = new Date(now);
        monthEnd.setDate(monthEnd.getDate() + 30);
        return start <= monthEnd;
      }
      return true;
    });
  }, [phases, dateFilter]);

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <header className="flex items-center justify-between px-4 md:px-8 pt-4 pb-1">
        <p className="text-[12px] text-[var(--secondary)]">{phases.length} upcoming phases</p>
        <div className="flex items-center gap-1 rounded-lg bg-[var(--bg)] p-1">
          {(["week", "month", "all"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setDateFilter(f)}
              className={`rounded-md px-3 py-1 text-[11px] font-medium transition-colors ${
                dateFilter === f
                  ? "bg-[var(--card)] text-[var(--label)] shadow-sm"
                  : "text-[var(--secondary)] hover:text-[var(--label)]"
              }`}
            >
              {f === "week" ? "This Week" : f === "month" ? "This Month" : "All"}
            </button>
          ))}
        </div>
      </header>

      <div className="px-4 md:px-8 py-4">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-xl border border-[var(--sep)] bg-[var(--gray5)]" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-[var(--sep)] bg-[var(--card)] px-6 py-12 text-center">
            <p className="text-[13px] text-[var(--secondary)]">No upcoming phases scheduled</p>
            <p className="text-[11px] text-[var(--tertiary)] mt-1">Add phases from the estimate editor schedule tab</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((phase) => {
              const start = new Date(phase.startDate);
              const end = new Date(phase.endDate);
              const dateRange = `${start.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${end.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
              return (
                <div
                  key={phase.id}
                  className="flex items-center gap-4 rounded-xl border border-[var(--sep)] bg-[var(--card)] px-4 py-3 transition-colors hover:bg-[var(--fill)] cursor-pointer"
                >
                  <div className="flex-shrink-0 text-center w-20">
                    <p className="text-[11px] font-medium text-[var(--accent)]">{dateRange}</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-[13px] font-medium text-[var(--label)] truncate">{phase.name}</p>
                      <StatusBadge status={phase.status} />
                    </div>
                    <p className="text-[11px] text-[var(--secondary)] mt-0.5">
                      {phase.estimateNumber}
                      {phase.crew.length > 0 && ` · ${phase.crew.join(", ")}`}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
