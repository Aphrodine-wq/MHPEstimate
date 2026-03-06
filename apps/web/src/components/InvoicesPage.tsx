"use client";

import { useState } from "react";
import { useInvoices } from "../lib/store";
import { EmptyState } from "./EmptyState";

const STATUS_STYLE: Record<string, string> = {
  pending: "bg-[var(--gray5)] text-[var(--gray1)]",
  processing: "bg-[#e3f2fd] text-[#1565c0]",
  review: "bg-[#fff3e0] text-[#e65100]",
  confirmed: "bg-[#e8f5e9] text-[#2e7d32]",
  error: "bg-[#ffebee] text-[#c62828]",
};

export function InvoicesPage({ onModal }: { onNavigate?: (page: string) => void; onCallAlex?: () => void; onModal?: (m: string) => void }) {
  const { data: invoices, loading } = useInvoices();
  const [filter, setFilter] = useState("All");

  const filters = ["All", "Pending", "Processing", "Review", "Confirmed", "Error"];
  const filtered = invoices.filter((inv) => {
    if (filter === "All") return true;
    return inv.status === filter.toLowerCase();
  });

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <header className="flex items-center justify-between px-8 pt-6 pb-1">
        <div>
          <h1 className="text-[24px] font-bold tracking-tight">Invoices</h1>
          <p className="text-[12px] text-[var(--secondary)]">{invoices.length} uploaded invoices</p>
        </div>
        <button onClick={() => onModal?.("upload-invoice")} className="rounded-lg bg-[var(--accent)] px-4 py-2 text-[13px] font-medium text-white transition-all active:scale-[0.97]">
          Upload Invoice
        </button>
      </header>

      <div className="px-8 py-3">
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

      <div className="flex-1 overflow-y-auto px-8 pb-6">
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
            {filtered.map((inv, i, arr) => (
              <div key={inv.id} className={`flex items-center gap-3 px-4 py-3.5 hover:bg-[var(--bg)] ${i < arr.length - 1 ? "border-b border-[var(--sep)]" : ""}`}>
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
                <p className="text-[12px] text-[var(--secondary)]">{new Date(inv.created_at).toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
