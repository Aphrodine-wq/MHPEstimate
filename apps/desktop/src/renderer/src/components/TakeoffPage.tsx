import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "../lib/supabase";
import { EmptyState } from "./EmptyState";
import {
  MapIcon,
  PlusIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";

interface TakeoffMeasurement {
  id: string;
  estimate_id: string;
  measurement_type: string;
  label: string;
  value: number;
  unit: string;
  color: string;
  notes: string | null;
  page_number: number;
  created_at: string;
}

const TYPE_STYLE: Record<string, string> = {
  linear: "bg-[#e3f2fd] text-[#1565c0]",
  area: "bg-[#e8f5e9] text-[#2e7d32]",
  count: "bg-[#fff3e0] text-[#e65100]",
  volume: "bg-[#f3e5f5] text-[#6a1b9a]",
};

const MEASUREMENT_TYPES = ["linear", "area", "count", "volume"];

const UNIT_OPTIONS: Record<string, string[]> = {
  linear: ["ft", "in", "m", "yd"],
  area: ["sqft", "sqm", "sqyd"],
  count: ["each", "pcs", "sets"],
  volume: ["cuft", "cum", "gal"],
};

export function TakeoffPage() {
  const [measurements, setMeasurements] = useState<TakeoffMeasurement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [estimates, setEstimates] = useState<{ id: string; estimate_number: string }[]>([]);
  const [form, setForm] = useState({
    estimate_id: "",
    measurement_type: "linear",
    label: "",
    value: "",
    unit: "ft",
    color: "#991b1b",
    notes: "",
  });

  const refresh = useCallback(async () => {
    if (!supabase) { setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from("takeoff_measurements")
      .select("*")
      .order("created_at", { ascending: false });
    setMeasurements((data as TakeoffMeasurement[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    if (!supabase) return;
    supabase.from("estimates").select("id, estimate_number").order("created_at", { ascending: false }).then(({ data }) => {
      setEstimates((data as any[]) ?? []);
    });
  }, []);

  const totals = useMemo(() => {
    const result: Record<string, { count: number; total: number; unit: string }> = {};
    for (const m of measurements) {
      if (!result[m.measurement_type]) {
        result[m.measurement_type] = { count: 0, total: 0, unit: m.unit };
      }
      result[m.measurement_type]!.count++;
      result[m.measurement_type]!.total += Number(m.value);
    }
    return result;
  }, [measurements]);

  const handleCreate = async () => {
    if (!supabase || !form.estimate_id || !form.label.trim() || !form.value) return;
    setSaving(true);
    const { error } = await supabase.from("takeoff_measurements").insert({
      estimate_id: form.estimate_id,
      measurement_type: form.measurement_type,
      label: form.label.trim(),
      value: parseFloat(form.value),
      unit: form.unit,
      color: form.color,
      notes: form.notes || null,
      points: [],
    });
    if (!error) {
      setForm({ estimate_id: "", measurement_type: "linear", label: "", value: "", unit: "ft", color: "#991b1b", notes: "" });
      setShowForm(false);
      refresh();
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!supabase) return;
    await supabase.from("takeoff_measurements").delete().eq("id", id);
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
        <p className="text-[12px] text-[var(--secondary)]">{measurements.length} measurements</p>
        <div className="flex items-center gap-2">
          <button onClick={refresh} className="rounded-lg border border-[var(--sep)] p-1.5 transition-colors hover:bg-[var(--bg)]">
            <ArrowPathIcon className="h-3.5 w-3.5 text-[var(--secondary)]" />
          </button>
          <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-3.5 py-1.5 text-[12px] font-semibold text-white shadow-sm shadow-[var(--accent)]/20 transition-all hover:brightness-110 active:scale-[0.98]">
            <PlusIcon className="h-3.5 w-3.5" />
            Add Measurement
          </button>
        </div>
      </header>

      {showForm && (
        <div className="mx-8 mt-3 rounded-xl border border-[var(--sep)] bg-[var(--card)] p-4 shadow-[var(--shadow-card)]">
          <p className="text-[13px] font-semibold mb-3">New Measurement</p>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] font-medium text-[var(--secondary)] mb-1 block">Estimate</label>
              <select value={form.estimate_id} onChange={(e) => setForm((f) => ({ ...f, estimate_id: e.target.value }))} className="w-full rounded-lg border border-[var(--sep)] bg-[var(--bg)] px-3 py-2 text-[12px] outline-none focus:border-[var(--accent)]">
                <option value="">Select...</option>
                {estimates.map((e) => <option key={e.id} value={e.id}>{e.estimate_number}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-medium text-[var(--secondary)] mb-1 block">Type</label>
              <select value={form.measurement_type} onChange={(e) => { setForm((f) => ({ ...f, measurement_type: e.target.value, unit: UNIT_OPTIONS[e.target.value]?.[0] ?? "ft" })); }} className="w-full rounded-lg border border-[var(--sep)] bg-[var(--bg)] px-3 py-2 text-[12px] outline-none focus:border-[var(--accent)] capitalize">
                {MEASUREMENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-medium text-[var(--secondary)] mb-1 block">Label</label>
              <input value={form.label} onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))} placeholder="e.g. Kitchen wall" className="w-full rounded-lg border border-[var(--sep)] bg-[var(--bg)] px-3 py-2 text-[12px] outline-none focus:border-[var(--accent)]" />
            </div>
            <div>
              <label className="text-[11px] font-medium text-[var(--secondary)] mb-1 block">Value</label>
              <input type="number" step="0.01" value={form.value} onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))} placeholder="0.00" className="w-full rounded-lg border border-[var(--sep)] bg-[var(--bg)] px-3 py-2 text-[12px] outline-none focus:border-[var(--accent)]" />
            </div>
            <div>
              <label className="text-[11px] font-medium text-[var(--secondary)] mb-1 block">Unit</label>
              <select value={form.unit} onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))} className="w-full rounded-lg border border-[var(--sep)] bg-[var(--bg)] px-3 py-2 text-[12px] outline-none focus:border-[var(--accent)]">
                {(UNIT_OPTIONS[form.measurement_type] ?? ["ft"]).map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-medium text-[var(--secondary)] mb-1 block">Color</label>
              <input type="color" value={form.color} onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))} className="w-full h-[34px] rounded-lg border border-[var(--sep)] bg-[var(--bg)] outline-none cursor-pointer" />
            </div>
          </div>
          <div className="mt-3 flex gap-2 justify-end">
            <button onClick={() => setShowForm(false)} className="rounded-lg border border-[var(--sep)] px-4 py-1.5 text-[12px] font-medium transition-colors hover:bg-[var(--bg)]">Cancel</button>
            <button onClick={handleCreate} disabled={saving || !form.estimate_id || !form.label.trim() || !form.value} className="rounded-lg bg-[var(--accent)] px-4 py-1.5 text-[12px] font-semibold text-white transition-all hover:brightness-110 disabled:opacity-50">
              {saving ? "Saving..." : "Add Measurement"}
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
                <div className="h-3 w-16 animate-skeleton rounded bg-[var(--gray5)]" />
              </div>
            ))}
          </div>
        ) : measurements.length === 0 ? (
          <EmptyState
            title="No measurements"
            description="Add takeoff measurements from your blueprints"
            action="Add Measurement"
          />
        ) : (
          <>
            {/* Measurement list */}
            <div className="rounded-xl bg-[var(--card)] shadow-[var(--shadow-card)]">
              <div className="flex items-center border-b border-[var(--sep)] px-4 py-2">
                <p className="flex-1 text-[11px] font-medium text-[var(--secondary)]">Label</p>
                <p className="w-20 text-[11px] font-medium text-[var(--secondary)]">Type</p>
                <p className="w-28 text-right text-[11px] font-medium text-[var(--secondary)]">Value</p>
                <p className="w-12" />
              </div>
              {measurements.map((m, i, arr) => (
                <div
                  key={m.id}
                  className={`flex items-center px-4 py-3 transition-colors hover:bg-[var(--bg)] animate-list-item ${i < arr.length - 1 ? "border-b border-[var(--sep)]" : ""}`}
                  style={{ animationDelay: `${i * 20}ms` }}
                >
                  <div className="flex-1 min-w-0 flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full flex-shrink-0" style={{ backgroundColor: m.color }} />
                    <MapIcon className="h-4 w-4 text-[var(--secondary)] flex-shrink-0" />
                    <div>
                      <p className="text-[13px] font-medium truncate">{m.label}</p>
                      {m.notes && <p className="text-[11px] text-[var(--secondary)] truncate">{m.notes}</p>}
                    </div>
                  </div>
                  <div className="w-20">
                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold capitalize ${TYPE_STYLE[m.measurement_type] ?? ""}`}>
                      {m.measurement_type}
                    </span>
                  </div>
                  <p className="w-28 text-right text-[13px] font-semibold">
                    {Number(m.value).toLocaleString("en-US", { maximumFractionDigits: 2 })} {m.unit}
                  </p>
                  <div className="w-12 text-right">
                    <button onClick={() => handleDelete(m.id)} className="text-[11px] text-red-500 hover:text-red-700 transition-colors">Del</button>
                  </div>
                </div>
              ))}
            </div>

            {/* Totals by type */}
            <div className="mt-4 grid grid-cols-4 gap-3">
              {Object.entries(totals).map(([type, data]) => (
                <div key={type} className="rounded-xl border border-[var(--sep)] bg-[var(--card)] p-3 shadow-[var(--shadow-card)]">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--secondary)]">{type}</p>
                  <p className="text-[18px] font-bold mt-1">{data.total.toLocaleString("en-US", { maximumFractionDigits: 2 })}</p>
                  <p className="text-[11px] text-[var(--secondary)]">{data.count} measurement{data.count !== 1 ? "s" : ""}</p>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
