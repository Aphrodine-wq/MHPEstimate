import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { DEMO_MODE, demoJobPhases, demoEstimates } from "../lib/demo-data";
import { EmptyState } from "./EmptyState";
import {
  CalendarDaysIcon,
  PlusIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";

interface JobPhase {
  id: string;
  estimate_id: string;
  phase_name: string;
  sort_order: number;
  start_date: string | null;
  end_date: string | null;
  status: string;
  crew_assigned: string[];
  notes: string | null;
  color: string | null;
  actual_start: string | null;
  actual_end: string | null;
  created_at: string;
}

const STATUS_STYLE: Record<string, string> = {
  not_started: "bg-[var(--gray5)] text-[var(--gray1)]",
  in_progress: "bg-[#e3f2fd] text-[#1565c0]",
  completed: "bg-[#e8f5e9] text-[#2e7d32]",
  blocked: "bg-[#ffebee] text-[#c62828]",
  skipped: "bg-[#fff3e0] text-[#e65100]",
};

const STATUS_LABELS: Record<string, string> = {
  not_started: "Not Started",
  in_progress: "In Progress",
  completed: "Completed",
  blocked: "Blocked",
  skipped: "Skipped",
};

function fmt(d: string | null): string {
  if (!d) return "--";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function SchedulePage() {
  const [phases, setPhases] = useState<JobPhase[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [estimates, setEstimates] = useState<{ id: string; estimate_number: string }[]>([]);
  const [form, setForm] = useState({
    estimate_id: "",
    phase_name: "",
    start_date: "",
    end_date: "",
    status: "not_started",
    crew_assigned: "",
    notes: "",
  });

  const refresh = useCallback(async () => {
    if (!supabase) {
      if (DEMO_MODE) {
        setPhases(demoJobPhases as unknown as JobPhase[]);
        setEstimates(demoEstimates.map((e) => ({ id: e.id, estimate_number: e.estimate_number })));
      }
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from("job_phases")
      .select("*")
      .order("sort_order", { ascending: true });
    const fetched = (data as JobPhase[]) ?? [];
    setPhases(fetched.length > 0 || !DEMO_MODE ? fetched : demoJobPhases as unknown as JobPhase[]);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    if (!supabase) {
      if (DEMO_MODE) setEstimates(demoEstimates.map((e) => ({ id: e.id, estimate_number: e.estimate_number })));
      return;
    }
    supabase.from("estimates").select("id, estimate_number").order("created_at", { ascending: false }).then(({ data }) => {
      const fetched = (data as any[]) ?? [];
      setEstimates(fetched.length > 0 || !DEMO_MODE ? fetched : demoEstimates.map((e) => ({ id: e.id, estimate_number: e.estimate_number })));
    });
  }, []);

  const handleCreate = async () => {
    if (!supabase || !form.estimate_id || !form.phase_name.trim()) return;
    setSaving(true);
    const crew = form.crew_assigned ? form.crew_assigned.split(",").map((s) => s.trim()).filter(Boolean) : [];
    const { error } = await supabase.from("job_phases").insert({
      estimate_id: form.estimate_id,
      phase_name: form.phase_name.trim(),
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      status: form.status,
      crew_assigned: crew,
      notes: form.notes || null,
      sort_order: phases.length,
    });
    if (!error) {
      setForm({ estimate_id: "", phase_name: "", start_date: "", end_date: "", status: "not_started", crew_assigned: "", notes: "" });
      setShowForm(false);
      refresh();
    }
    setSaving(false);
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    if (!supabase) return;
    await supabase.from("job_phases").update({ status: newStatus, updated_at: new Date().toISOString() }).eq("id", id);
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
        <p className="text-[12px] text-[var(--secondary)]">{phases.length} phases scheduled</p>
        <div className="flex items-center gap-2">
          <button onClick={refresh} className="rounded-lg border border-[var(--sep)] p-1.5 transition-colors hover:bg-[var(--bg)]">
            <ArrowPathIcon className="h-3.5 w-3.5 text-[var(--secondary)]" />
          </button>
          <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-3.5 py-1.5 text-[12px] font-semibold text-white shadow-sm shadow-[var(--accent)]/20 transition-all hover:brightness-110 active:scale-[0.98]">
            <PlusIcon className="h-3.5 w-3.5" />
            Add Phase
          </button>
        </div>
      </header>

      {showForm && (
        <div className="mx-8 mt-3 rounded-xl border border-[var(--sep)] bg-[var(--card)] p-4 shadow-[var(--shadow-card)]">
          <p className="text-[13px] font-semibold mb-3">New Phase</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-medium text-[var(--secondary)] mb-1 block">Estimate</label>
              <select value={form.estimate_id} onChange={(e) => setForm((f) => ({ ...f, estimate_id: e.target.value }))} className="w-full rounded-lg border border-[var(--sep)] bg-[var(--bg)] px-3 py-2 text-[12px] outline-none focus:border-[var(--accent)]">
                <option value="">Select estimate...</option>
                {estimates.map((e) => <option key={e.id} value={e.id}>{e.estimate_number}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-medium text-[var(--secondary)] mb-1 block">Phase Name</label>
              <input value={form.phase_name} onChange={(e) => setForm((f) => ({ ...f, phase_name: e.target.value }))} placeholder="e.g. Demolition" className="w-full rounded-lg border border-[var(--sep)] bg-[var(--bg)] px-3 py-2 text-[12px] outline-none focus:border-[var(--accent)]" />
            </div>
            <div>
              <label className="text-[11px] font-medium text-[var(--secondary)] mb-1 block">Start Date</label>
              <input type="date" value={form.start_date} onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))} className="w-full rounded-lg border border-[var(--sep)] bg-[var(--bg)] px-3 py-2 text-[12px] outline-none focus:border-[var(--accent)]" />
            </div>
            <div>
              <label className="text-[11px] font-medium text-[var(--secondary)] mb-1 block">End Date</label>
              <input type="date" value={form.end_date} onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))} className="w-full rounded-lg border border-[var(--sep)] bg-[var(--bg)] px-3 py-2 text-[12px] outline-none focus:border-[var(--accent)]" />
            </div>
            <div>
              <label className="text-[11px] font-medium text-[var(--secondary)] mb-1 block">Status</label>
              <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))} className="w-full rounded-lg border border-[var(--sep)] bg-[var(--bg)] px-3 py-2 text-[12px] outline-none focus:border-[var(--accent)]">
                {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-medium text-[var(--secondary)] mb-1 block">Crew (comma-separated)</label>
              <input value={form.crew_assigned} onChange={(e) => setForm((f) => ({ ...f, crew_assigned: e.target.value }))} placeholder="John, Mike, Sarah" className="w-full rounded-lg border border-[var(--sep)] bg-[var(--bg)] px-3 py-2 text-[12px] outline-none focus:border-[var(--accent)]" />
            </div>
          </div>
          <div className="mt-3">
            <label className="text-[11px] font-medium text-[var(--secondary)] mb-1 block">Notes</label>
            <textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={2} placeholder="Any additional notes..." className="w-full rounded-lg border border-[var(--sep)] bg-[var(--bg)] px-3 py-2 text-[12px] outline-none resize-none focus:border-[var(--accent)]" />
          </div>
          <div className="mt-3 flex gap-2 justify-end">
            <button onClick={() => setShowForm(false)} className="rounded-lg border border-[var(--sep)] px-4 py-1.5 text-[12px] font-medium transition-colors hover:bg-[var(--bg)]">Cancel</button>
            <button onClick={handleCreate} disabled={saving || !form.estimate_id || !form.phase_name.trim()} className="rounded-lg bg-[var(--accent)] px-4 py-1.5 text-[12px] font-semibold text-white transition-all hover:brightness-110 disabled:opacity-50">
              {saving ? "Saving..." : "Create Phase"}
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
        ) : phases.length === 0 ? (
          <EmptyState
            title="No phases scheduled"
            description="Add phases to build a project schedule"
            action="Add Phase"
          />
        ) : (
          <div className="rounded-xl bg-[var(--card)] shadow-[var(--shadow-card)]">
            <div className="flex items-center border-b border-[var(--sep)] px-4 py-2">
              <p className="flex-1 text-[11px] font-medium text-[var(--secondary)]">Phase</p>
              <p className="w-28 text-[11px] font-medium text-[var(--secondary)]">Start</p>
              <p className="w-28 text-[11px] font-medium text-[var(--secondary)]">End</p>
              <p className="w-24 text-[11px] font-medium text-[var(--secondary)]">Status</p>
              <p className="w-40 text-[11px] font-medium text-[var(--secondary)]">Crew</p>
            </div>
            {phases.map((p, i, arr) => (
              <div
                key={p.id}
                className={`flex items-center px-4 py-3 transition-colors hover:bg-[var(--bg)] animate-list-item ${i < arr.length - 1 ? "border-b border-[var(--sep)]" : ""}`}
                style={{ animationDelay: `${i * 20}ms` }}
              >
                <div className="flex-1 min-w-0 flex items-center gap-2">
                  {p.color && <div className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />}
                  <CalendarDaysIcon className="h-4 w-4 text-[var(--secondary)] flex-shrink-0" />
                  <div>
                    <p className="text-[13px] font-medium truncate">{p.phase_name}</p>
                    {p.notes && <p className="text-[11px] text-[var(--secondary)] truncate">{p.notes}</p>}
                  </div>
                </div>
                <p className="w-28 text-[12px] text-[var(--secondary)]">{fmt(p.start_date)}</p>
                <p className="w-28 text-[12px] text-[var(--secondary)]">{fmt(p.end_date)}</p>
                <div className="w-24">
                  <select
                    value={p.status}
                    onChange={(e) => handleStatusChange(p.id, e.target.value)}
                    className={`rounded px-1.5 py-0.5 text-[10px] font-semibold border-none outline-none cursor-pointer ${STATUS_STYLE[p.status] ?? ""}`}
                  >
                    {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div className="w-40 flex flex-wrap gap-1">
                  {p.crew_assigned.length > 0 ? p.crew_assigned.map((c, ci) => (
                    <span key={ci} className="rounded-md bg-[var(--gray5)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--secondary)]">{c}</span>
                  )) : <span className="text-[11px] text-[var(--gray3)]">--</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
