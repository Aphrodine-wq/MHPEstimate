import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { EmptyState } from "./EmptyState";
import {
  ClipboardDocumentListIcon,
  PlusIcon,
  ArrowPathIcon,
  SunIcon,
  CloudIcon,
} from "@heroicons/react/24/outline";

interface DailyLog {
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
  issues: string | null;
  safety_notes: string | null;
  delay_reason: string | null;
  delay_hours: number | null;
  created_by_name: string | null;
  created_at: string;
}

const WEATHER_OPTIONS = [
  { value: "clear", label: "Clear", icon: "sun" },
  { value: "cloudy", label: "Cloudy", icon: "cloud" },
  { value: "rain", label: "Rain", icon: "rain" },
  { value: "snow", label: "Snow", icon: "snow" },
  { value: "wind", label: "Wind", icon: "wind" },
  { value: "extreme_heat", label: "Extreme Heat", icon: "heat" },
  { value: "extreme_cold", label: "Extreme Cold", icon: "cold" },
];

const WEATHER_ICONS: Record<string, string> = {
  clear: "\u2600\uFE0F",
  cloudy: "\u2601\uFE0F",
  rain: "\uD83C\uDF27\uFE0F",
  snow: "\u2744\uFE0F",
  wind: "\uD83C\uDF2C\uFE0F",
  extreme_heat: "\uD83C\uDF21\uFE0F",
  extreme_cold: "\u2744\uFE0F",
};

