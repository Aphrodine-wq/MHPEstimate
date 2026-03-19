import { useState, useEffect, useCallback, useMemo } from "react";
import { Badge, Modal, Field, inputClass, textareaClass, selectClass } from "@proestimate/ui";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DailyLogEntry {
  id: string;
  estimate_id: string;
  log_date: string;
  weather: string | null;
  temperature_f: number | null;
  crew_count: number;
  hours_on_site: number | null;
  work_performed: string | null;
  materials_used: string | null;
  deliveries: string | null;
  visitors: string | null;
  issues: string | null;
  safety_notes: string | null;
  delay_reason: string | null;
  delay_hours: number | null;
  created_by_name: string | null;
  created_at: string;
  updated_at: string;
}

type WeatherType = "clear" | "cloudy" | "rain" | "snow" | "wind" | "extreme_heat" | "extreme_cold";

const WEATHER_OPTIONS: { id: WeatherType; label: string; icon: string }[] = [
  { id: "clear", label: "Clear", icon: "sun" },
  { id: "cloudy", label: "Cloudy", icon: "cloud" },
  { id: "rain", label: "Rain", icon: "rain" },
  { id: "snow", label: "Snow", icon: "snow" },
  { id: "wind", label: "Windy", icon: "wind" },
  { id: "extreme_heat", label: "Extreme Heat", icon: "heat" },
  { id: "extreme_cold", label: "Extreme Cold", icon: "cold" },
];

function WeatherIcon({ weather, size = 16 }: { weather: string | null; size?: number }) {
  const s = size;
  switch (weather) {
    case "clear":
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="var(--orange)" strokeWidth="2" strokeLinecap="round">
          <circle cx="12" cy="12" r="5" />
          <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
          <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
        </svg>
      );
    case "cloudy":
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="var(--gray2)" strokeWidth="2" strokeLinecap="round">
          <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
        </svg>
      );
    case "rain":
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="var(--teal)" strokeWidth="2" strokeLinecap="round">
          <line x1="16" y1="13" x2="16" y2="21" /><line x1="8" y1="13" x2="8" y2="21" /><line x1="12" y1="15" x2="12" y2="23" />
          <path d="M20 16.58A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25" />
        </svg>
      );
    case "snow":
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="var(--teal)" strokeWidth="2" strokeLinecap="round">
          <path d="M20 17.58A5 5 0 0 0 18 8h-1.26A8 8 0 1 0 4 16.25" />
          <line x1="8" y1="16" x2="8.01" y2="16" /><line x1="8" y1="20" x2="8.01" y2="20" />
          <line x1="12" y1="18" x2="12.01" y2="18" /><line x1="12" y1="22" x2="12.01" y2="22" />
          <line x1="16" y1="16" x2="16.01" y2="16" /><line x1="16" y1="20" x2="16.01" y2="20" />
        </svg>
      );
    case "wind":
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="var(--gray2)" strokeWidth="2" strokeLinecap="round">
          <path d="M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8.27A2.5 2.5 0 1 1 19.5 12H2" />
        </svg>
      );
    case "extreme_heat":
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="var(--red)" strokeWidth="2" strokeLinecap="round">
          <path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z" />
        </svg>
      );
    case "extreme_cold":
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="var(--teal)" strokeWidth="2" strokeLinecap="round">
          <path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z" />
        </svg>
      );
    default:
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="var(--gray3)" strokeWidth="2" strokeLinecap="round">
          <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      );
  }
}

