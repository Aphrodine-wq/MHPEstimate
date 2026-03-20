import { useState, useCallback, useEffect, useRef, useMemo, memo } from "react";
import { useEstimates, useClients, useTimeEntries, type TimeEntry } from "../lib/store";

import type { Estimate } from "@proestimate/shared/types";

interface ProjectsPageProps {
  onNavigate?: (page: string) => void;
  onEditEstimate?: (estimate: Estimate) => void;
  onCallAlex?: () => void;
  onModal?: (m: string) => void;
}

// ── Helpers ──

const ACTIVE_STATUSES = ["approved", "accepted", "sent"];
const COMPLETED_STATUSES = ["completed", "closed"];

type TimeCategory = TimeEntry["category"];

const CATEGORY_COLORS: Record<TimeCategory, { bg: string; text: string }> = {
  labor: { bg: "rgba(37, 99, 235, 0.1)", text: "#2563EB" },
  travel: { bg: "rgba(245, 158, 11, 0.1)", text: "#D97706" },
  admin: { bg: "rgba(139, 92, 246, 0.1)", text: "#7C3AED" },
  inspection: { bg: "rgba(6, 182, 212, 0.1)", text: "#0891B2" },
  cleanup: { bg: "rgba(107, 114, 128, 0.1)", text: "#6B7280" },
  other: { bg: "rgba(107, 114, 128, 0.1)", text: "#6B7280" },
};

const CATEGORIES: TimeCategory[] = ["labor", "travel", "admin", "inspection", "cleanup", "other"];

const STATUS_DOT_COLORS: Record<string, string> = {
  approved: "var(--green)",
  accepted: "var(--green)",
  sent: "var(--accent)",
  draft: "var(--gray2)",
  in_review: "var(--orange)",
  revision_requested: "var(--orange)",
  declined: "var(--red)",
  expired: "var(--gray3)",
  completed: "var(--teal)",
  closed: "var(--teal)",
};

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function formatHours(minutes: number): string {
  const h = Math.floor(minutes / 60);
  return `${h}h`;
}

