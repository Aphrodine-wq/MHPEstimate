import { useState, useCallback } from "react";
import { useLaborRates, type LaborRatePreset } from "../../hooks/useLaborRates";

/** Default MS construction trade presets */
const DEFAULT_TRADES: Array<{ trade: string; hourly_rate: number }> = [
  { trade: "Framing", hourly_rate: 85 },
  { trade: "Finish Carpentry", hourly_rate: 75 },
  { trade: "Electrical", hourly_rate: 90 },
  { trade: "Plumbing", hourly_rate: 85 },
  { trade: "HVAC", hourly_rate: 95 },
  { trade: "Painting", hourly_rate: 55 },
  { trade: "Drywall", hourly_rate: 65 },
  { trade: "Roofing", hourly_rate: 70 },
  { trade: "Concrete", hourly_rate: 80 },
  { trade: "Demolition", hourly_rate: 50 },
  { trade: "Tile", hourly_rate: 75 },
  { trade: "Flooring", hourly_rate: 65 },
  { trade: "Insulation", hourly_rate: 55 },
  { trade: "General Labor", hourly_rate: 45 },
];

const ROLE_OPTIONS = ["journeyman", "apprentice", "foreman", "helper", "master"] as const;

interface EditingRate {
  trade: string;
  role: string;
  hourly_rate: string;
  overtime_rate: string;
  is_default: boolean;
}

const emptyEditing: EditingRate = {
  trade: "",
  role: "journeyman",
  hourly_rate: "",
  overtime_rate: "",
  is_default: false,
};