export function DailyLogPage() {
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [estimates, setEstimates] = useState<{ id: string; estimate_number: string }[]>([]);
  const [form, setForm] = useState({
    estimate_id: "",
    log_date: new Date().toISOString().split("T")[0]!,
    weather: "clear",
    crew_count: "",
    hours_on_site: "",
    work_performed: "",
    issues: "",
    materials_used: "",
  });

  const refresh = useCallback(async () => {
    if (!supabase) { setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from("daily_logs")
      .select("*")
      .order("log_date", { ascending: false })
      .limit(100);
    setLogs((data as DailyLog[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    if (!supabase) return;
    supabase.from("estimates").select("id, estimate_number").order("created_at", { ascending: false }).then(({ data }) => {
      setEstimates((data as any[]) ?? []);
    });
  }, []);

  const handleCreate = async () => {
    if (!supabase || !form.estimate_id || !form.log_date) return;
    setSaving(true);
    const { error } = await supabase.from("daily_logs").insert({
      estimate_id: form.estimate_id,
      log_date: form.log_date,
      weather: form.weather,
      crew_count: form.crew_count ? parseInt(form.crew_count) : 0,
      hours_on_site: form.hours_on_site ? parseFloat(form.hours_on_site) : null,
      work_performed: form.work_performed || null,
      issues: form.issues || null,
      materials_used: form.materials_used || null,
    });
    if (!error) {
      setForm({ estimate_id: "", log_date: new Date().toISOString().split("T")[0]!, weather: "clear", crew_count: "", hours_on_site: "", work_performed: "", issues: "", materials_used: "" });
      setShowForm(false);
      refresh();
    } else {
      console.error("Failed to create daily log:", error);
    }
    setSaving(false);
  };

  if (!supabase) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-[14px] text-[var(--secondary)]">Supabase not configured</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto animate-page-enter">
      <header className="flex items-center justify-between px-8 pt-4 pb-1">
        <p className="text-[12px] text-[var(--secondary)]">{logs.length} daily logs</p>
        <div className="flex items-center gap-2">
          <button onClick={refresh} className="rounded-lg border border-[var(--sep)] p-1.5 transition-colors hover:bg-[var(--bg)]">
            <ArrowPathIcon className="h-3.5 w-3.5 text-[var(--secondary)]" />
          </button>
          <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-3.5 py-1.5 text-[12px] font-semibold text-white shadow-sm shadow-[var(--accent)]/20 transition-all hover:brightness-110 active:scale-[0.98]">
            <PlusIcon className="h-3.5 w-3.5" />
            New Log
          </button>
        </div>
      </header>

      {showForm && (
        <div className="mx-8 mt-3 rounded-xl border border-[var(--sep)] bg-[var(--card)] p-4 shadow-[var(--shadow-card)]">
          <p className="text-[13px] font-semibold mb-3">New Daily Log</p>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] font-medium text-[var(--secondary)] mb-1 block">Estimate</label>
              <select value={form.estimate_id} onChange={(e) => setForm((f) => ({ ...f, estimate_id: e.target.value }))} className="w-full rounded-lg border border-[var(--sep)] bg-[var(--bg)] px-3 py-2 text-[12px] outline-none focus:border-[var(--accent)]">
                <option value="">Select...</option>
                {estimates.map((e) => <option key={e.id} value={e.id}>{e.estimate_number}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-medium text-[var(--secondary)] mb-1 block">Date</label>
              <input type="date" value={form.log_date} onChange={(e) => setForm((f) => ({ ...f, log_date: e.target.value }))} className="w-full rounded-lg border border-[var(--sep)] bg-[var(--bg)] px-3 py-2 text-[12px] outline-none focus:border-[var(--accent)]" />
            </div>
            <div>
              <label className="text-[11px] font-medium text-[var(--secondary)] mb-1 block">Weather</label>
              <select value={form.weather} onChange={(e) => setForm((f) => ({ ...f, weather: e.target.value }))} className="w-full rounded-lg border border-[var(--sep)] bg-[var(--bg)] px-3 py-2 text-[12px] outline-none focus:border-[var(--accent)]">
                {WEATHER_OPTIONS.map((w) => <option key={w.value} value={w.value}>{w.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-medium text-[var(--secondary)] mb-1 block">Crew Count</label>
              <input type="number" value={form.crew_count} onChange={(e) => setForm((f) => ({ ...f, crew_count: e.target.value }))} placeholder="0" className="w-full rounded-lg border border-[var(--sep)] bg-[var(--bg)] px-3 py-2 text-[12px] outline-none focus:border-[var(--accent)]" />
            </div>
            <div>
              <label className="text-[11px] font-medium text-[var(--secondary)] mb-1 block">Hours On Site</label>
              <input type="number" step="0.5" value={form.hours_on_site} onChange={(e) => setForm((f) => ({ ...f, hours_on_site: e.target.value }))} placeholder="8.0" className="w-full rounded-lg border border-[var(--sep)] bg-[var(--bg)] px-3 py-2 text-[12px] outline-none focus:border-[var(--accent)]" />
            </div>
          </div>
          <div className="mt-3">
            <label className="text-[11px] font-medium text-[var(--secondary)] mb-1 block">Work Performed</label>
            <textarea value={form.work_performed} onChange={(e) => setForm((f) => ({ ...f, work_performed: e.target.value }))} rows={3} placeholder="Describe the work completed today..." className="w-full rounded-lg border border-[var(--sep)] bg-[var(--bg)] px-3 py-2 text-[12px] outline-none resize-none focus:border-[var(--accent)]" />
          </div>
          <div className="mt-3">
            <label className="text-[11px] font-medium text-[var(--secondary)] mb-1 block">Issues / Notes</label>
            <textarea value={form.issues} onChange={(e) => setForm((f) => ({ ...f, issues: e.target.value }))} rows={2} placeholder="Any problems, delays, or safety concerns..." className="w-full rounded-lg border border-[var(--sep)] bg-[var(--bg)] px-3 py-2 text-[12px] outline-none resize-none focus:border-[var(--accent)]" />
          </div>
          <div className="mt-3 flex gap-2 justify-end">
            <button onClick={() => setShowForm(false)} className="rounded-lg border border-[var(--sep)] px-4 py-1.5 text-[12px] font-medium transition-colors hover:bg-[var(--bg)]">Cancel</button>
            <button onClick={handleCreate} disabled={saving || !form.estimate_id} className="rounded-lg bg-[var(--accent)] px-4 py-1.5 text-[12px] font-semibold text-white transition-all hover:brightness-110 disabled:opacity-50">
              {saving ? "Saving..." : "Save Log"}
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-8 py-3 pb-6">
        {loading ? (
          <div className="rounded-xl bg-[var(--card)] p-4 shadow-[var(--shadow-card)] space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex justify-between">
                <div className="h-3 w-40 animate-skeleton rounded bg-[var(--gray5)]" />
                <div className="h-3 w-20 animate-skeleton rounded bg-[var(--gray5)]" />
              </div>
            ))}
          </div>
        ) : logs.length === 0 ? (
          <EmptyState
            title="No daily logs"
            description="Create a daily log to track jobsite activity"
            action="New Log"
          />
        ) : (
          <div className="space-y-2">
            {logs.map((log, i) => (
              <div
                key={log.id}
                className="rounded-xl border border-[var(--sep)] bg-[var(--card)] px-4 py-3 shadow-[var(--shadow-card)] transition-colors hover:bg-[var(--bg)] animate-list-item"
                style={{ animationDelay: `${i * 30}ms` }}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-[var(--gray5)] text-[16px]">
                    {log.weather ? (WEATHER_ICONS[log.weather] ?? "?") : "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-[13px] font-semibold">
                        {new Date(log.log_date + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
                      </p>
                      {log.weather && (
                        <span className="rounded bg-[var(--gray5)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--secondary)] capitalize">{log.weather.replace(/_/g, " ")}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-[11px] text-[var(--secondary)]">{log.crew_count} crew</span>
                      {log.hours_on_site && <span className="text-[11px] text-[var(--secondary)]">{log.hours_on_site}h on site</span>}
                      {log.created_by_name && <span className="text-[11px] text-[var(--gray3)]">by {log.created_by_name}</span>}
                    </div>
                  </div>
                  {log.issues && (
                    <span className="rounded bg-[#ffebee] px-1.5 py-0.5 text-[10px] font-medium text-[#c62828]">Has Issues</span>
                  )}
                </div>
                {log.work_performed && (
                  <p className="mt-2 text-[12px] text-[var(--secondary)] line-clamp-2">{log.work_performed}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
