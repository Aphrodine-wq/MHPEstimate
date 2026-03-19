"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  ClockIcon,
  PlayIcon,
  StopIcon,
  UserIcon,
  WrenchScrewdriverIcon,
} from "@heroicons/react/24/outline";
import { AnimatedNumber } from "./AnimatedNumber";
import { useEstimates } from "@/lib/store";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TimeEntry {
  id: string;
  estimate_id: string;
  phase_id: string | null;
  worker_name: string;
  trade: string | null;
  clock_in: string;
  clock_out: string | null;
  break_minutes: number;
  hours_worked: number | null;
  hourly_rate: number | null;
  labor_cost: number | null;
  notes: string | null;
  estimates?: {
    id: string;
    estimate_number: string;
    project_type: string;
  };
}

interface TimeTrackingProps {
  estimateId?: string;
}

const TRADES = [
  { value: "general", label: "General" },
  { value: "framing", label: "Framing" },
  { value: "electrical", label: "Electrical" },
  { value: "plumbing", label: "Plumbing" },
  { value: "hvac", label: "HVAC" },
  { value: "drywall", label: "Drywall" },
  { value: "painting", label: "Painting" },
  { value: "flooring", label: "Flooring" },
  { value: "roofing", label: "Roofing" },
  { value: "concrete", label: "Concrete" },
  { value: "demolition", label: "Demolition" },
  { value: "finish_carpentry", label: "Finish Carpentry" },
  { value: "tile", label: "Tile" },
  { value: "insulation", label: "Insulation" },
  { value: "landscaping", label: "Landscaping" },
  { value: "siding", label: "Siding" },
  { value: "gutters", label: "Gutters" },
  { value: "windows_doors", label: "Windows & Doors" },
  { value: "other", label: "Other" },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatElapsed(clockInStr: string): string {
  const diff = Date.now() - new Date(clockInStr).getTime();
  const totalMinutes = Math.floor(diff / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  return `${hours}h ${String(mins).padStart(2, "0")}m`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function tradeBadgeColor(trade: string | null): string {
  const map: Record<string, string> = {
    electrical: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
    plumbing: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    hvac: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300",
    framing: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
    roofing: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
    concrete: "bg-stone-100 text-stone-800 dark:bg-stone-900/30 dark:text-stone-300",
    painting: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
    demolition: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  };
  return map[trade ?? ""] ?? "bg-[var(--fill)] text-[var(--secondary)]";
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TimeTracking({ estimateId }: TimeTrackingProps) {
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [clockOutId, setClockOutId] = useState<string | null>(null);
  const [, setTick] = useState(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  // Clock-in form state
  const [workerName, setWorkerName] = useState("");
  const [selectedEstimateId, setSelectedEstimateId] = useState(estimateId ?? "");
  const [selectedPhaseId, setSelectedPhaseId] = useState("");
  const [selectedTrade, setSelectedTrade] = useState("");
  const [hourlyRate, setHourlyRate] = useState("");
  const [clockInNotes, setClockInNotes] = useState("");

  // Clock-out form state
  const [breakMinutes, setBreakMinutes] = useState("");
  const [clockOutNotes, setClockOutNotes] = useState("");

  const { data: estimates } = useEstimates();

  // Tick active timers every 30s
  useEffect(() => {
    tickRef.current = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(tickRef.current);
  }, []);

  // Fetch entries
  const fetchEntries = useCallback(async () => {
    try {
      const url = estimateId
        ? `/api/time-entries?estimateId=${estimateId}`
        : "/api/time-entries";
      const res = await fetch(url);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to fetch time entries");
      }
      const data = await res.json();
      setEntries(data.entries ?? []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch time entries");
    } finally {
      setLoading(false);
    }
  }, [estimateId]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  // Active (clocked-in) entries
  const activeEntries = entries.filter((e) => !e.clock_out);
  const completedEntries = entries.filter((e) => e.clock_out);

  // Summary stats (this week)
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);

  const weekEntries = completedEntries.filter(
    (e) => new Date(e.clock_in) >= weekStart,
  );
  const totalHoursWeek = weekEntries.reduce((s, e) => s + (e.hours_worked ?? 0), 0);
  const totalCostWeek = weekEntries.reduce((s, e) => s + (e.labor_cost ?? 0), 0);
  const daysWithWork = new Set(
    weekEntries.map((e) => new Date(e.clock_in).toDateString()),
  ).size;
  const avgHoursPerDay = daysWithWork > 0 ? totalHoursWeek / daysWithWork : 0;

  // Clock In handler
  const handleClockIn = async () => {
    if (!workerName.trim() || !selectedEstimateId) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/time-entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "clock_in",
          estimate_id: selectedEstimateId,
          phase_id: selectedPhaseId || null,
          worker_name: workerName.trim(),
          trade: selectedTrade || undefined,
          hourly_rate: hourlyRate ? parseFloat(hourlyRate) : undefined,
          notes: clockInNotes || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to clock in");
      }
      // Reset form
      setWorkerName("");
      if (!estimateId) setSelectedEstimateId("");
      setSelectedPhaseId("");
      setSelectedTrade("");
      setHourlyRate("");
      setClockInNotes("");
      await fetchEntries();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to clock in");
    } finally {
      setSubmitting(false);
    }
  };

  // Clock Out handler
  const handleClockOut = async (entryId: string) => {
    setClockOutId(entryId);
  };

  const confirmClockOut = async () => {
    if (!clockOutId) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/time-entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "clock_out",
          entry_id: clockOutId,
          break_minutes: breakMinutes ? parseInt(breakMinutes, 10) : undefined,
          notes: clockOutNotes || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to clock out");
      }
      setClockOutId(null);
      setBreakMinutes("");
      setClockOutNotes("");
      await fetchEntries();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to clock out");
    } finally {
      setSubmitting(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--sep)] border-t-[var(--accent)]" />
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Header */}
        {!estimateId && (
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent-light)]">
              <ClockIcon className="h-5 w-5 text-[var(--accent)]" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight font-display">Time Tracking</h1>
              <p className="text-sm text-[var(--secondary)]">Track crew hours across all jobs</p>
            </div>
          </div>
        )}

        {/* Error Banner */}
        {error && (
          <div className="rounded-xl border border-[var(--red)]/20 bg-[var(--red)]/5 px-4 py-3 text-sm text-[var(--red)]">
            {error}
            <button
              onClick={() => setError(null)}
              className="ml-3 font-medium underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard
            label="Hours This Week"
            value={<AnimatedNumber value={totalHoursWeek} decimals={1} suffix="h" />}
          />
          <StatCard
            label="Labor Cost"
            value={<AnimatedNumber value={totalCostWeek} prefix="$" decimals={0} />}
          />
          <StatCard
            label="Avg Hours/Day"
            value={<AnimatedNumber value={avgHoursPerDay} decimals={1} suffix="h" />}
          />
          <StatCard
            label="Active Now"
            value={
              <span className="flex items-center gap-2">
                {activeEntries.length > 0 && (
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--green)] opacity-75" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[var(--green)]" />
                  </span>
                )}
                <AnimatedNumber value={activeEntries.length} />
              </span>
            }
          />
        </div>

        {/* Active Timers */}
        {activeEntries.length > 0 && (
          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--tertiary)]">
              Active Timers
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {activeEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="relative rounded-xl border border-[var(--sep)] bg-[var(--card)] p-4 shadow-[var(--shadow-card)] transition-all hover:shadow-[var(--shadow-md)]"
                >
                  {/* Pulsing green dot */}
                  <span className="absolute top-3 right-3 flex h-3 w-3">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--green)] opacity-75" />
                    <span className="relative inline-flex h-3 w-3 rounded-full bg-[var(--green)]" />
                  </span>

                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-[var(--fill)]">
                      <UserIcon className="h-4 w-4 text-[var(--gray1)]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[15px] font-semibold truncate">{entry.worker_name}</p>
                      {entry.trade && (
                        <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${tradeBadgeColor(entry.trade)}`}>
                          {TRADES.find((t) => t.value === entry.trade)?.label ?? entry.trade}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <div>
                      <p className="text-2xl font-bold tabular-nums font-display">
                        {formatElapsed(entry.clock_in)}
                      </p>
                      <p className="text-xs text-[var(--secondary)]">
                        Since {formatTime(entry.clock_in)}
                      </p>
                    </div>
                    <button
                      onClick={() => handleClockOut(entry.id)}
                      disabled={submitting}
                      className="flex items-center gap-1.5 rounded-lg bg-[var(--red)]/10 px-3 py-2 text-sm font-medium text-[var(--red)] transition-colors hover:bg-[var(--red)]/20 disabled:opacity-50"
                    >
                      <StopIcon className="h-4 w-4" />
                      Clock Out
                    </button>
                  </div>

                  {entry.estimates && (
                    <p className="mt-2 truncate text-xs text-[var(--secondary)]">
                      {entry.estimates.estimate_number} &mdash; {entry.estimates.project_type}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Clock Out Modal */}
        {clockOutId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="mx-4 w-full max-w-md animate-modal-content rounded-2xl bg-[var(--card)] p-6 shadow-[var(--shadow-lg)]">
              <h3 className="text-lg font-bold font-display">Clock Out</h3>
              <p className="mt-1 text-sm text-[var(--secondary)]">
                Enter break time and any notes before clocking out.
              </p>
              <div className="mt-4 space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-[var(--secondary)]">
                    Break Minutes
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={breakMinutes}
                    onChange={(e) => setBreakMinutes(e.target.value)}
                    placeholder="0"
                    className="w-full rounded-lg border border-[var(--sep)] bg-[var(--bg)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-[var(--secondary)]">
                    Notes
                  </label>
                  <textarea
                    value={clockOutNotes}
                    onChange={(e) => setClockOutNotes(e.target.value)}
                    placeholder="Optional notes..."
                    rows={2}
                    className="w-full rounded-lg border border-[var(--sep)] bg-[var(--bg)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]"
                  />
                </div>
              </div>
              <div className="mt-5 flex justify-end gap-2">
                <button
                  onClick={() => {
                    setClockOutId(null);
                    setBreakMinutes("");
                    setClockOutNotes("");
                  }}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-[var(--secondary)] hover:bg-[var(--fill)]"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmClockOut}
                  disabled={submitting}
                  className="flex items-center gap-1.5 rounded-lg bg-[var(--red)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--red)]/90 disabled:opacity-50"
                >
                  <StopIcon className="h-4 w-4" />
                  {submitting ? "Saving..." : "Confirm Clock Out"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Clock-In Form */}
        <section className="rounded-xl border border-[var(--sep)] bg-[var(--card)] p-5 shadow-[var(--shadow-card)]">
          <h2 className="mb-4 flex items-center gap-2 text-base font-bold font-display">
            <PlayIcon className="h-5 w-5 text-[var(--accent)]" />
            Clock In
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {/* Worker Name */}
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--secondary)]">
                Worker Name *
              </label>
              <input
                type="text"
                value={workerName}
                onChange={(e) => setWorkerName(e.target.value)}
                placeholder="e.g. John Smith"
                className="w-full rounded-lg border border-[var(--sep)] bg-[var(--bg)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]"
              />
            </div>

            {/* Estimate Selector */}
            {!estimateId && (
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--secondary)]">
                  Estimate *
                </label>
                <select
                  value={selectedEstimateId}
                  onChange={(e) => setSelectedEstimateId(e.target.value)}
                  className="w-full rounded-lg border border-[var(--sep)] bg-[var(--bg)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]"
                >
                  <option value="">Select estimate...</option>
                  {(estimates ?? [])
                    .filter((e) => e.status !== "declined" && e.status !== "expired")
                    .map((est) => (
                      <option key={est.id} value={est.id}>
                        {est.estimate_number} &mdash; {est.project_type}
                      </option>
                    ))}
                </select>
              </div>
            )}

            {/* Trade Selector */}
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--secondary)]">
                Trade
              </label>
              <div className="relative">
                <WrenchScrewdriverIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--gray2)]" />
                <select
                  value={selectedTrade}
                  onChange={(e) => setSelectedTrade(e.target.value)}
                  className="w-full rounded-lg border border-[var(--sep)] bg-[var(--bg)] py-2 pl-9 pr-3 text-sm outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]"
                >
                  <option value="">Select trade...</option>
                  {TRADES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Hourly Rate */}
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--secondary)]">
                Hourly Rate
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[var(--gray2)]">$</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={hourlyRate}
                  onChange={(e) => setHourlyRate(e.target.value)}
                  placeholder="45.00"
                  className="w-full rounded-lg border border-[var(--sep)] bg-[var(--bg)] py-2 pl-7 pr-3 text-sm outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]"
                />
              </div>
            </div>

            {/* Notes */}
            <div className="sm:col-span-2 lg:col-span-1">
              <label className="mb-1 block text-xs font-medium text-[var(--secondary)]">
                Notes
              </label>
              <input
                type="text"
                value={clockInNotes}
                onChange={(e) => setClockInNotes(e.target.value)}
                placeholder="Optional..."
                className="w-full rounded-lg border border-[var(--sep)] bg-[var(--bg)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]"
              />
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <button
              onClick={handleClockIn}
              disabled={submitting || !workerName.trim() || !selectedEstimateId}
              className="flex items-center gap-2 rounded-xl bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[var(--accent-hover)] hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <PlayIcon className="h-4 w-4" />
              {submitting ? "Clocking In..." : "Clock In"}
            </button>
          </div>
        </section>

        {/* Recent Entries Table */}
        <section className="rounded-xl border border-[var(--sep)] bg-[var(--card)] shadow-[var(--shadow-card)]">
          <div className="border-b border-[var(--sep)] px-5 py-3">
            <h2 className="text-base font-bold font-display">Recent Entries</h2>
          </div>
          {completedEntries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <ClockIcon className="mb-3 h-10 w-10 text-[var(--gray3)]" />
              <p className="text-sm font-medium text-[var(--secondary)]">No completed entries yet</p>
              <p className="mt-1 text-xs text-[var(--tertiary)]">
                Clock in a worker to start tracking time
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-[var(--sep)] text-xs font-semibold uppercase tracking-wide text-[var(--tertiary)]">
                    <th className="px-5 py-3">Date</th>
                    <th className="px-5 py-3">Worker</th>
                    <th className="px-5 py-3">Trade</th>
                    {!estimateId && <th className="px-5 py-3">Estimate</th>}
                    <th className="px-5 py-3 text-right">Hours</th>
                    <th className="px-5 py-3 text-right">Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--sep)]">
                  {completedEntries.map((entry, i) => (
                    <tr
                      key={entry.id}
                      className="transition-colors hover:bg-[var(--fill)]"
                      style={{ animationDelay: `${i * 30}ms` }}
                    >
                      <td className="whitespace-nowrap px-5 py-3">
                        <p className="font-medium">{formatDate(entry.clock_in)}</p>
                        <p className="text-xs text-[var(--secondary)]">
                          {formatTime(entry.clock_in)} &ndash; {formatTime(entry.clock_out!)}
                        </p>
                      </td>
                      <td className="px-5 py-3 font-medium">{entry.worker_name}</td>
                      <td className="px-5 py-3">
                        {entry.trade ? (
                          <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${tradeBadgeColor(entry.trade)}`}>
                            {TRADES.find((t) => t.value === entry.trade)?.label ?? entry.trade}
                          </span>
                        ) : (
                          <span className="text-[var(--tertiary)]">&mdash;</span>
                        )}
                      </td>
                      {!estimateId && (
                        <td className="px-5 py-3 text-[var(--secondary)]">
                          {entry.estimates?.estimate_number ?? "—"}
                        </td>
                      )}
                      <td className="whitespace-nowrap px-5 py-3 text-right tabular-nums font-medium">
                        {entry.hours_worked != null ? `${entry.hours_worked}h` : "—"}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-right tabular-nums font-medium">
                        {entry.labor_cost != null
                          ? `$${Number(entry.labor_cost).toLocaleString("en-US", { minimumFractionDigits: 2 })}`
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
                {/* Totals row */}
                <tfoot>
                  <tr className="border-t-2 border-[var(--sep)] bg-[var(--fill)] font-semibold">
                    <td className="px-5 py-3" colSpan={estimateId ? 3 : 4}>
                      Total
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 text-right tabular-nums">
                      {completedEntries
                        .reduce((s, e) => s + (e.hours_worked ?? 0), 0)
                        .toFixed(1)}
                      h
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 text-right tabular-nums">
                      $
                      {completedEntries
                        .reduce((s, e) => s + (e.labor_cost ?? 0), 0)
                        .toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stat Card sub-component
// ---------------------------------------------------------------------------

function StatCard({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-[var(--sep)] bg-[var(--card)] px-4 py-3 shadow-[var(--shadow-card)]">
      <p className="text-xs font-medium text-[var(--secondary)]">{label}</p>
      <p className="mt-1 text-xl font-bold tabular-nums font-display">{value}</p>
    </div>
  );
}
