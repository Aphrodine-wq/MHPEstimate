import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../lib/supabase";
import { EmptyState } from "./EmptyState";
import {
  ClockIcon,
  PlayIcon,
  StopIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";

interface TimeEntry {
  id: string;
  estimate_id: string;
  worker_name: string;
  clock_in: string;
  clock_out: string | null;
  hours_worked: number | null;
  hourly_rate: number | null;
  labor_cost: number | null;
  trade: string | null;
  notes: string | null;
  break_minutes: number;
  created_at: string;
}

const TRADES = [
  "general", "framing", "electrical", "plumbing", "hvac",
  "drywall", "painting", "flooring", "roofing", "concrete",
  "demolition", "finish_carpentry", "tile", "insulation",
  "landscaping", "siding", "gutters", "windows_doors", "other",
];

function fmtMoney(n: number | null): string {
  if (n == null) return "--";
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtHours(n: number | null): string {
  if (n == null) return "--";
  return `${n.toFixed(1)}h`;
}

function elapsed(clockIn: string): string {
  const ms = Date.now() - new Date(clockIn).getTime();
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function ElapsedTimer({ clockIn }: { clockIn: string }) {
  const [time, setTime] = useState(elapsed(clockIn));
  const ref = useRef<ReturnType<typeof setInterval>>(undefined);

  useEffect(() => {
    ref.current = setInterval(() => setTime(elapsed(clockIn)), 1000);
    return () => clearInterval(ref.current);
  }, [clockIn]);

  return <span className="font-mono text-[14px] font-bold text-[var(--accent)]">{time}</span>;
}

export function TimeTrackingPage() {
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [estimates, setEstimates] = useState<{ id: string; estimate_number: string }[]>([]);
  const [form, setForm] = useState({
    worker_name: "",
    trade: "general",
    hourly_rate: "",
    estimate_id: "",
  });

  const active = entries.filter((e) => !e.clock_out);
  const completed = entries.filter((e) => !!e.clock_out);

  const refresh = useCallback(async () => {
    if (!supabase) { setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from("time_entries")
      .select("*")
      .order("clock_in", { ascending: false })
      .limit(100);
    setEntries((data as TimeEntry[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    if (!supabase) return;
    supabase.from("estimates").select("id, estimate_number").order("created_at", { ascending: false }).then(({ data }) => {
      setEstimates((data as any[]) ?? []);
    });
  }, []);

  const handleClockIn = async () => {
    if (!supabase || !form.worker_name.trim() || !form.estimate_id) return;
    setSaving(true);
    const { error } = await supabase.from("time_entries").insert({
      estimate_id: form.estimate_id,
      worker_name: form.worker_name.trim(),
      trade: form.trade,
      hourly_rate: form.hourly_rate ? parseFloat(form.hourly_rate) : null,
      clock_in: new Date().toISOString(),
    });
    if (!error) {
      setForm({ worker_name: "", trade: "general", hourly_rate: "", estimate_id: "" });
      refresh();
    }
    setSaving(false);
  };

  const handleClockOut = async (id: string) => {
    if (!supabase) return;
    await supabase.from("time_entries").update({
      clock_out: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq("id", id);
    refresh();
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
        <p className="text-[12px] text-[var(--secondary)]">{active.length} active timer{active.length !== 1 ? "s" : ""} &middot; {entries.length} total entries</p>
        <button onClick={refresh} className="rounded-lg border border-[var(--sep)] p-1.5 transition-colors hover:bg-[var(--bg)]">
          <ArrowPathIcon className="h-3.5 w-3.5 text-[var(--secondary)]" />
        </button>
      </header>

      {/* Active Timers */}
      {active.length > 0 && (
        <div className="px-8 pt-3">
          <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--secondary)] mb-2">Active Timers</p>
          <div className="space-y-2">
            {active.map((e) => (
              <div key={e.id} className="flex items-center gap-3 rounded-xl border border-[var(--accent)]/30 bg-[var(--card)] px-4 py-3 shadow-[var(--shadow-card)]">
                <div className="relative flex-shrink-0">
                  <div className="h-2.5 w-2.5 rounded-full bg-[var(--accent)]" />
                  <div className="absolute inset-0 h-2.5 w-2.5 rounded-full bg-[var(--accent)] animate-ping" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium">{e.worker_name}</p>
                  <p className="text-[11px] text-[var(--secondary)]">{e.trade ?? "general"} &middot; {e.hourly_rate ? fmtMoney(e.hourly_rate) + "/hr" : "No rate"}</p>
                </div>
                <ElapsedTimer clockIn={e.clock_in} />
                <button
                  onClick={() => handleClockOut(e.id)}
                  className="flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-[12px] font-medium text-red-600 transition-colors hover:bg-red-50"
                >
                  <StopIcon className="h-3.5 w-3.5" />
                  Clock Out
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Clock-In Form */}
      <div className="px-8 pt-3">
        <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--secondary)] mb-2">Clock In</p>
        <div className="rounded-xl border border-[var(--sep)] bg-[var(--card)] p-4 shadow-[var(--shadow-card)]">
          <div className="grid grid-cols-4 gap-3">
            <div>
              <label className="text-[11px] font-medium text-[var(--secondary)] mb-1 block">Worker Name</label>
              <input value={form.worker_name} onChange={(e) => setForm((f) => ({ ...f, worker_name: e.target.value }))} placeholder="John Smith" className="w-full rounded-lg border border-[var(--sep)] bg-[var(--bg)] px-3 py-2 text-[12px] outline-none focus:border-[var(--accent)]" />
            </div>
            <div>
              <label className="text-[11px] font-medium text-[var(--secondary)] mb-1 block">Trade</label>
              <select value={form.trade} onChange={(e) => setForm((f) => ({ ...f, trade: e.target.value }))} className="w-full rounded-lg border border-[var(--sep)] bg-[var(--bg)] px-3 py-2 text-[12px] outline-none focus:border-[var(--accent)]">
                {TRADES.map((t) => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-medium text-[var(--secondary)] mb-1 block">Hourly Rate ($)</label>
              <input type="number" step="0.01" value={form.hourly_rate} onChange={(e) => setForm((f) => ({ ...f, hourly_rate: e.target.value }))} placeholder="45.00" className="w-full rounded-lg border border-[var(--sep)] bg-[var(--bg)] px-3 py-2 text-[12px] outline-none focus:border-[var(--accent)]" />
            </div>
            <div>
              <label className="text-[11px] font-medium text-[var(--secondary)] mb-1 block">Estimate</label>
              <select value={form.estimate_id} onChange={(e) => setForm((f) => ({ ...f, estimate_id: e.target.value }))} className="w-full rounded-lg border border-[var(--sep)] bg-[var(--bg)] px-3 py-2 text-[12px] outline-none focus:border-[var(--accent)]">
                <option value="">Select...</option>
                {estimates.map((e) => <option key={e.id} value={e.id}>{e.estimate_number}</option>)}
              </select>
            </div>
          </div>
          <div className="mt-3 flex justify-end">
            <button onClick={handleClockIn} disabled={saving || !form.worker_name.trim() || !form.estimate_id} className="flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-4 py-1.5 text-[12px] font-semibold text-white transition-all hover:brightness-110 disabled:opacity-50 active:scale-[0.98]">
              <PlayIcon className="h-3.5 w-3.5" />
              {saving ? "Clocking in..." : "Clock In"}
            </button>
          </div>
        </div>
      </div>

      {/* Recent Entries */}
      <div className="flex-1 overflow-y-auto px-8 pt-4 pb-6">
        <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--secondary)] mb-2">Recent Entries</p>
        {loading ? (
          <div className="rounded-xl bg-[var(--card)] p-4 shadow-[var(--shadow-card)] space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex justify-between">
                <div className="h-3 w-32 animate-skeleton rounded bg-[var(--gray5)]" />
                <div className="h-3 w-16 animate-skeleton rounded bg-[var(--gray5)]" />
              </div>
            ))}
          </div>
        ) : completed.length === 0 ? (
          <EmptyState
            title="No completed entries"
            description="Clock in workers to start tracking time"
          />
        ) : (
          <div className="rounded-xl bg-[var(--card)] shadow-[var(--shadow-card)]">
            <div className="flex items-center border-b border-[var(--sep)] px-4 py-2">
              <p className="w-28 text-[11px] font-medium text-[var(--secondary)]">Date</p>
              <p className="flex-1 text-[11px] font-medium text-[var(--secondary)]">Worker</p>
              <p className="w-28 text-[11px] font-medium text-[var(--secondary)]">Trade</p>
              <p className="w-20 text-right text-[11px] font-medium text-[var(--secondary)]">Hours</p>
              <p className="w-24 text-right text-[11px] font-medium text-[var(--secondary)]">Cost</p>
            </div>
            {completed.map((e, i, arr) => (
              <div
                key={e.id}
                className={`flex items-center px-4 py-3 transition-colors hover:bg-[var(--bg)] animate-list-item ${i < arr.length - 1 ? "border-b border-[var(--sep)]" : ""}`}
                style={{ animationDelay: `${i * 20}ms` }}
              >
                <p className="w-28 text-[12px] text-[var(--secondary)]">{new Date(e.clock_in).toLocaleDateString()}</p>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium truncate">{e.worker_name}</p>
                </div>
                <p className="w-28 text-[12px] text-[var(--secondary)] capitalize">{(e.trade ?? "general").replace(/_/g, " ")}</p>
                <p className="w-20 text-right text-[12px] font-medium">{fmtHours(e.hours_worked)}</p>
                <p className="w-24 text-right text-[12px] font-semibold text-[var(--accent)]">{fmtMoney(e.labor_cost)}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
