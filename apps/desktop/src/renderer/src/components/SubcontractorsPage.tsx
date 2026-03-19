import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { DEMO_MODE, demoSubcontractors, demoSubBids } from "../lib/demo-data";
import { EmptyState } from "./EmptyState";
import {
  UserGroupIcon,
  PlusIcon,
  ArrowPathIcon,
  XMarkIcon,
  StarIcon,
} from "@heroicons/react/24/outline";
import { StarIcon as StarIconSolid } from "@heroicons/react/24/solid";

interface Subcontractor {
  id: string;
  company_name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  trades: string[];
  license_number: string | null;
  insurance_expiry: string | null;
  rating: number | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
}

interface SubBid {
  id: string;
  estimate_id: string;
  subcontractor_id: string;
  trade: string;
  scope_description: string | null;
  bid_amount: number | null;
  status: string;
  due_date: string | null;
  notes: string | null;
  created_at: string;
}

const BID_STATUS_STYLE: Record<string, string> = {
  draft: "bg-[var(--gray5)] text-[var(--gray1)]",
  requested: "bg-[#e3f2fd] text-[#1565c0]",
  received: "bg-[#fff3e0] text-[#e65100]",
  accepted: "bg-[#e8f5e9] text-[#2e7d32]",
  rejected: "bg-[#ffebee] text-[#c62828]",
  expired: "bg-[var(--gray5)] text-[var(--secondary)]",
};

function fmtMoney(n: number | null): string {
  if (n == null) return "--";
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function RatingStars({ rating }: { rating: number | null }) {
  if (rating == null) return <span className="text-[11px] text-[var(--gray3)]">No rating</span>;
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) =>
        i < rating ? (
          <StarIconSolid key={i} className="h-3 w-3 text-amber-500" />
        ) : (
          <StarIcon key={i} className="h-3 w-3 text-[var(--gray4)]" />
        )
      )}
    </div>
  );
}

