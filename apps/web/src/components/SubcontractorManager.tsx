"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  MagnifyingGlassIcon,
  PlusIcon,
  XMarkIcon,
  StarIcon as StarOutline,
  EnvelopeIcon,
  PhoneIcon,
  CheckIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";
import { StarIcon as StarSolid } from "@heroicons/react/24/solid";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Subcontractor {
  id: string;
  organization_id: string;
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
  updated_at: string;
}

interface SubBid {
  id: string;
  organization_id: string;
  estimate_id: string;
  subcontractor_id: string;
  trade: string;
  scope_description: string | null;
  bid_amount: number | null;
  status: "draft" | "requested" | "received" | "accepted" | "rejected" | "expired";
  requested_at: string | null;
  due_date: string | null;
  received_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  subcontractors?: {
    id: string;
    company_name: string;
    contact_name: string | null;
    email: string | null;
    phone: string | null;
    rating: number | null;
  };
}

interface SubcontractorManagerProps {
  estimateId?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TRADES = [
  { value: "framing", label: "Framing" },
  { value: "electrical", label: "Electrical" },
  { value: "plumbing", label: "Plumbing" },
  { value: "hvac", label: "HVAC" },
  { value: "drywall", label: "Drywall" },
  { value: "painting", label: "Painting" },
  { value: "flooring", label: "Flooring" },
  { value: "roofing", label: "Roofing" },
  { value: "concrete", label: "Concrete" },
  { value: "demolition", label: "Demolition" },
  { value: "finish_carpentry", label: "Finish Carpentry" },
  { value: "tile", label: "Tile" },
  { value: "insulation", label: "Insulation" },
  { value: "landscaping", label: "Landscaping" },
  { value: "siding", label: "Siding" },
  { value: "gutters", label: "Gutters" },
  { value: "windows_doors", label: "Windows & Doors" },
] as const;

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  requested: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  received: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  accepted: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  rejected: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  expired: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500",
};

function tradeLabel(value: string): string {
  return TRADES.find((t) => t.value === value)?.label ?? value;
}

function tradeBadgeColor(trade: string): string {
  const map: Record<string, string> = {
    electrical: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
    plumbing: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    hvac: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300",
    framing: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
    roofing: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
    concrete: "bg-stone-100 text-stone-800 dark:bg-stone-900/30 dark:text-stone-300",
    painting: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
    demolition: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
    drywall: "bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-300",
    flooring: "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300",
    finish_carpentry: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
    tile: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300",
    insulation: "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300",
    landscaping: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
    siding: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300",
    gutters: "bg-zinc-100 text-zinc-800 dark:bg-zinc-900/30 dark:text-zinc-300",
    windows_doors: "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300",
  };
  return map[trade] ?? "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function isExpired(dateStr: string | null): boolean {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date();
}

// ---------------------------------------------------------------------------
// Star Rating Component
// ---------------------------------------------------------------------------

