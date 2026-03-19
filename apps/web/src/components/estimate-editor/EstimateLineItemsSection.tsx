import { useMemo, useState } from "react";
import { suggestPrice, type PricingSuggestion } from "@proestimate/estimation-engine";
import { TABS, UNIT_OPTIONS, DRYWALL_UNIT, DRYWALL_HINT, fmt, type DraftLine, type TabKey, type EstimateCategory, INFRASTRUCTURE_DIVISIONS } from "./types";
import { PriceFreshnessBadge } from "../PriceFreshnessBadge";
import { MoasureImport } from "../MoasureImport";
import { PlanImport } from "../PlanImport";
import { BulkPriceAdjustment } from "./BulkPriceAdjustment";
import type { PriceFreshness } from "@proestimate/shared/types";
import type { LaborRatePreset } from "../../hooks/useLaborRates";

/** Map suggestion confidence to a price freshness indicator */
function confidenceToFreshness(confidence: "high" | "medium" | "low"): PriceFreshness {
  if (confidence === "high") return "green";
  if (confidence === "medium") return "yellow";
  return "orange";
}

export interface EstimateLineItemsSectionProps {
  lines: DraftLine[];
  activeTab: TabKey;
  setActiveTab: (tab: TabKey) => void;
  updateLine: (key: string, field: keyof DraftLine, value: string | number) => void;
  addLine: () => void;
  removeLine: (key: string) => void;
  onAddLines?: (newLines: DraftLine[]) => void;
  onBulkUpdate?: (updatedLines: DraftLine[]) => void;
  estimateCategory?: EstimateCategory;
  /** Labor rate presets — when provided, shows a Trade dropdown on labor line items */
  laborRates?: LaborRatePreset[];
}

/** Check if a description is drywall-related to auto-suggest board feet */
function isDrywallItem(description: string): boolean {
  const lower = description.toLowerCase();
  return lower.includes("drywall") || lower.includes("sheetrock") || lower.includes("gypsum");
}

