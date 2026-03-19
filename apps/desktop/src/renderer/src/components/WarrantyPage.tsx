import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "../lib/supabase";
import { DEMO_MODE, demoWarrantyItems, demoEstimates } from "../lib/demo-data";
import { EmptyState } from "./EmptyState";
import {
  ShieldCheckIcon,
  PlusIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";

interface WarrantyItem {
  id: string;
  estimate_id: string;
  client_id: string | null;
  item_description: string;
  category: string | null;
  warranty_start: string;
  warranty_end: string;
  status: string;
  claimed_at: string | null;
  claim_description: string | null;
  resolution: string | null;
  resolved_at: string | null;
  cost_to_repair: number | null;
  callback_date: string | null;
  callback_notes: string | null;
  created_at: string;
}

const STATUS_STYLE: Record<string, string> = {
  active: "bg-[#e8f5e9] text-[#2e7d32]",
  claimed: "bg-[#fff3e0] text-[#e65100]",
  in_progress: "bg-[#e3f2fd] text-[#1565c0]",
  resolved: "bg-[var(--gray5)] text-[var(--gray1)]",
  expired: "bg-[#ffebee] text-[#c62828]",
  voided: "bg-[var(--gray5)] text-[var(--secondary)]",
};

const CATEGORIES = [
  "labor", "material", "structural", "plumbing", "electrical",
  "hvac", "roofing", "flooring", "painting", "appliance", "other",
];

function fmtMoney(n: number | null): string {
  if (n == null) return "--";
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function daysRemaining(endDate: string): number {
  return Math.ceil((new Date(endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function DaysRemainingBadge({ endDate }: { endDate: string }) {
  const days = daysRemaining(endDate);
  let cls = "bg-[#e8f5e9] text-[#2e7d32]";
  if (days <= 0) cls = "bg-[#ffebee] text-[#c62828]";
  else if (days <= 30) cls = "bg-[#fff3e0] text-[#e65100]";
  else if (days <= 90) cls = "bg-[#fff8e1] text-[#f57f17]";

  return (
    <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${cls}`}>
      {days <= 0 ? "Expired" : `${days}d left`}
    </span>
  );
}

export function WarrantyPage() {
  const [items, setItems] = useState<WarrantyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [estimates, setEstimates] = useState<{ id: string; estimate_number: string }[]>([]);
  const [form, setForm] = useState({
    estimate_id: "",
    item_description: "",
    category: "labor",
    warranty_start: new Date().toISOString().split("T")[0]!,
    warranty_end: "",
    callback_notes: "",
  });

  const refresh = useCallback(async () => {
    if (!supabase) {
      if (DEMO_MODE) {
        setItems(demoWarrantyItems as unknown as WarrantyItem[]);
        setEstimates(demoEstimates.map((e) => ({ id: e.id, estimate_number: e.estimate_number })));
      }
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from("warranty_items")
      .select("*")
      .order("warranty_end", { ascending: true });
    const fetched = (data as WarrantyItem[]) ?? [];
    setItems(fetched.length > 0 || !DEMO_MODE ? fetched : demoWarrantyItems as unknown as WarrantyItem[]);
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

  const { activeItems, expiringSoon, expiredItems } = useMemo(() => {
    const active: WarrantyItem[] = [];
    const expiring: WarrantyItem[] = [];
    const expired: WarrantyItem[] = [];

    for (const item of items) {
      const days = daysRemaining(item.warranty_end);
      if (item.status === "expired" || (item.status === "active" && days <= 0)) {
        expired.push(item);
      } else if (item.status === "active" && days <= 90) {
        expiring.push(item);
      } else if (["active", "claimed", "in_progress"].includes(item.status)) {
        active.push(item);
      } else {
        active.push(item);
      }
    }

    return { activeItems: active, expiringSoon: expiring, expiredItems: expired };
  }, [items]);

  const handleCreate = async () => {
    if (!supabase || !form.estimate_id || !form.item_description.trim() || !form.warranty_end) return;
    setSaving(true);
    const { error } = await supabase.from("warranty_items").insert({
      estimate_id: form.estimate_id,
      item_description: form.item_description.trim(),
      category: form.category,
      warranty_start: form.warranty_start,
      warranty_end: form.warranty_end,
      status: "active",
      callback_notes: form.callback_notes || null,
    });
    if (!error) {
      setForm({ estimate_id: "", item_description: "", category: "labor", warranty_start: new Date().toISOString().split("T")[0]!, warranty_end: "", callback_notes: "" });
      setShowForm(false);
      refresh();
    }
    setSaving(false);
  };

  const handleClaim = async (id: string) => {
    if (!supabase) return;
    await supabase.from("warranty_items").update({
      status: "claimed",
      claimed_at: new Date().toISOString(),
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

  const renderSection = (title: string, sectionItems: WarrantyItem[], icon?: React.ReactNode) => {
    if (sectionItems.length === 0) return null;
    return (
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          {icon}
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--secondary)]">{title} ({sectionItems.length})</p>
        </div>
        <div className="rounded-xl bg-[var(--card)] shadow-[var(--shadow-card)]">
          {sectionItems.map((item, i, arr) => (
            <div
              key={item.id}
              className={`px-4 py-3 transition-colors hover:bg-[var(--bg)] animate-list-item ${i < arr.length - 1 ? "border-b border-[var(--sep)]" : ""}`}
              style={{ animationDelay: `${i * 25}ms` }}
            >
              <div className="flex items-center gap-3">
                <ShieldCheckIcon className="h-5 w-5 text-[var(--secondary)] flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-[13px] font-medium">{item.item_description}</p>
                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${STATUS_STYLE[item.status] ?? ""}`}>
                      {item.status.replace(/_/g, " ")}
                    </span>
                    {item.category && (
                      <span className="rounded bg-[var(--gray5)] px-1.5 py-0.5 text-[9px] font-medium text-[var(--secondary)] capitalize">{item.category}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-[11px] text-[var(--secondary)]">
                      {new Date(item.warranty_start).toLocaleDateString()} - {new Date(item.warranty_end).toLocaleDateString()}
                    </span>
                    {item.claim_description && (
                      <span className="text-[11px] text-[var(--gray2)] truncate">Claim: {item.claim_description}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <DaysRemainingBadge endDate={item.warranty_end} />
                  {item.status === "active" && (
                    <button
                      onClick={() => handleClaim(item.id)}
                      className="rounded-lg border border-[var(--sep)] px-2.5 py-1 text-[11px] font-medium transition-colors hover:bg-[var(--bg)] hover:border-[var(--accent)]"
                    >
                      File Claim
                    </button>
                  )}
                </div>
              </div>
              {item.resolution && (
                <p className="mt-1.5 ml-8 text-[11px] text-[#2e7d32]">Resolution: {item.resolution}</p>
              )}
              {item.cost_to_repair != null && (
                <p className="mt-0.5 ml-8 text-[11px] text-[var(--secondary)]">Repair cost: {fmtMoney(item.cost_to_repair)}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-full flex-col overflow-y-auto animate-page-enter">
      <header className="flex items-center justify-between px-8 pt-4 pb-1">
        <p className="text-[12px] text-[var(--secondary)]">{items.length} warranty items</p>
        <div className="flex items-center gap-2">
          <button onClick={refresh} className="rounded-lg border border-[var(--sep)] p-1.5 transition-colors hover:bg-[var(--bg)]">
            <ArrowPathIcon className="h-3.5 w-3.5 text-[var(--secondary)]" />
          </button>
          <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-3.5 py-1.5 text-[12px] font-semibold text-white shadow-sm shadow-[var(--accent)]/20 transition-all hover:brightness-110 active:scale-[0.98]">
            <PlusIcon className="h-3.5 w-3.5" />
            Add Warranty
          </button>
        </div>
      </header>

      {showForm && (
        <div className="mx-8 mt-3 rounded-xl border border-[var(--sep)] bg-[var(--card)] p-4 shadow-[var(--shadow-card)]">
          <p className="text-[13px] font-semibold mb-3">New Warranty Item</p>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] font-medium text-[var(--secondary)] mb-1 block">Estimate</label>
              <select value={form.estimate_id} onChange={(e) => setForm((f) => ({ ...f, estimate_id: e.target.value }))} className="w-full rounded-lg border border-[var(--sep)] bg-[var(--bg)] px-3 py-2 text-[12px] outline-none focus:border-[var(--accent)]">
                <option value="">Select...</option>
                {estimates.map((e) => <option key={e.id} value={e.id}>{e.estimate_number}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="text-[11px] font-medium text-[var(--secondary)] mb-1 block">Description</label>
              <input value={form.item_description} onChange={(e) => setForm((f) => ({ ...f, item_description: e.target.value }))} placeholder="e.g. Kitchen cabinet hinges" className="w-full rounded-lg border border-[var(--sep)] bg-[var(--bg)] px-3 py-2 text-[12px] outline-none focus:border-[var(--accent)]" />
            </div>
            <div>
              <label className="text-[11px] font-medium text-[var(--secondary)] mb-1 block">Category</label>
              <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} className="w-full rounded-lg border border-[var(--sep)] bg-[var(--bg)] px-3 py-2 text-[12px] outline-none focus:border-[var(--accent)] capitalize">
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-medium text-[var(--secondary)] mb-1 block">Start Date</label>
              <input type="date" value={form.warranty_start} onChange={(e) => setForm((f) => ({ ...f, warranty_start: e.target.value }))} className="w-full rounded-lg border border-[var(--sep)] bg-[var(--bg)] px-3 py-2 text-[12px] outline-none focus:border-[var(--accent)]" />
            </div>
            <div>
              <label className="text-[11px] font-medium text-[var(--secondary)] mb-1 block">End Date</label>
              <input type="date" value={form.warranty_end} onChange={(e) => setForm((f) => ({ ...f, warranty_end: e.target.value }))} className="w-full rounded-lg border border-[var(--sep)] bg-[var(--bg)] px-3 py-2 text-[12px] outline-none focus:border-[var(--accent)]" />
            </div>
          </div>
          <div className="mt-3">
            <label className="text-[11px] font-medium text-[var(--secondary)] mb-1 block">Notes</label>
            <textarea value={form.callback_notes} onChange={(e) => setForm((f) => ({ ...f, callback_notes: e.target.value }))} rows={2} className="w-full rounded-lg border border-[var(--sep)] bg-[var(--bg)] px-3 py-2 text-[12px] outline-none resize-none focus:border-[var(--accent)]" />
          </div>
          <div className="mt-3 flex gap-2 justify-end">
            <button onClick={() => setShowForm(false)} className="rounded-lg border border-[var(--sep)] px-4 py-1.5 text-[12px] font-medium transition-colors hover:bg-[var(--bg)]">Cancel</button>
            <button onClick={handleCreate} disabled={saving || !form.estimate_id || !form.item_description.trim() || !form.warranty_end} className="rounded-lg bg-[var(--accent)] px-4 py-1.5 text-[12px] font-semibold text-white transition-all hover:brightness-110 disabled:opacity-50">
              {saving ? "Saving..." : "Add Warranty"}
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-8 py-3 pb-6">
        {loading ? (
          <div className="rounded-xl bg-[var(--card)] p-4 shadow-[var(--shadow-card)] space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex justify-between">
                <div className="h-3 w-40 animate-skeleton rounded bg-[var(--gray5)]" />
                <div className="h-3 w-20 animate-skeleton rounded bg-[var(--gray5)]" />
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            title="No warranties"
            description="Add warranty items to track coverage and claims"
            action="Add Warranty"
          />
        ) : (
          <>
            {renderSection("Expiring Soon", expiringSoon, <ExclamationTriangleIcon className="h-4 w-4 text-amber-500" />)}
            {renderSection("Active Warranties", activeItems)}
            {renderSection("Expired", expiredItems)}
          </>
        )}
      </div>
    </div>
  );
}