export function LaborRatesSettings() {
  const { rates, loading, addRate, updateRate, deleteRate } = useLaborRates();
  const [adding, setAdding] = useState(false);
  const [newRate, setNewRate] = useState<EditingRate>({ ...emptyEditing });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<EditingRate>({ ...emptyEditing });
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);

  const handleSeedDefaults = useCallback(async () => {
    setSeeding(true);
    for (const preset of DEFAULT_TRADES) {
      await addRate({
        trade: preset.trade,
        role: "journeyman",
        hourly_rate: preset.hourly_rate,
        overtime_rate: preset.hourly_rate * 1.5,
        is_default: true,
      });
    }
    setSeeding(false);
  }, [addRate]);

  const handleAdd = useCallback(async () => {
    const hourly = parseFloat(newRate.hourly_rate);
    if (!newRate.trade.trim() || isNaN(hourly) || hourly < 0) return;

    const overtime = newRate.overtime_rate ? parseFloat(newRate.overtime_rate) : null;

    await addRate({
      trade: newRate.trade,
      role: newRate.role,
      hourly_rate: hourly,
      overtime_rate: overtime !== null && !isNaN(overtime) ? overtime : null,
      is_default: newRate.is_default,
    });

    setNewRate({ ...emptyEditing });
    setAdding(false);
  }, [newRate, addRate]);

  const startEditing = useCallback((rate: LaborRatePreset) => {
    setEditingId(rate.id);
    setEditValues({
      trade: rate.trade,
      role: rate.role,
      hourly_rate: String(rate.hourly_rate),
      overtime_rate: rate.overtime_rate !== null ? String(rate.overtime_rate) : "",
      is_default: rate.is_default,
    });
  }, []);

  const handleSaveEdit = useCallback(async () => {
    if (!editingId) return;
    const hourly = parseFloat(editValues.hourly_rate);
    if (!editValues.trade.trim() || isNaN(hourly) || hourly < 0) return;

    const overtime = editValues.overtime_rate ? parseFloat(editValues.overtime_rate) : null;

    await updateRate({
      id: editingId,
      trade: editValues.trade,
      role: editValues.role,
      hourly_rate: hourly,
      overtime_rate: overtime !== null && !isNaN(overtime) ? overtime : null,
      is_default: editValues.is_default,
    });

    setEditingId(null);
  }, [editingId, editValues, updateRate]);

  const handleDelete = useCallback(
    async (id: string) => {
      await deleteRate(id);
      setDeletingId(null);
    },
    [deleteRate]
  );

  const handleToggleDefault = useCallback(
    async (rate: LaborRatePreset) => {
      await updateRate({ id: rate.id, is_default: !rate.is_default });
    },
    [updateRate]
  );

  if (loading) {
    return <p className="text-[13px] text-[var(--secondary)]">Loading labor rates...</p>;
  }

  return (
    <div>
      {/* Header with actions */}
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--secondary)]">
          Labor Rate Presets
        </p>
        <div className="flex items-center gap-2">
          {rates.length === 0 && (
            <button
              type="button"
              onClick={handleSeedDefaults}
              disabled={seeding}
              className="rounded-lg border border-[var(--accent)]/30 px-3 py-1.5 text-[12px] font-medium text-[var(--accent)] transition-colors hover:bg-[var(--accent)]/10 disabled:opacity-50"
            >
              {seeding ? "Seeding..." : "Load MS Defaults"}
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setAdding(true);
              setNewRate({ ...emptyEditing });
            }}
            className="flex items-center gap-1 rounded-lg border border-[var(--sep)] px-3 py-1.5 text-[12px] font-medium transition-colors hover:bg-[var(--bg)]"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
            Add Rate
          </button>
        </div>
      </div>

      <p className="mb-3 text-[11px] text-[var(--tertiary)]">
        Set hourly labor rates by trade. These rates auto-fill when adding labor line items in estimates.
      </p>

      {/* Table */}
      <div className="rounded-xl border border-[var(--sep)] bg-[var(--card)] overflow-hidden">
        {/* Header row */}
        <div
          className="grid items-center gap-2 border-b border-[var(--sep)] bg-[var(--bg)] px-4 py-2 text-[11px] font-medium uppercase tracking-wide text-[var(--secondary)]"
          style={{ gridTemplateColumns: "1fr 100px 90px 90px 60px 72px" }}
        >
          <span>Trade</span>
          <span>Role</span>
          <span className="text-right">$/hr</span>
          <span className="text-right">OT $/hr</span>
          <span className="text-center">Default</span>
          <span />
        </div>

        {/* Add inline row */}
        {adding && (
          <div
            className="grid items-center gap-2 border-b border-[var(--sep)] bg-[var(--accent)]/5 px-4 py-2"
            style={{ gridTemplateColumns: "1fr 100px 90px 90px 60px 72px" }}
          >
            <input
              className="rounded-md border border-[var(--sep)] bg-[var(--card)] px-2 py-1 text-[13px] outline-none focus:border-[var(--accent)] transition-colors"
              placeholder="Trade name..."
              value={newRate.trade}
              onChange={(e) => setNewRate((p) => ({ ...p, trade: e.target.value }))}
              autoFocus
            />
            <select
              className="rounded-md border border-[var(--sep)] bg-[var(--card)] px-1 py-1 text-[12px] outline-none"
              value={newRate.role}
              onChange={(e) => setNewRate((p) => ({ ...p, role: e.target.value }))}
            >
              {ROLE_OPTIONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            <input
              type="number"
              min="0"
              step="0.01"
              className="rounded-md border border-[var(--sep)] bg-[var(--card)] px-2 py-1 text-right text-[13px] outline-none focus:border-[var(--accent)] transition-colors"
              placeholder="0.00"
              value={newRate.hourly_rate}
              onChange={(e) => setNewRate((p) => ({ ...p, hourly_rate: e.target.value }))}
            />
            <input
              type="number"
              min="0"
              step="0.01"
              className="rounded-md border border-[var(--sep)] bg-[var(--card)] px-2 py-1 text-right text-[13px] outline-none focus:border-[var(--accent)] transition-colors"
              placeholder="0.00"
              value={newRate.overtime_rate}
              onChange={(e) => setNewRate((p) => ({ ...p, overtime_rate: e.target.value }))}
            />
            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => setNewRate((p) => ({ ...p, is_default: !p.is_default }))}
                role="switch"
                aria-checked={newRate.is_default}
                className={`relative h-[22px] w-[38px] rounded-full transition-colors ${
                  newRate.is_default ? "bg-[var(--green)]" : "bg-[var(--gray4)]"
                }`}
              >
                <div
                  className={`absolute top-[2px] h-[18px] w-[18px] rounded-full bg-white shadow transition-transform ${
                    newRate.is_default ? "translate-x-[18px]" : "translate-x-[2px]"
                  }`}
                />
              </button>
            </div>
            <div className="flex items-center gap-1 justify-end">
              <button
                type="button"
                onClick={handleAdd}
                className="rounded px-2 py-0.5 text-[11px] font-semibold bg-[var(--accent)] text-white transition-all hover:brightness-110"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => setAdding(false)}
                className="rounded px-1.5 py-0.5 text-[11px] text-[var(--tertiary)] hover:text-[var(--label)] transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Rows */}
        {rates.length === 0 && !adding ? (
          <div className="flex items-center justify-center py-8">
            <p className="text-[12px] text-[var(--tertiary)]">
              No labor rates configured. Click &quot;Load MS Defaults&quot; to start with common trade rates, or add your own.
            </p>
          </div>
        ) : (
          rates.map((rate) => {
            const isEditing = editingId === rate.id;
            const isDeleting = deletingId === rate.id;

            if (isEditing) {
              return (
                <div
                  key={rate.id}
                  className="grid items-center gap-2 border-b border-[var(--sep)] bg-[var(--accent)]/5 px-4 py-2"
                  style={{ gridTemplateColumns: "1fr 100px 90px 90px 60px 72px" }}
                >
                  <input
                    className="rounded-md border border-[var(--sep)] bg-[var(--card)] px-2 py-1 text-[13px] outline-none focus:border-[var(--accent)] transition-colors"
                    value={editValues.trade}
                    onChange={(e) => setEditValues((p) => ({ ...p, trade: e.target.value }))}
                    autoFocus
                  />
                  <select
                    className="rounded-md border border-[var(--sep)] bg-[var(--card)] px-1 py-1 text-[12px] outline-none"
                    value={editValues.role}
                    onChange={(e) => setEditValues((p) => ({ ...p, role: e.target.value }))}
                  >
                    {ROLE_OPTIONS.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="rounded-md border border-[var(--sep)] bg-[var(--card)] px-2 py-1 text-right text-[13px] outline-none focus:border-[var(--accent)] transition-colors"
                    value={editValues.hourly_rate}
                    onChange={(e) => setEditValues((p) => ({ ...p, hourly_rate: e.target.value }))}
                  />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="rounded-md border border-[var(--sep)] bg-[var(--card)] px-2 py-1 text-right text-[13px] outline-none focus:border-[var(--accent)] transition-colors"
                    value={editValues.overtime_rate}
                    onChange={(e) => setEditValues((p) => ({ ...p, overtime_rate: e.target.value }))}
                  />
                  <div className="flex justify-center">
                    <button
                      type="button"
                      onClick={() => setEditValues((p) => ({ ...p, is_default: !p.is_default }))}
                      role="switch"
                      aria-checked={editValues.is_default}
                      className={`relative h-[22px] w-[38px] rounded-full transition-colors ${
                        editValues.is_default ? "bg-[var(--green)]" : "bg-[var(--gray4)]"
                      }`}
                    >
                      <div
                        className={`absolute top-[2px] h-[18px] w-[18px] rounded-full bg-white shadow transition-transform ${
                          editValues.is_default ? "translate-x-[18px]" : "translate-x-[2px]"
                        }`}
                      />
                    </button>
                  </div>
                  <div className="flex items-center gap-1 justify-end">
                    <button
                      type="button"
                      onClick={handleSaveEdit}
                      className="rounded px-2 py-0.5 text-[11px] font-semibold bg-[var(--accent)] text-white transition-all hover:brightness-110"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="rounded px-1.5 py-0.5 text-[11px] text-[var(--tertiary)] hover:text-[var(--label)] transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={rate.id}
                className="grid items-center gap-2 border-b border-[var(--sep)] px-4 py-2.5 last:border-b-0 hover:bg-[var(--bg)] transition-colors"
                style={{ gridTemplateColumns: "1fr 100px 90px 90px 60px 72px" }}
              >
                <span className="text-[13px] font-medium">{rate.trade}</span>
                <span className="text-[12px] text-[var(--secondary)] capitalize">{rate.role}</span>
                <span className="text-right text-[13px] tabular-nums">
                  ${Number(rate.hourly_rate).toFixed(2)}
                </span>
                <span className="text-right text-[13px] tabular-nums text-[var(--secondary)]">
                  {rate.overtime_rate !== null ? `$${Number(rate.overtime_rate).toFixed(2)}` : "--"}
                </span>
                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={() => handleToggleDefault(rate)}
                    role="switch"
                    aria-checked={rate.is_default}
                    aria-label={`Toggle default for ${rate.trade}`}
                    className={`relative h-[22px] w-[38px] rounded-full transition-colors ${
                      rate.is_default ? "bg-[var(--green)]" : "bg-[var(--gray4)]"
                    }`}
                  >
                    <div
                      className={`absolute top-[2px] h-[18px] w-[18px] rounded-full bg-white shadow transition-transform ${
                        rate.is_default ? "translate-x-[18px]" : "translate-x-[2px]"
                      }`}
                    />
                  </button>
                </div>
                <div className="flex items-center gap-1 justify-end">
                  {isDeleting ? (
                    <>
                      <button
                        type="button"
                        onClick={() => handleDelete(rate.id)}
                        className="rounded px-2 py-0.5 text-[11px] font-semibold text-[var(--red)] border border-[var(--red)]/30 hover:bg-[var(--red)]/10 transition-colors"
                      >
                        Confirm
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingId(null)}
                        className="rounded px-1.5 py-0.5 text-[11px] text-[var(--tertiary)] hover:text-[var(--label)] transition-colors"
                      >
                        No
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => startEditing(rate)}
                        className="rounded p-1 text-[var(--secondary)] hover:text-[var(--foreground)] hover:bg-[var(--card)] transition-colors"
                        title="Edit"
                      >
                        <svg
                          width="13"
                          height="13"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingId(rate.id)}
                        className="rounded p-1 text-[var(--gray2)] hover:text-[var(--red)] hover:bg-[var(--card)] transition-colors"
                        title="Delete"
                      >
                        <svg
                          width="13"
                          height="13"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                        >
                          <path d="M18 6 6 18M6 6l12 12" />
                        </svg>
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
