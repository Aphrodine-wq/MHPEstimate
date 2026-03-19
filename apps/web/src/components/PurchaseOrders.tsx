"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Modal,
  Field,
  inputClass,
  textareaClass,
  selectClass,
} from "@proestimate/ui";
import { useEstimates } from "@/lib/store";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface POLineItem {
  id: string;
  purchase_order_id: string;
  estimate_line_item_id: string | null;
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  extended_price: number;
  received_qty: number;
  status: string;
  notes: string | null;
  created_at: string;
}

interface PurchaseOrder {
  id: string;
  organization_id: string;
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
  delivery_address: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  po_line_items: POLineItem[];
  estimates?: {
    id: string;
    estimate_number: string;
    project_type: string;
  };
}

interface DraftLineItem {
  key: string;
  description: string;
  quantity: string;
  unit: string;
  unit_price: string;
  estimate_line_item_id: string | null;
}

interface PurchaseOrdersProps {
  estimateId?: string;
}

// ---------------------------------------------------------------------------
// Status badge helpers
// ---------------------------------------------------------------------------

const PO_STATUS_STYLE: Record<string, string> = {
  draft: "bg-[var(--fill)] text-[var(--secondary)]",
  sent: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  confirmed: "bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300",
  partial: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  fulfilled: "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  cancelled: "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300",
};

const PO_STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  sent: "Sent",
  confirmed: "Confirmed",
  partial: "Partial",
  fulfilled: "Fulfilled",
  cancelled: "Cancelled",
};

