import { useState, useMemo } from "react";
import { Modal, Field, inputClass } from "../Modal";
import { fmt, type DraftLine } from "./types";

type CategoryFilter = "all" | "material" | "labor" | "subcontractor";
type AdjustmentType = "percentage" | "fixed";

interface BulkPriceAdjustmentProps {
  lines: DraftLine[];
  onBulkUpdate: (updatedLines: DraftLine[]) => void;
}

const CATEGORY_OPTIONS: { key: CategoryFilter; label: string }[] = [
  { key: "all", label: "All Line Items" },
  { key: "material", label: "Materials Only" },
  { key: "labor", label: "Labor Only" },
  { key: "subcontractor", label: "Subcontractor Only" },
];

export function BulkPriceAdjustment({ lines, onBulkUpdate }: BulkPriceAdjustmentProps) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [adjustmentType, setAdjustmentType] = useState<AdjustmentType>("percentage");
  const [value, setValue] = useState<number>(0);
  const [reason, setReason] = useState("");

  const affectedLines = useMemo(
    () => lines.filter((l) => l.description.trim() !== "" && (category === "all" || l.category === category)),
    [lines, category],
  );

  const currentTotal = useMemo(
    () => affectedLines.reduce((sum, l) => sum + l.quantity * l.retail_price, 0),
    [affectedLines],
  );

  const newTotal = useMemo(() => {
    return affectedLines.reduce((sum, l) => {
      const adjusted =
        adjustmentType === "percentage"
          ? l.retail_price * (1 + value / 100)
          : l.retail_price + value;
      const clamped = Math.max(0, adjusted);
      return sum + l.quantity * clamped;
    }, 0);
  }, [affectedLines, adjustmentType, value]);

  const totalChange = newTotal - currentTotal;
  const totalChangePct = currentTotal > 0 ? (totalChange / currentTotal) * 100 : 0;

  const handleApply = () => {
    if (value === 0 || affectedLines.length === 0) return;

    const affectedKeys = new Set(affectedLines.map((l) => l._key));
    const updatedLines = lines.map((l) => {
      if (!affectedKeys.has(l._key)) return l;
      const adjusted =
        adjustmentType === "percentage"
          ? l.retail_price * (1 + value / 100)
          : l.retail_price + value;
      const newPrice = Math.max(0, Math.round(adjusted * 100) / 100);
      return { ...l, retail_price: newPrice };
    });

    onBulkUpdate(updatedLines);
    handleClose();
  };

  const handleClose = () => {
    setOpen(false);
    setCategory("all");
    setAdjustmentType("percentage");
    setValue(0);
    setReason("");
  };

  const sign = value >= 0 ? "+" : "";
  const previewLabel =
    adjustmentType === "percentage"
      ? `${sign}${value}%`
      : `${sign}$${fmt(Math.abs(value))}`;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
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
          <line x1="12" y1="1" x2="12" y2="23" />
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
        Adjust Prices
      </button>

      <Modal
        open={open}
        onClose={handleClose}
        title="Bulk Price Adjustment"
        description="Adjust retail prices across multiple line items at once"
        width="w-full max-w-[520px]"
      >
        <div className="px-6 py-5 space-y-5">
          {/* Category selector */}
          <div>
            <p className="mb-2 text-[12px] font-medium text-[var(--secondary)]">Category</p>
            <div className="flex flex-wrap gap-2">
              {CATEGORY_OPTIONS.map((opt) => {
                const count =
                  opt.key === "all"
                    ? lines.filter((l) => l.description.trim() !== "").length
                    : lines.filter((l) => l.description.trim() !== "" && l.category === opt.key).length;
                return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setCategory(opt.key)}
                    className={`rounded-lg border px-3 py-1.5 text-[12px] font-medium transition-all ${
                      category === opt.key
                        ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]"
                        : "border-[var(--sep)] text-[var(--secondary)] hover:bg-[var(--bg)]"
                    }`}
                  >
                    {opt.label}
                    <span className="ml-1.5 text-[10px] opacity-60">{count}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Adjustment type */}
          <div>
            <p className="mb-2 text-[12px] font-medium text-[var(--secondary)]">Adjustment Type</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setAdjustmentType("percentage")}
                className={`flex-1 rounded-lg border px-3 py-2 text-[12px] font-medium transition-all ${
                  adjustmentType === "percentage"
                    ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]"
                    : "border-[var(--sep)] text-[var(--secondary)] hover:bg-[var(--bg)]"
                }`}
              >
                Percentage (%)
              </button>
              <button
                type="button"
                onClick={() => setAdjustmentType("fixed")}
                className={`flex-1 rounded-lg border px-3 py-2 text-[12px] font-medium transition-all ${
                  adjustmentType === "fixed"
                    ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]"
                    : "border-[var(--sep)] text-[var(--secondary)] hover:bg-[var(--bg)]"
                }`}
              >
                Fixed Amount ($)
              </button>
            </div>
          </div>

          {/* Value input */}
          <Field label={adjustmentType === "percentage" ? "Adjustment (%)" : "Adjustment ($)"}>
            <div className="relative">
              <input
                type="number"
                step={adjustmentType === "percentage" ? "0.5" : "0.01"}
                className={inputClass}
                placeholder={adjustmentType === "percentage" ? "e.g. 10 for +10%, -5 for -5%" : "e.g. 25 for +$25, -10 for -$10"}
                value={value || ""}
                onChange={(e) => setValue(parseFloat(e.target.value) || 0)}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px] text-[var(--tertiary)]">
                {adjustmentType === "percentage" ? "%" : "$"}
              </span>
            </div>
          </Field>

          {/* Reason (optional) */}
          <Field label="Reason (optional)">
            <input
              type="text"
              className={inputClass}
              placeholder="e.g. Q2 lumber price increase"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </Field>

          {/* Preview */}
          {affectedLines.length > 0 && value !== 0 && (
            <div className="rounded-xl border border-[var(--sep)] bg-[var(--bg)] p-4 space-y-2">
              <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--secondary)] mb-2">
                Preview
              </p>
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-[var(--secondary)]">Items affected</span>
                <span className="text-[12px] font-medium tabular-nums">{affectedLines.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-[var(--secondary)]">Current total</span>
                <span className="text-[12px] font-medium tabular-nums">${fmt(currentTotal)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-[var(--secondary)]">New total</span>
                <span className="text-[12px] font-bold tabular-nums">${fmt(newTotal)}</span>
              </div>
              <div className="border-t border-[var(--sep)] my-1" />
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-[var(--secondary)]">Change</span>
                <span
                  className={`text-[13px] font-semibold tabular-nums ${
                    totalChange > 0 ? "text-[var(--green)]" : totalChange < 0 ? "text-[var(--red)]" : ""
                  }`}
                >
                  {totalChange >= 0 ? "+" : ""}${fmt(totalChange)} ({totalChangePct >= 0 ? "+" : ""}
                  {totalChangePct.toFixed(1)}%)
                </span>
              </div>
            </div>
          )}

          {affectedLines.length === 0 && (
            <div className="rounded-xl border border-dashed border-[var(--sep)] py-6 text-center">
              <p className="text-[12px] text-[var(--tertiary)]">
                No line items match the selected category.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t border-[var(--sep)] px-6 py-3">
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg border border-[var(--sep)] px-4 py-2 text-[13px] font-medium transition-colors hover:bg-[var(--bg)]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApply}
            disabled={value === 0 || affectedLines.length === 0}
            className="rounded-lg bg-[var(--accent)] px-4 py-2 text-[13px] font-medium text-white transition-all active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Apply {affectedLines.length > 0 && value !== 0 ? `(${previewLabel} to ${affectedLines.length} items)` : ""}
          </button>
        </div>
      </Modal>
    </>
  );
}