function formatDate(dateStr: string): string {
  const d = dateStr.length === 10
    ? new Date(dateStr + "T12:00:00")
    : new Date(dateStr);
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

function formatDateShort(dateStr: string): string {
  const d = dateStr.length === 10
    ? new Date(dateStr + "T12:00:00")
    : new Date(dateStr);
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function todayStr(): string {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// Daily Log Component
// ---------------------------------------------------------------------------

interface DailyLogProps {
  estimateId: string;
}

export function DailyLog({ estimateId }: DailyLogProps) {
  const [logs, setLogs] = useState<DailyLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingLog, setEditingLog] = useState<DailyLogEntry | null>(null);

  const fetchLogs = useCallback(async () => {
    if (!estimateId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/daily-logs?estimateId=${estimateId}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs ?? []);
      }
    } catch {
      /* ignore */
    }
    setLoading(false);
  }, [estimateId]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // --- Summary Stats ---
  const summary = useMemo(() => {
    const totalDays = logs.length;
    const totalCrewDays = logs.reduce((sum, l) => sum + (l.crew_count ?? 0), 0);
    const totalHours = logs.reduce((sum, l) => sum + (l.hours_on_site ?? 0), 0);
    const issueCount = logs.filter((l) => l.issues && l.issues.trim().length > 0).length;
    const weatherCounts = new Map<string, number>();
    for (const l of logs) {
      if (l.weather) {
        weatherCounts.set(l.weather, (weatherCounts.get(l.weather) ?? 0) + 1);
      }
    }
    return { totalDays, totalCrewDays, totalHours, issueCount, weatherCounts };
  }, [logs]);

  const handleEdit = useCallback((log: DailyLogEntry) => {
    setEditingLog(log);
    setShowForm(true);
  }, []);

  const handleNew = useCallback(() => {
    setEditingLog(null);
    setShowForm(true);
  }, []);

  if (!estimateId) {
    return (
      <div className="flex h-full items-center justify-center px-4">
        <p className="text-[13px] text-[var(--secondary)]">No estimate selected. Use ?estimateId= to load daily logs.</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-[var(--sep)] px-4 pb-3 pt-4 md:px-8">
        <div>
          <h2 className="text-[15px] font-semibold text-[var(--label)]">Daily Log</h2>
          <p className="text-[11px] text-[var(--secondary)]">{logs.length} entr{logs.length !== 1 ? "ies" : "y"} logged</p>
        </div>
        <button
          onClick={handleNew}
          className="flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-3 py-1.5 text-[12px] font-medium text-white transition-all hover:bg-[var(--accent-hover)] active:scale-[0.98]"
        >
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          New Entry
        </button>
      </header>

      {/* Summary Bar */}
      {logs.length > 0 && (
        <div className="grid grid-cols-2 gap-3 border-b border-[var(--sep)] px-4 py-3 sm:grid-cols-4 md:px-8">
          <div className="rounded-xl border border-[var(--sep)] bg-[var(--card)] px-3 py-2.5">
            <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--tertiary)]">Days Logged</p>
            <p className="mt-0.5 text-[18px] font-bold tabular-nums text-[var(--label)]">{summary.totalDays}</p>
          </div>
          <div className="rounded-xl border border-[var(--sep)] bg-[var(--card)] px-3 py-2.5">
            <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--tertiary)]">Crew-Days</p>
            <p className="mt-0.5 text-[18px] font-bold tabular-nums text-[var(--label)]">{summary.totalCrewDays}</p>
          </div>
          <div className="rounded-xl border border-[var(--sep)] bg-[var(--card)] px-3 py-2.5">
            <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--tertiary)]">Total Hours</p>
            <p className="mt-0.5 text-[18px] font-bold tabular-nums text-[var(--label)]">{summary.totalHours.toFixed(1)}</p>
          </div>
          <div className="rounded-xl border border-[var(--sep)] bg-[var(--card)] px-3 py-2.5">
            <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--tertiary)]">Issues Flagged</p>
            <p className={`mt-0.5 text-[18px] font-bold tabular-nums ${summary.issueCount > 0 ? "text-[var(--red)]" : "text-[var(--label)]"}`}>
              {summary.issueCount}
            </p>
          </div>
        </div>
      )}

      {/* Weather Distribution */}
      {summary.weatherCounts.size > 0 && (
        <div className="flex items-center gap-3 border-b border-[var(--sep)] px-4 py-2.5 md:px-8">
          <span className="text-[10px] font-medium uppercase tracking-wider text-[var(--tertiary)]">Weather</span>
          <div className="flex items-center gap-2">
            {Array.from(summary.weatherCounts.entries()).map(([w, count]) => (
              <div key={w} className="flex items-center gap-1">
                <WeatherIcon weather={w} size={14} />
                <span className="text-[11px] font-medium text-[var(--secondary)]">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Log List */}
      <div className="flex-1 overflow-y-auto px-4 py-4 md:px-8">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-20 animate-pulse rounded-xl border border-[var(--sep)] bg-[var(--gray5)]" />
            ))}
          </div>
        ) : logs.length === 0 ? (
          <div className="rounded-xl border border-[var(--sep)] bg-[var(--card)] px-6 py-12 text-center">
            <svg className="mx-auto mb-3" width="40" height="40" fill="none" viewBox="0 0 24 24" stroke="var(--gray3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
            <p className="text-[13px] font-medium text-[var(--secondary)]">No daily logs yet</p>
            <p className="mt-1 text-[11px] text-[var(--tertiary)]">Start logging daily jobsite activity</p>
            <button
              onClick={handleNew}
              className="mt-4 rounded-lg bg-[var(--accent)] px-4 py-2 text-[12px] font-medium text-white transition-all hover:bg-[var(--accent-hover)]"
            >
              Log Today
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {logs.map((log) => {
              const isExpanded = expandedId === log.id;
              const hasIssues = log.issues && log.issues.trim().length > 0;
              const hasDelay = log.delay_reason && log.delay_reason.trim().length > 0;

              return (
                <div
                  key={log.id}
                  className="overflow-hidden rounded-xl border border-[var(--sep)] bg-[var(--card)] transition-all"
                >
                  {/* Summary row */}
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : log.id)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[var(--fill)]"
                  >
                    <div className="flex-shrink-0">
                      <WeatherIcon weather={log.weather} size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-[13px] font-medium text-[var(--label)]">{formatDateShort(log.log_date)}</p>
                        {hasIssues && (
                          <Badge variant="error" size="sm" dot>Issues</Badge>
                        )}
                        {hasDelay && (
                          <Badge variant="warning" size="sm" dot>Delay</Badge>
                        )}
                      </div>
                      <p className="mt-0.5 truncate text-[11px] text-[var(--secondary)]">
                        {log.work_performed ?? "No work description"}
                      </p>
                    </div>
                    <div className="flex flex-shrink-0 items-center gap-4 text-right">
                      <div>
                        <p className="text-[11px] font-medium text-[var(--label)]">{log.crew_count} crew</p>
                        <p className="text-[10px] text-[var(--tertiary)]">{log.hours_on_site ?? 0}h</p>
                      </div>
                      {log.temperature_f !== null && (
                        <p className="text-[12px] font-medium tabular-nums text-[var(--secondary)]">
                          {log.temperature_f}&deg;F
                        </p>
                      )}
                      <svg
                        width="14"
                        height="14"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="var(--gray3)"
                        strokeWidth="2"
                        strokeLinecap="round"
                        className={`transition-transform ${isExpanded ? "rotate-180" : ""}`}
                      >
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </div>
                  </button>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div className="border-t border-[var(--sep)] bg-[var(--bg)] px-4 py-3 space-y-3">
                      {log.work_performed && (
                        <div>
                          <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--tertiary)]">Work Performed</p>
                          <p className="mt-0.5 text-[12px] text-[var(--label)] whitespace-pre-line">{log.work_performed}</p>
                        </div>
                      )}
                      {log.materials_used && (
                        <div>
                          <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--tertiary)]">Materials Used</p>
                          <p className="mt-0.5 text-[12px] text-[var(--label)] whitespace-pre-line">{log.materials_used}</p>
                        </div>
                      )}
                      {log.deliveries && (
                        <div>
                          <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--tertiary)]">Deliveries</p>
                          <p className="mt-0.5 text-[12px] text-[var(--label)] whitespace-pre-line">{log.deliveries}</p>
                        </div>
                      )}
                      {log.visitors && (
                        <div>
                          <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--tertiary)]">Visitors</p>
                          <p className="mt-0.5 text-[12px] text-[var(--label)] whitespace-pre-line">{log.visitors}</p>
                        </div>
                      )}
                      {hasIssues && (
                        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2">
                          <p className="text-[10px] font-medium uppercase tracking-wider text-red-400">Issues</p>
                          <p className="mt-0.5 text-[12px] text-red-700 whitespace-pre-line">{log.issues}</p>
                        </div>
                      )}
                      {log.safety_notes && (
                        <div>
                          <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--tertiary)]">Safety Notes</p>
                          <p className="mt-0.5 text-[12px] text-[var(--label)] whitespace-pre-line">{log.safety_notes}</p>
                        </div>
                      )}
                      {hasDelay && (
                        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                          <p className="text-[10px] font-medium uppercase tracking-wider text-amber-500">
                            Delay {log.delay_hours ? `(${log.delay_hours}h)` : ""}
                          </p>
                          <p className="mt-0.5 text-[12px] text-amber-700 whitespace-pre-line">{log.delay_reason}</p>
                        </div>
                      )}
                      {log.created_by_name && (
                        <p className="text-[10px] text-[var(--tertiary)]">Logged by {log.created_by_name}</p>
                      )}
                      <button
                        onClick={() => handleEdit(log)}
                        className="rounded-lg border border-[var(--sep)] px-3 py-1.5 text-[11px] font-medium text-[var(--secondary)] transition-colors hover:bg-[var(--fill)] hover:text-[var(--label)]"
                      >
                        Edit Entry
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Form Modal */}
      {showForm && (
        <DailyLogForm
          estimateId={estimateId}
          existing={editingLog}
          onClose={() => {
            setShowForm(false);
            setEditingLog(null);
          }}
          onSaved={() => {
            setShowForm(false);
            setEditingLog(null);
            fetchLogs();
          }}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Daily Log Form Modal
// ---------------------------------------------------------------------------

function DailyLogForm({
  estimateId,
  existing,
  onClose,
  onSaved,
}: {
  estimateId: string;
  existing: DailyLogEntry | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [logDate, setLogDate] = useState(existing?.log_date ?? todayStr());
  const [weather, setWeather] = useState<string>(existing?.weather ?? "clear");
  const [temperatureF, setTemperatureF] = useState(existing?.temperature_f?.toString() ?? "");
  const [crewCount, setCrewCount] = useState(existing?.crew_count?.toString() ?? "");
  const [hoursOnSite, setHoursOnSite] = useState(existing?.hours_on_site?.toString() ?? "");
  const [workPerformed, setWorkPerformed] = useState(existing?.work_performed ?? "");
  const [materialsUsed, setMaterialsUsed] = useState(existing?.materials_used ?? "");
  const [deliveries, setDeliveries] = useState(existing?.deliveries ?? "");
  const [issues, setIssues] = useState(existing?.issues ?? "");
  const [safetyNotes, setSafetyNotes] = useState(existing?.safety_notes ?? "");
  const [delayReason, setDelayReason] = useState(existing?.delay_reason ?? "");
  const [delayHours, setDelayHours] = useState(existing?.delay_hours?.toString() ?? "");
  const [showDelay, setShowDelay] = useState(!!existing?.delay_reason);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/daily-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          estimate_id: estimateId,
          log_date: logDate,
          weather: weather || null,
          temperature_f: temperatureF ? parseInt(temperatureF, 10) : null,
          crew_count: crewCount ? parseInt(crewCount, 10) : 0,
          hours_on_site: hoursOnSite ? parseFloat(hoursOnSite) : null,
          work_performed: workPerformed || null,
          materials_used: materialsUsed || null,
          deliveries: deliveries || null,
          issues: issues || null,
          safety_notes: safetyNotes || null,
          delay_reason: delayReason || null,
          delay_hours: delayHours ? parseFloat(delayHours) : null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to save daily log");
      }

      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    }
    setSaving(false);
  }, [
    estimateId, logDate, weather, temperatureF, crewCount, hoursOnSite,
    workPerformed, materialsUsed, deliveries, issues, safetyNotes,
    delayReason, delayHours, onSaved,
  ]);

  return (
    <Modal
      open={true}
      onClose={onClose}
      title={existing ? "Edit Daily Log" : "New Daily Log"}
      description={existing ? `Editing entry for ${formatDate(existing.log_date)}` : "Log today's jobsite activity"}
      width="w-full max-w-[560px]"
    >
      <div className="space-y-4 px-6 py-4 max-h-[60vh] overflow-y-auto">
        {/* Date */}
        <Field label="Date">
          <input
            type="date"
            value={logDate}
            onChange={(e) => setLogDate(e.target.value)}
            className={inputClass}
          />
        </Field>

        {/* Weather selector */}
        <Field label="Weather">
          <div className="flex flex-wrap gap-1.5">
            {WEATHER_OPTIONS.map((w) => (
              <button
                key={w.id}
                type="button"
                onClick={() => setWeather(w.id)}
                className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-medium transition-colors ${
                  weather === w.id
                    ? "border-[var(--accent)] bg-[var(--accent-light)] text-[var(--accent)]"
                    : "border-[var(--sep)] text-[var(--secondary)] hover:border-[var(--gray3)]"
                }`}
              >
                <WeatherIcon weather={w.id} size={14} />
                {w.label}
              </button>
            ))}
          </div>
        </Field>

        {/* Temperature + Crew + Hours -- inline row */}
        <div className="grid grid-cols-3 gap-3">
          <Field label="Temp (&deg;F)">
            <input
              type="number"
              value={temperatureF}
              onChange={(e) => setTemperatureF(e.target.value)}
              placeholder="72"
              className={inputClass}
              min={-60}
              max={150}
            />
          </Field>
          <Field label="Crew Count">
            <input
              type="number"
              value={crewCount}
              onChange={(e) => setCrewCount(e.target.value)}
              placeholder="4"
              className={inputClass}
              min={0}
            />
          </Field>
          <Field label="Hours on Site">
            <input
              type="number"
              value={hoursOnSite}
              onChange={(e) => setHoursOnSite(e.target.value)}
              placeholder="8"
              className={inputClass}
              min={0}
              max={24}
              step={0.5}
            />
          </Field>
        </div>

        {/* Work performed */}
        <Field label="Work Performed">
          <textarea
            value={workPerformed}
            onChange={(e) => setWorkPerformed(e.target.value)}
            placeholder="Describe what was accomplished today..."
            className={textareaClass}
            rows={3}
          />
        </Field>

        {/* Materials used */}
        <Field label="Materials Used">
          <textarea
            value={materialsUsed}
            onChange={(e) => setMaterialsUsed(e.target.value)}
            placeholder="List materials used on site..."
            className={textareaClass}
            rows={2}
          />
        </Field>

        {/* Deliveries */}
        <Field label="Deliveries">
          <textarea
            value={deliveries}
            onChange={(e) => setDeliveries(e.target.value)}
            placeholder="Note any deliveries received..."
            className={textareaClass}
            rows={2}
          />
        </Field>

        {/* Issues */}
        <Field label="Issues">
          <textarea
            value={issues}
            onChange={(e) => setIssues(e.target.value)}
            placeholder="Document any problems or concerns..."
            className={`${textareaClass} ${issues.trim().length > 0 ? "border-[var(--red)] ring-1 ring-[var(--red)]/20" : ""}`}
            rows={2}
          />
        </Field>

        {/* Safety notes */}
        <Field label="Safety Notes">
          <textarea
            value={safetyNotes}
            onChange={(e) => setSafetyNotes(e.target.value)}
            placeholder="PPE compliance, safety observations..."
            className={textareaClass}
            rows={2}
          />
        </Field>

        {/* Delay section -- collapsible */}
        <div>
          <button
            type="button"
            onClick={() => setShowDelay(!showDelay)}
            className="flex items-center gap-1.5 text-[12px] font-medium text-[var(--secondary)] transition-colors hover:text-[var(--label)]"
          >
            <svg
              width="12"
              height="12"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              className={`transition-transform ${showDelay ? "rotate-90" : ""}`}
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
            Delay Information
          </button>
          {showDelay && (
            <div className="mt-2 space-y-3 rounded-xl border border-amber-200 bg-amber-50/50 p-3">
              <Field label="Delay Reason">
                <textarea
                  value={delayReason}
                  onChange={(e) => setDelayReason(e.target.value)}
                  placeholder="Reason for any delays..."
                  className={textareaClass}
                  rows={2}
                />
              </Field>
              <Field label="Delay Hours">
                <input
                  type="number"
                  value={delayHours}
                  onChange={(e) => setDelayHours(e.target.value)}
                  placeholder="0"
                  className={inputClass}
                  min={0}
                  max={24}
                  step={0.5}
                />
              </Field>
            </div>
          )}
        </div>

        {error && (
          <p className="text-[12px] text-[var(--red)]">{error}</p>
        )}
      </div>

      <div className="flex justify-end gap-2 border-t border-[var(--sep)] px-6 py-3">
        <button
          onClick={onClose}
          className="rounded-lg border border-[var(--sep)] px-4 py-2 text-[13px] font-medium transition-colors hover:bg-[var(--fill)]"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-lg bg-[var(--accent)] px-4 py-2 text-[13px] font-medium text-white transition-all hover:bg-[var(--accent-hover)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? "Saving..." : existing ? "Update Log" : "Save Log"}
        </button>
      </div>
    </Modal>
  );
}
