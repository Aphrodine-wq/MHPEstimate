import { useState, useMemo, useEffect } from "react";
import toast from "react-hot-toast";
import * as Sentry from "@sentry/nextjs";
import { useProducts } from "../lib/store";
import { useAppContext } from "./AppContext";
import { EmptyState } from "./EmptyState";
import { ConfirmDialog } from "./Modal";
import { supabase } from "../lib/supabase";
import type { Product } from "@proestimate/shared/types";

const CATEGORIES = ["All", "Flooring", "Countertops", "Cabinetry", "Paint", "Roofing", "Lumber", "Plumbing", "Electrical", "Other"];
const PRODUCT_CATEGORIES = CATEGORIES.filter((c) => c !== "All");

/* ── Product form modal ── */

interface ProductFormProps {
  product: Product | null; // null = creating new
  onClose: () => void;
  onSaved: () => void;
}

function ProductForm({ product, onClose, onSaved }: ProductFormProps) {
  const isEditing = !!product;

  const [name, setName] = useState(product?.name ?? "");
  const [category, setCategory] = useState(product?.category ?? "Paint");
  const [unit, setUnit] = useState(product?.unit ?? "each");
  const [brand, setBrand] = useState(product?.brand ?? "");
  const [skuHd, setSkuHd] = useState(product?.sku_hd ?? "");
  const [tier, setTier] = useState<string>(product?.tier ?? "mid");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (product) {
      setName(product.name);
      setCategory(product.category);
      setUnit(product.unit);
      setBrand(product.brand ?? "");
      setSkuHd(product.sku_hd ?? "");
      setTier(product.tier ?? "mid");
    }
  }, [product]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || !name.trim()) return;
    setSaving(true);
    try {
      if (isEditing && product) {
        const { error } = await supabase
          .from("products")
          .update({
            name: name.trim(),
            category,
            unit: unit.trim(),
            brand: brand.trim() || null,
            sku_hd: skuHd.trim() || null,
            tier: tier as Product["tier"],
            updated_at: new Date().toISOString(),
          })
          .eq("id", product.id);
        if (error) throw error;
        toast.success("Product updated");
      } else {
        const { error } = await supabase.from("products").insert({
          name: name.trim(),
          category,
          unit: unit.trim(),
          brand: brand.trim() || null,
          sku_hd: skuHd.trim() || null,
          tier: tier as Product["tier"],
          is_active: true,
          specifications: {},
        });
        if (error) throw error;
        toast.success("Product added to catalog");
      }
      onSaved();
      onClose();
    } catch (err) {
      Sentry.captureException(err);
      toast.error(isEditing ? "Failed to update product. Please try again." : "Failed to add product. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.4)" }}
    >
      <div className="w-full max-w-md rounded-2xl bg-[var(--card)] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--sep)] px-6 py-4">
          <h2 className="text-[15px] font-semibold">{isEditing ? "Edit Product" : "Add Product"}</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-[var(--gray5)] transition-colors"
          >
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-[var(--secondary)]">Product Name *</label>
            <input
              required
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Premium Interior Paint"
              className="w-full rounded-lg border border-[var(--sep)] bg-[var(--bg)] px-3 py-2 text-[13px] outline-none placeholder:text-[var(--gray3)] focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/20"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-[var(--secondary)]">Category *</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-lg border border-[var(--sep)] bg-[var(--bg)] px-3 py-2 text-[13px] outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/20"
              >
                {PRODUCT_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-medium text-[var(--secondary)]">Unit *</label>
              <input
                required
                type="text"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="e.g. gallon, sqft, each"
                className="w-full rounded-lg border border-[var(--sep)] bg-[var(--bg)] px-3 py-2 text-[13px] outline-none placeholder:text-[var(--gray3)] focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/20"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-[var(--secondary)]">Brand (optional)</label>
              <input
                type="text"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="e.g. Sherwin-Williams"
                className="w-full rounded-lg border border-[var(--sep)] bg-[var(--bg)] px-3 py-2 text-[13px] outline-none placeholder:text-[var(--gray3)] focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/20"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-medium text-[var(--secondary)]">Home Depot SKU (optional)</label>
              <input
                type="text"
                value={skuHd}
                onChange={(e) => setSkuHd(e.target.value)}
                placeholder="e.g. 123456789"
                className="w-full rounded-lg border border-[var(--sep)] bg-[var(--bg)] px-3 py-2 text-[13px] outline-none placeholder:text-[var(--gray3)] focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/20"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-medium text-[var(--secondary)]">Tier</label>
            <div className="inline-flex rounded-md bg-[var(--gray5)] p-0.5">
              {(["budget", "mid", "premium"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTier(t)}
                  className={`rounded px-3 py-1 text-[12px] font-medium transition-colors capitalize ${
                    tier === t
                      ? "bg-[var(--card)] text-[var(--foreground)] shadow-sm"
                      : "text-[var(--secondary)] hover:text-[var(--foreground)]"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-[var(--sep)] py-2 text-[13px] font-medium transition-colors hover:bg-[var(--bg)]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !name.trim()}
              className="flex-1 rounded-lg bg-[var(--accent)] py-2 text-[13px] font-medium text-white transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {saving ? (isEditing ? "Saving…" : "Adding…") : (isEditing ? "Save Changes" : "Add Product")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Main page ── */

export function MaterialsPage() {
  const { onModal } = useAppContext();
  const { data: products, loading, refresh } = useProducts();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState(false);

  const filtered = useMemo(() => products.filter((p) => {
    if (category !== "All" && p.category.toLowerCase() !== category.toLowerCase()) return false;
    if (search) {
      const q = search.toLowerCase();
      return p.name.toLowerCase().includes(q) || (p.brand ?? "").toLowerCase().includes(q) || (p.sku_hd ?? "").includes(q);
    }
    return true;
  }), [products, category, search]);

  const handleEdit = (p: Product) => {
    setEditingProduct(p);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingProduct(null);
  };

  const handleDelete = async (p: Product) => {
    if (!supabase) return;
    setDeleting(true);
    try {
      // Soft-delete by setting is_active = false
      const { error } = await supabase
        .from("products")
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq("id", p.id);
      if (error) throw error;
      toast.success(`"${p.name}" removed from catalog`);
      setDeleteTarget(null);
      await refresh();
    } catch (err) {
      Sentry.captureException(err);
      toast.error("Failed to delete product. Please try again.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <header className="flex items-center justify-between px-8 pt-4 pb-1">
        <p className="text-[12px] text-[var(--secondary)]">{products.length} products in catalog</p>
        <div className="flex gap-2">
          <button
            onClick={() => { setEditingProduct(null); setShowForm(true); }}
            className="rounded-lg border border-[var(--sep)] px-3.5 py-1.5 text-[12px] font-semibold transition-colors hover:bg-[var(--bg)]"
          >
            + Add Product
          </button>
          <button
            onClick={() => onModal?.("log-expense")}
            className="rounded-lg bg-[var(--accent)] px-3.5 py-1.5 text-[12px] font-semibold text-white shadow-sm shadow-[var(--accent)]/20 transition-all hover:brightness-110 active:scale-[0.98]"
          >
            Log Expense
          </button>
        </div>
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
            onAction={!search && category === "All" ? () => { setEditingProduct(null); setShowForm(true); } : undefined}
          />
        ) : (
          <div className="rounded-xl border border-[var(--sep)] bg-[var(--card)]">
            {/* Header */}
            <div className="flex items-center border-b border-[var(--sep)] px-4 py-2">
              <p className="flex-1 text-[11px] font-medium text-[var(--secondary)]">Product</p>
              <p className="w-20 text-right text-[11px] font-medium text-[var(--secondary)]">Unit</p>
              <p className="w-24 text-right text-[11px] font-medium text-[var(--secondary)]">Category</p>
              <p className="w-16 text-right text-[11px] font-medium text-[var(--secondary)]">Tier</p>
              <p className="w-20 text-right text-[11px] font-medium text-[var(--secondary)]">Actions</p>
            </div>
            {filtered.map((p, i, arr) => (
              <div
                key={p.id}
                className={`flex items-center px-4 py-3 hover:bg-[var(--bg)] group ${i < arr.length - 1 ? "border-b border-[var(--sep)]" : ""}`}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium truncate">{p.name}</p>
                  <p className="text-[11px] text-[var(--secondary)]">{p.brand ?? "—"}{p.sku_hd ? ` · ${p.sku_hd}` : ""}</p>
                </div>
                <p className="w-20 text-right text-[12px] text-[var(--secondary)]">{p.unit}</p>
                <p className="w-24 text-right text-[12px] text-[var(--secondary)]">{p.category}</p>
                <p className="w-16 text-right text-[12px] font-medium capitalize">{p.tier ?? "—"}</p>
                <div className="w-20 flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={() => handleEdit(p)}
                    className="flex h-7 w-7 items-center justify-center rounded-md border border-[var(--sep)] text-[var(--secondary)] hover:bg-[var(--card)] hover:text-[var(--label)] transition-colors"
                    title="Edit product"
                  >
                    <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(p)}
                    className="flex h-7 w-7 items-center justify-center rounded-md border border-[var(--sep)] text-[var(--secondary)] hover:border-red-200 hover:bg-red-50 hover:text-red-600 transition-colors"
                    title="Delete product"
                  >
                    <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6l-1 14H6L5 6" />
                      <path d="M10 11v6M14 11v6" />
                      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Product form modal */}
      {showForm && (
        <ProductForm
          product={editingProduct}
          onClose={handleCloseForm}
          onSaved={refresh}
        />
      )}

      {/* Delete confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => { if (deleteTarget) handleDelete(deleteTarget); }}
        title="Remove Product"
        message={`Remove "${deleteTarget?.name}" from the catalog? It will no longer appear in searches or estimates.`}
        confirmLabel={deleting ? "Removing…" : "Remove"}
        destructive
      />
    </div>
  );
}