function formatCurrency(n: number): string {
  if (n === 0) return "$0";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toLocaleString()}`;
}

function formatCurrencyFull(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateShort(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function todayStr(): string {
  return new Date().toISOString().split("T")[0]!;
}

function padTimer(n: number): string {
  return String(n).padStart(2, "0");
}

// ── Icons (inline SVGs) ──

function ClockIcon({ size = 14, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
    </svg>
  );
}

function PlusIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5v14" /><path d="M5 12h14" />
    </svg>
  );
}

function PhoneIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
    </svg>
  );
}

function TrashIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6" /><path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2" />
    </svg>
  );
}

function FolderIcon({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke="var(--gray3)" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
    </svg>
  );
}

function ChevronRightIcon({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}

// ── Main Component ──

export function ProjectsPage({ onNavigate, onEditEstimate, onCallAlex, onModal }: ProjectsPageProps) {
  const { data: estimates } = useEstimates();
  const { data: clients } = useClients();
  const { allEntries, addEntry, deleteEntry, totalMinutes: allTotalMinutes } = useTimeEntries();

  const [showLogForm, setShowLogForm] = useState(false);
  const [logForEstimateId, setLogForEstimateId] = useState<string | null>(null);

  const activeProjects = useMemo(
    () => estimates.filter((e) => ACTIVE_STATUSES.includes(e.status)),
    [estimates]
  );

  const completedCount = useMemo(
    () => estimates.filter((e) => COMPLETED_STATUSES.includes(e.status)).length,
    [estimates]
  );

  const totalValue = useMemo(
    () => activeProjects.reduce((sum, e) => sum + Number(e.grand_total ?? 0), 0),
    [activeProjects]
  );

  const clientMap = useMemo(() => {
    const map: Record<string, string> = {};
    clients.forEach((c) => { map[c.id] = c.full_name; });
    return map;
  }, [clients]);

  const estimateMap = useMemo(() => {
    const map: Record<string, Estimate> = {};
    estimates.forEach((e) => { map[e.id] = e; });
    return map;
  }, [estimates]);

  // Time entries grouped by estimate
  const timeByEstimate = useMemo(() => {
    const map: Record<string, number> = {};
    allEntries.forEach((te) => {
      map[te.estimate_id] = (map[te.estimate_id] ?? 0) + te.duration_min;
    });
    return map;
  }, [allEntries]);

  const recentEntries = useMemo(
    () => [...allEntries].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 8),
    [allEntries]
  );

  const handleLogTime = useCallback((estimateId?: string) => {
    setLogForEstimateId(estimateId ?? null);
    setShowLogForm(true);
  }, []);

  const handleLogSaved = useCallback(() => {
    setShowLogForm(false);
    setLogForEstimateId(null);
  }, []);

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* ── Header Row ── */}
      <div className="flex-shrink-0 px-6 pt-6 pb-4 slide-up">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="h-4 w-1 rounded-full bg-[var(--accent)]" />
              <p className="caps">Projects</p>
            </div>
            <h1 className="text-[20px] font-extrabold tight leading-none">Active Projects</h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full px-3 py-1 text-[11px] font-semibold" style={{ background: "rgba(196, 30, 58, 0.1)", color: "var(--accent)" }}>
              {activeProjects.length} Active
            </span>
            <span className="rounded-full px-3 py-1 text-[11px] font-semibold" style={{ background: "rgba(34, 197, 94, 0.08)", color: "var(--green)" }}>
              {formatCurrency(totalValue)} Value
            </span>
            <span className="rounded-full px-3 py-1 text-[11px] font-semibold" style={{ background: "rgba(139, 92, 246, 0.08)", color: "#7C3AED" }}>
              {formatHours(allTotalMinutes)} Logged
            </span>
            <span className="rounded-full px-3 py-1 text-[11px] font-semibold" style={{ background: "rgba(6, 182, 212, 0.08)", color: "var(--teal)" }}>
              {completedCount} Completed
            </span>
          </div>
        </div>
      </div>

      {/* ── Two-Column Body ── */}
      <div className="flex-1 min-h-0 grid grid-cols-[1fr_0.67fr] gap-4 px-6 pb-5">
        {/* ── Left Column: Project Cards ── */}
        <div className="flex flex-col min-h-0 slide-up stagger-1">
          <div className="flex-1 min-h-0 overflow-y-auto pr-1" style={{ scrollbarWidth: "thin" }}>
            {activeProjects.length > 0 ? (
              <div className="flex flex-col gap-1.5">
                {activeProjects.map((project, i) => (
                  <ProjectRow
                    key={project.id}
                    project={project}
                    clientName={project.client_id ? clientMap[project.client_id] : undefined}
                    hoursLogged={timeByEstimate[project.id] ?? 0}
                    onViewDetails={() => onEditEstimate?.(project)}
                    onLogTime={() => handleLogTime(project.id)}
                    index={i}
                  />
                ))}
              </div>
            ) : (
              <div className="surface-elevated p-8 text-center">
                <div className="flex justify-center mb-3">
                  <FolderIcon size={36} />
                </div>
                <p className="text-[14px] font-semibold tight text-[var(--label)] mb-1">No active projects</p>
                <p className="text-[12px] text-[var(--secondary)]">
                  When estimates are approved, accepted, or sent, they appear here.
                </p>
              </div>
            )}
          </div>
          {/* All Estimates link */}
          <div className="flex-shrink-0 pt-3">
            <button
              onClick={() => onNavigate?.("estimates")}
              className="flex items-center gap-1 text-[12px] font-semibold text-[var(--accent)] hover:underline transition-colors"
            >
              All Estimates
              <ChevronRightIcon size={11} />
            </button>
          </div>
        </div>

        {/* ── Right Column: Timer + Time Log + Quick Actions ── */}
        <div className="flex flex-col min-h-0 gap-3 slide-up stagger-2">
          {/* Timer */}
          <div className="flex-shrink-0">
            <TimerWidget activeProjects={activeProjects} onEntryCreated={addEntry} />
          </div>

          {/* Recent Time Log */}
          <div className="flex-1 min-h-0 surface-elevated flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--sep)] flex-shrink-0">
              <h3 className="caps font-semibold">Recent Time</h3>
              <span className="text-[11px] tabular text-[var(--secondary)]">{recentEntries.length} entries</span>
            </div>

            {/* Inline Log Form */}
            {showLogForm && (
              <div className="flex-shrink-0 border-b border-[var(--sep)]">
                <LogTimeForm
                  activeProjects={activeProjects}
                  preselectedEstimateId={logForEstimateId}
                  onSave={(entry) => {
                    addEntry(entry);
                    handleLogSaved();
                  }}
                  onCancel={() => { setShowLogForm(false); setLogForEstimateId(null); }}
                />
              </div>
            )}

            <div className="flex-1 min-h-0 overflow-y-auto" style={{ scrollbarWidth: "thin" }}>
              {recentEntries.length > 0 ? (
                <table className="w-full text-[12px]">
                  <thead>
                    <tr className="border-b border-[var(--sep)] text-left sticky top-0 bg-[var(--surface)]">
                      <th className="px-3 py-2 caps font-semibold text-[10px]">Date</th>
                      <th className="px-3 py-2 caps font-semibold text-[10px]">Project</th>
                      <th className="px-3 py-2 caps font-semibold text-[10px]">Cat</th>
                      <th className="px-3 py-2 caps font-semibold text-[10px] text-right">Dur</th>
                      <th className="px-2 py-2 w-8"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentEntries.map((entry) => {
                      const est = estimateMap[entry.estimate_id];
                      const catColor = CATEGORY_COLORS[entry.category];
                      return (
                        <tr key={entry.id} className="border-b border-[var(--sep)] last:border-0 hover:bg-[var(--fill)] transition-colors">
                          <td className="px-3 py-2 tabular text-[var(--secondary)]">{formatDateShort(entry.date)}</td>
                          <td className="px-3 py-2 font-medium truncate max-w-[80px]">{est?.estimate_number ?? "---"}</td>
                          <td className="px-3 py-2">
                            <span
                              className="inline-block rounded px-1.5 py-0.5 text-[9px] font-semibold capitalize"
                              style={{ background: catColor.bg, color: catColor.text }}
                            >
                              {entry.category}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-right tabular font-medium">{formatDuration(entry.duration_min)}</td>
                          <td className="px-2 py-2 text-right">
                            <button
                              onClick={() => deleteEntry(entry.id)}
                              className="rounded p-0.5 text-[var(--gray2)] transition-colors hover:bg-[var(--fill)] hover:text-[var(--red)]"
                              title="Delete entry"
                            >
                              <TrashIcon size={12} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 px-4">
                  <ClockIcon size={28} color="var(--gray3)" />
                  <p className="text-[12px] text-[var(--secondary)] mt-2 text-center">No time logged yet</p>
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex-shrink-0 flex items-center gap-2">
            <button
              onClick={() => onModal?.("new-estimate")}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-full px-3 py-2 text-[11px] font-semibold text-white transition-colors hover:opacity-90 press"
              style={{ background: "var(--accent)" }}
            >
              <PlusIcon size={12} />
              New Estimate
            </button>
            <button
              onClick={() => handleLogTime()}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-full border border-[var(--sep)] px-3 py-2 text-[11px] font-semibold text-[var(--label)] transition-colors hover:bg-[var(--fill)] press"
            >
              <ClockIcon size={12} />
              Log Time
            </button>
            <button
              onClick={() => onCallAlex?.()}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-full px-3 py-2 text-[11px] font-semibold text-white transition-colors hover:opacity-90 press"
              style={{ background: "var(--green)" }}
            >
              <PhoneIcon size={12} />
              Call Alex
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Project Row (memo'd) ──

const ProjectRow = memo(function ProjectRow({
  project,
  clientName,
  hoursLogged,
  onViewDetails,
  onLogTime,
  index,
}: {
  project: Estimate;
  clientName?: string;
  hoursLogged: number;
  onViewDetails: () => void;
  onLogTime: () => void;
  index: number;
}) {
  const total = Number(project.grand_total ?? 0);
  const laborCost = (hoursLogged / 60) * 75;
  const budgetPct = total > 0 ? Math.min((laborCost / total) * 100, 100) : 0;
  const dotColor = STATUS_DOT_COLORS[project.status] ?? "var(--gray2)";

  return (
    <div
      className="surface-elevated card-hover flex items-center gap-4 px-4 py-3 cursor-pointer group"
      onClick={onViewDetails}
      style={{ borderLeft: "3px solid transparent", transition: "border-color 0.15s, box-shadow 0.15s" }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderLeftColor = "var(--accent)"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderLeftColor = "transparent"; }}
    >
      {/* Left: Status dot + Type + Number */}
      <div className="flex items-center gap-3 min-w-[180px]">
        <span className="flex-shrink-0 h-2.5 w-2.5 rounded-full" style={{ background: dotColor }} />
        <div className="min-w-0">
          <p className="text-[13px] font-bold tight leading-tight truncate">{project.project_type}</p>
          <p className="text-[11px] text-[var(--secondary)] tabular">{project.estimate_number}</p>
        </div>
      </div>

      {/* Middle: Client + Value + Hours */}
      <div className="flex-1 flex items-center gap-6 min-w-0">
        <p className="text-[12px] text-[var(--secondary)] truncate min-w-[100px] max-w-[160px]">
          {clientName ?? "--"}
        </p>
        <p className="text-[13px] font-semibold tabular tight min-w-[80px]">
          {formatCurrencyFull(total)}
        </p>
        <p className="text-[12px] tabular text-[var(--secondary)] min-w-[50px]">
          {formatDuration(hoursLogged)}
        </p>
      </div>

      {/* Right: Budget bar + Log Time */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <div className="w-[80px]">
          <div className="h-1.5 rounded-full bg-[var(--fill)] overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${budgetPct}%`,
                background: budgetPct > 80 ? "var(--red)" : budgetPct > 50 ? "var(--orange)" : "var(--green)",
              }}
            />
          </div>
          <p className="text-[9px] tabular text-[var(--secondary)] mt-0.5 text-right">{Math.round(budgetPct)}% budget</p>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onLogTime(); }}
          className="flex items-center gap-1 rounded-md bg-[var(--fill)] px-2 py-1 text-[10px] font-semibold text-[var(--label)] transition-colors hover:bg-[var(--gray4)] opacity-0 group-hover:opacity-100"
        >
          <ClockIcon size={10} />
          Log
        </button>
      </div>
    </div>
  );
});