export function SubcontractorsPage() {
  const [subs, setSubs] = useState<Subcontractor[]>([]);
  const [bids, setBids] = useState<SubBid[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSub, setSelectedSub] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    company_name: "",
    contact_name: "",
    email: "",
    phone: "",
    trades: "",
    license_number: "",
    insurance_expiry: "",
    rating: "",
    notes: "",
  });

  const refresh = useCallback(async () => {
    if (!supabase) {
      if (DEMO_MODE) {
        setSubs(demoSubcontractors as unknown as Subcontractor[]);
        setBids(demoSubBids as unknown as SubBid[]);
      }
      setLoading(false);
      return;
    }
    setLoading(true);
    const [{ data: subData }, { data: bidData }] = await Promise.all([
      supabase.from("subcontractors").select("*").order("company_name"),
      supabase.from("sub_bids").select("*").order("created_at", { ascending: false }),
    ]);
    const fetchedSubs = (subData as Subcontractor[]) ?? [];
    const fetchedBids = (bidData as SubBid[]) ?? [];
    setSubs(fetchedSubs.length > 0 || !DEMO_MODE ? fetchedSubs : demoSubcontractors as unknown as Subcontractor[]);
    setBids(fetchedBids.length > 0 || !DEMO_MODE ? fetchedBids : demoSubBids as unknown as SubBid[]);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const selectedBids = selectedSub ? bids.filter((b) => b.subcontractor_id === selectedSub) : [];
  const detail = selectedSub ? subs.find((s) => s.id === selectedSub) : null;

  const handleCreate = async () => {
    if (!supabase || !form.company_name.trim()) return;
    setSaving(true);
    const trades = form.trades ? form.trades.split(",").map((s) => s.trim()).filter(Boolean) : [];
    const { error } = await supabase.from("subcontractors").insert({
      company_name: form.company_name.trim(),
      contact_name: form.contact_name || null,
      email: form.email || null,
      phone: form.phone || null,
      trades,
      license_number: form.license_number || null,
      insurance_expiry: form.insurance_expiry || null,
      rating: form.rating ? parseInt(form.rating) : null,
      notes: form.notes || null,
    });
    if (!error) {
      setForm({ company_name: "", contact_name: "", email: "", phone: "", trades: "", license_number: "", insurance_expiry: "", rating: "", notes: "" });
      setShowForm(false);
      refresh();
    }
    setSaving(false);
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
        <p className="text-[12px] text-[var(--secondary)]">{subs.length} subcontractors</p>
        <div className="flex items-center gap-2">
          <button onClick={refresh} className="rounded-lg border border-[var(--sep)] p-1.5 transition-colors hover:bg-[var(--bg)]">
            <ArrowPathIcon className="h-3.5 w-3.5 text-[var(--secondary)]" />
          </button>
          <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-3.5 py-1.5 text-[12px] font-semibold text-white shadow-sm shadow-[var(--accent)]/20 transition-all hover:brightness-110 active:scale-[0.98]">
            <PlusIcon className="h-3.5 w-3.5" />
            Add Sub
          </button>
        </div>
      </header>

      {showForm && (
        <div className="mx-8 mt-3 rounded-xl border border-[var(--sep)] bg-[var(--card)] p-4 shadow-[var(--shadow-card)]">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[13px] font-semibold">Add Subcontractor</p>
            <button onClick={() => setShowForm(false)} className="rounded-md p-1 hover:bg-[var(--bg)]">
              <XMarkIcon className="h-4 w-4 text-[var(--gray1)]" />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] font-medium text-[var(--secondary)] mb-1 block">Company Name *</label>
              <input value={form.company_name} onChange={(e) => setForm((f) => ({ ...f, company_name: e.target.value }))} placeholder="ABC Plumbing" className="w-full rounded-lg border border-[var(--sep)] bg-[var(--bg)] px-3 py-2 text-[12px] outline-none focus:border-[var(--accent)]" />
            </div>
            <div>
              <label className="text-[11px] font-medium text-[var(--secondary)] mb-1 block">Contact Name</label>
              <input value={form.contact_name} onChange={(e) => setForm((f) => ({ ...f, contact_name: e.target.value }))} placeholder="John Doe" className="w-full rounded-lg border border-[var(--sep)] bg-[var(--bg)] px-3 py-2 text-[12px] outline-none focus:border-[var(--accent)]" />
            </div>
            <div>
              <label className="text-[11px] font-medium text-[var(--secondary)] mb-1 block">Email</label>
              <input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="john@abcplumbing.com" className="w-full rounded-lg border border-[var(--sep)] bg-[var(--bg)] px-3 py-2 text-[12px] outline-none focus:border-[var(--accent)]" />
            </div>
            <div>
              <label className="text-[11px] font-medium text-[var(--secondary)] mb-1 block">Phone</label>
              <input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="(555) 123-4567" className="w-full rounded-lg border border-[var(--sep)] bg-[var(--bg)] px-3 py-2 text-[12px] outline-none focus:border-[var(--accent)]" />
            </div>
            <div>
              <label className="text-[11px] font-medium text-[var(--secondary)] mb-1 block">Trades (comma-separated)</label>
              <input value={form.trades} onChange={(e) => setForm((f) => ({ ...f, trades: e.target.value }))} placeholder="plumbing, hvac" className="w-full rounded-lg border border-[var(--sep)] bg-[var(--bg)] px-3 py-2 text-[12px] outline-none focus:border-[var(--accent)]" />
            </div>
            <div>
              <label className="text-[11px] font-medium text-[var(--secondary)] mb-1 block">License #</label>
              <input value={form.license_number} onChange={(e) => setForm((f) => ({ ...f, license_number: e.target.value }))} className="w-full rounded-lg border border-[var(--sep)] bg-[var(--bg)] px-3 py-2 text-[12px] outline-none focus:border-[var(--accent)]" />
            </div>
            <div>
              <label className="text-[11px] font-medium text-[var(--secondary)] mb-1 block">Insurance Expiry</label>
              <input type="date" value={form.insurance_expiry} onChange={(e) => setForm((f) => ({ ...f, insurance_expiry: e.target.value }))} className="w-full rounded-lg border border-[var(--sep)] bg-[var(--bg)] px-3 py-2 text-[12px] outline-none focus:border-[var(--accent)]" />
            </div>
            <div>
              <label className="text-[11px] font-medium text-[var(--secondary)] mb-1 block">Rating (1-5)</label>
              <select value={form.rating} onChange={(e) => setForm((f) => ({ ...f, rating: e.target.value }))} className="w-full rounded-lg border border-[var(--sep)] bg-[var(--bg)] px-3 py-2 text-[12px] outline-none focus:border-[var(--accent)]">
                <option value="">No rating</option>
                {[1,2,3,4,5].map((n) => <option key={n} value={n}>{n} star{n > 1 ? "s" : ""}</option>)}
              </select>
            </div>
          </div>
          <div className="mt-3">
            <label className="text-[11px] font-medium text-[var(--secondary)] mb-1 block">Notes</label>
            <textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={2} className="w-full rounded-lg border border-[var(--sep)] bg-[var(--bg)] px-3 py-2 text-[12px] outline-none resize-none focus:border-[var(--accent)]" />
          </div>
          <div className="mt-3 flex gap-2 justify-end">
            <button onClick={() => setShowForm(false)} className="rounded-lg border border-[var(--sep)] px-4 py-1.5 text-[12px] font-medium transition-colors hover:bg-[var(--bg)]">Cancel</button>
            <button onClick={handleCreate} disabled={saving || !form.company_name.trim()} className="rounded-lg bg-[var(--accent)] px-4 py-1.5 text-[12px] font-semibold text-white transition-all hover:brightness-110 disabled:opacity-50">
              {saving ? "Adding..." : "Add Subcontractor"}
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden px-8 py-3 pb-6 gap-3">
        {/* Sub directory */}
        <div className={`overflow-y-auto rounded-xl bg-[var(--card)] shadow-[var(--shadow-card)] ${selectedSub ? "w-[50%]" : "w-full"}`}>
          {loading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="h-9 w-9 animate-skeleton rounded-full bg-[var(--gray5)]" />
                  <div className="space-y-1.5 flex-1">
                    <div className="h-3 w-28 animate-skeleton rounded bg-[var(--gray5)]" />
                    <div className="h-2.5 w-40 animate-skeleton rounded bg-[var(--gray5)]" />
                  </div>
                </div>
              ))}
            </div>
          ) : subs.length === 0 ? (
            <EmptyState
              title="No subcontractors"
              description="Add subcontractors to your directory"
              action="Add Sub"
            />
          ) : (
            subs.map((s, i, arr) => (
              <button
                key={s.id}
                onClick={() => setSelectedSub(s.id === selectedSub ? null : s.id)}
                className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-all animate-list-item ${
                  s.id === selectedSub
                    ? "bg-[var(--accent-subtle)] border-l-[3px] border-l-[var(--accent)]"
                    : "border-l-[3px] border-l-transparent hover:bg-[var(--bg)]"
                } ${i < arr.length - 1 ? "border-b border-[var(--sep)]" : ""}`}
                style={{ animationDelay: `${i * 25}ms` }}
              >
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[var(--accent-light)] text-[12px] font-semibold text-[var(--accent)]">
                  {s.company_name.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-[13px] font-medium truncate">{s.company_name}</p>
                    {!s.is_active && <span className="rounded bg-[var(--gray5)] px-1 py-0.5 text-[9px] text-[var(--secondary)]">Inactive</span>}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    {s.trades.length > 0 && (
                      <div className="flex gap-1 flex-wrap">
                        {s.trades.slice(0, 3).map((t) => (
                          <span key={t} className="rounded bg-[var(--gray5)] px-1.5 py-0.5 text-[9px] font-medium text-[var(--secondary)] capitalize">{t}</span>
                        ))}
                        {s.trades.length > 3 && <span className="text-[9px] text-[var(--gray3)]">+{s.trades.length - 3}</span>}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <RatingStars rating={s.rating} />
                  {s.insurance_expiry && (
                    <span className={`text-[10px] ${new Date(s.insurance_expiry) < new Date() ? "text-[#c62828] font-semibold" : "text-[var(--secondary)]"}`}>
                      Ins: {new Date(s.insurance_expiry).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                    </span>
                  )}
                </div>
              </button>
            ))
          )}
        </div>

        {/* Detail / bids panel */}
        {detail && (
          <div className="w-[50%] overflow-y-auto rounded-xl bg-[var(--card)] shadow-[var(--shadow-card)] p-4 animate-slide-in-right">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[16px] font-bold">{detail.company_name}</h3>
              <button onClick={() => setSelectedSub(null)} className="rounded-md p-1 hover:bg-[var(--bg)]">
                <XMarkIcon className="h-4 w-4 text-[var(--gray1)]" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--secondary)]">Contact</p>
                <p className="text-[12px]">{detail.contact_name ?? "--"}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--secondary)]">Phone</p>
                <p className="text-[12px]">{detail.phone ?? "--"}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--secondary)]">Email</p>
                <p className="text-[12px]">{detail.email ?? "--"}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--secondary)]">License</p>
                <p className="text-[12px]">{detail.license_number ?? "--"}</p>
              </div>
            </div>

            {/* Bids */}
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--secondary)] mb-2">Bids ({selectedBids.length})</p>
            {selectedBids.length === 0 ? (
              <p className="text-[12px] text-[var(--gray3)] py-3">No bids on file</p>
            ) : (
              <div className="rounded-lg border border-[var(--sep)] divide-y divide-[var(--sep)]">
                {selectedBids.map((b) => (
                  <div key={b.id} className="px-3 py-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <p className="text-[12px] font-medium capitalize">{b.trade}</p>
                        <span className={`rounded px-1.5 py-0.5 text-[9px] font-semibold ${BID_STATUS_STYLE[b.status] ?? ""}`}>{b.status}</span>
                      </div>
                      <p className="text-[13px] font-semibold">{fmtMoney(b.bid_amount)}</p>
                    </div>
                    {b.scope_description && <p className="text-[11px] text-[var(--secondary)] mt-1 truncate">{b.scope_description}</p>}
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
