import { useState, useEffect } from "react";
import toast from "react-hot-toast";

interface MaterialOrderPanelProps {
  estimateId: string;
  estimateNumber: string;
}

interface CartItem {
  description: string;
  sku: string | null;
  quantity: number;
  url: string | null;
  matched: boolean;
}

interface CartData {
  homeDepot: { items: CartItem[]; cartUrl: string | null };
  lowes: { items: CartItem[]; cartUrl: string | null };
}

export function MaterialOrderPanel({ estimateId, estimateNumber }: MaterialOrderPanelProps) {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"homedepot" | "lowes">("homedepot");
  const [data, setData] = useState<CartData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCartLinks() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/integrations/materials/cart-links", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ estimateId }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: "Failed to fetch" }));
          throw new Error(err.error || "Failed to fetch cart links");
        }
        const result = await res.json();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load material links");
      } finally {
        setLoading(false);
      }
    }
    fetchCartLinks();
  }, [estimateId]);

  if (loading) {
    return (
      <div className="p-6 space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-12 animate-pulse rounded-lg bg-[var(--gray5)]" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-[12px] text-red-700">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-2 text-[11px] font-medium text-red-600 hover:underline"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const currentStore = activeTab === "homedepot" ? data.homeDepot : data.lowes;
  const matchedItems = currentStore.items.filter((i) => i.matched);
  const unmatchedItems = currentStore.items.filter((i) => !i.matched);
  const matchRate = currentStore.items.length > 0
    ? Math.round((matchedItems.length / currentStore.items.length) * 100)
    : 0;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-[14px] font-semibold text-[var(--label)]">Order Materials</p>
          <p className="text-[11px] text-[var(--secondary)]">{estimateNumber}</p>
        </div>
      </div>

      {/* Store Tabs */}
      <div className="flex items-center gap-1 rounded-lg bg-[var(--bg)] p-1 mb-4">
        <button
          onClick={() => setActiveTab("homedepot")}
          className={`flex-1 rounded-md px-3 py-1.5 text-[12px] font-medium transition-colors ${
            activeTab === "homedepot"
              ? "bg-[var(--card)] text-[var(--label)] shadow-sm"
              : "text-[var(--secondary)] hover:text-[var(--label)]"
          }`}
        >
          Home Depot
        </button>
        <button
          onClick={() => setActiveTab("lowes")}
          className={`flex-1 rounded-md px-3 py-1.5 text-[12px] font-medium transition-colors ${
            activeTab === "lowes"
              ? "bg-[var(--card)] text-[var(--label)] shadow-sm"
              : "text-[var(--secondary)] hover:text-[var(--label)]"
          }`}
        >
          Lowe&apos;s
        </button>
      </div>

      {/* Match Rate */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] text-[var(--secondary)]">Match Rate</span>
          <span className="text-[11px] font-medium text-[var(--label)]">{matchRate}%</span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-[var(--gray5)] overflow-hidden">
          <div
            className="h-full rounded-full bg-[var(--accent)] transition-all duration-500"
            style={{ width: `${matchRate}%` }}
          />
        </div>
        <p className="mt-1 text-[10px] text-[var(--tertiary)]">
          {matchedItems.length} of {currentStore.items.length} items matched
        </p>
      </div>

      {/* Open Cart Button */}
      {currentStore.cartUrl && (
        <a
          href={currentStore.cartUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2.5 text-[12px] font-semibold text-white transition-all hover:brightness-110 active:scale-[0.98] mb-4"
          onClick={() => toast.success("Opening cart in new tab")}
        >
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" y1="14" x2="21" y2="3" />
          </svg>
          Open Cart
        </a>
      )}

      {/* Matched Items */}
      {matchedItems.length > 0 && (
        <div className="mb-4">
          <p className="text-[11px] font-semibold text-[var(--secondary)] uppercase tracking-wider mb-2">Matched Items</p>
          <div className="rounded-lg border border-[var(--sep)] overflow-hidden">
            {matchedItems.map((item, i) => (
              <div
                key={i}
                className={`flex items-center gap-3 px-3 py-2.5 ${
                  i < matchedItems.length - 1 ? "border-b border-[var(--sep)]" : ""
                }`}
              >
                <div className="h-2 w-2 flex-shrink-0 rounded-full bg-[var(--green)]" />
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] text-[var(--label)] truncate">{item.description}</p>
                  <p className="text-[10px] text-[var(--tertiary)]">
                    {item.sku && `SKU: ${item.sku} · `}Qty: {item.quantity}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Unmatched Items */}
      {unmatchedItems.length > 0 && (
        <div>
          <p className="text-[11px] font-semibold text-[var(--secondary)] uppercase tracking-wider mb-2">Unmatched Items</p>
          <div className="rounded-lg border border-[var(--sep)] overflow-hidden">
            {unmatchedItems.map((item, i) => (
              <div
                key={i}
                className={`flex items-center gap-3 px-3 py-2.5 ${
                  i < unmatchedItems.length - 1 ? "border-b border-[var(--sep)]" : ""
                }`}
              >
                <div className="h-2 w-2 flex-shrink-0 rounded-full bg-[var(--gray3)]" />
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] text-[var(--secondary)] truncate">{item.description}</p>
                  <p className="text-[10px] text-[var(--tertiary)]">Qty: {item.quantity}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
