"use client";

import { useState, useCallback } from "react";
import { PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import type { EstimateLineItem } from "@proestimate/shared/types";

interface UpgradeOptionRow {
  id?: string;
  upgrade_type: "material_tier" | "scope_addon";
  label: string;
  description: string;
  price_diff: number;
  line_item_id: string | null;
  tier_rank: number;
  is_default: boolean;
  sort_order: number;
}

interface UpgradeOptionsEditorProps {
  estimateId: string;
  lineItems: EstimateLineItem[];
  options: UpgradeOptionRow[];
  onChange: (options: UpgradeOptionRow[]) => void;
}

const EMPTY_OPTION: UpgradeOptionRow = {
  upgrade_type: "scope_addon",
  label: "",
  description: "",
  price_diff: 0,
  line_item_id: null,
  tier_rank: 0,
  is_default: false,
  sort_order: 0,
};

export function UpgradeOptionsEditor({ estimateId, lineItems, options, onChange }: UpgradeOptionsEditorProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const handleAdd = useCallback(() => {
    const newOptions = [...options, { ...EMPTY_OPTION, sort_order: options.length }];
    onChange(newOptions);
    setEditingIndex(newOptions.length - 1);
  }, [options, onChange]);

  const handleRemove = useCallback((index: number) => {
    onChange(options.filter((_, i) => i !== index));
    setEditingIndex(null);
  }, [options, onChange]);

  const handleUpdate = useCallback((index: number, field: keyof UpgradeOptionRow, value: any) => {
    const updated = options.map((opt, i) => (i === index ? { ...opt, [field]: value } : opt));
    onChange(updated);
  }, [options, onChange]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[13px] font-semibold">Upgrade Options</p>
          <p className="text-[11px] text-[var(--secondary)]">
            Let homeowners toggle material upgrades and add-ons on the portal
          </p>
        </div>
        <button onClick={handleAdd} className="flex items-center gap-1.5 rounded-lg border border-[var(--sep)] px-3 py-1.5 text-[12px] font-medium transition-colors hover:bg-[var(--fill)]">
          <PlusIcon className="h-3.5 w-3.5" />
          Add Option
        </button>
      </div>

      {options.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[var(--sep)] py-8 text-center">
          <p className="text-[13px] text-[var(--secondary)]">No upgrade options yet</p>
          <button onClick={handleAdd} className="mt-2 text-[12px] font-medium text-[var(--accent)] hover:underline">Add your first upgrade option</button>
        </div>
      ) : (
        <div className="space-y-2">
          {options.map((opt, i) => (
            <div key={opt.id ?? i} className="rounded-lg border border-[var(--sep)] bg-[var(--card)] p-3">
              <div className="flex items-start gap-3">
                <div className="flex-1 space-y-2">
                  <div className="flex gap-2">
                    <select value={opt.upgrade_type} onChange={(e) => handleUpdate(i, "upgrade_type", e.target.value)} className="rounded-md border border-[var(--sep)] bg-[var(--bg)] px-2 py-1.5 text-[12px]">
                      <option value="material_tier">Material Tier</option>
                      <option value="scope_addon">Scope Add-on</option>
                    </select>
                    <input type="text" value={opt.label} onChange={(e) => handleUpdate(i, "label", e.target.value)} placeholder="Label (e.g. Quartz Countertops)" className="flex-1 rounded-md border border-[var(--sep)] bg-[var(--bg)] px-2 py-1.5 text-[12px]" />
                    <input type="number" value={opt.price_diff} onChange={(e) => handleUpdate(i, "price_diff", Number(e.target.value))} placeholder="Price diff" className="w-24 rounded-md border border-[var(--sep)] bg-[var(--bg)] px-2 py-1.5 text-[12px] text-right" />
                  </div>
                  <div className="flex gap-2">
                    <input type="text" value={opt.description} onChange={(e) => handleUpdate(i, "description", e.target.value)} placeholder="Description (optional)" className="flex-1 rounded-md border border-[var(--sep)] bg-[var(--bg)] px-2 py-1.5 text-[12px]" />
                    {opt.upgrade_type === "material_tier" && (
                      <select value={opt.line_item_id ?? ""} onChange={(e) => handleUpdate(i, "line_item_id", e.target.value || null)} className="w-48 rounded-md border border-[var(--sep)] bg-[var(--bg)] px-2 py-1.5 text-[12px]">
                        <option value="">Link to line item...</option>
                        {lineItems.map((li) => (<option key={li.id} value={li.id}>{li.description}</option>))}
                      </select>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-1.5 text-[11px] text-[var(--secondary)]">
                      <input type="checkbox" checked={opt.is_default} onChange={(e) => handleUpdate(i, "is_default", e.target.checked)} className="rounded" />
                      Default selected
                    </label>
                    {opt.upgrade_type === "material_tier" && (
                      <label className="flex items-center gap-1.5 text-[11px] text-[var(--secondary)]">
                        Tier rank:
                        <input type="number" value={opt.tier_rank} onChange={(e) => handleUpdate(i, "tier_rank", Number(e.target.value))} className="w-12 rounded-md border border-[var(--sep)] bg-[var(--bg)] px-1 py-0.5 text-[11px] text-center" />
                      </label>
                    )}
                  </div>
                </div>
                <button onClick={() => handleRemove(i)} className="flex-shrink-0 rounded-md p-1.5 text-[var(--secondary)] transition-colors hover:bg-[var(--fill)] hover:text-[var(--red)]">
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
