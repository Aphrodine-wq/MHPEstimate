import { useState, useEffect, useMemo } from "react";

interface JobPhase {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: string;
  crew: string[];
  notes: string;
}

function useJobPhases(estimateId: string) {
  const [phases, setPhases] = useState<JobPhase[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPhases() {
      try {
        const res = await fetch(`/api/schedule/${estimateId}`);
        if (res.ok) { const data = await res.json(); setPhases(data.phases || []); }
      } catch { /* ignore */ }
      setLoading(false);
    }
    fetchPhases();
  }, [estimateId]);

  return { phases, loading, setPhases };
}

const STATUS_COLORS: Record<string, string> = {
  pending: "var(--gray3)", in_progress: "var(--accent)", completed: "var(--green)", delayed: "var(--orange)", blocked: "var(--red)",
};

interface PhaseTimelineProps {
  estimateId: string;
  onEditPhase?: (phase: JobPhase) => void;
}

export function PhaseTimeline({ estimateId, onEditPhase }: PhaseTimelineProps) {
  const { phases, loading } = useJobPhases(estimateId);

  const { minDate, maxDate, totalDays } = useMemo(() => {
    if (phases.length === 0) return { minDate: new Date(), maxDate: new Date(), totalDays: 1 };
    const dates = phases.flatMap((p) => [new Date(p.startDate), new Date(p.endDate)]);
    const min = new Date(Math.min(...dates.map((d) => d.getTime())));
    const max = new Date(Math.max(...dates.map((d) => d.getTime())));
    const days = Math.max(1, Math.ceil((max.getTime() - min.getTime()) / (1000 * 60 * 60 * 24)));
    return { minDate: min, maxDate: max, totalDays: days };
  }, [phases]);

  if (loading) return (<div className="p-6 space-y-3">{[1, 2, 3].map((i) => (<div key={i} className="h-10 animate-pulse rounded-lg bg-[var(--gray5)]" />))}</div>);
  if (phases.length === 0) return (<div className="p-6 text-center"><p className="text-[13px] text-[var(--secondary)]">No phases scheduled yet</p><p className="text-[11px] text-[var(--tertiary)] mt-1">Add phases to track the project schedule</p></div>);

  return (
    <div className="p-6">
      <p className="text-[14px] font-semibold text-[var(--label)] mb-4">Project Timeline</p>
      <div className="mb-2 flex items-center justify-between text-[10px] text-[var(--tertiary)]">
        <span>{minDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
        <span>{maxDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
      </div>
      <div className="space-y-2">
        {phases.map((phase) => {
          const start = new Date(phase.startDate);
          const end = new Date(phase.endDate);
          const offsetDays = Math.max(0, (start.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24));
          const durationDays = Math.max(1, (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
          const leftPct = (offsetDays / totalDays) * 100;
          const widthPct = Math.max(3, (durationDays / totalDays) * 100);
          const color = STATUS_COLORS[phase.status] || "var(--accent)";
          return (
            <div key={phase.id} className="relative">
              <div className="flex items-center gap-3 mb-1">
                <span className="text-[11px] font-medium text-[var(--label)] w-32 truncate">{phase.name}</span>
                <span className="text-[10px] text-[var(--tertiary)]">{start.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - {end.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
              </div>
              <div className="h-6 w-full rounded bg-[var(--gray5)] relative overflow-hidden">
                <button onClick={() => onEditPhase?.(phase)} className="absolute h-full rounded cursor-pointer transition-opacity hover:opacity-80" style={{ left: `${leftPct}%`, width: `${widthPct}%`, backgroundColor: color }} title={`${phase.name} (${phase.status})`} />
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-4 flex flex-wrap gap-3">
        {Object.entries(STATUS_COLORS).map(([status, color]) => (
          <div key={status} className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
            <span className="text-[10px] text-[var(--tertiary)] capitalize">{status.replace("_", " ")}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
