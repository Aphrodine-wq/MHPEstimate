import { useMemo } from "react";
import { TABS, UNIT_OPTIONS, fmt, type DraftLine, type TabKey } from "./types";

export interface EstimateLineItemsSectionProps {
  lines: DraftLine[];
  activeTab: TabKey;
  setActiveTab: (tab: TabKey) => void;
  updateLine: (key: string, field: keyof DraftLine, value: string | number) => void;
  addLine: () => void;
  removeLine: (key: string) => void;
}

export function EstimateLineItemsSection({
  lines,
  activeTab,
  setActiveTab,
  updateLine,
  addLine,
  removeLine,
}: EstimateLineItemsSectionProps) {
  const tabLines = useMemo(() => lines.filter((l) => l.category === activeTab), [lines, activeTab]);

  return (
    <div>
      {/* Tab bar + Add button */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex rounded-lg bg-[var(--gray5)] p-0.5">
          {TABS.map((tab) => {
            const count = lines.filter((l) => l.category === tab.key).length;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`rounded-md px-3 py-1.5 text-[12px] font-medium transition-all ${
                  activeTab === tab.key
                    ? "bg-[var(--card)] text-[var(--label)] shadow-sm"
                    : "text-[var(--secondary)]"
                }`}
              >
                {tab.label}
                {count > 0 && (
                  <span className="ml-1.5 text-[10px] text-[var(--tertiary)]">{count}</span>
                )}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={addLine}
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
          Add Row
        </button>
      </div>

      {/* Table header */}
      <div className="overflow-x-auto">
      <div
        className="grid items-center gap-2 px-2 pb-1.5 text-[11px] font-medium uppercase tracking-wide text-[var(--secondary)] min-w-[540px]"
        style={{ gridTemplateColumns: "1fr 80px 90px 100px 100px 36px" }}
      >
        <span>Description</span>
        <span className="text-right">Qty</span>
        <span>Unit</span>
        <span className="text-right">Price</span>
        <span className="text-right">Total</span>
        <span />
      </div>

      {/* Table rows */}
      <div className="space-y-1.5 max-h-[240px] overflow-y-auto min-w-[540px]">
        {tabLines.length === 0 ? (
          <div className="flex items-center justify-center rounded-lg border border-dashed border-[var(--sep)] py-8">
            <p className="text-[12px] text-[var(--tertiary)]">
              No {TABS.find((t) => t.key === activeTab)?.label.toLowerCase()} line items yet.
              Click &quot;Add Row&quot; to start.
            </p>
          </div>
        ) : (
          tabLines.map((line) => {
            const total = line.quantity * line.unit_price;
            return (
              <div
                key={line._key}
                className="grid items-center gap-2 rounded-lg border border-[var(--sep)] bg-[var(--bg)] px-2 py-1.5"
                style={{ gridTemplateColumns: "1fr 80px 90px 100px 100px 36px" }}
              >
                <input
                  className="w-full rounded-md border-none bg-transparent px-2 py-1 text-[13px] outline-none placeholder:text-[var(--gray3)]"
                  placeholder="Item description..."
                  value={line.description}
                  onChange={(e) => updateLine(line._key, "description", e.target.value)}
                />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="w-full rounded-md border-none bg-transparent px-2 py-1 text-right text-[13px] outline-none"
                  value={line.quantity}
                  onChange={(e) =>
                    updateLine(line._key, "quantity", parseFloat(e.target.value) || 0)
                  }
                />
                <select
                  className="w-full rounded-md border-none bg-transparent px-1 py-1 text-[12px] outline-none"
                  value={line.unit}
                  onChange={(e) => updateLine(line._key, "unit", e.target.value)}
                >
                  {UNIT_OPTIONS.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="w-full rounded-md border-none bg-transparent px-2 py-1 text-right text-[13px] outline-none"
                  value={line.unit_price}
                  onChange={(e) =>
                    updateLine(line._key, "unit_price", parseFloat(e.target.value) || 0)
                  }
                />
                <span className="text-right text-[13px] font-medium tabular-nums pr-1">
                  ${fmt(total)}
                </span>
                <button
                  type="button"
                  onClick={() => removeLine(line._key)}
                  className="flex items-center justify-center rounded-md p-1 text-[var(--gray2)] transition-colors hover:bg-[var(--card)] hover:text-[var(--red)]"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  >
                    <path d="M18 6 6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
            );
          })
        )}
      </div>
      </div>
    </div>
  );
}
