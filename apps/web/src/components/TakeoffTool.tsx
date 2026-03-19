"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Badge, Modal, Field, inputClass, selectClass } from "@proestimate/ui";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Measurement {
  id: string;
  estimate_id: string;
  page_number: number;
  plan_image_path: string | null;
  measurement_type: string;
  label: string;
  value: number;
  unit: string;
  color: string;
  points: unknown[];
  linked_line_item_id: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

interface LineItem {
  id: string;
  name: string;
}

interface TakeoffToolProps {
  estimateId: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MEASUREMENT_TYPES = [
  { id: "linear", label: "Linear", icon: "line", unit: "ft" },
  { id: "area", label: "Area", icon: "square", unit: "sqft" },
  { id: "count", label: "Count", icon: "dot", unit: "each" },
  { id: "volume", label: "Volume", icon: "cube", unit: "cuft" },
] as const;

const UNIT_OPTIONS = ["ft", "in", "sqft", "sqin", "each", "cuft", "yd", "m", "cm"] as const;

const COLOR_PALETTE = [
  "#991b1b", "#b45309", "#15803d", "#0369a1", "#6d28d9",
  "#be185d", "#0f766e", "#c2410c", "#4338ca", "#a16207",
];

const TYPE_ICONS: Record<string, React.ReactNode> = {
  linear: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="4" y1="20" x2="20" y2="4" />
      <circle cx="4" cy="20" r="2" fill="currentColor" />
      <circle cx="20" cy="4" r="2" fill="currentColor" />
    </svg>
  ),
  area: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <rect x="4" y="4" width="16" height="16" rx="1" />
    </svg>
  ),
  count: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="12" r="4" fill="currentColor" />
    </svg>
  ),
  volume: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
    </svg>
  ),
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmtVal(n: number): string {
  if (Number.isInteger(n)) return n.toLocaleString();
  return n.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 2 });
}

// ---------------------------------------------------------------------------
// Measurement Row
// ---------------------------------------------------------------------------

