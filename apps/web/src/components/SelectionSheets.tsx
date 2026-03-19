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

interface SelectionOption {
  name: string;
  price: number;
  thumbnail?: string | null;
}

interface SelectionItem {
  id: string;
  sheet_id: string;
  category: string;
  item_name: string;
  room: string | null;
  sort_order: number;
  options: SelectionOption[];
  selected_option: number | null;
  budget_amount: number | null;
  actual_amount: number | null;
  price_impact: number | null;
  client_notes: string | null;
  status: string;
  created_at: string;
}

interface SelectionSheet {
  id: string;
  organization_id: string;
  estimate_id: string;
  name: string;
  status: string;
  due_date: string | null;
  notes: string | null;
  sent_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  selection_items: SelectionItem[];
  estimates?: {
    id: string;
    estimate_number: string;
    project_type: string;
  };
}

interface DraftOption {
  key: string;
  name: string;
  price: string;
}

interface DraftItem {
  key: string;
  category: string;
  item_name: string;
  room: string;
  budget_amount: string;
  options: DraftOption[];
  sort_order: number;
}

interface SelectionSheetsProps {
  estimateId?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SHEET_STATUS_STYLE: Record<string, string> = {
  draft: "bg-[var(--fill)] text-[var(--secondary)]",
  sent: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  in_progress: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  completed: "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  approved: "bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300",
};

const SHEET_STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  sent: "Sent",
  in_progress: "In Progress",
  completed: "Completed",
  approved: "Approved",
};

const SHEET_STATUS_FLOW: Record<string, string[]> = {
  draft: ["sent"],
  sent: ["in_progress"],
  in_progress: ["completed"],
  completed: ["approved"],
  approved: [],
};

const CATEGORIES = [
  "Flooring",
  "Countertops",
  "Fixtures",
  "Paint",
  "Hardware",
  "Appliances",
  "Cabinets",
  "Tile",
  "Lighting",
  "Plumbing Fixtures",
  "Windows & Doors",
  "Other",
];

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
// Main Component
// ---------------------------------------------------------------------------