const STATUS_FLOW: Record<string, string[]> = {
  draft: ["sent"],
  sent: ["confirmed", "cancelled"],
  confirmed: ["partial", "fulfilled", "cancelled"],
  partial: ["fulfilled"],
  fulfilled: [],
  cancelled: [],
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(value);
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "--";
  const d = dateStr.length === 10 ? new Date(dateStr + "T12:00:00") : new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function makeKey(): string {
  return Math.random().toString(36).slice(2, 10);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PurchaseOrders({ estimateId }: PurchaseOrdersProps) {
  const [pos, setPOs] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const { data: estimates } = useEstimates();

  // ── Fetch POs ──
  const fetchPOs = useCallback(async () => {
    setLoading(true);
    try {
      const url = estimateId
        ? `/api/purchase-orders?estimateId=${estimateId}`
        : "/api/purchase-orders";
      const res = await fetch(url);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to fetch purchase orders");
      }
      const data = await res.json();
      setPOs(data.purchase_orders ?? []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load purchase orders");
    } finally {
      setLoading(false);
    }
  }, [estimateId]);

  useEffect(() => {
    fetchPOs();
  }, [fetchPOs]);

  // ── Summary stats ──
  const summary = useMemo(() => {
    const totalValue = pos.reduce((s, p) => s + (Number(p.total) || 0), 0);
    const draftCount = pos.filter((p) => p.status === "draft").length;
    const activeCount = pos.filter((p) => ["sent", "confirmed", "partial"].includes(p.status)).length;
    const fulfilledCount = pos.filter((p) => p.status === "fulfilled").length;
    return { totalValue, draftCount, activeCount, fulfilledCount };
  }, [pos]);

  // ── Status update ──
  const handleStatusChange = async (poId: string, newStatus: string) => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/purchase-orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: poId, status: newStatus }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to update status");
      }
      await fetchPOs();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update status");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Receive item ──
  const handleReceiveItem = async (poId: string, lineItemId: string, receivedQty: number) => {
    try {
      const res = await fetch("/api/purchase-orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: poId,
          received_items: [{ line_item_id: lineItemId, received_qty: receivedQty }],
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to receive item");
      }
      await fetchPOs();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to receive item");
    }
  };

  // ── Loading state ──
  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--sep)] border-t-[var(--accent)]" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-[var(--sep)] px-4 pb-3 pt-4 md:px-8">
        <div>
          <h2 className="text-[15px] font-semibold text-[var(--label)]">Purchase Orders</h2>
          <p className="text-[11px] text-[var(--secondary)]">
            {pos.length} PO{pos.length !== 1 ? "s" : ""} &middot; {formatCurrency(summary.totalValue)} total value
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="rounded-lg bg-[var(--accent)] px-3 py-2 text-[13px] font-medium text-white shadow-sm transition-all hover:brightness-110 active:scale-[0.98]"
        >
          + New PO
        </button>
      </header>

      {/* Error banner */}
      {error && (
        <div className="mx-4 mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-[12px] text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300 md:mx-8">
          {error}
          <button onClick={() => setError(null)} className="ml-2 font-medium underline">Dismiss</button>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3 px-4 pt-4 md:grid-cols-4 md:px-8">
        {[
          { label: "Total Value", value: formatCurrency(summary.totalValue) },
          { label: "Drafts", value: String(summary.draftCount) },
          { label: "Active", value: String(summary.activeCount) },
          { label: "Fulfilled", value: String(summary.fulfilledCount) },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-[var(--sep)] bg-[var(--card)] p-3"
          >
            <p className="text-[11px] font-medium text-[var(--secondary)]">{stat.label}</p>
            <p className="mt-0.5 text-[18px] font-semibold tracking-tight text-[var(--label)]">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* PO Table */}
      <div className="flex-1 px-4 pb-6 pt-4 md:px-8">
        {pos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-3 text-[36px] opacity-30">📦</div>
            <p className="text-[14px] font-medium text-[var(--secondary)]">No purchase orders yet</p>
            <p className="mt-1 text-[12px] text-[var(--gray3)]">Create your first PO to track material orders</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-[var(--sep)]">
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="border-b border-[var(--sep)] bg-[var(--fill)]">
                  <th className="px-4 py-2.5 font-medium text-[var(--secondary)]">PO #</th>
                  <th className="px-4 py-2.5 font-medium text-[var(--secondary)]">Vendor</th>
                  <th className="hidden px-4 py-2.5 font-medium text-[var(--secondary)] md:table-cell">Estimate</th>
                  <th className="px-4 py-2.5 font-medium text-[var(--secondary)]">Status</th>
                  <th className="hidden px-4 py-2.5 text-right font-medium text-[var(--secondary)] sm:table-cell">Total</th>
                  <th className="hidden px-4 py-2.5 font-medium text-[var(--secondary)] lg:table-cell">Order Date</th>
                  <th className="hidden px-4 py-2.5 font-medium text-[var(--secondary)] lg:table-cell">Expected</th>
                </tr>
              </thead>
              <tbody>
                {pos.map((po) => (
                  <PORow
                    key={po.id}
                    po={po}
                    expanded={expandedId === po.id}
                    onToggle={() => setExpandedId(expandedId === po.id ? null : po.id)}
                    onStatusChange={handleStatusChange}
                    onReceiveItem={handleReceiveItem}
                    submitting={submitting}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <CreatePOModal
          open={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          estimates={estimates ?? []}
          defaultEstimateId={estimateId}
          onCreated={() => {
            setShowCreateModal(false);
            fetchPOs();
          }}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// PO Row (expandable)
// ---------------------------------------------------------------------------

interface PORowProps {
  po: PurchaseOrder;
  expanded: boolean;
  onToggle: () => void;
  onStatusChange: (poId: string, newStatus: string) => void;
  onReceiveItem: (poId: string, lineItemId: string, receivedQty: number) => void;
  submitting: boolean;
}

function PORow({ po, expanded, onToggle, onStatusChange, onReceiveItem, submitting }: PORowProps) {
  const nextStatuses = STATUS_FLOW[po.status] ?? [];

  const totalOrdered = po.po_line_items?.reduce((s, li) => s + Number(li.quantity), 0) ?? 0;
  const totalReceived = po.po_line_items?.reduce((s, li) => s + Number(li.received_qty), 0) ?? 0;
  const totalOutstanding = totalOrdered - totalReceived;

  return (
    <>
      <tr
        onClick={onToggle}
        className="cursor-pointer border-b border-[var(--sep)] transition-colors hover:bg-[var(--fill)]/50 last:border-b-0"
      >
        <td className="px-4 py-3 font-medium text-[var(--accent)]">{po.po_number}</td>
        <td className="px-4 py-3 text-[var(--label)]">{po.vendor_name}</td>
        <td className="hidden px-4 py-3 text-[var(--secondary)] md:table-cell">
          {po.estimates?.estimate_number ?? "--"}
        </td>
        <td className="px-4 py-3">
          <span
            className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${PO_STATUS_STYLE[po.status] ?? PO_STATUS_STYLE.draft}`}
          >
            {PO_STATUS_LABEL[po.status] ?? po.status}
          </span>
        </td>
        <td className="hidden px-4 py-3 text-right font-medium text-[var(--label)] sm:table-cell">
          {formatCurrency(Number(po.total))}
        </td>
        <td className="hidden px-4 py-3 text-[var(--secondary)] lg:table-cell">{formatDate(po.order_date)}</td>
        <td className="hidden px-4 py-3 text-[var(--secondary)] lg:table-cell">{formatDate(po.expected_delivery)}</td>
      </tr>

      {/* Expanded Detail View */}
      {expanded && (
        <tr>
          <td colSpan={7} className="border-b border-[var(--sep)] bg-[var(--fill)]/30 px-4 py-4">
            {/* Vendor info header */}
            <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
              <div>
                <h3 className="text-[14px] font-semibold text-[var(--label)]">
                  {po.po_number} — {po.vendor_name}
                </h3>
                <div className="mt-1 flex flex-wrap gap-4 text-[12px] text-[var(--secondary)]">
                  {po.vendor_contact && <span>Contact: {po.vendor_contact}</span>}
                  {po.vendor_phone && <span>Phone: {po.vendor_phone}</span>}
                  {po.vendor_email && <span>Email: {po.vendor_email}</span>}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {nextStatuses.map((ns) => (
                  <button
                    key={ns}
                    onClick={(e) => { e.stopPropagation(); onStatusChange(po.id, ns); }}
                    disabled={submitting}
                    className="rounded-lg border border-[var(--sep)] bg-[var(--card)] px-3 py-1.5 text-[12px] font-medium text-[var(--label)] transition-colors hover:bg-[var(--fill)] disabled:opacity-50"
                  >
                    {ns === "sent" && "Send"}
                    {ns === "confirmed" && "Confirm"}
                    {ns === "partial" && "Mark Partial"}
                    {ns === "fulfilled" && "Mark Fulfilled"}
                    {ns === "cancelled" && "Cancel"}
                  </button>
                ))}
              </div>
            </div>

            {/* Running totals */}
            <div className="mb-3 grid grid-cols-3 gap-3">
              <div className="rounded-lg border border-[var(--sep)] bg-[var(--card)] p-2.5 text-center">
                <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--secondary)]">Ordered</p>
                <p className="text-[15px] font-semibold text-[var(--label)]">{totalOrdered}</p>
              </div>
              <div className="rounded-lg border border-[var(--sep)] bg-[var(--card)] p-2.5 text-center">
                <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--secondary)]">Received</p>
                <p className="text-[15px] font-semibold text-green-600">{totalReceived}</p>
              </div>
              <div className="rounded-lg border border-[var(--sep)] bg-[var(--card)] p-2.5 text-center">
                <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--secondary)]">Outstanding</p>
                <p className={`text-[15px] font-semibold ${totalOutstanding > 0 ? "text-amber-600" : "text-[var(--label)]"}`}>{totalOutstanding}</p>
              </div>
            </div>

            {/* Line items table */}
            <div className="overflow-hidden rounded-lg border border-[var(--sep)]">
              <table className="w-full text-left text-[12px]">
                <thead>
                  <tr className="border-b border-[var(--sep)] bg-[var(--fill)]">
                    <th className="px-3 py-2 font-medium text-[var(--secondary)]">Description</th>
                    <th className="px-3 py-2 text-right font-medium text-[var(--secondary)]">Qty</th>
                    <th className="hidden px-3 py-2 font-medium text-[var(--secondary)] sm:table-cell">Unit</th>
                    <th className="hidden px-3 py-2 text-right font-medium text-[var(--secondary)] sm:table-cell">Unit Price</th>
                    <th className="px-3 py-2 text-right font-medium text-[var(--secondary)]">Extended</th>
                    <th className="px-3 py-2 text-right font-medium text-[var(--secondary)]">Received</th>
                    <th className="px-3 py-2 font-medium text-[var(--secondary)]"></th>
                  </tr>
                </thead>
                <tbody>
                  {(po.po_line_items ?? []).map((li) => (
                    <LineItemRow
                      key={li.id}
                      item={li}
                      poId={po.id}
                      onReceive={onReceiveItem}
                    />
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-[var(--sep)] bg-[var(--fill)]">
                    <td colSpan={4} className="px-3 py-2 text-right font-medium text-[var(--secondary)]">Subtotal</td>
                    <td className="px-3 py-2 text-right font-medium text-[var(--label)]">{formatCurrency(Number(po.subtotal))}</td>
                    <td colSpan={2}></td>
                  </tr>
                  {Number(po.tax) > 0 && (
                    <tr className="bg-[var(--fill)]">
                      <td colSpan={4} className="px-3 py-1.5 text-right text-[var(--secondary)]">Tax</td>
                      <td className="px-3 py-1.5 text-right text-[var(--label)]">{formatCurrency(Number(po.tax))}</td>
                      <td colSpan={2}></td>
                    </tr>
                  )}
                  {Number(po.shipping) > 0 && (
                    <tr className="bg-[var(--fill)]">
                      <td colSpan={4} className="px-3 py-1.5 text-right text-[var(--secondary)]">Shipping</td>
                      <td className="px-3 py-1.5 text-right text-[var(--label)]">{formatCurrency(Number(po.shipping))}</td>
                      <td colSpan={2}></td>
                    </tr>
                  )}
                  <tr className="border-t border-[var(--sep)] bg-[var(--fill)]">
                    <td colSpan={4} className="px-3 py-2 text-right font-semibold text-[var(--label)]">Total</td>
                    <td className="px-3 py-2 text-right font-semibold text-[var(--accent)]">{formatCurrency(Number(po.total))}</td>
                    <td colSpan={2}></td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {po.notes && (
              <p className="mt-3 text-[12px] text-[var(--secondary)]">
                <span className="font-medium">Notes:</span> {po.notes}
              </p>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Line Item Row with receive button
// ---------------------------------------------------------------------------

interface LineItemRowProps {
  item: POLineItem;
  poId: string;
  onReceive: (poId: string, lineItemId: string, receivedQty: number) => void;
}

function LineItemRow({ item, poId, onReceive }: LineItemRowProps) {
  const [editing, setEditing] = useState(false);
  const [recvQty, setRecvQty] = useState(String(item.received_qty ?? 0));

  const handleSave = () => {
    const qty = parseFloat(recvQty);
    if (!isNaN(qty) && qty >= 0) {
      onReceive(poId, item.id, qty);
    }
    setEditing(false);
  };

  return (
    <tr className="border-b border-[var(--sep)] last:border-b-0">
      <td className="px-3 py-2 text-[var(--label)]">{item.description}</td>
      <td className="px-3 py-2 text-right text-[var(--label)]">{item.quantity}</td>
      <td className="hidden px-3 py-2 text-[var(--secondary)] sm:table-cell">{item.unit}</td>
      <td className="hidden px-3 py-2 text-right text-[var(--label)] sm:table-cell">{formatCurrency(Number(item.unit_price))}</td>
      <td className="px-3 py-2 text-right font-medium text-[var(--label)]">{formatCurrency(Number(item.extended_price))}</td>
      <td className="px-3 py-2 text-right">
        {editing ? (
          <input
            type="number"
            value={recvQty}
            onChange={(e) => setRecvQty(e.target.value)}
            onBlur={handleSave}
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
            className="w-16 rounded border border-[var(--sep)] bg-[var(--bg)] px-2 py-1 text-right text-[12px] outline-none focus:border-[var(--accent)]"
            min={0}
            step="any"
            autoFocus
          />
        ) : (
          <span
            className={`${Number(item.received_qty) >= Number(item.quantity) ? "text-green-600" : "text-[var(--label)]"}`}
          >
            {item.received_qty ?? 0}
          </span>
        )}
      </td>
      <td className="px-3 py-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (editing) {
              handleSave();
            } else {
              setRecvQty(String(item.quantity));
              setEditing(true);
            }
          }}
          className="rounded px-2 py-1 text-[11px] font-medium text-[var(--accent)] transition-colors hover:bg-[var(--accent)]/10"
        >
          {editing ? "Save" : "Receive"}
        </button>
      </td>
    </tr>
  );
}

// ---------------------------------------------------------------------------
// Create PO Modal
// ---------------------------------------------------------------------------

interface CreatePOModalProps {
  open: boolean;
  onClose: () => void;
  estimates: Array<{ id: string; estimate_number: string; project_type: string }>;
  defaultEstimateId?: string;
  onCreated: () => void;
}

function CreatePOModal({
  open,
  onClose,
  estimates,
  defaultEstimateId,
  onCreated,
}: CreatePOModalProps) {
  const [vendorName, setVendorName] = useState("");
  const [vendorContact, setVendorContact] = useState("");
  const [vendorPhone, setVendorPhone] = useState("");
  const [vendorEmail, setVendorEmail] = useState("");
  const [selectedEstimateId, setSelectedEstimateId] = useState(defaultEstimateId ?? "");
  const [orderDate, setOrderDate] = useState("");
  const [expectedDelivery, setExpectedDelivery] = useState("");
  const [tax, setTax] = useState("");
  const [shipping, setShipping] = useState("");
  const [notes, setNotes] = useState("");
  const [lineItems, setLineItems] = useState<DraftLineItem[]>([
    { key: makeKey(), description: "", quantity: "1", unit: "each", unit_price: "0", estimate_line_item_id: null },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addLineItem = () => {
    setLineItems((prev) => [
      ...prev,
      { key: makeKey(), description: "", quantity: "1", unit: "each", unit_price: "0", estimate_line_item_id: null },
    ]);
  };

  const removeLineItem = (key: string) => {
    setLineItems((prev) => prev.filter((li) => li.key !== key));
  };

  const updateLineItem = (key: string, field: keyof DraftLineItem, value: string) => {
    setLineItems((prev) =>
      prev.map((li) => (li.key === key ? { ...li, [field]: value } : li)),
    );
  };

  const subtotal = lineItems.reduce((s, li) => {
    const q = parseFloat(li.quantity) || 0;
    const p = parseFloat(li.unit_price) || 0;
    return s + q * p;
  }, 0);

  const total = subtotal + (parseFloat(tax) || 0) + (parseFloat(shipping) || 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendorName.trim() || !selectedEstimateId || lineItems.length === 0) return;

    const validItems = lineItems.filter((li) => li.description.trim());
    if (validItems.length === 0) {
      setError("At least one line item with a description is required");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/purchase-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          estimate_id: selectedEstimateId,
          vendor_name: vendorName.trim(),
          vendor_contact: vendorContact.trim() || null,
          vendor_phone: vendorPhone.trim() || null,
          vendor_email: vendorEmail.trim() || null,
          order_date: orderDate || null,
          expected_delivery: expectedDelivery || null,
          tax: parseFloat(tax) || 0,
          shipping: parseFloat(shipping) || 0,
          notes: notes.trim() || null,
          line_items: validItems.map((li) => ({
            description: li.description.trim(),
            quantity: parseFloat(li.quantity) || 1,
            unit: li.unit || "each",
            unit_price: parseFloat(li.unit_price) || 0,
            estimate_line_item_id: li.estimate_line_item_id,
          })),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to create purchase order");
      }

      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create purchase order");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Create Purchase Order"
      description="Create a new PO to track material orders from a vendor"
      width="w-full max-w-[700px]"
    >
      <form onSubmit={handleSubmit} className="px-6 py-4">
        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
            {error}
          </div>
        )}

        {/* Vendor Info */}
        <div className="mb-4 grid grid-cols-2 gap-3">
          <Field label="Vendor Name *">
            <input
              className={inputClass}
              value={vendorName}
              onChange={(e) => setVendorName(e.target.value)}
              placeholder="Lumber supply co."
              required
            />
          </Field>
          <Field label="Contact Name">
            <input
              className={inputClass}
              value={vendorContact}
              onChange={(e) => setVendorContact(e.target.value)}
              placeholder="John Smith"
            />
          </Field>
          <Field label="Phone">
            <input
              className={inputClass}
              value={vendorPhone}
              onChange={(e) => setVendorPhone(e.target.value)}
              placeholder="(555) 123-4567"
            />
          </Field>
          <Field label="Email">
            <input
              className={inputClass}
              type="email"
              value={vendorEmail}
              onChange={(e) => setVendorEmail(e.target.value)}
              placeholder="vendor@example.com"
            />
          </Field>
        </div>

        {/* Estimate Link */}
        <div className="mb-4">
          <Field label="Link to Estimate *">
            <select
              className={selectClass}
              value={selectedEstimateId}
              onChange={(e) => setSelectedEstimateId(e.target.value)}
              required
            >
              <option value="">Select an estimate...</option>
              {estimates.map((est) => (
                <option key={est.id} value={est.id}>
                  {est.estimate_number} — {est.project_type}
                </option>
              ))}
            </select>
          </Field>
        </div>

        {/* Dates */}
        <div className="mb-4 grid grid-cols-2 gap-3">
          <Field label="Order Date">
            <input
              className={inputClass}
              type="date"
              value={orderDate}
              onChange={(e) => setOrderDate(e.target.value)}
            />
          </Field>
          <Field label="Expected Delivery">
            <input
              className={inputClass}
              type="date"
              value={expectedDelivery}
              onChange={(e) => setExpectedDelivery(e.target.value)}
            />
          </Field>
        </div>

        {/* Line Items */}
        <div className="mb-4">
          <div className="mb-2 flex items-center justify-between">
            <label className="text-[12px] font-medium text-[var(--secondary)]">Line Items</label>
            <button
              type="button"
              onClick={addLineItem}
              className="text-[12px] font-medium text-[var(--accent)] transition-colors hover:underline"
            >
              + Add Item
            </button>
          </div>
          <div className="space-y-2">
            {lineItems.map((li) => (
              <div key={li.key} className="flex items-start gap-2 rounded-lg border border-[var(--sep)] bg-[var(--fill)]/30 p-2.5">
                <input
                  className={`${inputClass} flex-1`}
                  value={li.description}
                  onChange={(e) => updateLineItem(li.key, "description", e.target.value)}
                  placeholder="Description"
                />
                <input
                  className={`${inputClass} w-20`}
                  type="number"
                  value={li.quantity}
                  onChange={(e) => updateLineItem(li.key, "quantity", e.target.value)}
                  placeholder="Qty"
                  min={0}
                  step="any"
                />
                <input
                  className={`${inputClass} w-20`}
                  value={li.unit}
                  onChange={(e) => updateLineItem(li.key, "unit", e.target.value)}
                  placeholder="Unit"
                />
                <input
                  className={`${inputClass} w-24`}
                  type="number"
                  value={li.unit_price}
                  onChange={(e) => updateLineItem(li.key, "unit_price", e.target.value)}
                  placeholder="Price"
                  min={0}
                  step="0.01"
                />
                <div className="flex w-24 items-center justify-end text-[12px] font-medium text-[var(--label)]">
                  {formatCurrency((parseFloat(li.quantity) || 0) * (parseFloat(li.unit_price) || 0))}
                </div>
                {lineItems.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeLineItem(li.key)}
                    className="mt-2 text-[var(--gray3)] transition-colors hover:text-[var(--red)]"
                    aria-label="Remove line item"
                  >
                    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Tax / Shipping / Totals */}
        <div className="mb-4 grid grid-cols-3 gap-3">
          <Field label="Tax">
            <input
              className={inputClass}
              type="number"
              value={tax}
              onChange={(e) => setTax(e.target.value)}
              placeholder="0.00"
              min={0}
              step="0.01"
            />
          </Field>
          <Field label="Shipping">
            <input
              className={inputClass}
              type="number"
              value={shipping}
              onChange={(e) => setShipping(e.target.value)}
              placeholder="0.00"
              min={0}
              step="0.01"
            />
          </Field>
          <div className="flex flex-col justify-end">
            <p className="text-[11px] text-[var(--secondary)]">Total</p>
            <p className="text-[18px] font-semibold text-[var(--accent)]">{formatCurrency(total)}</p>
          </div>
        </div>

        {/* Notes */}
        <div className="mb-4">
          <Field label="Notes">
            <textarea
              className={textareaClass}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Delivery instructions, special requests..."
              rows={2}
            />
          </Field>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 border-t border-[var(--sep)] pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[var(--sep)] px-4 py-2 text-[13px] font-medium transition-colors hover:bg-[var(--fill)]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting || !vendorName.trim() || !selectedEstimateId}
            className="rounded-lg bg-[var(--accent)] px-4 py-2 text-[13px] font-medium text-white shadow-sm transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
          >
            {submitting ? "Creating..." : "Create PO"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