// ── Log Time Form (compact inline) ──

function LogTimeForm({
  activeProjects,
  preselectedEstimateId,
  onSave,
  onCancel,
}: {
  activeProjects: Estimate[];
  preselectedEstimateId: string | null;
  onSave: (entry: Omit<TimeEntry, "id" | "created_at">) => void;
  onCancel: () => void;
}) {
  const [estimateId, setEstimateId] = useState(preselectedEstimateId ?? (activeProjects[0]?.id ?? ""));
  const [date, setDate] = useState(todayStr());
  const [hours, setHours] = useState("0");
  const [minutes, setMinutes] = useState("30");
  const [category, setCategory] = useState<TimeCategory>("labor");
  const [description, setDescription] = useState("");

  const handleSave = () => {
    const totalMin = (parseInt(hours) || 0) * 60 + (parseInt(minutes) || 0);
    if (!estimateId || totalMin <= 0) return;
    onSave({
      estimate_id: estimateId,
      date,
      duration_min: totalMin,
      category,
      description,
    });
  };

  return (
    <div className="p-3 slide-up">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-[12px] font-bold tight">Log Time Entry</h4>
        <button
          onClick={onCancel}
          className="rounded p-0.5 text-[var(--gray2)] transition-colors hover:bg-[var(--fill)] hover:text-[var(--label)]"
        >
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6L6 18" /><path d="M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-2">
        <select
          value={estimateId}
          onChange={(e) => setEstimateId(e.target.value)}
          className="w-full rounded-md border border-[var(--sep)] bg-[var(--bg)] px-2 py-1.5 text-[11px] text-[var(--label)] outline-none focus:border-[var(--accent)] transition-colors"
        >
          {activeProjects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.estimate_number} -- {p.project_type}
            </option>
          ))}
        </select>

        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full rounded-md border border-[var(--sep)] bg-[var(--bg)] px-2 py-1.5 text-[11px] text-[var(--label)] outline-none focus:border-[var(--accent)] transition-colors"
        />

        <div className="flex items-center gap-1">
          <input
            type="number"
            min="0"
            max="24"
            value={hours}
            onChange={(e) => setHours(e.target.value)}
            className="w-12 rounded-md border border-[var(--sep)] bg-[var(--bg)] px-2 py-1.5 text-[11px] text-[var(--label)] outline-none focus:border-[var(--accent)] transition-colors tabular text-center"
          />
          <span className="text-[10px] text-[var(--secondary)]">h</span>
          <input
            type="number"
            min="0"
            max="59"
            value={minutes}
            onChange={(e) => setMinutes(e.target.value)}
            className="w-12 rounded-md border border-[var(--sep)] bg-[var(--bg)] px-2 py-1.5 text-[11px] text-[var(--label)] outline-none focus:border-[var(--accent)] transition-colors tabular text-center"
          />
          <span className="text-[10px] text-[var(--secondary)]">m</span>
        </div>

        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as TimeCategory)}
          className="w-full rounded-md border border-[var(--sep)] bg-[var(--bg)] px-2 py-1.5 text-[11px] text-[var(--label)] outline-none focus:border-[var(--accent)] transition-colors capitalize"
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      <input
        type="text"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="What did you work on?"
        className="w-full rounded-md border border-[var(--sep)] bg-[var(--bg)] px-2 py-1.5 text-[11px] text-[var(--label)] outline-none focus:border-[var(--accent)] transition-colors placeholder:text-[var(--gray2)] mb-2"
      />

      <div className="flex items-center justify-end gap-2">
        <button
          onClick={onCancel}
          className="rounded-md px-3 py-1.5 text-[11px] font-semibold text-[var(--secondary)] transition-colors hover:bg-[var(--fill)]"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          className="rounded-md bg-[var(--accent)] px-3 py-1.5 text-[11px] font-semibold text-white transition-colors hover:bg-[var(--accent-hover)] press"
        >
          Save
        </button>
      </div>
    </div>
  );
}