function MeasurementRow({
  m,
  lineItems,
  onDelete,
  onLink,
}: {
  m: Measurement;
  lineItems: LineItem[];
  onDelete: (id: string) => void;
  onLink: (id: string, lineItemId: string | null) => void;
}) {
  return (
    <div className="flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-[var(--fill)] transition-colors group">
      {/* Color dot + type icon */}
      <div className="flex items-center gap-2 shrink-0">
        <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: m.color }} />
        <span className="text-[var(--secondary)]">{TYPE_ICONS[m.measurement_type]}</span>
      </div>

      {/* Label + value */}
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium truncate">{m.label}</p>
        <p className="text-[11px] text-[var(--secondary)] tabular-nums">
          {fmtVal(m.value)} {m.unit}
        </p>
      </div>

      {/* Link to line item */}
      <select
        className="text-[11px] bg-transparent border border-[var(--sep)] rounded-md px-1.5 py-1 text-[var(--secondary)] max-w-[120px] opacity-0 group-hover:opacity-100 transition-opacity"
        value={m.linked_line_item_id ?? ""}
        onChange={(e) => onLink(m.id, e.target.value || null)}
      >
        <option value="">Link to item...</option>
        {lineItems.map((li) => (
          <option key={li.id} value={li.id}>{li.name}</option>
        ))}
      </select>

      {/* Delete */}
      <button
        onClick={() => onDelete(m.id)}
        className="shrink-0 p-1 rounded-md text-[var(--secondary)] hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all"
        title="Delete measurement"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        </svg>
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function TakeoffTool({ estimateId }: TakeoffToolProps) {
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Current page
  const [activePage, setActivePage] = useState(1);

  // Add measurement form
  const [showForm, setShowForm] = useState(false);
  const [newType, setNewType] = useState<string>("linear");
  const [newLabel, setNewLabel] = useState("");
  const [newValue, setNewValue] = useState("");
  const [newUnit, setNewUnit] = useState("ft");
  const [newColor, setNewColor] = useState(COLOR_PALETTE[0]);
  const [newNotes, setNewNotes] = useState("");
  const [saving, setSaving] = useState(false);

  // Plan image (from the measurements data)
  const planImagePath = useMemo(() => {
    const pageM = measurements.find((m) => m.page_number === activePage && m.plan_image_path);
    return pageM?.plan_image_path ?? null;
  }, [measurements, activePage]);

  // Pages list
  const pages = useMemo(() => {
    const set = new Set(measurements.map((m) => m.page_number));
    if (set.size === 0) set.add(1);
    return Array.from(set).sort((a, b) => a - b);
  }, [measurements]);

  // Page measurements
  const pageMeasurements = useMemo(
    () => measurements.filter((m) => m.page_number === activePage),
    [measurements, activePage],
  );

  // Totals by type
  const totals = useMemo(() => {
    const map = new Map<string, { total: number; unit: string }>();
    for (const m of pageMeasurements) {
      const key = m.measurement_type;
      const entry = map.get(key) ?? { total: 0, unit: m.unit };
      entry.total += m.value;
      map.set(key, entry);
    }
    return map;
  }, [pageMeasurements]);

  // ── Fetch ──
  const fetchMeasurements = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/takeoff?estimateId=${estimateId}`);
      if (!res.ok) throw new Error("Failed to fetch measurements");
      const data = await res.json();
      setMeasurements(data.measurements ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [estimateId]);

  // Fetch line items for linking
  const fetchLineItems = useCallback(async () => {
    try {
      // Uses the existing Supabase client-side store, but we can also
      // do a simple fetch if there's an API. For now, empty fallback.
      setLineItems([]);
    } catch {
      // Silently ignore
    }
  }, []);

  useEffect(() => {
    fetchMeasurements();
    fetchLineItems();
  }, [fetchMeasurements, fetchLineItems]);

  // ── Add measurement ──
  const handleAdd = async () => {
    if (!newLabel.trim() || !newValue) return;
    setSaving(true);
    try {
      const res = await fetch("/api/takeoff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          estimate_id: estimateId,
          page_number: activePage,
          measurement_type: newType,
          label: newLabel.trim(),
          value: parseFloat(newValue),
          unit: newUnit,
          color: newColor,
          notes: newNotes.trim() || null,
          points: [],
        }),
      });
      if (!res.ok) throw new Error("Failed to save");
      setNewLabel("");
      setNewValue("");
      setNewNotes("");
      setShowForm(false);
      fetchMeasurements();
    } catch {
      // Handled silently
    } finally {
      setSaving(false);
    }
  };

  // ── Delete measurement ──
  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/takeoff?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      setMeasurements((prev) => prev.filter((m) => m.id !== id));
    } catch {
      // Handled silently
    }
  };

  // ── Link to line item (placeholder for future PATCH) ──
  const handleLink = (_measurementId: string, _lineItemId: string | null) => {
    // Would PATCH the measurement — left as placeholder since takeoff
    // route doesn't have a PATCH yet
  };

  // ── Undo ──
  const handleUndo = () => {
    if (pageMeasurements.length === 0) return;
    const last = pageMeasurements[pageMeasurements.length - 1];
    if (last) handleDelete(last.id);
  };

  // ── Loading / Error ──
  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--sep)] border-t-[var(--accent)]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="text-center">
          <p className="text-[15px] font-semibold mb-1 text-red-400">Error loading takeoff</p>
          <p className="text-[13px] text-[var(--secondary)]">{error}</p>
          <button onClick={fetchMeasurements} className="mt-3 text-[13px] text-[var(--accent)] hover:underline">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* ══ Left: Canvas / Plan Image ══ */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Toolbar */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--sep)] bg-[var(--card)]">
          {/* Tool selector */}
          <div className="flex items-center rounded-lg bg-[var(--fill)] p-0.5">
            {MEASUREMENT_TYPES.map((t) => (
              <button
                key={t.id}
                onClick={() => { setNewType(t.id); setNewUnit(t.unit); setShowForm(true); }}
                className={`flex items-center gap-1.5 text-[12px] font-medium px-3 py-1.5 rounded-md transition-colors ${
                  newType === t.id && showForm
                    ? "bg-[var(--accent)] text-white"
                    : "text-[var(--secondary)] hover:text-[var(--text)]"
                }`}
              >
                {TYPE_ICONS[t.id]}
                <span className="hidden sm:inline">{t.label}</span>
              </button>
            ))}
          </div>

          <div className="w-px h-6 bg-[var(--sep)]" />

          {/* Undo */}
          <button
            onClick={handleUndo}
            disabled={pageMeasurements.length === 0}
            className="text-[12px] font-medium px-3 py-1.5 rounded-lg bg-[var(--fill)] text-[var(--secondary)] hover:text-[var(--text)] disabled:opacity-30 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="inline mr-1">
              <polyline points="1 4 1 10 7 10" />
              <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
            </svg>
            Undo
          </button>

          {/* Color picker */}
          <div className="flex items-center gap-1 ml-2">
            {COLOR_PALETTE.map((c) => (
              <button
                key={c}
                onClick={() => setNewColor(c)}
                className={`w-5 h-5 rounded-full border-2 transition-all ${
                  newColor === c ? "border-white scale-110" : "border-transparent"
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>

          <div className="flex-1" />

          {/* Add button */}
          <button
            onClick={() => setShowForm(true)}
            className="text-[12px] font-semibold px-3 py-1.5 rounded-lg bg-[var(--accent)] text-white hover:opacity-90 transition-opacity"
          >
            + Measurement
          </button>
        </div>

        {/* Plan canvas area */}
        <div className="flex-1 overflow-auto bg-[var(--bg)] flex items-center justify-center p-4">
          {planImagePath ? (
            <div className="relative max-w-full max-h-full">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={planImagePath}
                alt="Blueprint plan"
                className="max-w-full max-h-[calc(100vh-200px)] object-contain rounded-lg shadow-lg"
              />
              {/* Measurement annotations overlay placeholder */}
              <div className="absolute inset-0 pointer-events-none">
                {pageMeasurements.map((m) => (
                  <div
                    key={m.id}
                    className="absolute top-2 left-2 text-[10px] font-bold px-1.5 py-0.5 rounded"
                    style={{ backgroundColor: m.color + "40", color: m.color, border: `1px solid ${m.color}` }}
                  >
                    {m.label}: {fmtVal(m.value)} {m.unit}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--secondary)" strokeWidth="1" strokeLinecap="round" className="mx-auto mb-4 opacity-30">
                <rect x="2" y="2" width="20" height="20" rx="2" />
                <line x1="2" y1="8" x2="22" y2="8" />
                <line x1="8" y1="2" x2="8" y2="22" />
                <line x1="14" y1="2" x2="14" y2="22" />
                <line x1="2" y1="14" x2="22" y2="14" />
              </svg>
              <p className="text-[15px] font-semibold mb-1 text-[var(--secondary)]">No plan uploaded</p>
              <p className="text-[12px] text-[var(--secondary)]/70">
                Upload a blueprint to Supabase Storage and link it to measurements.
              </p>
              <p className="text-[12px] text-[var(--secondary)]/50 mt-2">
                You can still add measurements manually below.
              </p>
            </div>
          )}
        </div>

        {/* Page navigation */}
        {pages.length > 0 && (
          <div className="flex items-center gap-2 px-4 py-2 border-t border-[var(--sep)] bg-[var(--card)]">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--secondary)]">Pages:</span>
            {pages.map((p) => (
              <button
                key={p}
                onClick={() => setActivePage(p)}
                className={`text-[12px] font-medium w-8 h-8 rounded-lg transition-colors ${
                  activePage === p
                    ? "bg-[var(--accent)] text-white"
                    : "bg-[var(--fill)] text-[var(--secondary)] hover:text-[var(--text)]"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ══ Right: Measurements Panel ══ */}
      <div className="w-[320px] shrink-0 border-l border-[var(--sep)] bg-[var(--card)] flex flex-col overflow-hidden">
        <div className="px-4 py-3 border-b border-[var(--sep)]">
          <h3 className="text-[13px] font-semibold">
            Measurements
            <span className="ml-2 text-[var(--secondary)] font-normal">({pageMeasurements.length})</span>
          </h3>
        </div>

        {/* Measurement list */}
        <div className="flex-1 overflow-y-auto">
          {pageMeasurements.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center px-4">
              <p className="text-[13px] text-[var(--secondary)]">No measurements on this page</p>
              <button
                onClick={() => setShowForm(true)}
                className="mt-2 text-[12px] text-[var(--accent)] hover:underline"
              >
                Add a measurement
              </button>
            </div>
          ) : (
            <div className="py-1">
              {pageMeasurements.map((m) => (
                <MeasurementRow
                  key={m.id}
                  m={m}
                  lineItems={lineItems}
                  onDelete={handleDelete}
                  onLink={handleLink}
                />
              ))}
            </div>
          )}
        </div>

        {/* Totals by type */}
        {totals.size > 0 && (
          <div className="border-t border-[var(--sep)] px-4 py-3 space-y-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--secondary)] mb-1">Totals</p>
            {Array.from(totals.entries()).map(([type, data]) => (
              <div key={type} className="flex items-center justify-between text-[12px]">
                <span className="flex items-center gap-1.5 text-[var(--secondary)]">
                  {TYPE_ICONS[type]}
                  {MEASUREMENT_TYPES.find((t) => t.id === type)?.label ?? type}
                </span>
                <span className="font-semibold tabular-nums">{fmtVal(data.total)} {data.unit}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Add Measurement Modal ── */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title="Add Measurement">
        <div className="space-y-4 p-1">
          {/* Type selector */}
          <Field label="Type">
            <div className="flex gap-2">
              {MEASUREMENT_TYPES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => { setNewType(t.id); setNewUnit(t.unit); }}
                  className={`flex items-center gap-1.5 text-[12px] font-medium px-3 py-2 rounded-lg border transition-colors ${
                    newType === t.id
                      ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]"
                      : "border-[var(--sep)] text-[var(--secondary)] hover:text-[var(--text)]"
                  }`}
                >
                  {TYPE_ICONS[t.id]}
                  {t.label}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Label">
            <input
              type="text"
              className={inputClass}
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="e.g. Living room perimeter"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Value">
              <input
                type="number"
                className={inputClass}
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                placeholder="0"
                min="0"
                step="0.01"
              />
            </Field>
            <Field label="Unit">
              <select className={selectClass} value={newUnit} onChange={(e) => setNewUnit(e.target.value)}>
                {UNIT_OPTIONS.map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </Field>
          </div>

          {/* Color */}
          <Field label="Color">
            <div className="flex items-center gap-2">
              {COLOR_PALETTE.map((c) => (
                <button
                  key={c}
                  onClick={() => setNewColor(c)}
                  className={`w-6 h-6 rounded-full border-2 transition-all ${
                    newColor === c ? "border-white scale-110" : "border-transparent"
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </Field>

          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setShowForm(false)}
              className="text-[13px] px-4 py-2 rounded-lg bg-[var(--fill)] text-[var(--secondary)] hover:text-[var(--text)] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAdd}
              disabled={saving || !newLabel.trim() || !newValue}
              className="text-[13px] font-semibold px-4 py-2 rounded-lg bg-[var(--accent)] text-white hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {saving ? "Saving..." : "Add"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
