import { useState } from "react";
import toast from "react-hot-toast";
import { useInvoices } from "../lib/store";
import { supabase } from "../lib/supabase";
import { EmptyState } from "./EmptyState";
import { ConfirmDialog } from "./Modal";
import { generateInvoicePDF } from "./InvoicePDF";
import type { Invoice, InvoiceStatus } from "@proestimate/shared/types";

const STATUS_STYLE: Record<string, string> = {
  pending: "bg-[var(--gray5)] text-[var(--gray1)]",
  processing: "bg-[#e3f2fd] text-[#1565c0]",
  review: "bg-[#fff3e0] text-[#e65100]",
  confirmed: "bg-[#e8f5e9] text-[#2e7d32]",
  error: "bg-[#ffebee] text-[#c62828]",
};

const STATUS_FLOW: InvoiceStatus[] = ["pending", "processing", "review", "confirmed", "error"];

function parsedTotal(inv: Invoice): number | null {
  const pd = inv.parsed_data;
  if (!pd) return null;
  const total = (pd as any).total ?? (pd as any).amount ?? (pd as any).grand_total;
  return typeof total === "number" ? total : null;
}

function fmt(n: number): string {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function InvoicesPage({ onModal }: { onNavigate?: (page: string) => void; onCallAlex?: () => void; onModal?: (m: string) => void }) {
  const { data: invoices, loading } = useInvoices();
  const [filter, setFilter] = useState("All");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Invoice | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const filters = ["All", "Pending", "Processing", "Review", "Confirmed", "Error"];
  const filtered = invoices.filter((inv) => {
    if (filter === "All") return true;
    return inv.status === filter.toLowerCase();
  });

  const selectedInvoice = invoices.find((inv) => inv.id === selectedId) ?? null;

  const handleStatusChange = async (inv: Invoice, newStatus: InvoiceStatus) => {
    if (!supabase || newStatus === inv.status) return;
    setUpdatingStatus(true);
    try {
      const { error } = await supabase.from("invoices").update({ status: newStatus }).eq("id", inv.id);
      if (error) { toast.error("Failed to update status"); console.error(error); }
      else toast.success(`Status updated to ${newStatus}`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to update status");
    }
    setUpdatingStatus(false);
  };

  const handleDelete = async (inv: Invoice) => {
    if (!supabase) return;
    try {
      const { error } = await supabase.from("invoices").delete().eq("id", inv.id);
      if (error) { toast.error("Failed to delete invoice"); console.error(error); }
      else {
        toast.success("Invoice deleted");
        if (selectedId === inv.id) setSelectedId(null);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete invoice");
    }
  };

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <header className="flex items-center justify-between px-4 md:px-8 pt-4 pb-1">
        <p className="text-[12px] text-[var(--secondary)]">{invoices.length} uploaded invoices</p>
        <button onClick={() => onModal?.("upload-invoice")} className="rounded-lg bg-[var(--accent)] px-3.5 py-1.5 text-[12px] font-semibold text-white shadow-sm shadow-[var(--accent)]/20 transition-all hover:brightness-110 active:scale-[0.98]">
          Upload Invoice
        </button>
      </header>

      <div className="px-4 md:px-8 py-3">
        <div className="flex rounded-lg bg-[var(--gray5)] p-0.5">
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-1 rounded-md px-2 py-1.5 text-[11px] font-medium transition-all ${
                filter === f ? "bg-[var(--card)] text-[var(--label)] shadow-sm" : "text-[var(--secondary)]"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 md:px-8 pb-6">
        {loading ? (
          <div className="rounded-xl border border-[var(--sep)] bg-[var(--card)] p-4 space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex justify-between">
                <div className="h-3 w-32 animate-pulse rounded bg-[var(--gray5)]" />
                <div className="h-3 w-16 animate-pulse rounded bg-[var(--gray5)]" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No invoices"
            description={filter !== "All" ? "No invoices with this status" : "Upload supplier invoices to feed the pricing engine"}
            action={filter === "All" ? "Upload Invoice" : undefined}
          />
        ) : (
          <div className="rounded-xl border border-[var(--sep)] bg-[var(--card)]">
            {filtered.map((inv, i, arr) => {
              const isSelected = selectedId === inv.id;
              const total = parsedTotal(inv);
              return (
                <div key={inv.id}>
                  <div
                    onClick={() => setSelectedId(isSelected ? null : inv.id)}
                    className={`flex items-center gap-3 px-4 py-3.5 cursor-pointer transition-colors ${
                      isSelected ? "bg-[var(--accent)]/5" : "hover:bg-[var(--bg)]"
                    } ${i < arr.length - 1 && !isSelected ? "border-b border-[var(--sep)]" : ""}`}
                  >
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-[var(--gray5)]">
                      <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="var(--gray1)" strokeWidth="1.5" strokeLinecap="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><path d="M14 2v6h6" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-[13px] font-medium truncate">{inv.supplier_name ?? "Unknown supplier"}</p>
                        <span className={`flex-shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold ${STATUS_STYLE[inv.status]}`}>
                          {inv.status}
                        </span>
                      </div>
                      <p className="text-[11px] text-[var(--secondary)]">
                        {inv.invoice_number ?? "No number"}{inv.invoice_date ? ` · ${new Date(inv.invoice_date).toLocaleDateString()}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      {total !== null && (
                        <p className="text-[13px] font-semibold text-[var(--label)]">${fmt(total)}</p>
                      )}
                      <p className="text-[12px] text-[var(--secondary)]">{new Date(inv.created_at).toLocaleDateString()}</p>
                      <svg
                        width="14" height="14" fill="none" viewBox="0 0 24 24"
                        stroke="var(--gray2)" strokeWidth="2" strokeLinecap="round"
                        className={`transition-transform ${isSelected ? "rotate-180" : ""}`}
                      >
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </div>
                  </div>

                  {/* ── Detail Panel ── */}
                  {isSelected && (
                    <div className="border-b border-[var(--sep)] bg-[var(--bg)] px-4 py-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--secondary)] mb-1">Supplier</p>
                          <p className="text-[13px] text-[var(--label)]">{inv.supplier_name ?? "Unknown"}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--secondary)] mb-1">Invoice Number</p>
                          <p className="text-[13px] text-[var(--label)]">{inv.invoice_number ?? "N/A"}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--secondary)] mb-1">Invoice Date</p>
                          <p className="text-[13px] text-[var(--label)]">{inv.invoice_date ? new Date(inv.invoice_date).toLocaleDateString() : "N/A"}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--secondary)] mb-1">File</p>
                          <p className="text-[13px] text-[var(--label)]">{inv.file_path}</p>
                        </div>
                        {total !== null && (
                          <div>
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--secondary)] mb-1">Total Amount</p>
                            <p className="text-[15px] font-bold text-[var(--accent)]">${fmt(total)}</p>
                          </div>
                        )}
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--secondary)] mb-1">Uploaded</p>
                          <p className="text-[13px] text-[var(--label)]">{new Date(inv.created_at).toLocaleString()}</p>
                        </div>
                      </div>

                      {/* Parsed data display */}
                      {inv.parsed_data && Object.keys(inv.parsed_data).length > 0 && (
                        <div className="mb-4">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--secondary)] mb-2">Parsed Data</p>
                          <div className="rounded-lg border border-[var(--sep)] bg-[var(--card)] overflow-hidden">
                            {/* Line items if present */}
                            {Array.isArray((inv.parsed_data as any).line_items) && (inv.parsed_data as any).line_items.length > 0 && (
                              <div className="p-3">
                                <p className="text-[11px] font-semibold text-[var(--label)] mb-2">Line Items</p>
                                <div className="space-y-1.5">
                                  {(inv.parsed_data as any).line_items.map((item: any, idx: number) => (
                                    <div key={idx} className="flex items-center justify-between text-[12px]">
                                      <span className="text-[var(--label)] truncate flex-1 mr-3">
                                        {item.description ?? item.name ?? `Item ${idx + 1}`}
                                        {item.quantity ? ` x${item.quantity}` : ""}
                                      </span>
                                      {(item.total ?? item.price ?? item.amount) != null && (
                                        <span className="text-[var(--secondary)] font-medium flex-shrink-0">
                                          ${fmt(Number(item.total ?? item.price ?? item.amount))}
                                        </span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            {/* Other fields */}
                            {Object.entries(inv.parsed_data)
                              .filter(([k]) => !["line_items", "total", "amount", "grand_total"].includes(k))
                              .length > 0 && (
                              <div className="p-3 border-t border-[var(--sep)]">
                                <div className="space-y-1">
                                  {Object.entries(inv.parsed_data!)
                                    .filter(([k]) => !["line_items", "total", "amount", "grand_total"].includes(k))
                                    .map(([key, value]) => (
                                      <div key={key} className="flex items-center justify-between text-[12px]">
                                        <span className="text-[var(--secondary)] capitalize">{key.replace(/_/g, " ")}</span>
                                        <span className="text-[var(--label)]">{String(value)}</span>
                                      </div>
                                    ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Status change */}
                      <div className="mb-4">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--secondary)] mb-2">Change Status</p>
                        <div className="flex gap-1.5 flex-wrap">
                          {STATUS_FLOW.map((st) => (
                            <button
                              key={st}
                              onClick={() => handleStatusChange(inv, st)}
                              disabled={updatingStatus || st === inv.status}
                              className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-all ${
                                st === inv.status
                                  ? `${STATUS_STYLE[st]} ring-2 ring-[var(--accent)]/30`
                                  : `${STATUS_STYLE[st]} opacity-60 hover:opacity-100`
                              } disabled:cursor-not-allowed`}
                            >
                              {st}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => generateInvoicePDF(inv)}
                          className="rounded-lg border border-[var(--sep)] px-3 py-1.5 text-[12px] font-medium text-[var(--label)] transition-colors hover:bg-[var(--card)]"
                        >
                          <span className="flex items-center gap-1.5">
                            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
                            </svg>
                            Download PDF
                          </span>
                        </button>
                        <button
                          onClick={() => setDeleteTarget(inv)}
                          className="rounded-lg border border-red-200 px-3 py-1.5 text-[12px] font-medium text-red-600 transition-colors hover:bg-red-50"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => { if (deleteTarget) handleDelete(deleteTarget); }}
        title="Delete Invoice"
        message={`Are you sure you want to delete the invoice from "${deleteTarget?.supplier_name ?? "Unknown supplier"}"? This action cannot be undone.`}
        confirmLabel="Delete"
        destructive
      />
    </div>
  );
}