// ── Timer Widget (memo'd, separate state) ──

const TimerWidget = memo(function TimerWidget({
  activeProjects,
  onEntryCreated,
}: {
  activeProjects: Estimate[];
  onEntryCreated: (entry: Omit<TimeEntry, "id" | "created_at">) => TimeEntry;
}) {
  const [isRunning, setIsRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [estimateId, setEstimateId] = useState(activeProjects[0]?.id ?? "");
  const [category, setCategory] = useState<TimeCategory>("labor");
  const [showSave, setShowSave] = useState(false);
  const [description, setDescription] = useState("");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    if (!activeProjects.find((p) => p.id === estimateId) && activeProjects.length > 0) {
      setEstimateId(activeProjects[0]!.id);
    }
  }, [activeProjects, estimateId]);

  const startTimer = useCallback(() => {
    setIsRunning(true);
    setElapsed(0);
    setShowSave(false);
    startTimeRef.current = Date.now();
    intervalRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);
  }, []);

  const stopTimer = useCallback(() => {
    setIsRunning(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setShowSave(true);
  }, []);

  const saveTimerEntry = useCallback(() => {
    const totalMin = Math.max(1, Math.round(elapsed / 60));
    if (!estimateId) return;
    onEntryCreated({
      estimate_id: estimateId,
      date: todayStr(),
      duration_min: totalMin,
      category,
      description,
      started_at: new Date(startTimeRef.current).toISOString(),
      ended_at: new Date().toISOString(),
    });
    setShowSave(false);
    setElapsed(0);
    setDescription("");
  }, [elapsed, estimateId, category, description, onEntryCreated]);

  const discardTimer = useCallback(() => {
    setShowSave(false);
    setElapsed(0);
    setDescription("");
  }, []);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const hours = Math.floor(elapsed / 3600);
  const mins = Math.floor((elapsed % 3600) / 60);
  const secs = elapsed % 60;

  return (
    <div className="surface-elevated p-3">
      {/* Compact inline row: project + category + timer display + button */}
      <div className="flex items-center gap-2">
        {/* Running indicator */}
        {isRunning && (
          <span className="flex-shrink-0 h-2 w-2 rounded-full animate-pulse" style={{ background: "var(--green)" }} />
        )}

        <select
          value={estimateId}
          onChange={(e) => setEstimateId(e.target.value)}
          disabled={isRunning}
          className="flex-1 min-w-0 rounded-md border border-[var(--sep)] bg-[var(--bg)] px-2 py-1.5 text-[11px] text-[var(--label)] outline-none focus:border-[var(--accent)] transition-colors disabled:opacity-50 truncate"
        >
          {activeProjects.length === 0 && <option value="">No active projects</option>}
          {activeProjects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.estimate_number}
            </option>
          ))}
        </select>

        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as TimeCategory)}
          disabled={isRunning}
          className="w-[90px] flex-shrink-0 rounded-md border border-[var(--sep)] bg-[var(--bg)] px-2 py-1.5 text-[11px] text-[var(--label)] outline-none focus:border-[var(--accent)] transition-colors capitalize disabled:opacity-50"
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        <div
          className="flex-shrink-0 rounded-md px-3 py-1.5 text-[15px] font-bold tabular tracking-wider"
          style={{
            background: isRunning ? "rgba(34, 197, 94, 0.08)" : "var(--fill)",
            color: isRunning ? "var(--green)" : "var(--label)",
            minWidth: 90,
            textAlign: "center",
          }}
        >
          {padTimer(hours)}:{padTimer(mins)}:{padTimer(secs)}
        </div>

        {!isRunning && !showSave && (
          <button
            onClick={startTimer}
            disabled={activeProjects.length === 0}
            className="flex-shrink-0 rounded-md px-3 py-1.5 text-[11px] font-bold text-white transition-colors hover:opacity-90 press disabled:opacity-40"
            style={{ background: "var(--green)" }}
          >
            Start
          </button>
        )}
        {isRunning && (
          <button
            onClick={stopTimer}
            className="flex-shrink-0 rounded-md px-3 py-1.5 text-[11px] font-bold text-white transition-colors hover:opacity-90 press"
            style={{ background: "var(--red)" }}
          >
            Stop
          </button>
        )}
      </div>

      {/* Save prompt after stopping */}
      {showSave && (
        <div className="mt-2.5 pt-2.5 border-t border-[var(--sep)] slide-up">
          <p className="text-[11px] text-[var(--secondary)] mb-2">
            Logged <span className="font-semibold text-[var(--label)]">{formatDuration(Math.max(1, Math.round(elapsed / 60)))}</span>
          </p>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What did you work on?"
              className="flex-1 rounded-md border border-[var(--sep)] bg-[var(--bg)] px-2 py-1.5 text-[11px] text-[var(--label)] outline-none focus:border-[var(--accent)] transition-colors placeholder:text-[var(--gray2)]"
              onKeyDown={(e) => { if (e.key === "Enter") saveTimerEntry(); }}
            />
            <button
              onClick={saveTimerEntry}
              className="rounded-md bg-[var(--accent)] px-3 py-1.5 text-[11px] font-semibold text-white transition-colors hover:bg-[var(--accent-hover)] press"
            >
              Save
            </button>
            <button
              onClick={discardTimer}
              className="rounded-md px-2 py-1.5 text-[11px] font-semibold text-[var(--secondary)] transition-colors hover:bg-[var(--fill)]"
            >
              Discard
            </button>
          </div>
        </div>
      )}
    </div>
  );
});