export function SelectionSheets({ estimateId }: SelectionSheetsProps) {
  const [sheets, setSheets] = useState<SelectionSheet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSheetId, setSelectedSheetId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const { data: estimates } = useEstimates();

  // ── Fetch sheets ──
  const fetchSheets = useCallback(async () => {
    setLoading(true);
    try {
      const url = estimateId
        ? `/api/selections?estimateId=${estimateId}`
        : "/api/selections";
      const res = await fetch(url);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to fetch selection sheets");
      }
      const data = await res.json();
      setSheets(data.selection_sheets ?? []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load selection sheets");
    } finally {
      setLoading(false);
    }
  }, [estimateId]);

  useEffect(() => {
    fetchSheets();
  }, [fetchSheets]);

  const selectedSheet = useMemo(
    () => sheets.find((s) => s.id === selectedSheetId) ?? null,
    [sheets, selectedSheetId],
  );

  // ── Status update ──
  const handleStatusChange = async (sheetId: string, newStatus: string) => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/selections", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: sheetId, status: newStatus }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to update status");
      }
      await fetchSheets();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update status");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Select option ──
  const handleSelectOption = async (
    sheetId: string,
    itemId: string,
    selectedOption: number,
    actualAmount: number,
  ) => {
    try {
      const res = await fetch("/api/selections", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: sheetId,
          select_item: {
            item_id: itemId,
            selected_option: selectedOption,
            actual_amount: actualAmount,
          },
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to update selection");
      }
      await fetchSheets();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update selection");
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

  // ── Sheet Detail View ──
  if (selectedSheet) {
    return (
      <SheetDetailView
        sheet={selectedSheet}
        onBack={() => setSelectedSheetId(null)}
        onStatusChange={handleStatusChange}
        onSelectOption={handleSelectOption}
        onAddItem={() => setShowAddItemModal(true)}
        submitting={submitting}
        error={error}
        onDismissError={() => setError(null)}
        showAddItemModal={showAddItemModal}
        onCloseAddItemModal={() => setShowAddItemModal(false)}
        onItemAdded={() => {
          setShowAddItemModal(false);
          fetchSheets();
        }}
      />
    );
  }

  // ── Sheet List View ──
  return (
    <div className="flex h-full flex-col overflow-y-auto">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-[var(--sep)] px-4 pb-3 pt-4 md:px-8">
        <div>
          <h2 className="text-[15px] font-semibold text-[var(--label)]">Selection Sheets</h2>
          <p className="text-[11px] text-[var(--secondary)]">
            {sheets.length} sheet{sheets.length !== 1 ? "s" : ""} — track client material and finish selections
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="rounded-lg bg-[var(--accent)] px-3 py-2 text-[13px] font-medium text-white shadow-sm transition-all hover:brightness-110 active:scale-[0.98]"
        >
          + New Selection Sheet
        </button>
      </header>

      {/* Error */}
      {error && (
        <div className="mx-4 mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-[12px] text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300 md:mx-8">
          {error}
          <button onClick={() => setError(null)} className="ml-2 font-medium underline">Dismiss</button>
        </div>
      )}

      {/* Sheet Cards */}
      <div className="flex-1 px-4 pb-6 pt-4 md:px-8">
        {sheets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-3 text-[36px] opacity-30">🎨</div>
            <p className="text-[14px] font-medium text-[var(--secondary)]">No selection sheets yet</p>
            <p className="mt-1 text-[12px] text-[var(--gray3)]">Create a sheet to track client material and finish choices</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sheets.map((sheet) => {
              const itemCount = sheet.selection_items?.length ?? 0;
              const selectedCount = (sheet.selection_items ?? []).filter(
                (i) => i.selected_option !== null,
              ).length;
              const totalImpact = (sheet.selection_items ?? []).reduce(
                (s, i) => s + (Number(i.price_impact) || 0),
                0,
              );

              return (
                <button
                  key={sheet.id}
                  onClick={() => setSelectedSheetId(sheet.id)}
                  className="group rounded-xl border border-[var(--sep)] bg-[var(--card)] p-4 text-left transition-all hover:border-[var(--accent)]/40 hover:shadow-md"
                >
                  <div className="flex items-start justify-between">
                    <h3 className="text-[14px] font-semibold text-[var(--label)] group-hover:text-[var(--accent)]">
                      {sheet.name}
                    </h3>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${SHEET_STATUS_STYLE[sheet.status] ?? SHEET_STATUS_STYLE.draft}`}
                    >
                      {SHEET_STATUS_LABEL[sheet.status] ?? sheet.status}
                    </span>
                  </div>
                  <p className="mt-1 text-[12px] text-[var(--secondary)]">
                    {sheet.estimates?.estimate_number ?? "No estimate"} &middot; {sheet.estimates?.project_type ?? ""}
                  </p>
                  <div className="mt-3 flex items-center gap-4 text-[11px] text-[var(--secondary)]">
                    <span>{selectedCount}/{itemCount} selected</span>
                    {sheet.due_date && <span>Due: {formatDate(sheet.due_date)}</span>}
                  </div>
                  {totalImpact !== 0 && (
                    <p className={`mt-2 text-[12px] font-medium ${totalImpact > 0 ? "text-red-600" : "text-green-600"}`}>
                      Price impact: {totalImpact > 0 ? "+" : ""}{formatCurrency(totalImpact)}
                    </p>
                  )}

                  {/* Progress bar */}
                  {itemCount > 0 && (
                    <div className="mt-3">
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--fill)]">
                        <div
                          className="h-full rounded-full bg-[var(--accent)] transition-all"
                          style={{ width: `${(selectedCount / itemCount) * 100}%` }}
                        />
                      </div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <CreateSheetModal
          open={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          estimates={estimates ?? []}
          defaultEstimateId={estimateId}
          onCreated={() => {
            setShowCreateModal(false);
            fetchSheets();
          }}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sheet Detail View
// ---------------------------------------------------------------------------

interface SheetDetailViewProps {
  sheet: SelectionSheet;
  onBack: () => void;
  onStatusChange: (sheetId: string, newStatus: string) => void;
  onSelectOption: (sheetId: string, itemId: string, selectedOption: number, actualAmount: number) => void;
  onAddItem: () => void;
  submitting: boolean;
  error: string | null;
  onDismissError: () => void;
  showAddItemModal: boolean;
  onCloseAddItemModal: () => void;
  onItemAdded: () => void;
}

function SheetDetailView({
  sheet,
  onBack,
  onStatusChange,
  onSelectOption,
  onAddItem,
  submitting,
  error,
  onDismissError,
  showAddItemModal,
  onCloseAddItemModal,
  onItemAdded,
}: SheetDetailViewProps) {
  const nextStatuses = SHEET_STATUS_FLOW[sheet.status] ?? [];

  // Group items by category
  const groupedItems = useMemo(() => {
    const items = [...(sheet.selection_items ?? [])].sort((a, b) => a.sort_order - b.sort_order);
    const groups = new Map<string, SelectionItem[]>();
    for (const item of items) {
      const group = groups.get(item.category) ?? [];
      group.push(item);
      groups.set(item.category, group);
    }
    return groups;
  }, [sheet.selection_items]);

  // Running total of price impacts
  const totalImpact = (sheet.selection_items ?? []).reduce(
    (s, i) => s + (Number(i.price_impact) || 0),
    0,
  );

  const totalBudget = (sheet.selection_items ?? []).reduce(
    (s, i) => s + (Number(i.budget_amount) || 0),
    0,
  );

  const totalActual = (sheet.selection_items ?? [])
    .filter((i) => i.actual_amount != null)
    .reduce((s, i) => s + (Number(i.actual_amount) || 0), 0);

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      {/* Header */}
      <header className="border-b border-[var(--sep)] px-4 pb-3 pt-4 md:px-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="rounded-lg p-1.5 transition-colors hover:bg-[var(--fill)]"
              aria-label="Back to sheets"
            >
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="var(--secondary)" strokeWidth="2" strokeLinecap="round">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h2 className="text-[15px] font-semibold text-[var(--label)]">{sheet.name}</h2>
              <p className="text-[11px] text-[var(--secondary)]">
                {sheet.estimates?.estimate_number} &middot; {sheet.estimates?.project_type}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${SHEET_STATUS_STYLE[sheet.status] ?? SHEET_STATUS_STYLE.draft}`}
            >
              {SHEET_STATUS_LABEL[sheet.status] ?? sheet.status}
            </span>
            {nextStatuses.map((ns) => (
              <button
                key={ns}
                onClick={() => onStatusChange(sheet.id, ns)}
                disabled={submitting}
                className="rounded-lg border border-[var(--sep)] bg-[var(--card)] px-3 py-1.5 text-[12px] font-medium text-[var(--label)] transition-colors hover:bg-[var(--fill)] disabled:opacity-50"
              >
                {SHEET_STATUS_LABEL[ns] ?? ns}
              </button>
            ))}
            <button
              onClick={onAddItem}
              className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-[12px] font-medium text-white transition-all hover:brightness-110 active:scale-[0.98]"
            >
              + Add Item
            </button>
          </div>
        </div>

        {/* Price impact summary */}
        <div className="mt-3 grid grid-cols-3 gap-3">
          <div className="rounded-lg border border-[var(--sep)] bg-[var(--card)] p-2.5 text-center">
            <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--secondary)]">Budget Total</p>
            <p className="text-[15px] font-semibold text-[var(--label)]">{formatCurrency(totalBudget)}</p>
          </div>
          <div className="rounded-lg border border-[var(--sep)] bg-[var(--card)] p-2.5 text-center">
            <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--secondary)]">Actual Total</p>
            <p className="text-[15px] font-semibold text-[var(--label)]">{formatCurrency(totalActual)}</p>
          </div>
          <div className="rounded-lg border border-[var(--sep)] bg-[var(--card)] p-2.5 text-center">
            <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--secondary)]">Price Impact</p>
            <p
              className={`text-[15px] font-semibold ${totalImpact > 0 ? "text-red-600" : totalImpact < 0 ? "text-green-600" : "text-[var(--label)]"}`}
            >
              {totalImpact > 0 ? "+" : ""}{formatCurrency(totalImpact)}
            </p>
          </div>
        </div>
      </header>

      {/* Error */}
      {error && (
        <div className="mx-4 mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-[12px] text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300 md:mx-8">
          {error}
          <button onClick={onDismissError} className="ml-2 font-medium underline">Dismiss</button>
        </div>
      )}

      {/* Categories */}
      <div className="flex-1 px-4 pb-6 pt-4 md:px-8">
        {groupedItems.size === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-[14px] font-medium text-[var(--secondary)]">No items yet</p>
            <p className="mt-1 text-[12px] text-[var(--gray3)]">Add items to this selection sheet</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Array.from(groupedItems.entries()).map(([category, items]) => (
              <div key={category}>
                <h3 className="mb-3 text-[13px] font-semibold uppercase tracking-wider text-[var(--secondary)]">
                  {category}
                </h3>
                <div className="space-y-3">
                  {items.map((item) => (
                    <SelectionItemCard
                      key={item.id}
                      item={item}
                      sheetId={sheet.id}
                      onSelectOption={onSelectOption}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Item Modal */}
      {showAddItemModal && (
        <AddItemModal
          open={showAddItemModal}
          onClose={onCloseAddItemModal}
          sheetId={sheet.id}
          onAdded={onItemAdded}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Selection Item Card
// ---------------------------------------------------------------------------

interface SelectionItemCardProps {
  item: SelectionItem;
  sheetId: string;
  onSelectOption: (sheetId: string, itemId: string, selectedOption: number, actualAmount: number) => void;
}

function SelectionItemCard({ item, sheetId, onSelectOption }: SelectionItemCardProps) {
  const options: SelectionOption[] = Array.isArray(item.options) ? item.options : [];
  const impact = Number(item.price_impact) || 0;

  return (
    <div className="rounded-xl border border-[var(--sep)] bg-[var(--card)] p-4">
      {/* Item header */}
      <div className="mb-3 flex items-start justify-between">
        <div>
          <h4 className="text-[13px] font-semibold text-[var(--label)]">{item.item_name}</h4>
          <div className="mt-0.5 flex items-center gap-3 text-[11px] text-[var(--secondary)]">
            {item.room && <span>Room: {item.room}</span>}
            {item.budget_amount != null && (
              <span>Budget: {formatCurrency(Number(item.budget_amount))}</span>
            )}
          </div>
        </div>
        {item.selected_option !== null && impact !== 0 && (
          <span
            className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${impact > 0 ? "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300" : "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300"}`}
          >
            {impact > 0 ? "+" : ""}{formatCurrency(impact)}
          </span>
        )}
      </div>

      {/* Options grid */}
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {options.map((opt, idx) => {
          const isSelected = item.selected_option === idx;

          return (
            <button
              key={idx}
              onClick={() => onSelectOption(sheetId, item.id, idx, opt.price)}
              className={`group rounded-lg border-2 p-3 text-left transition-all ${
                isSelected
                  ? "border-[var(--accent)] bg-[var(--accent)]/5 shadow-sm"
                  : "border-[var(--sep)] hover:border-[var(--accent)]/30 hover:bg-[var(--fill)]/50"
              }`}
            >
              {/* Thumbnail placeholder */}
              <div
                className={`mb-2 flex h-16 items-center justify-center rounded-md ${
                  isSelected ? "bg-[var(--accent)]/10" : "bg-[var(--fill)]"
                }`}
              >
                <svg
                  width="24"
                  height="24"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke={isSelected ? "var(--accent)" : "var(--gray3)"}
                  strokeWidth="1.5"
                  strokeLinecap="round"
                >
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <path d="m21 15-5-5L5 21" />
                </svg>
              </div>
              <p className={`text-[12px] font-medium ${isSelected ? "text-[var(--accent)]" : "text-[var(--label)]"}`}>
                {opt.name}
              </p>
              <p className="mt-0.5 text-[12px] font-semibold text-[var(--label)]">
                {formatCurrency(opt.price)}
              </p>
              {isSelected && (
                <div className="mt-1.5 flex items-center gap-1">
                  <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                  <span className="text-[10px] font-medium text-[var(--accent)]">Selected</span>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Client notes */}
      {item.client_notes && (
        <p className="mt-2 text-[11px] italic text-[var(--secondary)]">
          Client note: {item.client_notes}
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Create Sheet Modal
// ---------------------------------------------------------------------------

interface CreateSheetModalProps {
  open: boolean;
  onClose: () => void;
  estimates: Array<{ id: string; estimate_number: string; project_type: string }>;
  defaultEstimateId?: string;
  onCreated: () => void;
}

function CreateSheetModal({
  open,
  onClose,
  estimates,
  defaultEstimateId,
  onCreated,
}: CreateSheetModalProps) {
  const [name, setName] = useState("Material Selections");
  const [selectedEstimateId, setSelectedEstimateId] = useState(defaultEstimateId ?? "");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<DraftItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      {
        key: makeKey(),
        category: "Flooring",
        item_name: "",
        room: "",
        budget_amount: "",
        options: [
          { key: makeKey(), name: "", price: "" },
        ],
        sort_order: prev.length,
      },
    ]);
  };

  const removeItem = (key: string) => {
    setItems((prev) => prev.filter((i) => i.key !== key));
  };

  const updateItem = (key: string, field: string, value: string) => {
    setItems((prev) =>
      prev.map((i) => (i.key === key ? { ...i, [field]: value } : i)),
    );
  };

  const addOption = (itemKey: string) => {
    setItems((prev) =>
      prev.map((i) =>
        i.key === itemKey
          ? { ...i, options: [...i.options, { key: makeKey(), name: "", price: "" }] }
          : i,
      ),
    );
  };

  const removeOption = (itemKey: string, optKey: string) => {
    setItems((prev) =>
      prev.map((i) =>
        i.key === itemKey
          ? { ...i, options: i.options.filter((o) => o.key !== optKey) }
          : i,
      ),
    );
  };

  const updateOption = (itemKey: string, optKey: string, field: string, value: string) => {
    setItems((prev) =>
      prev.map((i) =>
        i.key === itemKey
          ? { ...i, options: i.options.map((o) => (o.key === optKey ? { ...o, [field]: value } : o)) }
          : i,
      ),
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !selectedEstimateId) return;

    setSubmitting(true);
    setError(null);

    try {
      const validItems = items
        .filter((i) => i.item_name.trim() && i.options.some((o) => o.name.trim()))
        .map((i) => ({
          category: i.category,
          item_name: i.item_name.trim(),
          room: i.room.trim() || null,
          budget_amount: parseFloat(i.budget_amount) || null,
          options: i.options
            .filter((o) => o.name.trim())
            .map((o) => ({
              name: o.name.trim(),
              price: parseFloat(o.price) || 0,
            })),
          sort_order: i.sort_order,
        }));

      const res = await fetch("/api/selections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          estimate_id: selectedEstimateId,
          name: name.trim(),
          due_date: dueDate || null,
          notes: notes.trim() || null,
          items: validItems.length > 0 ? validItems : undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to create selection sheet");
      }

      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create selection sheet");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New Selection Sheet"
      description="Create a sheet to track client material and finish choices"
      width="w-full max-w-[700px]"
    >
      <form onSubmit={handleSubmit} className="px-6 py-4">
        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
            {error}
          </div>
        )}

        <div className="mb-4 grid grid-cols-2 gap-3">
          <Field label="Sheet Name *">
            <input
              className={inputClass}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Material Selections"
              required
            />
          </Field>
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

        <div className="mb-4 grid grid-cols-2 gap-3">
          <Field label="Due Date">
            <input
              className={inputClass}
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </Field>
          <Field label="Notes">
            <input
              className={inputClass}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any notes for the client..."
            />
          </Field>
        </div>

        {/* Items */}
        <div className="mb-4">
          <div className="mb-2 flex items-center justify-between">
            <label className="text-[12px] font-medium text-[var(--secondary)]">Selection Items (optional)</label>
            <button
              type="button"
              onClick={addItem}
              className="text-[12px] font-medium text-[var(--accent)] transition-colors hover:underline"
            >
              + Add Item
            </button>
          </div>
          <div className="space-y-3">
            {items.map((item) => (
              <div key={item.key} className="rounded-lg border border-[var(--sep)] bg-[var(--fill)]/30 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <select
                      className={`${selectClass} w-36`}
                      value={item.category}
                      onChange={(e) => updateItem(item.key, "category", e.target.value)}
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                    <input
                      className={`${inputClass} flex-1`}
                      value={item.item_name}
                      onChange={(e) => updateItem(item.key, "item_name", e.target.value)}
                      placeholder="Item name"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeItem(item.key)}
                    className="text-[var(--gray3)] transition-colors hover:text-[var(--red)]"
                    aria-label="Remove item"
                  >
                    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="mb-2 grid grid-cols-2 gap-2">
                  <input
                    className={inputClass}
                    value={item.room}
                    onChange={(e) => updateItem(item.key, "room", e.target.value)}
                    placeholder="Room (optional)"
                  />
                  <input
                    className={inputClass}
                    type="number"
                    value={item.budget_amount}
                    onChange={(e) => updateItem(item.key, "budget_amount", e.target.value)}
                    placeholder="Budget amount"
                    min={0}
                    step="0.01"
                  />
                </div>
                {/* Options */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium text-[var(--secondary)]">Options</span>
                    <button
                      type="button"
                      onClick={() => addOption(item.key)}
                      className="text-[11px] text-[var(--accent)] hover:underline"
                    >
                      + Option
                    </button>
                  </div>
                  {item.options.map((opt) => (
                    <div key={opt.key} className="flex items-center gap-2">
                      <input
                        className={`${inputClass} flex-1`}
                        value={opt.name}
                        onChange={(e) => updateOption(item.key, opt.key, "name", e.target.value)}
                        placeholder="Option name"
                      />
                      <input
                        className={`${inputClass} w-24`}
                        type="number"
                        value={opt.price}
                        onChange={(e) => updateOption(item.key, opt.key, "price", e.target.value)}
                        placeholder="Price"
                        min={0}
                        step="0.01"
                      />
                      {item.options.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeOption(item.key, opt.key)}
                          className="text-[var(--gray3)] transition-colors hover:text-[var(--red)]"
                        >
                          <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
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
            disabled={submitting || !name.trim() || !selectedEstimateId}
            className="rounded-lg bg-[var(--accent)] px-4 py-2 text-[13px] font-medium text-white shadow-sm transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
          >
            {submitting ? "Creating..." : "Create Sheet"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Add Item Modal (for existing sheets)
// ---------------------------------------------------------------------------

interface AddItemModalProps {
  open: boolean;
  onClose: () => void;
  sheetId: string;
  onAdded: () => void;
}

function AddItemModal({ open, onClose, sheetId, onAdded }: AddItemModalProps) {
  const [category, setCategory] = useState("Flooring");
  const [itemName, setItemName] = useState("");
  const [room, setRoom] = useState("");
  const [budgetAmount, setBudgetAmount] = useState("");
  const [options, setOptions] = useState<DraftOption[]>([
    { key: makeKey(), name: "", price: "" },
  ]);
  const [sortOrder, setSortOrder] = useState("0");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addOption = () => {
    setOptions((prev) => [...prev, { key: makeKey(), name: "", price: "" }]);
  };

  const removeOption = (key: string) => {
    setOptions((prev) => prev.filter((o) => o.key !== key));
  };

  const updateOption = (key: string, field: string, value: string) => {
    setOptions((prev) =>
      prev.map((o) => (o.key === key ? { ...o, [field]: value } : o)),
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName.trim()) return;

    const validOptions = options.filter((o) => o.name.trim());
    if (validOptions.length === 0) {
      setError("At least one option with a name is required");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/selections", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: sheetId,
          add_items: [
            {
              category,
              item_name: itemName.trim(),
              room: room.trim() || null,
              budget_amount: parseFloat(budgetAmount) || null,
              options: validOptions.map((o) => ({
                name: o.name.trim(),
                price: parseFloat(o.price) || 0,
              })),
              sort_order: parseInt(sortOrder) || 0,
            },
          ],
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to add item");
      }

      onAdded();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add item");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add Selection Item"
      description="Add a new item for client selection"
      width="w-full max-w-[520px]"
    >
      <form onSubmit={handleSubmit} className="px-6 py-4">
        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
            {error}
          </div>
        )}

        <div className="mb-3 grid grid-cols-2 gap-3">
          <Field label="Category *">
            <select
              className={selectClass}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </Field>
          <Field label="Item Name *">
            <input
              className={inputClass}
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              placeholder="e.g., Kitchen Countertop"
              required
            />
          </Field>
        </div>

        <div className="mb-3 grid grid-cols-3 gap-3">
          <Field label="Room">
            <input
              className={inputClass}
              value={room}
              onChange={(e) => setRoom(e.target.value)}
              placeholder="Kitchen"
            />
          </Field>
          <Field label="Budget Amount">
            <input
              className={inputClass}
              type="number"
              value={budgetAmount}
              onChange={(e) => setBudgetAmount(e.target.value)}
              placeholder="0.00"
              min={0}
              step="0.01"
            />
          </Field>
          <Field label="Sort Order">
            <input
              className={inputClass}
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              min={0}
            />
          </Field>
        </div>

        {/* Options */}
        <div className="mb-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[12px] font-medium text-[var(--secondary)]">Options *</span>
            <button
              type="button"
              onClick={addOption}
              className="text-[11px] text-[var(--accent)] hover:underline"
            >
              + Add Option
            </button>
          </div>
          <div className="space-y-2">
            {options.map((opt) => (
              <div key={opt.key} className="flex items-center gap-2">
                <input
                  className={`${inputClass} flex-1`}
                  value={opt.name}
                  onChange={(e) => updateOption(opt.key, "name", e.target.value)}
                  placeholder="Option name"
                />
                <input
                  className={`${inputClass} w-24`}
                  type="number"
                  value={opt.price}
                  onChange={(e) => updateOption(opt.key, "price", e.target.value)}
                  placeholder="Price"
                  min={0}
                  step="0.01"
                />
                {options.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeOption(opt.key)}
                    className="text-[var(--gray3)] transition-colors hover:text-[var(--red)]"
                  >
                    <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

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
            disabled={submitting || !itemName.trim()}
            className="rounded-lg bg-[var(--accent)] px-4 py-2 text-[13px] font-medium text-white shadow-sm transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
          >
            {submitting ? "Adding..." : "Add Item"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
