import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { EmptyState } from "./EmptyState";
import {
  ShoppingCartIcon,
  PlusIcon,
  ArrowPathIcon,
  XMarkIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";

interface PurchaseOrder {
  id: string;
  estimate_id: string;
  po_number: string;
  vendor_name: string;
  vendor_contact: string | null;
  vendor_phone: string | null;
  vendor_email: string | null;
  status: string;
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
  order_date: string | null;
  expected_delivery: string | null;
  actual_delivery: string | null;
  notes: string | null;
  created_at: string;
}

interface POLineItem {
  id: string;
  purchase_order_id: string;
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  extended_price: number;
  received_qty: number;
  status: string;
  notes: string | null;
}

const STATUS_STYLE: Record<string, string> = {
  draft: "bg-[var(--gray5)] text-[var(--gray1)]",
  sent: "bg-[#e3f2fd] text-[#1565c0]",
  confirmed: "bg-[#e8f5e9] text-[#2e7d32]",
  partial: "bg-[#fff3e0] text-[#e65100]",
  fulfilled: "bg-[#e8f5e9] text-[#1b5e20]",
  cancelled: "bg-[#ffebee] text-[#c62828]",
};

const LINE_STATUS_STYLE: Record<string, string> = {
  pending: "bg-[var(--gray5)] text-[var(--gray1)]",
  ordered: "bg-[#e3f2fd] text-[#1565c0]",
  received: "bg-[#e8f5e9] text-[#2e7d32]",
  backordered: "bg-[#fff3e0] text-[#e65100]",
  cancelled: "bg-[#ffebee] text-[#c62828]",
};

function fmtMoney(n: number | null): string {
  if (n == null) return "--";
  return `$${Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function PurchaseOrdersPage() {
  const [pos, setPos] = useState<PurchaseOrder[]>([]);
  const [lineItems, setLineItems] = useState<POLineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPo, setSelectedPo] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [estimates, setEstimates] = useState<{ id: string; estimate_number: string }[]>([]);
  const [form, setForm] = useState({
    estimate_id: "",
    po_number: "",
    vendor_name: "",
    vendor_contact: "",
    vendor_phone: "",
    order_date: "",
    expected_delivery: "",
    notes: "",
  });

  const refresh = useCallback(async () => {
    if (!supabase) { setLoading(false); return; }
    setLoading(true);
    const [{ data: poData }, { data: liData }] = await Promise.all([
      supabase.from("purchase_orders").select("*").order("created_at", { ascending: false }),
      supabase.from("po_line_items").select("*").order("created_at", { ascending: true }),
    ]);
    setPos((poData as PurchaseOrder[]) ?? []);
    setLineItems((liData as POLineItem[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    if (!supabase) return;
    supabase.from("estimates").select("id, estimate_number").order("created_at", { ascending: false }).then(({ data }) => {
      setEstimates((data as any[]) ?? []);
    });
  }, []);

  const selectedLineItems = selectedPo ? lineItems.filter((li) => li.purchase_order_id === selectedPo) : [];
  const detail = selectedPo ? pos.find((p) => p.id === selectedPo) : null;

  const handleCreate = async () => {
    if (!supabase || !form.estimate_id || !form.po_number.trim() || !form.vendor_name.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("purchase_orders").insert({
      estimate_id: form.estimate_id,
      po_number: form.po_number.trim(),
      vendor_name: form.vendor_name.trim(),
      vendor_contact: form.vendor_contact || null,
      vendor_phone: form.vendor_phone || null,
      order_date: form.order_date || null,
      expected_delivery: form.expected_delivery || null,
      notes: form.notes || null,
      status: "draft",
    });
    if (!error) {
      setForm({ estimate_id: "", po_number: "", vendor_name: "", vendor_contact: "", vendor_phone: "", order_date: "", expected_delivery: "", notes: "" });
      setShowForm(false);
      refresh();
    }
    setSaving(false);
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    if (!supabase) return;
    await supabase.from("purchase_orders").update({ status: newStatus, updated_at: new Date().toISOString() }).eq("id", id);
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
        <p className="text-[12px] text-[var(--secondary)]">{pos.length} purchase orders</p>
        <div className="flex items-center gap-2">
          <button onClick={refresh} className="rounded-lg border border-[var(--sep)] p-1.5 transition-colors hover:bg-[var(--bg)]">
            <ArrowPathIcon className="h-3.5 w-3.5 text-[var(--secondary)]" />
          </button>
          <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-3.5 py-1.5 text-[12px] font-semibold text-white shadow-sm shadow-[var(--accent)]/20 transition-all hover:brightness-110 active:scale-[0.98]">
            <PlusIcon className="h-3.5 w-3.5" />
            New PO
          </button>
        </div>
      </header>

      {showForm && (
        <div className="mx-8 mt-3 rounded-xl border border-[var(--sep)] bg-[var(--card)] p-4 shadow-[var(--shadow-card)]">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[13px] font-semibold">Create Purchase Order</p>
            <button onClick={() => setShowForm(false)} className="rounded-md p-1 hover:bg-[var(--bg)]">
              <XMarkIcon className="h-4 w-4 text-[var(--gray1)]" />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] font-medium text-[var(--secondary)] mb-1 block">Estimate</label>
              <select value={form.estimate_id} onChange={(e) => setForm((f) => ({ ...f, estimate_id: e.target.value }))} className="w-full rounded-lg border border-[var(--sep)] bg-[var(--bg)] px-3 py-2 text-[12px] outline-none focus:border-[var(--accent)]">
                <option value="">Select...</option>
                {estimates.map((e) => <option key={e.id} value={e.id}>{e.estimate_number}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-medium text-[var(--secondary)] mb-1 block">PO Number *</label>
              <input value={form.po_number} onChange={(e) => setForm((f) => ({ ...f, po_number: e.target.value }))} placeholder="PO-001" className="w-full rounded-lg border border-[var(--sep)] bg-[var(--bg)] px-3 py-2 text-[12px] outline-none focus:border-[var(--accent)]" />
            </div>
            <div>
              <label className="text-[11px] font-medium text-[var(--secondary)] mb-1 block">Vendor Name *</label>
              <input value={form.vendor_name} onChange={(e) => setForm((f) => ({ ...f, vendor_name: e.target.value }))} placeholder="Home Depot" className="w-full rounded-lg border border-[var(--sep)] bg-[var(--bg)] px-3 py-2 text-[12px] outline-none focus:border-[var(--accent)]" />
            </div>
            <div>
              <label className="text-[11px] font-medium text-[var(--secondary)] mb-1 block">Vendor Contact</label>
              <input value={form.vendor_contact} onChange={(e) => setForm((f) => ({ ...f, vendor_contact: e.target.value }))} className="w-full rounded-lg border border-[var(--sep)] bg-[var(--bg)] px-3 py-2 text-[12px] outline-none focus:border-[var(--accent)]" />
            </div>
            <div>
              <label className="text-[11px] font-medium text-[var(--secondary)] mb-1 block">Order Date</label>
              <input type="date" value={form.order_date} onChange={(e) => setForm((f) => ({ ...f, order_date: e.target.value }))} className="w-full rounded-lg border border-[var(--sep)] bg-[var(--bg)] px-3 py-2 text-[12px] outline-none focus:border-[var(--accent)]" />
            </div>
            <div>
              <label className="text-[11px] font-medium text-[var(--secondary)] mb-1 block">Expected Delivery</label>
              <input type="date" value={form.expected_delivery} onChange={(e) => setForm((f) => ({ ...f, expected_delivery: e.target.value }))} className="w-full rounded-lg border border-[var(--sep)] bg-[var(--bg)] px-3 py-2 text-[12px] outline-none focus:border-[var(--accent)]" />
            </div>
          </div>
          <div className="mt-3 flex gap-2 justify-end">
            <button onClick={() => setShowForm(false)} className="rounded-lg border border-[var(--sep)] px-4 py-1.5 text-[12px] font-medium transition-colors hover:bg-[var(--bg)]">Cancel</button>
            <button onClick={handleCreate} disabled={saving || !form.estimate_id || !form.po_number.trim() || !form.vendor_name.trim()} className="rounded-lg bg-[var(--accent)] px-4 py-1.5 text-[12px] font-semibold text-white transition-all hover:brightness-110 disabled:opacity-50">
              {saving ? "Creating..." : "Create PO"}
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden px-8 py-3 pb-6 gap-3">
        {/* PO List */}
        <div className={`overflow-y-auto rounded-xl bg-[var(--card)] shadow-[var(--shadow-card)] ${selectedPo ? "w-[45%]" : "w-full"}`}>
          {loading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex justify-between">
                  <div className="h-3 w-32 animate-skeleton rounded bg-[var(--gray5)]" />
                  <div className="h-3 w-16 animate-skeleton rounded bg-[var(--gray5)]" />
                </div>
              ))}
            </div>
          ) : pos.length === 0 ? (
            <EmptyState
              title="No purchase orders"
              description="Create a PO to track material orders"
              action="New PO"
            />
          ) : (
            pos.map((po, i, arr) => (
              <button
                key={po.id}
                onClick={() => setSelectedPo(po.id === selectedPo ? null : po.id)}
                className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-all animate-list-item ${
                  po.id === selectedPo
                    ? "bg-[var(--accent-subtle)] border-l-[3px] border-l-[var(--accent)]"
                    : "border-l-[3px] border-l-transparent hover:bg-[var(--bg)]"
                } ${i < arr.length - 1 ? "border-b border-[var(--sep)]" : ""}`}
                style={{ animationDelay: `${i * 25}ms` }}
              >
                <ShoppingCartIcon className="h-5 w-5 text-[var(--secondary)] flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-[13px] font-semibold">{po.po_number}</p>
                    <span className={`flex-shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold ${STATUS_STYLE[po.status] ?? ""}`}>
                      {po.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-[var(--secondary)]">{po.vendor_name}</p>
                </div>
                <div className="text-right">
                  <p className="text-[13px] font-semibold">{fmtMoney(po.total)}</p>
                  <p className="text-[10px] text-[var(--secondary)]">{po.order_date ? new Date(po.order_date).toLocaleDateString() : new Date(po.created_at).toLocaleDateString()}</p>
                </div>
                <ChevronRightIcon className="h-3.5 w-3.5 text-[var(--gray3)]" />
              </button>
            ))
          )}
        </div>

        {/* PO Detail */}
        {detail && (
          <div className="w-[55%] overflow-y-auto rounded-xl bg-[var(--card)] shadow-[var(--shadow-card)] p-4 animate-slide-in-right">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-[16px] font-bold">{detail.po_number}</h3>
                <p className="text-[12px] text-[var(--secondary)]">{detail.vendor_name}</p>
              </div>
              <button onClick={() => setSelectedPo(null)} className="rounded-md p-1 hover:bg-[var(--bg)]">
                <XMarkIcon className="h-4 w-4 text-[var(--gray1)]" />
              </button>
            </div>

            {/* Status changer */}
            <div className="mb-4">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--secondary)] mb-2">Status</p>
              <div className="flex gap-1.5 flex-wrap">
                {Object.keys(STATUS_STYLE).map((st) => (
                  <button
                    key={st}
                    onClick={() => handleStatusChange(detail.id, st)}
                    className={`rounded-md px-2.5 py-1 text-[11px] font-medium capitalize transition-all ${
                      st === detail.status
                        ? `${STATUS_STYLE[st]} ring-2 ring-[var(--accent)]/30`
                        : `${STATUS_STYLE[st]} opacity-60 hover:opacity-100`
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {/* PO Summary */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="rounded-lg border border-[var(--sep)] p-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--secondary)]">Subtotal</p>
                <p className="text-[14px] font-bold mt-0.5">{fmtMoney(detail.subtotal)}</p>
              </div>
              <div className="rounded-lg border border-[var(--sep)] p-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--secondary)]">Tax + Ship</p>
                <p className="text-[14px] font-bold mt-0.5">{fmtMoney(Number(detail.tax) + Number(detail.shipping))}</p>
              </div>
              <div className="rounded-lg border border-[var(--sep)] bg-[var(--accent-subtle)] p-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--accent)]">Total</p>
                <p className="text-[14px] font-bold mt-0.5 text-[var(--accent)]">{fmtMoney(detail.total)}</p>
              </div>
            </div>

            {/* Line Items */}
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--secondary)] mb-2">Line Items ({selectedLineItems.length})</p>
            {selectedLineItems.length === 0 ? (
              <p className="text-[12px] text-[var(--gray3)] py-3">No line items yet</p>
            ) : (
              <div className="rounded-lg border border-[var(--sep)]">
                <div className="flex items-center border-b border-[var(--sep)] px-3 py-1.5">
                  <p className="flex-1 text-[10px] font-medium text-[var(--secondary)]">Description</p>
                  <p className="w-14 text-right text-[10px] font-medium text-[var(--secondary)]">Qty</p>
                  <p className="w-20 text-right text-[10px] font-medium text-[var(--secondary)]">Price</p>
                  <p className="w-14 text-right text-[10px] font-medium text-[var(--secondary)]">Recv</p>
                  <p className="w-16 text-right text-[10px] font-medium text-[var(--secondary)]">Status</p>
                </div>
                {selectedLineItems.map((li, i, arr) => (
                  <div key={li.id} className={`flex items-center px-3 py-2 ${i < arr.length - 1 ? "border-b border-[var(--sep)]" : ""}`}>
                    <p className="flex-1 text-[12px] truncate">{li.description}</p>
                    <p className="w-14 text-right text-[12px]">{li.quantity}</p>
                    <p className="w-20 text-right text-[12px] font-medium">{fmtMoney(li.unit_price)}</p>
                    <p className="w-14 text-right text-[12px]">{li.received_qty}</p>
                    <div className="w-16 text-right">
                      <span className={`rounded px-1 py-0.5 text-[9px] font-semibold ${LINE_STATUS_STYLE[li.status] ?? ""}`}>{li.status}</span>
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