export function EstimateLineItemsSection({
  lines,
  activeTab,
  setActiveTab,
  updateLine,
  addLine,
  removeLine,
  onAddLines,
  onBulkUpdate,
  estimateCategory = "building",
  laborRates,
}: EstimateLineItemsSectionProps) {
  // For infrastructure, show all items in a single list grouped by division
  // For building, use the existing Material/Labor/Subcontractor tabs
  const tabLines = useMemo(() => lines.filter((l) => l.category === activeTab), [lines, activeTab]);

  const [suggestions, setSuggestions] = useState<Record<string, PricingSuggestion | null>>({});

  const handleSuggest = (key: string, description: string) => {
    if (description.trim().length < 3) return;
    const result = suggestPrice(description.trim());
    setSuggestions((prev) => ({ ...prev, [key]: result }));
  };

  const handleUseSuggestion = (key: string, price: number) => {
    updateLine(key, "unit_price", price);
    setSuggestions((prev) => ({ ...prev, [key]: null }));
  };

  const handleDismissSuggestion = (key: string) => {
    setSuggestions((prev) => ({ ...prev, [key]: null }));
  };

  // Labor rate preset auto-fill: when a trade is selected, fill labor_cost and set unit to "hour"
  const showTradeDropdown = activeTab === "labor" && laborRates && laborRates.length > 0;

  const handleTradeSelect = (key: string, tradeName: string) => {
    if (!laborRates) return;
    const preset = laborRates.find((r) => r.trade === tradeName);
    if (preset) {
      updateLine(key, "description", `${preset.trade} (${preset.role})`);
      updateLine(key, "labor_cost", Number(preset.hourly_rate));
      updateLine(key, "retail_price", Number(preset.hourly_rate));
      updateLine(key, "unit", "hour");
    }
  };

  return (
    <div>
      {/* Tab bar + Add button */}
      <div className="flex items-center justify-between mb-3">
        {estimateCategory === "building" ? (
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
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-medium uppercase tracking-wide text-[var(--secondary)]">
              Infrastructure Line Items
            </span>
            <span className="text-[10px] text-[var(--tertiary)]">
              ({lines.length} items)
            </span>
          </div>
        )}

        <div className="flex items-center gap-2">
          {onAddLines && (
            <>
              <PlanImport onImport={onAddLines} projectType="general" />
              <MoasureImport onImport={onAddLines} projectType={activeTab === "material" ? "general" : undefined} />
            </>
          )}
          {onBulkUpdate && lines.filter((l) => l.description.trim() !== "").length > 0 && (
            <BulkPriceAdjustment lines={lines} onBulkUpdate={onBulkUpdate} />
          )}
          <button
            type="button"
            onClick={addLine}
            className="flex items-center gap-1 rounded-lg border border-[var(--sep)] px-3 py-1.5 text-[12px] font-medium transition-colors hover:bg-[var(--bg)]"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Add Row
          </button>
        </div>
      </div>

      {/* Consolidated table header — shows Material Cost + Labor Cost + Retail Price */}
      <div className="overflow-x-auto">
        <div
          className="grid items-center gap-2 px-2 pb-1.5 text-[11px] font-medium uppercase tracking-wide text-[var(--secondary)] min-w-[820px]"
          style={{ gridTemplateColumns: "1fr 64px 80px 96px 96px 96px 90px 36px" }}
        >
          <span>Description</span>
          <span className="text-right">Qty</span>
          <span>Unit</span>
          <span className="text-right">Material $</span>
          <span className="text-right">Labor $</span>
          <span className="text-right">Retail Price</span>
          <span className="text-right">Total</span>
          <span />
        </div>

        {/* Table rows */}
        <div className="space-y-1.5 max-h-[400px] overflow-y-auto min-w-[820px]">
          {(estimateCategory === "building" ? tabLines : lines).length === 0 ? (
            <div className="flex items-center justify-center rounded-lg border border-dashed border-[var(--sep)] py-8">
              <p className="text-[12px] text-[var(--tertiary)]">
                {estimateCategory === "building"
                  ? `No ${TABS.find((t) => t.key === activeTab)?.label.toLowerCase()} line items yet. Click "Add Row" to start.`
                  : "No infrastructure items yet. Click \"Add Row\" to start."
                }
              </p>
            </div>
          ) : (
            (estimateCategory === "building" ? tabLines : lines).map((line) => {
              const total = line.quantity * line.retail_price;
              const suggestion = suggestions[line._key] ?? null;
              const drywallDetected = isDrywallItem(line.description);
              return (
                <div key={line._key} className="space-y-1">
                  <div
                    className="grid items-center gap-2 rounded-lg border border-[var(--sep)] bg-[var(--bg)] px-2 py-1.5"
                    style={{ gridTemplateColumns: "1fr 64px 80px 96px 96px 96px 90px 36px" }}
                  >
                    {/* Description (with optional trade dropdown for labor tab) */}
                    <div className="flex flex-col">
                      {showTradeDropdown && (
                        <select
                          className="w-full rounded-md border-none bg-transparent px-1.5 py-0.5 text-[11px] text-[var(--accent)] outline-none cursor-pointer"
                          value=""
                          onChange={(e) => {
                            if (e.target.value) handleTradeSelect(line._key, e.target.value);
                          }}
                        >
                          <option value="">Select trade to auto-fill rate...</option>
                          {laborRates!.map((r) => (
                            <option key={r.id} value={r.trade}>
                              {r.trade} ({r.role}) -- ${Number(r.hourly_rate).toFixed(2)}/hr
                            </option>
                          ))}
                        </select>
                      )}
                      <input
                        className="w-full rounded-md border-none bg-transparent px-2 py-1 text-[13px] outline-none placeholder:text-[var(--gray3)]"
                        placeholder="Item description..."
                        value={line.description}
                        onChange={(e) => {
                          updateLine(line._key, "description", e.target.value);
                          // Auto-set unit for drywall items
                          if (isDrywallItem(e.target.value) && line.unit !== DRYWALL_UNIT) {
                            updateLine(line._key, "unit", DRYWALL_UNIT);
                          }
                        }}
                      />
                      {drywallDetected && line.unit === DRYWALL_UNIT && (
                        <span className="px-2 text-[9px] text-[var(--accent)]">{DRYWALL_HINT}</span>
                      )}
                    </div>

                    {/* Qty */}
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className="w-full rounded-md border-none bg-transparent px-2 py-1 text-right text-[13px] outline-none"
                      value={line.quantity}
                      onChange={(e) => updateLine(line._key, "quantity", parseFloat(e.target.value) || 0)}
                    />

                    {/* Unit */}
                    <select
                      className="w-full rounded-md border-none bg-transparent px-1 py-1 text-[12px] outline-none"
                      value={line.unit}
                      onChange={(e) => updateLine(line._key, "unit", e.target.value)}
                    >
                      {UNIT_OPTIONS.map((u) => (
                        <option key={u} value={u}>{u}</option>
                      ))}
                    </select>

                    {/* Material Cost (actual/internal) */}
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className="w-full rounded-md border border-[var(--sep)] bg-[var(--card)] px-2 py-1 text-right text-[12px] outline-none focus:border-[var(--accent)]"
                      placeholder="0.00"
                      value={line.material_cost || ""}
                      onChange={(e) => updateLine(line._key, "material_cost", parseFloat(e.target.value) || 0)}
                    />

                    {/* Labor Cost (actual/internal) */}
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className="w-full rounded-md border border-[var(--sep)] bg-[var(--card)] px-2 py-1 text-right text-[12px] outline-none focus:border-[var(--accent)]"
                      placeholder="0.00"
                      value={line.labor_cost || ""}
                      onChange={(e) => updateLine(line._key, "labor_cost", parseFloat(e.target.value) || 0)}
                    />

                    {/* Retail Price (client-facing) */}
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className="w-full rounded-md border-none bg-transparent px-2 py-1 text-right text-[13px] outline-none font-medium"
                        value={line.retail_price}
                        onChange={(e) => updateLine(line._key, "retail_price", parseFloat(e.target.value) || 0)}
                      />
                      <button
                        type="button"
                        title="Suggest price"
                        onClick={() => handleSuggest(line._key, line.description)}
                        disabled={line.description.trim().length < 3}
                        className="flex-shrink-0 rounded px-1 py-0.5 text-[9px] font-medium text-[var(--accent)] border border-[var(--accent)]/30 transition-colors hover:bg-[var(--accent)]/10 disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        $?
                      </button>
                    </div>

                    {/* Total (retail × qty) */}
                    <span className="text-right text-[13px] font-medium tabular-nums pr-1">
                      ${fmt(total)}
                    </span>

                    {/* Remove */}
                    <button
                      type="button"
                      onClick={() => removeLine(line._key)}
                      className="flex items-center justify-center rounded-md p-1 text-[var(--gray2)] transition-colors hover:bg-[var(--card)] hover:text-[var(--red)]"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <path d="M18 6 6 18M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  {/* Margin indicator per line */}
                  {line.material_cost + line.labor_cost > 0 && line.retail_price > 0 && (
                    <div className="flex items-center gap-3 px-3 text-[10px] text-[var(--tertiary)]">
                      <span>Actual: ${fmt(line.material_cost + line.labor_cost)}</span>
                      <span>Markup: {(((line.retail_price - (line.material_cost + line.labor_cost)) / (line.material_cost + line.labor_cost)) * 100).toFixed(0)}%</span>
                    </div>
                  )}

                  {/* Suggestion chip */}
                  {suggestion && (
                    <div className="flex items-center gap-2 rounded-md bg-[var(--accent)]/5 border border-[var(--accent)]/20 px-3 py-1.5 text-[12px]">
                      <span className="flex items-center gap-1.5 text-[var(--secondary)]">
                        Suggested: <span className="font-semibold text-[var(--label)]">${fmt(suggestion.suggestedPrice)}</span>
                        {" "}
                        <PriceFreshnessBadge freshness={confidenceToFreshness(suggestion.confidence)} />
                        {suggestion.basedOn > 0 && (
                          <span className="text-[var(--tertiary)]"> · {suggestion.basedOn} pts</span>
                        )}
                      </span>
                      <div className="ml-auto flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleUseSuggestion(line._key, suggestion.suggestedPrice)}
                          className="rounded px-2 py-0.5 text-[11px] font-semibold bg-[var(--accent)] text-white transition-all hover:brightness-110"
                        >
                          Use
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDismissSuggestion(line._key)}
                          className="rounded px-1.5 py-0.5 text-[11px] text-[var(--tertiary)] hover:text-[var(--label)] transition-colors"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Infrastructure division legend */}
      {estimateCategory === "infrastructure" && lines.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {INFRASTRUCTURE_DIVISIONS.map((div) => (
            <span key={div.key} className="rounded-full bg-[var(--gray5)] px-2 py-0.5 text-[10px] text-[var(--secondary)]">
              {div.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
