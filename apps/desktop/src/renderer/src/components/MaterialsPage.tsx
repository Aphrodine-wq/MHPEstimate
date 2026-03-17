import { useState, useMemo } from "react";
import { useProducts } from "../lib/store";
import type { UnifiedPricing } from "@proestimate/shared/types";

const CATEGORIES = ["All", "Flooring", "Countertops", "Cabinetry", "Paint", "Roofing", "Lumber", "Plumbing", "Electrical"];

function fmt(n: number): string {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

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

  /* ── Compute summary stats ── */
  const stats = useMemo(() => {
    const uniqueCategories = new Set(products.map((p) => p.category));

    const prices: number[] = [];
    for (const p of products) {
      const up = (p as any).unified_pricing as UnifiedPricing[] | UnifiedPricing | null | undefined;
      const price = Array.isArray(up) ? up[0]?.unified_price : up?.unified_price;
      if (typeof price === "number" && price > 0) prices.push(price);
    }
    const avgPrice = prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : null;

    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const recentlyUpdated = products.filter((p) => new Date(p.updated_at).getTime() >= thirtyDaysAgo).length;

    return {
      total: products.length,
      categories: uniqueCategories.size,
      avgPrice,
      recentlyUpdated,
    };
  }, [products]);

  /* ── Category counts for filter badges ── */
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { All: products.length };
    for (const p of products) {
      const cat = CATEGORIES.find((c) => c.toLowerCase() === p.category.toLowerCase());
      if (cat) counts[cat] = (counts[cat] ?? 0) + 1;
    }
    return counts;
  }, [products]);

  function getProductPrice(p: any): number | null {
    const up = p.unified_pricing as UnifiedPricing[] | UnifiedPricing | null | undefined;
    const price = Array.isArray(up) ? up[0]?.unified_price : up?.unified_price;
    return typeof price === "number" && price > 0 ? price : null;
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      {/* ── Header ── */}
      <header className="px-8 pt-6 pb-4 slide-up">
        <div className="flex items-end justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="h-4 w-1 rounded-full bg-[var(--accent)]" />
              <p className="caps">Product Catalog</p>
            </div>
            <h1 className="text-[20px] font-extrabold tight">{products.length} Products</h1>
          </div>
          <button
            onClick={() => onModal?.("log-expense")}
            className="rounded-lg bg-[var(--accent)] px-3.5 py-1.5 text-[12px] font-semibold text-white shadow-sm shadow-[var(--accent)]/20 transition-all hover:bg-[var(--accent-hover)] active:scale-[0.98]"
          >
            Log Expense
          </button>
        </div>
      </header>

      {/* ── Summary Stats ── */}
      <div className="grid grid-cols-4 gap-3 px-8 py-4 slide-up stagger-1">
        <div className="surface rounded-xl p-4">
          <p className="caps mb-1">Total Products</p>
          <p className="text-[22px] font-bold tight tabular">{stats.total}</p>
        </div>
        <div className="surface rounded-xl p-4">
          <p className="caps mb-1">Categories</p>
          <p className="text-[22px] font-bold tight tabular">{stats.categories}</p>
        </div>
        <div className="surface rounded-xl p-4">
          <p className="caps mb-1">Avg Price</p>
          <p className="text-[22px] font-bold tight tabular">
            {stats.avgPrice !== null ? `$${fmt(stats.avgPrice)}` : "\u2014"}
          </p>
        </div>
        <div className="surface rounded-xl p-4">
          <p className="caps mb-1">Recently Updated</p>
          <p className="text-[22px] font-bold tight tabular">{stats.recentlyUpdated}</p>
        </div>
      </div>

      {/* ── Search + Category Filter ── */}
      <div className="px-8 pb-3 slide-up stagger-2">
        <div className="relative mb-2">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="var(--gray2)" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="text"
            placeholder="Search by name, brand, or SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-[var(--sep)] bg-[var(--card)] py-2 pl-9 pr-3 text-[13px] shadow-sm shadow-black/[0.02] outline-none placeholder:text-[var(--gray3)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/10"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors ${
                category === c ? "bg-[var(--accent)] text-white shadow-sm shadow-[var(--accent)]/20" : "bg-[var(--gray5)] text-[var(--secondary)] hover:bg-[var(--gray4)]"
              }`}
            >
              {c}
              {(categoryCounts[c] ?? 0) > 0 && (
                <span className={`inline-flex items-center justify-center min-w-[18px] h-[16px] rounded-full px-1 text-[9px] font-bold ${
                  category === c ? "bg-white/20 text-white" : "bg-[var(--gray4)] text-[var(--secondary)]"
                }`}>
                  {categoryCounts[c]}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Product Table ── */}
      <div className="flex-1 overflow-y-auto px-8 pb-6 slide-up stagger-3">
        {loading ? (
          <div className="surface-elevated p-4 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex justify-between">
                <div className="h-3 w-40 animate-pulse rounded bg-[var(--gray5)]" />
                <div className="h-3 w-16 animate-pulse rounded bg-[var(--gray5)]" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: "rgba(196,30,58,0.06)" }}>
              <svg width="26" height="26" fill="none" viewBox="0 0 24 24" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                <path d="m3.27 6.96 8.73 5.05 8.73-5.05M12 22.08V12" />
              </svg>
            </div>
            <p className="text-[15px] font-bold tight">
              {search || category !== "All" ? "No products found" : "No products in catalog"}
            </p>
            <p className="mt-1 max-w-[260px] text-center text-[12px] text-[var(--secondary)]">
              {search || category !== "All"
                ? "Try adjusting your search or category filter"
                : "Upload an invoice to auto-populate pricing, or add products manually to start building your catalog."}
            </p>
            {!search && category === "All" && (
              <button
                onClick={() => onModal?.("upload-invoice")}
                className="mt-5 rounded-lg bg-[var(--accent)] px-4 py-2 text-[13px] font-semibold text-white shadow-sm shadow-[var(--accent)]/20 transition-all hover:bg-[var(--accent-hover)] active:scale-[0.97]"
              >
                Upload Invoice
              </button>
            )}
          </div>
        ) : (
          <div className="surface-elevated">
            {/* Table Header */}
            <div className="flex items-center border-b border-[var(--sep)] px-4 py-2.5">
              <p className="caps flex-1">Product</p>
              <p className="caps w-24 text-right">Price</p>
              <p className="caps w-20 text-right">Unit</p>
              <p className="caps w-24 text-right">Category</p>
              <p className="caps w-16 text-right">Tier</p>
            </div>
            {filtered.map((p, i, arr) => {
              const price = getProductPrice(p);
              return (
                <div
                  key={p.id}
                  className={`flex items-center px-4 py-3 transition-all hover:bg-[var(--bg)] border-l-2 border-l-transparent hover:border-l-[var(--accent)] ${
                    i < arr.length - 1 ? "border-b border-[var(--sep)]" : ""
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium truncate">{p.name}</p>
                    <p className="text-[11px] text-[var(--secondary)]">
                      {p.brand ?? "\u2014"}{p.sku_hd ? ` \u00B7 ${p.sku_hd}` : ""}
                    </p>
                  </div>
                  <p className="w-24 text-right text-[13px] font-semibold tabular">
                    {price !== null ? `$${fmt(price)}` : "\u2014"}
                  </p>
                  <p className="w-20 text-right text-[12px] text-[var(--secondary)]">{p.unit}</p>
                  <p className="w-24 text-right text-[12px] text-[var(--secondary)]">{p.category}</p>
                  <p className="w-16 text-right text-[12px] font-medium capitalize">{p.tier ?? "\u2014"}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
