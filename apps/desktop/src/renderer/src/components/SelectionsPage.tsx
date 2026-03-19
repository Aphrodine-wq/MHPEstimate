import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "../lib/supabase";
import { EmptyState } from "./EmptyState";
import {
  SwatchIcon,
  PlusIcon,
  ArrowPathIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";

interface SelectionSheet {
  id: string;
  estimate_id: string;
  name: string;
  status: string;
  due_date: string | null;
  notes: string | null;
  created_at: string;
}

interface SelectionItem {
  id: string;
  sheet_id: string;
  category: string;
  item_name: string;
  room: string | null;
  sort_order: number;
  options: any[];
  selected_option: number | null;
  budget_amount: number | null;
  actual_amount: number | null;
  price_impact: number | null;
  client_notes: string | null;
  status: string;
}

const SHEET_STATUS_STYLE: Record<string, string> = {
  draft: "bg-[var(--gray5)] text-[var(--gray1)]",
  sent: "bg-[#e3f2fd] text-[#1565c0]",
  in_progress: "bg-[#fff3e0] text-[#e65100]",
  completed: "bg-[#e8f5e9] text-[#2e7d32]",
  approved: "bg-[#e8f5e9] text-[#1b5e20]",
};

const ITEM_STATUS_STYLE: Record<string, string> = {
  pending: "bg-[var(--gray5)] text-[var(--gray1)]",
  selected: "bg-[#e3f2fd] text-[#1565c0]",
  ordered: "bg-[#fff3e0] text-[#e65100]",
  installed: "bg-[#e8f5e9] text-[#2e7d32]",
};

function fmtMoney(n: number | null): string {
  if (n == null) return "--";
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function SelectionsPage() {
  const [sheets, setSheets] = useState<SelectionSheet[]>([]);
  const [items, setItems] = useState<SelectionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSheet, setSelectedSheet] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [estimates, setEstimates] = useState<{ id: string; estimate_number: string }[]>([]);
  const [form, setForm] = useState({ estimate_id: "", name: "Material Selections" });

  const refresh = useCallback(async () => {
    if (!supabase) { setLoading(false); return; }
    setLoading(true);
    const { data: sheetData } = await supabase
      .from("selection_sheets")
      .select("*")
      .order("created_at", { ascending: false });
    setSheets((sheetData as SelectionSheet[]) ?? []);

    const { data: itemData } = await supabase
      .from("selection_items")
      .select("*")
      .order("sort_order", { ascending: true });
    setItems((itemData as SelectionItem[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    if (!supabase) return;
    supabase.from("estimates").select("id, estimate_number").order("created_at", { ascending: false }).then(({ data }) => {
      setEstimates((data as any[]) ?? []);
    });
  }, []);

  const selectedItems = useMemo(() => {
    if (!selectedSheet) return [];
    return items.filter((item) => item.sheet_id === selectedSheet);
  }, [selectedSheet, items]);

  const groupedItems = useMemo(() => {
    const groups: Record<string, SelectionItem[]> = {};
    for (const item of selectedItems) {
      if (!groups[item.category]) groups[item.category] = [];
      groups[item.category]!.push(item);
    }
    return groups;
  }, [selectedItems]);

  const sheetItemCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const item of items) {
      counts[item.sheet_id] = (counts[item.sheet_id] ?? 0) + 1;
    }
    return counts;
  }, [items]);

  const handleCreate = async () => {
    if (!supabase || !form.estimate_id) return;
    setSaving(true);
    const { error } = await supabase.from("selection_sheets").insert({
      estimate_id: form.estimate_id,
      name: form.name.trim() || "Material Selections",
      status: "draft",
    });
    if (!error) {
      setForm({ estimate_id: "", name: "Material Selections" });
      setShowForm(false);
      refresh();
    }
    setSaving(false);
  };

  const handleItemStatusChange = async (itemId: string, newStatus: string) => {
    if (!supabase) return;
    await supabase.from("selection_items").update({ status: newStatus }).eq("id", itemId);
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
    <div className="flex h-full flex-col animate-page-enter">
      <header className="flex items-center justify-between px-8 pt-4 pb-1">
        <p className="text-[12px] text-[var(--secondary)]">{sheets.length} selection sheets</p>
        <div className="flex items-center gap-2">
          <button onClick={refresh} className="rounded-lg border border-[var(--sep)] p-1.5 transition-colors hover:bg-[var(--bg)]">
            <ArrowPathIcon className="h-3.5 w-3.5 text-[var(--secondary)]" />
          </button>
          <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-3.5 py-1.5 text-[12px] font-semibold text-white shadow-sm shadow-[var(--accent)]/20 transition-all hover:brightness-110 active:scale-[0.98]">
            <PlusIcon className="h-3.5 w-3.5" />
            New Sheet
          </button>
        </div>
      </header>

      {showForm && (
        <div className="mx-8 mt-3 rounded-xl border border-[var(--sep)] bg-[var(--card)] p-4 shadow-[var(--shadow-card)]">
          <p className="text-[13px] font-semibold mb-3">New Selection Sheet</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-medium text-[var(--secondary)] mb-1 block">Estimate</label>
              <select value={form.estimate_id} onChange={(e) => setForm((f) => ({ ...f, estimate_id: e.target.value }))} className="w-full rounded-lg border border-[var(--sep)] bg-[var(--bg)] px-3 py-2 text-[12px] outline-none focus:border-[var(--accent)]">
                <option value="">Select...</option>
                {estimates.map((e) => <option key={e.id} value={e.id}>{e.estimate_number}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-medium text-[var(--secondary)] mb-1 block">Name</label>
              <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="w-full rounded-lg border border-[var(--sep)] bg-[var(--bg)] px-3 py-2 text-[12px] outline-none focus:border-[var(--accent)]" />
            </div>
          </div>
          <div className="mt-3 flex gap-2 justify-end">
            <button onClick={() => setShowForm(false)} className="rounded-lg border border-[var(--sep)] px-4 py-1.5 text-[12px] font-medium transition-colors hover:bg-[var(--bg)]">Cancel</button>
            <button onClick={handleCreate} disabled={saving || !form.estimate_id} className="rounded-lg bg-[var(--accent)] px-4 py-1.5 text-[12px] font-semibold text-white transition-all hover:brightness-110 disabled:opacity-50">
              {saving ? "Creating..." : "Create Sheet"}
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden px-8 py-3 pb-6 gap-3">
        {/* Sheet list */}
        <div className={`overflow-y-auto rounded-xl bg-[var(--card)] shadow-[var(--shadow-card)] ${selectedSheet ? "w-[40%]" : "w-full"}`}>
          {loading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex justify-between">
                  <div className="h-3 w-32 animate-skeleton rounded bg-[var(--gray5)]" />
                  <div className="h-3 w-16 animate-skeleton rounded bg-[var(--gray5)]" />
                </div>
              ))}
            </div>
          ) : sheets.length === 0 ? (
            <EmptyState
              title="No selection sheets"
              description="Create a selection sheet for client material choices"
              action="New Sheet"
            />
          ) : (
            sheets.map((s, i, arr) => (
              <button
                key={s.id}
                onClick={() => setSelectedSheet(s.id === selectedSheet ? null : s.id)}
                className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-all animate-list-item ${
                  s.id === selectedSheet
                    ? "bg-[var(--accent-subtle)] border-l-[3px] border-l-[var(--accent)]"
                    : "border-l-[3px] border-l-transparent hover:bg-[var(--bg)]"
                } ${i < arr.length - 1 ? "border-b border-[var(--sep)]" : ""}`}
                style={{ animationDelay: `${i * 30}ms` }}
              >
                <SwatchIcon className="h-5 w-5 text-[var(--secondary)] flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-[13px] font-medium truncate">{s.name}</p>
                    <span className={`flex-shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold ${SHEET_STATUS_STYLE[s.status] ?? ""}`}>
                      {s.status.replace(/_/g, " ")}
                    </span>
                  </div>
                  <p className="text-[11px] text-[var(--secondary)]">
                    {sheetItemCounts[s.id] ?? 0} items &middot; {new Date(s.created_at).toLocaleDateString()}
                  </p>
                </div>
                <ChevronRightIcon className="h-3.5 w-3.5 text-[var(--gray3)]" />
              </button>
            ))
          )}
        </div>

        {/* Items detail panel */}
        {selectedSheet && (
          <div className="w-[60%] overflow-y-auto rounded-xl bg-[var(--card)] shadow-[var(--shadow-card)] p-4 animate-slide-in-right">
            {selectedItems.length === 0 ? (
              <EmptyState
                title="No items yet"
                description="Add selection items to this sheet"
              />
            ) : (
              <div className="space-y-4">
                {Object.entries(groupedItems).map(([category, catItems]) => (
                  <div key={category}>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--secondary)] mb-2">{category}</p>
                    <div className="rounded-lg border border-[var(--sep)] divide-y divide-[var(--sep)]">
                      {catItems.map((item) => (
                        <div key={item.id} className="px-3 py-2.5 hover:bg-[var(--bg)] transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-[13px] font-medium">{item.item_name}</p>
                                <span className={`rounded px-1.5 py-0.5 text-[9px] font-semibold ${ITEM_STATUS_STYLE[item.status] ?? ""}`}>
                                  {item.status}
                                </span>
                              </div>
                              {item.room && <p className="text-[11px] text-[var(--secondary)]">{item.room}</p>}
                            </div>
                            <div className="text-right ml-3">
                              <p className="text-[12px] font-medium">Budget: {fmtMoney(item.budget_amount)}</p>
                              {item.actual_amount != null && (
                                <p className="text-[11px] text-[var(--secondary)]">Actual: {fmtMoney(item.actual_amount)}</p>
                              )}
                              {item.price_impact != null && (
                                <p className={`text-[11px] font-semibold ${item.price_impact > 0 ? "text-[#c62828]" : item.price_impact < 0 ? "text-[#2e7d32]" : "text-[var(--secondary)]"}`}>
                                  {item.price_impact > 0 ? "+" : ""}{fmtMoney(item.price_impact)}
                                </p>
                              )}
                            </div>
                          </div>
                          {item.client_notes && (
                            <p className="mt-1 text-[11px] text-[var(--gray2)] italic">"{item.client_notes}"</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