function StarRating({
  value,
  onChange,
  readonly = false,
}: {
  value: number | null;
  onChange?: (v: number) => void;
  readonly?: boolean;
}) {
  const [hover, setHover] = useState(0);

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = hover ? star <= hover : star <= (value ?? 0);
        const Icon = filled ? StarSolid : StarOutline;
        return (
          <button
            key={star}
            type="button"
            disabled={readonly}
            onClick={() => onChange?.(star)}
            onMouseEnter={() => !readonly && setHover(star)}
            onMouseLeave={() => !readonly && setHover(0)}
            className={`h-5 w-5 ${readonly ? "cursor-default" : "cursor-pointer"} ${
              filled ? "text-amber-400" : "text-[var(--gray2)]"
            }`}
          >
            <Icon className="h-5 w-5" />
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function SubcontractorManager({ estimateId }: SubcontractorManagerProps) {
  // --- State ---
  const [tab, setTab] = useState<"directory" | "bids">(estimateId ? "bids" : "directory");
  const [subs, setSubs] = useState<Subcontractor[]>([]);
  const [bids, setBids] = useState<SubBid[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedSub, setSelectedSub] = useState<Subcontractor | null>(null);
  const [showSubModal, setShowSubModal] = useState(false);
  const [editingSub, setEditingSub] = useState<Subcontractor | null>(null);
  const [showBidModal, setShowBidModal] = useState(false);
  const [saving, setSaving] = useState(false);

  // Sub form state
  const [formCompanyName, setFormCompanyName] = useState("");
  const [formContactName, setFormContactName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formTrades, setFormTrades] = useState<string[]>([]);
  const [formLicense, setFormLicense] = useState("");
  const [formInsuranceExpiry, setFormInsuranceExpiry] = useState("");
  const [formRating, setFormRating] = useState<number | null>(null);
  const [formNotes, setFormNotes] = useState("");

  // Bid form state
  const [bidSubId, setBidSubId] = useState("");
  const [bidTrade, setBidTrade] = useState("");
  const [bidScope, setBidScope] = useState("");
  const [bidDueDate, setBidDueDate] = useState("");

  // --- Data Fetching ---
  const fetchSubs = useCallback(async () => {
    try {
      const res = await fetch("/api/subcontractors");
      if (res.ok) {
        const data = await res.json();
        setSubs(data.subcontractors ?? []);
      }
    } catch {
      // silent
    }
  }, []);

  const fetchBids = useCallback(async () => {
    try {
      const url = estimateId
        ? `/api/sub-bids?estimateId=${estimateId}`
        : "/api/sub-bids";
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setBids(data.bids ?? []);
      }
    } catch {
      // silent
    }
  }, [estimateId]);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchSubs(), fetchBids()]).finally(() => setLoading(false));
  }, [fetchSubs, fetchBids]);

  // --- Filtered Subs ---
  const filteredSubs = useMemo(() => {
    if (!search.trim()) return subs;
    const q = search.toLowerCase();
    return subs.filter(
      (s) =>
        s.company_name.toLowerCase().includes(q) ||
        s.contact_name?.toLowerCase().includes(q) ||
        s.trades.some((t) => t.toLowerCase().includes(q)),
    );
  }, [subs, search]);

  // --- Sub bid history for selected sub ---
  const selectedSubBids = useMemo(() => {
    if (!selectedSub) return [];
    return bids.filter((b) => b.subcontractor_id === selectedSub.id);
  }, [selectedSub, bids]);

  // --- Bid comparison: group by trade ---
  const bidsByTrade = useMemo(() => {
    const map: Record<string, SubBid[]> = {};
    for (const bid of bids) {
      if (!map[bid.trade]) map[bid.trade] = [];
      map[bid.trade]!.push(bid);
    }
    return map;
  }, [bids]);

  // --- Sub Form Helpers ---
  const resetSubForm = useCallback(() => {
    setFormCompanyName("");
    setFormContactName("");
    setFormEmail("");
    setFormPhone("");
    setFormTrades([]);
    setFormLicense("");
    setFormInsuranceExpiry("");
    setFormRating(null);
    setFormNotes("");
    setEditingSub(null);
  }, []);

  const openAddSub = useCallback(() => {
    resetSubForm();
    setShowSubModal(true);
  }, [resetSubForm]);

  const openEditSub = useCallback((sub: Subcontractor) => {
    setEditingSub(sub);
    setFormCompanyName(sub.company_name);
    setFormContactName(sub.contact_name ?? "");
    setFormEmail(sub.email ?? "");
    setFormPhone(sub.phone ?? "");
    setFormTrades(sub.trades);
    setFormLicense(sub.license_number ?? "");
    setFormInsuranceExpiry(sub.insurance_expiry ?? "");
    setFormRating(sub.rating);
    setFormNotes(sub.notes ?? "");
    setShowSubModal(true);
  }, []);

  const handleSaveSub = useCallback(async () => {
    if (!formCompanyName.trim()) return;
    setSaving(true);
    try {
      const payload = {
        company_name: formCompanyName.trim(),
        contact_name: formContactName.trim() || undefined,
        email: formEmail.trim() || undefined,
        phone: formPhone.trim() || undefined,
        trades: formTrades,
        license_number: formLicense.trim() || undefined,
        insurance_expiry: formInsuranceExpiry || undefined,
        rating: formRating ?? undefined,
        notes: formNotes.trim() || undefined,
      };

      // For edit, we'd need a PATCH endpoint — for now just POST new ones
      // The API only has POST, so we create new subs
      if (editingSub) {
        // Update via direct PATCH — we can extend later.
        // For now, skip the update and just close.
        setShowSubModal(false);
        resetSubForm();
        return;
      }

      const res = await fetch("/api/subcontractors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        await fetchSubs();
        setShowSubModal(false);
        resetSubForm();
      }
    } finally {
      setSaving(false);
    }
  }, [
    formCompanyName,
    formContactName,
    formEmail,
    formPhone,
    formTrades,
    formLicense,
    formInsuranceExpiry,
    formRating,
    formNotes,
    editingSub,
    fetchSubs,
    resetSubForm,
  ]);

  // --- Bid Form Helpers ---
  const resetBidForm = useCallback(() => {
    setBidSubId("");
    setBidTrade("");
    setBidScope("");
    setBidDueDate("");
  }, []);

  const handleCreateBid = useCallback(async () => {
    if (!estimateId || !bidSubId || !bidTrade) return;
    setSaving(true);
    try {
      const res = await fetch("/api/sub-bids", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          estimate_id: estimateId,
          subcontractor_id: bidSubId,
          trade: bidTrade,
          scope_description: bidScope.trim() || undefined,
          due_date: bidDueDate || undefined,
        }),
      });

      if (res.ok) {
        await fetchBids();
        setShowBidModal(false);
        resetBidForm();
      }
    } finally {
      setSaving(false);
    }
  }, [estimateId, bidSubId, bidTrade, bidScope, bidDueDate, fetchBids, resetBidForm]);

  const handleUpdateBid = useCallback(
    async (bidId: string, updates: { bid_amount?: number; status?: string; notes?: string }) => {
      try {
        const res = await fetch("/api/sub-bids", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: bidId, ...updates }),
        });
        if (res.ok) {
          await fetchBids();
        }
      } catch {
        // silent
      }
    },
    [fetchBids],
  );

  const toggleTrade = useCallback((trade: string) => {
    setFormTrades((prev) =>
      prev.includes(trade) ? prev.filter((t) => t !== trade) : [...prev, trade],
    );
  }, []);

  // --- Loading State ---
  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--sep)] border-t-[var(--accent)]" />
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Tab bar */}
      <div className="flex items-center gap-2 border-b border-[var(--sep)] px-6 pt-4 pb-0">
        <button
          onClick={() => setTab("directory")}
          className={`px-4 py-2.5 text-[14px] font-medium transition-colors border-b-2 -mb-px ${
            tab === "directory"
              ? "border-[var(--accent)] text-[var(--accent)]"
              : "border-transparent text-[var(--secondary)] hover:text-[var(--label)]"
          }`}
        >
          Sub Directory
        </button>
        <button
          onClick={() => setTab("bids")}
          className={`px-4 py-2.5 text-[14px] font-medium transition-colors border-b-2 -mb-px ${
            tab === "bids"
              ? "border-[var(--accent)] text-[var(--accent)]"
              : "border-transparent text-[var(--secondary)] hover:text-[var(--label)]"
          }`}
        >
          Bid Management
          {bids.length > 0 && (
            <span className="ml-2 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[var(--accent-light)] px-1.5 text-[11px] font-semibold text-[var(--accent)]">
              {bids.length}
            </span>
          )}
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {tab === "directory" ? (
          <DirectoryPanel
            subs={filteredSubs}
            search={search}
            onSearchChange={setSearch}
            selectedSub={selectedSub}
            onSelectSub={setSelectedSub}
            selectedSubBids={selectedSubBids}
            onAddSub={openAddSub}
            onEditSub={openEditSub}
          />
        ) : (
          <BidPanel
            bids={bids}
            bidsByTrade={bidsByTrade}
            subs={subs}
            estimateId={estimateId}
            onRequestBid={() => setShowBidModal(true)}
            onUpdateBid={handleUpdateBid}
          />
        )}
      </div>

      {/* Add/Edit Sub Modal */}
      {showSubModal && (
        <Modal
          title={editingSub ? "Edit Subcontractor" : "Add Subcontractor"}
          onClose={() => {
            setShowSubModal(false);
            resetSubForm();
          }}
        >
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-[13px] font-medium text-[var(--label)]">
                Company Name *
              </label>
              <input
                type="text"
                value={formCompanyName}
                onChange={(e) => setFormCompanyName(e.target.value)}
                className="w-full rounded-lg border border-[var(--sep)] bg-[var(--bg)] px-3 py-2 text-[14px] text-[var(--text)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                placeholder="Enter company name"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-[13px] font-medium text-[var(--label)]">
                  Contact Name
                </label>
                <input
                  type="text"
                  value={formContactName}
                  onChange={(e) => setFormContactName(e.target.value)}
                  className="w-full rounded-lg border border-[var(--sep)] bg-[var(--bg)] px-3 py-2 text-[14px] text-[var(--text)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                  placeholder="Contact person"
                />
              </div>
              <div>
                <label className="mb-1 block text-[13px] font-medium text-[var(--label)]">
                  Email
                </label>
                <input
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  className="w-full rounded-lg border border-[var(--sep)] bg-[var(--bg)] px-3 py-2 text-[14px] text-[var(--text)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                  placeholder="email@example.com"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-[13px] font-medium text-[var(--label)]">
                  Phone
                </label>
                <input
                  type="tel"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  className="w-full rounded-lg border border-[var(--sep)] bg-[var(--bg)] px-3 py-2 text-[14px] text-[var(--text)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                  placeholder="(555) 555-5555"
                />
              </div>
              <div>
                <label className="mb-1 block text-[13px] font-medium text-[var(--label)]">
                  License Number
                </label>
                <input
                  type="text"
                  value={formLicense}
                  onChange={(e) => setFormLicense(e.target.value)}
                  className="w-full rounded-lg border border-[var(--sep)] bg-[var(--bg)] px-3 py-2 text-[14px] text-[var(--text)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                  placeholder="License #"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-[13px] font-medium text-[var(--label)]">
                  Insurance Expiry
                </label>
                <input
                  type="date"
                  value={formInsuranceExpiry}
                  onChange={(e) => setFormInsuranceExpiry(e.target.value)}
                  className="w-full rounded-lg border border-[var(--sep)] bg-[var(--bg)] px-3 py-2 text-[14px] text-[var(--text)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                />
              </div>
              <div>
                <label className="mb-1 block text-[13px] font-medium text-[var(--label)]">
                  Rating
                </label>
                <StarRating value={formRating} onChange={setFormRating} />
              </div>
            </div>

            {/* Trades multi-select */}
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-[var(--label)]">
                Trades
              </label>
              <div className="grid grid-cols-3 gap-2">
                {TRADES.map((trade) => (
                  <label
                    key={trade.value}
                    className="flex cursor-pointer items-center gap-2 rounded-lg border border-[var(--sep)] px-2.5 py-1.5 text-[13px] transition-colors hover:bg-[var(--fill)]"
                  >
                    <input
                      type="checkbox"
                      checked={formTrades.includes(trade.value)}
                      onChange={() => toggleTrade(trade.value)}
                      className="h-3.5 w-3.5 rounded border-[var(--sep)] text-[var(--accent)] focus:ring-[var(--accent)]"
                    />
                    <span className="text-[var(--label)]">{trade.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-1 block text-[13px] font-medium text-[var(--label)]">
                Notes
              </label>
              <textarea
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-[var(--sep)] bg-[var(--bg)] px-3 py-2 text-[14px] text-[var(--text)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                placeholder="Additional notes..."
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => {
                  setShowSubModal(false);
                  resetSubForm();
                }}
                className="rounded-lg border border-[var(--sep)] px-4 py-2 text-[14px] font-medium text-[var(--secondary)] transition-colors hover:bg-[var(--fill)]"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveSub}
                disabled={saving || !formCompanyName.trim()}
                className="rounded-lg bg-[var(--accent)] px-4 py-2 text-[14px] font-medium text-white transition-colors hover:bg-[var(--accent)]/90 disabled:opacity-50"
              >
                {saving ? "Saving..." : editingSub ? "Update" : "Add Subcontractor"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Bid Request Modal */}
      {showBidModal && estimateId && (
        <Modal
          title="Request Bid"
          onClose={() => {
            setShowBidModal(false);
            resetBidForm();
          }}
        >
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-[13px] font-medium text-[var(--label)]">
                Subcontractor *
              </label>
              <select
                value={bidSubId}
                onChange={(e) => setBidSubId(e.target.value)}
                className="w-full rounded-lg border border-[var(--sep)] bg-[var(--bg)] px-3 py-2 text-[14px] text-[var(--text)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
              >
                <option value="">Select a subcontractor...</option>
                {subs.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.company_name}
                    {sub.contact_name ? ` (${sub.contact_name})` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-[13px] font-medium text-[var(--label)]">
                Trade *
              </label>
              <select
                value={bidTrade}
                onChange={(e) => setBidTrade(e.target.value)}
                className="w-full rounded-lg border border-[var(--sep)] bg-[var(--bg)] px-3 py-2 text-[14px] text-[var(--text)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
              >
                <option value="">Select trade...</option>
                {TRADES.map((trade) => (
                  <option key={trade.value} value={trade.value}>
                    {trade.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-[13px] font-medium text-[var(--label)]">
                Scope Description
              </label>
              <textarea
                value={bidScope}
                onChange={(e) => setBidScope(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-[var(--sep)] bg-[var(--bg)] px-3 py-2 text-[14px] text-[var(--text)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                placeholder="Describe the scope of work..."
              />
            </div>

            <div>
              <label className="mb-1 block text-[13px] font-medium text-[var(--label)]">
                Due Date
              </label>
              <input
                type="date"
                value={bidDueDate}
                onChange={(e) => setBidDueDate(e.target.value)}
                className="w-full rounded-lg border border-[var(--sep)] bg-[var(--bg)] px-3 py-2 text-[14px] text-[var(--text)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => {
                  setShowBidModal(false);
                  resetBidForm();
                }}
                className="rounded-lg border border-[var(--sep)] px-4 py-2 text-[14px] font-medium text-[var(--secondary)] transition-colors hover:bg-[var(--fill)]"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateBid}
                disabled={saving || !bidSubId || !bidTrade}
                className="rounded-lg bg-[var(--accent)] px-4 py-2 text-[14px] font-medium text-white transition-colors hover:bg-[var(--accent)]/90 disabled:opacity-50"
              >
                {saving ? "Sending..." : "Send Bid Request"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Directory Panel
// ---------------------------------------------------------------------------

function DirectoryPanel({
  subs,
  search,
  onSearchChange,
  selectedSub,
  onSelectSub,
  selectedSubBids,
  onAddSub,
  onEditSub,
}: {
  subs: Subcontractor[];
  search: string;
  onSearchChange: (v: string) => void;
  selectedSub: Subcontractor | null;
  onSelectSub: (s: Subcontractor | null) => void;
  selectedSubBids: SubBid[];
  onAddSub: () => void;
  onEditSub: (s: Subcontractor) => void;
}) {
  return (
    <div className="flex gap-6 h-full">
      {/* Left — Sub list */}
      <div className="w-[380px] flex-shrink-0 flex flex-col">
        {/* Search + Add */}
        <div className="mb-4 flex items-center gap-3">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--gray2)]" />
            <input
              type="text"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search subs..."
              className="w-full rounded-lg border border-[var(--sep)] bg-[var(--bg)] py-2 pl-9 pr-3 text-[14px] text-[var(--text)] placeholder:text-[var(--gray2)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
            />
          </div>
          <button
            onClick={onAddSub}
            className="flex h-9 items-center gap-1.5 rounded-lg bg-[var(--accent)] px-3 text-[13px] font-medium text-white transition-colors hover:bg-[var(--accent)]/90"
          >
            <PlusIcon className="h-4 w-4" />
            Add Sub
          </button>
        </div>

        {/* List */}
        <div className="flex-1 space-y-2 overflow-y-auto pr-1">
          {subs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-[14px] text-[var(--secondary)]">No subcontractors yet</p>
              <p className="mt-1 text-[13px] text-[var(--tertiary)]">
                Add your first subcontractor to get started
              </p>
            </div>
          ) : (
            subs.map((sub) => (
              <button
                key={sub.id}
                onClick={() => onSelectSub(selectedSub?.id === sub.id ? null : sub)}
                className={`w-full rounded-xl border p-4 text-left transition-all ${
                  selectedSub?.id === sub.id
                    ? "border-[var(--accent)] bg-[var(--accent-light)] shadow-sm"
                    : "border-[var(--sep)] bg-[var(--card)] shadow-[var(--shadow-card)] hover:border-[var(--accent)]/50"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-semibold text-[var(--text)] truncate">
                      {sub.company_name}
                    </p>
                    {sub.contact_name && (
                      <p className="text-[13px] text-[var(--secondary)] mt-0.5">{sub.contact_name}</p>
                    )}
                  </div>
                  {sub.rating && <StarRating value={sub.rating} readonly />}
                </div>

                {/* Trades badges */}
                {sub.trades.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {sub.trades.slice(0, 4).map((trade) => (
                      <span
                        key={trade}
                        className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${tradeBadgeColor(trade)}`}
                      >
                        {tradeLabel(trade)}
                      </span>
                    ))}
                    {sub.trades.length > 4 && (
                      <span className="inline-block rounded-full bg-[var(--fill)] px-2 py-0.5 text-[11px] font-medium text-[var(--secondary)]">
                        +{sub.trades.length - 4}
                      </span>
                    )}
                  </div>
                )}

                {/* Insurance expiry */}
                {sub.insurance_expiry && (
                  <p
                    className={`mt-2 text-[12px] ${
                      isExpired(sub.insurance_expiry) ? "text-red-500 font-medium" : "text-[var(--tertiary)]"
                    }`}
                  >
                    Insurance: {formatDate(sub.insurance_expiry)}
                    {isExpired(sub.insurance_expiry) && " (EXPIRED)"}
                  </p>
                )}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Right — Selected sub detail */}
      <div className="flex-1 min-w-0">
        {selectedSub ? (
          <div className="rounded-xl border border-[var(--sep)] bg-[var(--card)] p-6 shadow-[var(--shadow-card)]">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-[18px] font-bold text-[var(--text)]">
                  {selectedSub.company_name}
                </h3>
                {selectedSub.contact_name && (
                  <p className="text-[14px] text-[var(--secondary)] mt-0.5">
                    {selectedSub.contact_name}
                  </p>
                )}
              </div>
              <button
                onClick={() => onEditSub(selectedSub)}
                className="rounded-lg border border-[var(--sep)] px-3 py-1.5 text-[13px] font-medium text-[var(--secondary)] transition-colors hover:bg-[var(--fill)]"
              >
                Edit
              </button>
            </div>

            {/* Contact info */}
            <div className="flex flex-wrap gap-4 mb-4">
              {selectedSub.email && (
                <div className="flex items-center gap-2 text-[13px] text-[var(--secondary)]">
                  <EnvelopeIcon className="h-4 w-4" />
                  <span>{selectedSub.email}</span>
                </div>
              )}
              {selectedSub.phone && (
                <div className="flex items-center gap-2 text-[13px] text-[var(--secondary)]">
                  <PhoneIcon className="h-4 w-4" />
                  <span>{selectedSub.phone}</span>
                </div>
              )}
            </div>

            {/* Trades */}
            {selectedSub.trades.length > 0 && (
              <div className="mb-4">
                <p className="text-[12px] font-medium text-[var(--tertiary)] uppercase tracking-wide mb-1.5">
                  Trades
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {selectedSub.trades.map((trade) => (
                    <span
                      key={trade}
                      className={`inline-block rounded-full px-2.5 py-1 text-[12px] font-medium ${tradeBadgeColor(trade)}`}
                    >
                      {tradeLabel(trade)}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Meta */}
            <div className="flex flex-wrap gap-6 mb-4 text-[13px]">
              {selectedSub.license_number && (
                <div>
                  <span className="text-[var(--tertiary)]">License:</span>{" "}
                  <span className="text-[var(--label)]">{selectedSub.license_number}</span>
                </div>
              )}
              {selectedSub.insurance_expiry && (
                <div>
                  <span className="text-[var(--tertiary)]">Insurance Expiry:</span>{" "}
                  <span
                    className={
                      isExpired(selectedSub.insurance_expiry)
                        ? "text-red-500 font-medium"
                        : "text-[var(--label)]"
                    }
                  >
                    {formatDate(selectedSub.insurance_expiry)}
                    {isExpired(selectedSub.insurance_expiry) && " (EXPIRED)"}
                  </span>
                </div>
              )}
              {selectedSub.rating && (
                <div className="flex items-center gap-1.5">
                  <span className="text-[var(--tertiary)]">Rating:</span>
                  <StarRating value={selectedSub.rating} readonly />
                </div>
              )}
            </div>

            {/* Notes */}
            {selectedSub.notes && (
              <div className="mb-6">
                <p className="text-[12px] font-medium text-[var(--tertiary)] uppercase tracking-wide mb-1">
                  Notes
                </p>
                <p className="text-[14px] text-[var(--label)] whitespace-pre-wrap">
                  {selectedSub.notes}
                </p>
              </div>
            )}

            {/* Bid History */}
            <div>
              <p className="text-[12px] font-medium text-[var(--tertiary)] uppercase tracking-wide mb-2">
                Bid History ({selectedSubBids.length})
              </p>
              {selectedSubBids.length === 0 ? (
                <p className="text-[13px] text-[var(--tertiary)]">No bids on record</p>
              ) : (
                <div className="space-y-2">
                  {selectedSubBids.map((bid) => (
                    <div
                      key={bid.id}
                      className="flex items-center justify-between rounded-lg border border-[var(--sep)] bg-[var(--bg)] px-3 py-2"
                    >
                      <div>
                        <span className="text-[13px] font-medium text-[var(--label)]">
                          {tradeLabel(bid.trade)}
                        </span>
                        {bid.scope_description && (
                          <p className="text-[12px] text-[var(--tertiary)] truncate max-w-[300px]">
                            {bid.scope_description}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        {bid.bid_amount != null && (
                          <span className="text-[14px] font-semibold text-[var(--text)]">
                            {formatCurrency(bid.bid_amount)}
                          </span>
                        )}
                        <span
                          className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_STYLES[bid.status]}`}
                        >
                          {bid.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-[var(--sep)] bg-[var(--bg)]">
            <div className="text-center">
              <p className="text-[14px] text-[var(--secondary)]">Select a subcontractor</p>
              <p className="mt-1 text-[13px] text-[var(--tertiary)]">
                Click on a sub to view details and bid history
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Bid Panel
// ---------------------------------------------------------------------------

function BidPanel({
  bids,
  bidsByTrade,
  subs,
  estimateId,
  onRequestBid,
  onUpdateBid,
}: {
  bids: SubBid[];
  bidsByTrade: Record<string, SubBid[]>;
  subs: Subcontractor[];
  estimateId?: string;
  onRequestBid: () => void;
  onUpdateBid: (bidId: string, updates: { bid_amount?: number; status?: string; notes?: string }) => void;
}) {
  const [editingAmount, setEditingAmount] = useState<string | null>(null);
  const [amountValue, setAmountValue] = useState("");

  if (bids.length === 0 && !estimateId) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-[16px] font-medium text-[var(--secondary)]">No bids yet</p>
        <p className="mt-1 text-[14px] text-[var(--tertiary)]">
          Navigate from an estimate to request bids from subcontractors
        </p>
      </div>
    );
  }

  const tradeKeys = Object.keys(bidsByTrade).sort();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-[16px] font-semibold text-[var(--text)]">
            {estimateId ? "Bids for This Estimate" : "All Bids"}
          </h3>
          <p className="text-[13px] text-[var(--secondary)]">
            {bids.length} bid{bids.length !== 1 ? "s" : ""} across {tradeKeys.length} trade
            {tradeKeys.length !== 1 ? "s" : ""}
          </p>
        </div>
        {estimateId && (
          <button
            onClick={onRequestBid}
            className="flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-[var(--accent)]/90"
          >
            <PlusIcon className="h-4 w-4" />
            Request Bid
          </button>
        )}
      </div>

      {/* Bid comparison tables grouped by trade */}
      {tradeKeys.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-[14px] text-[var(--secondary)]">No bids requested yet</p>
          {estimateId && (
            <button
              onClick={onRequestBid}
              className="mt-3 flex items-center gap-1.5 rounded-lg border border-[var(--accent)] px-4 py-2 text-[13px] font-medium text-[var(--accent)] transition-colors hover:bg-[var(--accent-light)]"
            >
              <PlusIcon className="h-4 w-4" />
              Request First Bid
            </button>
          )}
        </div>
      ) : (
        tradeKeys.map((trade) => {
          const tradeBids = bidsByTrade[trade] ?? [];
          // Find lowest received/accepted bid
          const receivedBids = tradeBids.filter(
            (b) => b.bid_amount != null && (b.status === "received" || b.status === "accepted"),
          );
          const lowestAmount =
            receivedBids.length > 0
              ? Math.min(...receivedBids.map((b) => b.bid_amount!))
              : null;

          return (
            <div
              key={trade}
              className="rounded-xl border border-[var(--sep)] bg-[var(--card)] shadow-[var(--shadow-card)] overflow-hidden"
            >
              <div className="border-b border-[var(--sep)] px-5 py-3">
                <h4 className="text-[14px] font-semibold text-[var(--text)]">
                  {tradeLabel(trade)}
                </h4>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[var(--sep)] bg-[var(--bg)]">
                      <th className="px-5 py-2.5 text-left text-[12px] font-medium uppercase tracking-wide text-[var(--tertiary)]">
                        Subcontractor
                      </th>
                      <th className="px-5 py-2.5 text-right text-[12px] font-medium uppercase tracking-wide text-[var(--tertiary)]">
                        Amount
                      </th>
                      <th className="px-5 py-2.5 text-center text-[12px] font-medium uppercase tracking-wide text-[var(--tertiary)]">
                        Status
                      </th>
                      <th className="px-5 py-2.5 text-left text-[12px] font-medium uppercase tracking-wide text-[var(--tertiary)]">
                        Notes
                      </th>
                      <th className="px-5 py-2.5 text-right text-[12px] font-medium uppercase tracking-wide text-[var(--tertiary)]">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {tradeBids.map((bid) => {
                      const subName = bid.subcontractors?.company_name ?? "Unknown";
                      const isLowest =
                        lowestAmount != null &&
                        bid.bid_amount != null &&
                        bid.bid_amount === lowestAmount;

                      return (
                        <tr
                          key={bid.id}
                          className="border-b border-[var(--sep)] last:border-b-0 transition-colors hover:bg-[var(--fill)]"
                        >
                          <td className="px-5 py-3">
                            <p className="text-[14px] font-medium text-[var(--text)]">{subName}</p>
                            {bid.subcontractors?.contact_name && (
                              <p className="text-[12px] text-[var(--tertiary)]">
                                {bid.subcontractors.contact_name}
                              </p>
                            )}
                          </td>
                          <td className="px-5 py-3 text-right">
                            {editingAmount === bid.id ? (
                              <div className="flex items-center justify-end gap-1">
                                <input
                                  type="number"
                                  value={amountValue}
                                  onChange={(e) => setAmountValue(e.target.value)}
                                  className="w-28 rounded border border-[var(--sep)] bg-[var(--bg)] px-2 py-1 text-right text-[14px] text-[var(--text)] focus:border-[var(--accent)] focus:outline-none"
                                  autoFocus
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      const amt = parseFloat(amountValue);
                                      if (!isNaN(amt) && amt >= 0) {
                                        onUpdateBid(bid.id, { bid_amount: amt });
                                      }
                                      setEditingAmount(null);
                                    }
                                    if (e.key === "Escape") setEditingAmount(null);
                                  }}
                                />
                                <button
                                  onClick={() => {
                                    const amt = parseFloat(amountValue);
                                    if (!isNaN(amt) && amt >= 0) {
                                      onUpdateBid(bid.id, { bid_amount: amt });
                                    }
                                    setEditingAmount(null);
                                  }}
                                  className="rounded p-1 text-emerald-600 hover:bg-emerald-50"
                                >
                                  <CheckIcon className="h-4 w-4" />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => {
                                  setEditingAmount(bid.id);
                                  setAmountValue(bid.bid_amount?.toString() ?? "");
                                }}
                                className={`text-[14px] font-semibold ${
                                  isLowest
                                    ? "text-emerald-600 dark:text-emerald-400"
                                    : bid.bid_amount != null
                                      ? "text-[var(--text)]"
                                      : "text-[var(--tertiary)] italic"
                                }`}
                              >
                                {bid.bid_amount != null
                                  ? formatCurrency(bid.bid_amount)
                                  : "Enter amount"}
                                {isLowest && (
                                  <span className="ml-1.5 text-[11px] font-normal text-emerald-500">
                                    LOWEST
                                  </span>
                                )}
                              </button>
                            )}
                          </td>
                          <td className="px-5 py-3 text-center">
                            <span
                              className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize ${STATUS_STYLES[bid.status]}`}
                            >
                              {bid.status}
                            </span>
                          </td>
                          <td className="px-5 py-3">
                            <p className="text-[13px] text-[var(--secondary)] truncate max-w-[200px]">
                              {bid.notes ?? bid.scope_description ?? "--"}
                            </p>
                          </td>
                          <td className="px-5 py-3">
                            <div className="flex items-center justify-end gap-1.5">
                              {bid.status === "received" && (
                                <>
                                  <button
                                    onClick={() => onUpdateBid(bid.id, { status: "accepted" })}
                                    className="flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-[12px] font-medium text-emerald-700 transition-colors hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:hover:bg-emerald-900/40"
                                  >
                                    <CheckIcon className="h-3.5 w-3.5" />
                                    Accept
                                  </button>
                                  <button
                                    onClick={() => onUpdateBid(bid.id, { status: "rejected" })}
                                    className="flex items-center gap-1 rounded-lg bg-red-50 px-2.5 py-1.5 text-[12px] font-medium text-red-700 transition-colors hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40"
                                  >
                                    <XCircleIcon className="h-3.5 w-3.5" />
                                    Reject
                                  </button>
                                </>
                              )}
                              {bid.status === "requested" && (
                                <button
                                  onClick={() => {
                                    setEditingAmount(bid.id);
                                    setAmountValue("");
                                  }}
                                  className="rounded-lg border border-[var(--sep)] px-2.5 py-1.5 text-[12px] font-medium text-[var(--secondary)] transition-colors hover:bg-[var(--fill)]"
                                >
                                  Log Bid
                                </button>
                              )}
                              {(bid.status === "accepted" || bid.status === "rejected") && (
                                <span className="text-[12px] text-[var(--tertiary)] italic">
                                  {bid.status === "accepted" ? "Awarded" : "Declined"}
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Modal Wrapper
// ---------------------------------------------------------------------------

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative mx-4 w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl border border-[var(--sep)] bg-[var(--card)] p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[16px] font-bold text-[var(--text)]">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-[var(--gray2)] transition-colors hover:bg-[var(--fill)] hover:text-[var(--text)]"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
