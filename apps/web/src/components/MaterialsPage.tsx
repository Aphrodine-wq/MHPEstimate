"use client";

import { useState } from "react";
import { useProducts } from "../lib/store";
import { EmptyState } from "./EmptyState";
import { PRICE_FRESHNESS_THRESHOLDS } from "@proestimate/shared/constants";

const CATEGORIES = ["All", "Flooring", "Countertops", "Cabinetry", "Paint", "Roofing", "Lumber", "Plumbing", "Electrical"];

export function MaterialsPage({ onModal }: { onNavigate?: (page: string) => void; onCallAlex?: () => void; onModal?: (m: string) => void }) {
  const { data: products, loading } = useProducts();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");

  const filtered = products.filter((p) => {
    if (category !== "All" && p.category.toLowerCase() !== category.toLowerCase()) return false;
    if (search) {
      const q = search.toLowerCase();
      return p.name.toLowerCase().includes(q) || (p.brand ?? "").toLowerCase().includes(q) || (p.sku_hd ?? "").includes(q);
    }
    return true;
  });

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <header className="flex items-center justify-between px-8 pt-6 pb-1">
        <div>
          <h1 className="text-[24px] font-bold tracking-tight">Materials</h1>
          <p className="text-[12px] text-[var(--secondary)]">{products.length} products in catalog</p>
        </div>
        <button onClick={() => onModal?.("log-expense")} className="rounded-lg bg-[var(--accent)] px-4 py-2 text-[13px] font-medium text-white transition-all active:scale-[0.97]">
          Log Expense
        </button>
      </header>

      <div className="px-8 py-3">
        <div className="relative mb-2">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="var(--gray2)" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="text"
            placeholder="Search by name, brand, or SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-[var(--sep)] bg-[var(--card)] py-2 pl-9 pr-3 text-[13px] outline-none placeholder:text-[var(--gray3)] focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/20"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors ${
                category === c ? "bg-[var(--accent)] text-white" : "bg-[var(--gray5)] text-[var(--secondary)] hover:bg-[var(--gray4)]"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-8 pb-6">
        {loading ? (
          <div className="rounded-xl border border-[var(--sep)] bg-[var(--card)] p-4 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex justify-between">
                <div className="h-3 w-40 animate-pulse rounded bg-[var(--gray5)]" />
                <div className="h-3 w-16 animate-pulse rounded bg-[var(--gray5)]" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No products found"
            description={search || category !== "All" ? "Try adjusting your search" : "Add products to your catalog"}
            action={!search && category === "All" ? "Add Product" : undefined}
          />
        ) : (
          <div className="rounded-xl border border-[var(--sep)] bg-[var(--card)]">
            {/* Header */}
            <div className="flex items-center border-b border-[var(--sep)] px-4 py-2">
              <p className="flex-1 text-[11px] font-medium text-[var(--secondary)]">Product</p>
              <p className="w-20 text-right text-[11px] font-medium text-[var(--secondary)]">Unit</p>
              <p className="w-24 text-right text-[11px] font-medium text-[var(--secondary)]">Category</p>
              <p className="w-16 text-right text-[11px] font-medium text-[var(--secondary)]">Tier</p>
            </div>
            {filtered.map((p, i, arr) => (
              <div key={p.id} className={`flex items-center px-4 py-3 hover:bg-[var(--bg)] ${i < arr.length - 1 ? "border-b border-[var(--sep)]" : ""}`}>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium truncate">{p.name}</p>
                  <p className="text-[11px] text-[var(--secondary)]">{p.brand ?? "—"}{p.sku_hd ? ` · ${p.sku_hd}` : ""}</p>
                </div>
                <p className="w-20 text-right text-[12px] text-[var(--secondary)]">{p.unit}</p>
                <p className="w-24 text-right text-[12px] text-[var(--secondary)]">{p.category}</p>
                <p className="w-16 text-right text-[12px] font-medium capitalize">{p.tier ?? "—"}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
