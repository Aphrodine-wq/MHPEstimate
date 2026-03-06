# Estimate Editor, Dashboard & Settings Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a full line-item estimate editor modal, enhance the Dashboard with activity feed and quote of the day, and expand Settings with editable company/estimate/notification/integration tabs.

**Architecture:** All data flows through existing Supabase realtime hooks. The estimate editor uses the existing `estimate_line_items` table and `EstimateLineItem` type. Activity feed is derived from realtime subscriptions on existing tables (no new table needed). Settings uses the existing `company_settings` key-value table.

**Tech Stack:** React, Tailwind CSS, Supabase JS client, existing `useTableSync` realtime hook pattern

---

### Task 1: Add `useLineItems` and `useCompanySettings` hooks to store.ts

**Files:**
- Modify: `apps/desktop/src/renderer/src/lib/store.ts`

**Step 1: Add useLineItems hook**

Add after the `useInvoices` function (~line 106):

```typescript
export function useLineItems(estimateId: string | null) {
  const [data, setData] = useState<EstimateLineItem[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!supabase || !estimateId) { setData([]); setLoading(false); return; }
    setLoading(true);
    const { data: rows } = await supabase
      .from("estimate_line_items")
      .select("*")
      .eq("estimate_id", estimateId)
      .order("line_number");
    setData((rows as EstimateLineItem[]) ?? []);
    setLoading(false);
  }, [estimateId]);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    if (!supabase || !estimateId) return;
    const channel = supabase
      .channel(`sync-line-items-${estimateId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "estimate_line_items", filter: `estimate_id=eq.${estimateId}` },
        () => { refresh(); }
      )
      .subscribe();
    return () => { supabase!.removeChannel(channel); };
  }, [estimateId, refresh]);

  return { data, loading, refresh };
}
```

**Step 2: Add useCompanySettings hook**

Add after `useLineItems`:

```typescript
export function useCompanySettings() {
  const [data, setData] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!supabase) { setLoading(false); return; }
    setLoading(true);
    const { data: rows } = await supabase
      .from("company_settings")
      .select("*");
    const map: Record<string, any> = {};
    (rows ?? []).forEach((r: any) => { map[r.key] = r.value; });
    setData(map);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    if (!supabase) return;
    const channel = supabase
      .channel("sync-company-settings")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "company_settings" },
        () => { refresh(); }
      )
      .subscribe();
    return () => { supabase!.removeChannel(channel); };
  }, [refresh]);

  return { data, loading, refresh };
}

export async function upsertSetting(key: string, value: any) {
  if (!supabase) return;
  await supabase.from("company_settings").upsert(
    { key, value, updated_at: new Date().toISOString() },
    { onConflict: "key" }
  );
}
```

**Step 3: Add useActivityFeed hook**

Add after `useCompanySettings`. This derives recent activity from existing tables via realtime:

```typescript
export interface ActivityEntry {
  id: string;
  type: "estimate" | "client" | "invoice" | "call";
  action: string;
  description: string;
  timestamp: string;
}

export function useActivityFeed() {
  const { data: estimates } = useEstimates();
  const { data: clients } = useClients();
  const { data: invoices } = useInvoices();

  const entries: ActivityEntry[] = [
    ...estimates.slice(0, 10).map((e) => ({
      id: `est-${e.id}`,
      type: "estimate" as const,
      action: e.status === "draft" ? "created" : e.status,
      description: `${e.estimate_number} — ${e.project_type}`,
      timestamp: e.updated_at,
    })),
    ...clients.slice(0, 5).map((c) => ({
      id: `cli-${c.id}`,
      type: "client" as const,
      action: "added",
      description: c.full_name,
      timestamp: c.created_at,
    })),
    ...invoices.slice(0, 5).map((inv) => ({
      id: `inv-${inv.id}`,
      type: "invoice" as const,
      action: inv.status,
      description: inv.supplier_name ?? `Invoice ${inv.invoice_number ?? ""}`,
      timestamp: inv.created_at,
    })),
  ];

  entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  return entries.slice(0, 15);
}
```

**Step 4: Update imports**

Add `EstimateLineItem` to the import at the top of store.ts:

```typescript
import type {
  Estimate,
  Client,
  Product,
  Invoice,
  VoiceCall,
  TeamMember,
  EstimateLineItem,
} from "@proestimate/shared/types";
```

**Step 5: Verify**

Run: `cd apps/desktop && npx tsc --noEmit`
Expected: No errors

**Step 6: Commit**

```bash
git add apps/desktop/src/renderer/src/lib/store.ts
git commit -m "feat: add useLineItems, useCompanySettings, useActivityFeed hooks"
```

---

### Task 2: Build the Estimate Editor Modal

**Files:**
- Create: `apps/desktop/src/renderer/src/components/EstimateEditorModal.tsx`

**Step 1: Create the estimate editor modal component**

This is a wide (960px) modal with:
- Header: estimate number, status, project type, address, client, tier
- Tabbed line items: Materials, Labor, Subcontractors
- Editable table rows with add/remove
- Auto-calculating summary footer
- Save Draft / Save & Send actions

```typescript
import { useState, useEffect, useMemo } from "react";
import { Modal, Field, inputClass, selectClass, textareaClass } from "./Modal";
import { supabase } from "../lib/supabase";
import { useLineItems, useClients } from "../lib/store";
import type { Estimate, EstimateLineItem } from "@proestimate/shared/types";

interface EstimateEditorModalProps {
  open: boolean;
  onClose: () => void;
  estimate: Estimate | null;
}

interface DraftLine {
  _key: string;
  id?: string;
  category: string;
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
}

const TABS = ["Materials", "Labor", "Subcontractors"] as const;
type Tab = typeof TABS[number];
const TAB_CATEGORY: Record<Tab, string> = {
  Materials: "material",
  Labor: "labor",
  Subcontractors: "subcontractor",
};

const UNITS = ["sq ft", "lin ft", "each", "bundle", "gallon", "sheet", "box", "roll", "bag", "ton", "hour", "day", "lot"];

let keyCounter = 0;
function nextKey() { return `draft-${++keyCounter}`; }

export function EstimateEditorModal({ open, onClose, estimate }: EstimateEditorModalProps) {
  const { data: existingLines } = useLineItems(estimate?.id ?? null);
  const { data: clients } = useClients();

  // Header fields
  const [projectType, setProjectType] = useState("General");
  const [address, setAddress] = useState("");
  const [clientId, setClientId] = useState("");
  const [tier, setTier] = useState<"good" | "better" | "best">("better");
  const [siteConditions, setSiteConditions] = useState("");
  const [scopeInclusions, setScopeInclusions] = useState("");
  const [scopeExclusions, setScopeExclusions] = useState("");
  const [validThrough, setValidThrough] = useState("");

  // Financials (non-line-item)
  const [permitsFees, setPermitsFees] = useState(0);
  const [overheadPct, setOverheadPct] = useState(15);
  const [contingencyPct, setContingencyPct] = useState(10);
  const [taxPct, setTaxPct] = useState(8.25);

  // Line items
  const [lines, setLines] = useState<DraftLine[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>("Materials");
  const [saving, setSaving] = useState(false);

  // Sync from estimate when opened
  useEffect(() => {
    if (!estimate || !open) return;
    setProjectType(estimate.project_type);
    setAddress(estimate.project_address ?? "");
    setClientId(estimate.client_id ?? "");
    setTier(estimate.tier);
    setSiteConditions(estimate.site_conditions ?? "");
    setScopeInclusions((estimate.scope_inclusions ?? []).join("\n"));
    setScopeExclusions((estimate.scope_exclusions ?? []).join("\n"));
    setValidThrough(estimate.valid_through ?? "");
    setPermitsFees(Number(estimate.permits_fees));

    // Derive percentages from existing values if grand_total > 0
    const gt = Number(estimate.grand_total);
    if (gt > 0) {
      setOverheadPct(Number(estimate.overhead_profit) > 0 ? Math.round(Number(estimate.overhead_profit) / gt * 100) : 15);
      setContingencyPct(Number(estimate.contingency) > 0 ? Math.round(Number(estimate.contingency) / gt * 100) : 10);
      setTaxPct(Number(estimate.tax) > 0 ? Math.round(Number(estimate.tax) / gt * 10000) / 100 : 8.25);
    }
  }, [estimate, open]);

  // Sync existing line items
  useEffect(() => {
    if (!open) return;
    if (existingLines.length > 0) {
      setLines(existingLines.map((li) => ({
        _key: nextKey(),
        id: li.id,
        category: li.category,
        description: li.description,
        quantity: Number(li.quantity ?? 0),
        unit: li.unit ?? "each",
        unit_price: Number(li.unit_price ?? 0),
      })));
    } else if (lines.length === 0) {
      // Start with one empty row per tab
      setLines([
        { _key: nextKey(), category: "material", description: "", quantity: 1, unit: "each", unit_price: 0 },
      ]);
    }
  }, [existingLines, open]);

  // Filtered lines for active tab
  const tabCategory = TAB_CATEGORY[activeTab];
  const tabLines = lines.filter((l) => l.category === tabCategory);

  // Calculations
  const lineTotal = (l: DraftLine) => l.quantity * l.unit_price;

  const materialsTotal = useMemo(
    () => lines.filter((l) => l.category === "material").reduce((s, l) => s + lineTotal(l), 0),
    [lines]
  );
  const laborTotal = useMemo(
    () => lines.filter((l) => l.category === "labor").reduce((s, l) => s + lineTotal(l), 0),
    [lines]
  );
  const subTotal = useMemo(
    () => lines.filter((l) => l.category === "subcontractor").reduce((s, l) => s + lineTotal(l), 0),
    [lines]
  );
  const subtotal = materialsTotal + laborTotal + subTotal + permitsFees;
  const overheadAmt = subtotal * (overheadPct / 100);
  const contingencyAmt = subtotal * (contingencyPct / 100);
  const preTotal = subtotal + overheadAmt + contingencyAmt;
  const taxAmt = preTotal * (taxPct / 100);
  const grandTotal = preTotal + taxAmt;
  const costBasis = materialsTotal + laborTotal + subTotal;
  const grossMargin = grandTotal > 0 ? ((grandTotal - costBasis) / grandTotal) * 100 : 0;

  const updateLine = (key: string, field: keyof DraftLine, value: string | number) => {
    setLines((prev) => prev.map((l) => l._key === key ? { ...l, [field]: value } : l));
  };

  const addLine = () => {
    setLines((prev) => [...prev, {
      _key: nextKey(),
      category: tabCategory,
      description: "",
      quantity: 1,
      unit: tabCategory === "labor" ? "hour" : "each",
      unit_price: 0,
    }]);
  };

  const removeLine = (key: string) => {
    setLines((prev) => prev.filter((l) => l._key !== key));
  };

  const handleSave = async (sendAfter = false) => {
    if (!supabase || !estimate) return;
    setSaving(true);

    // Update estimate header
    await supabase.from("estimates").update({
      project_type: projectType,
      project_address: address || null,
      client_id: clientId || null,
      tier,
      site_conditions: siteConditions || null,
      scope_inclusions: scopeInclusions ? scopeInclusions.split("\n").filter(Boolean) : [],
      scope_exclusions: scopeExclusions ? scopeExclusions.split("\n").filter(Boolean) : [],
      valid_through: validThrough || null,
      materials_subtotal: materialsTotal,
      labor_subtotal: laborTotal,
      subcontractor_total: subTotal,
      permits_fees: permitsFees,
      overhead_profit: overheadAmt,
      contingency: contingencyAmt,
      tax: taxAmt,
      grand_total: grandTotal,
      gross_margin_pct: Math.round(grossMargin * 100) / 100,
      status: sendAfter ? "sent" : estimate.status,
      sent_at: sendAfter ? new Date().toISOString() : estimate.sent_at,
      updated_at: new Date().toISOString(),
    }).eq("id", estimate.id);

    // Delete existing line items and re-insert
    await supabase.from("estimate_line_items").delete().eq("estimate_id", estimate.id);

    const lineInserts = lines
      .filter((l) => l.description.trim())
      .map((l, i) => ({
        estimate_id: estimate.id,
        line_number: i + 1,
        category: l.category,
        description: l.description,
        quantity: l.quantity,
        unit: l.unit,
        unit_price: l.unit_price,
        extended_price: l.quantity * l.unit_price,
      }));

    if (lineInserts.length > 0) {
      await supabase.from("estimate_line_items").insert(lineInserts);
    }

    setSaving(false);
    onClose();
  };

  if (!estimate) return null;

  return (
    <Modal open={open} onClose={onClose} title={`${estimate.estimate_number}`} description="Edit estimate details and line items" width="w-[960px]">
      <div className="max-h-[calc(85vh-180px)] overflow-y-auto">
        {/* Header fields */}
        <div className="border-b border-[var(--sep)] px-6 py-4">
          <div className="grid grid-cols-3 gap-3">
            <Field label="Project Type">
              <select value={projectType} onChange={(e) => setProjectType(e.target.value)} className={selectClass}>
                {["General","Kitchen Remodel","Bathroom Remodel","Flooring","Roofing","Painting","Siding","Deck / Patio","Addition","Full Renovation"].map((t) => <option key={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Client">
              <select value={clientId} onChange={(e) => setClientId(e.target.value)} className={selectClass}>
                <option value="">— No client —</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.full_name}</option>)}
              </select>
            </Field>
            <Field label="Pricing Tier">
              <div className="flex rounded-lg bg-[var(--gray5)] p-0.5">
                {(["good", "better", "best"] as const).map((t) => (
                  <button key={t} onClick={() => setTier(t)} className={`flex-1 rounded-md py-1.5 text-[12px] font-medium capitalize transition-all ${tier === t ? "bg-[var(--card)] text-[var(--label)] shadow-sm" : "text-[var(--secondary)]"}`}>
                    {t}
                  </button>
                ))}
              </div>
            </Field>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <Field label="Project Address">
              <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="123 Main St, City, State" className={inputClass} />
            </Field>
            <Field label="Valid Through">
              <input type="date" value={validThrough} onChange={(e) => setValidThrough(e.target.value)} className={inputClass} />
            </Field>
          </div>
        </div>

        {/* Line Items */}
        <div className="px-6 py-4">
          {/* Tabs */}
          <div className="mb-3 flex items-center justify-between">
            <div className="flex rounded-lg bg-[var(--gray5)] p-0.5">
              {TABS.map((tab) => {
                const count = lines.filter((l) => l.category === TAB_CATEGORY[tab]).length;
                return (
                  <button key={tab} onClick={() => setActiveTab(tab)} className={`rounded-md px-3 py-1.5 text-[12px] font-medium transition-all ${activeTab === tab ? "bg-[var(--card)] text-[var(--label)] shadow-sm" : "text-[var(--secondary)]"}`}>
                    {tab} {count > 0 && <span className="ml-1 text-[10px] opacity-60">({count})</span>}
                  </button>
                );
              })}
            </div>
            <button onClick={addLine} className="rounded-lg bg-[var(--accent)]/10 px-3 py-1.5 text-[12px] font-medium text-[var(--accent)] transition-colors hover:bg-[var(--accent)]/20">
              + Add Row
            </button>
          </div>

          {/* Table */}
          <div className="rounded-xl border border-[var(--sep)] bg-[var(--card)] overflow-hidden">
            {/* Table header */}
            <div className="grid grid-cols-[1fr_80px_90px_100px_100px_36px] gap-px bg-[var(--sep)]">
              <div className="bg-[var(--bg)] px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-[var(--secondary)]">Description</div>
              <div className="bg-[var(--bg)] px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-[var(--secondary)]">Qty</div>
              <div className="bg-[var(--bg)] px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-[var(--secondary)]">Unit</div>
              <div className="bg-[var(--bg)] px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-[var(--secondary)]">Price</div>
              <div className="bg-[var(--bg)] px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-[var(--secondary)] text-right">Total</div>
              <div className="bg-[var(--bg)] px-1 py-2" />
            </div>

            {/* Rows */}
            {tabLines.length === 0 ? (
              <div className="px-4 py-8 text-center text-[12px] text-[var(--secondary)]">
                No {activeTab.toLowerCase()} line items yet. Click "+ Add Row" to begin.
              </div>
            ) : (
              tabLines.map((line) => (
                <div key={line._key} className="grid grid-cols-[1fr_80px_90px_100px_100px_36px] gap-px border-t border-[var(--sep)]">
                  <div className="px-1 py-1">
                    <input
                      value={line.description}
                      onChange={(e) => updateLine(line._key, "description", e.target.value)}
                      placeholder={activeTab === "Materials" ? "e.g. LVP Flooring 7mm" : activeTab === "Labor" ? "e.g. Demo & prep" : "e.g. Plumbing rough-in"}
                      className="w-full border-0 bg-transparent px-2 py-1.5 text-[13px] outline-none placeholder:text-[var(--gray3)]"
                    />
                  </div>
                  <div className="px-1 py-1">
                    <input
                      type="number"
                      value={line.quantity || ""}
                      onChange={(e) => updateLine(line._key, "quantity", parseFloat(e.target.value) || 0)}
                      className="w-full border-0 bg-transparent px-2 py-1.5 text-[13px] text-right outline-none"
                    />
                  </div>
                  <div className="px-1 py-1">
                    <select
                      value={line.unit}
                      onChange={(e) => updateLine(line._key, "unit", e.target.value)}
                      className="w-full border-0 bg-transparent px-1 py-1.5 text-[12px] outline-none"
                    >
                      {UNITS.map((u) => <option key={u}>{u}</option>)}
                    </select>
                  </div>
                  <div className="px-1 py-1">
                    <input
                      type="number"
                      step="0.01"
                      value={line.unit_price || ""}
                      onChange={(e) => updateLine(line._key, "unit_price", parseFloat(e.target.value) || 0)}
                      className="w-full border-0 bg-transparent px-2 py-1.5 text-[13px] text-right outline-none"
                    />
                  </div>
                  <div className="flex items-center justify-end px-3 text-[13px] font-medium">
                    ${lineTotal(line).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div className="flex items-center justify-center">
                    <button onClick={() => removeLine(line._key)} className="rounded p-1 text-[var(--gray2)] transition-colors hover:bg-[var(--red)]/10 hover:text-[var(--red)]">
                      <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Summary */}
        <div className="border-t border-[var(--sep)] px-6 py-4">
          <div className="grid grid-cols-2 gap-6">
            {/* Left: additional fields */}
            <div className="space-y-3">
              <Field label="Site Conditions">
                <textarea value={siteConditions} onChange={(e) => setSiteConditions(e.target.value)} placeholder="Any special conditions..." rows={2} className={textareaClass} />
              </Field>
              <Field label="Scope Inclusions (one per line)">
                <textarea value={scopeInclusions} onChange={(e) => setScopeInclusions(e.target.value)} placeholder="Material supply and installation..." rows={2} className={textareaClass} />
              </Field>
              <Field label="Scope Exclusions (one per line)">
                <textarea value={scopeExclusions} onChange={(e) => setScopeExclusions(e.target.value)} placeholder="Structural modifications..." rows={2} className={textareaClass} />
              </Field>
            </div>

            {/* Right: financial summary */}
            <div>
              <div className="rounded-xl border border-[var(--sep)] bg-[var(--bg)] divide-y divide-[var(--sep)]">
                <SummaryRow label="Materials" value={materialsTotal} />
                <SummaryRow label="Labor" value={laborTotal} />
                <SummaryRow label="Subcontractors" value={subTotal} />
                <div className="flex items-center gap-2 px-3 py-2">
                  <p className="flex-1 text-[12px] text-[var(--secondary)]">Permits & Fees</p>
                  <span className="text-[12px] text-[var(--secondary)]">$</span>
                  <input
                    type="number"
                    step="0.01"
                    value={permitsFees || ""}
                    onChange={(e) => setPermitsFees(parseFloat(e.target.value) || 0)}
                    className="w-20 border-0 bg-transparent text-right text-[12px] font-medium outline-none"
                  />
                </div>
                <div className="flex items-center gap-2 px-3 py-2">
                  <p className="flex-1 text-[12px] text-[var(--secondary)]">Overhead & Profit</p>
                  <input
                    type="number"
                    value={overheadPct || ""}
                    onChange={(e) => setOverheadPct(parseFloat(e.target.value) || 0)}
                    className="w-12 border-0 bg-transparent text-right text-[12px] outline-none"
                  />
                  <span className="text-[11px] text-[var(--secondary)]">%</span>
                  <p className="w-20 text-right text-[12px] font-medium">${overheadAmt.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
                </div>
                <div className="flex items-center gap-2 px-3 py-2">
                  <p className="flex-1 text-[12px] text-[var(--secondary)]">Contingency</p>
                  <input
                    type="number"
                    value={contingencyPct || ""}
                    onChange={(e) => setContingencyPct(parseFloat(e.target.value) || 0)}
                    className="w-12 border-0 bg-transparent text-right text-[12px] outline-none"
                  />
                  <span className="text-[11px] text-[var(--secondary)]">%</span>
                  <p className="w-20 text-right text-[12px] font-medium">${contingencyAmt.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
                </div>
                <div className="flex items-center gap-2 px-3 py-2">
                  <p className="flex-1 text-[12px] text-[var(--secondary)]">Tax</p>
                  <input
                    type="number"
                    step="0.01"
                    value={taxPct || ""}
                    onChange={(e) => setTaxPct(parseFloat(e.target.value) || 0)}
                    className="w-12 border-0 bg-transparent text-right text-[12px] outline-none"
                  />
                  <span className="text-[11px] text-[var(--secondary)]">%</span>
                  <p className="w-20 text-right text-[12px] font-medium">${taxAmt.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
                </div>
                <div className="flex items-center justify-between px-3 py-3 bg-[var(--card)]">
                  <p className="text-[13px] font-bold">Grand Total</p>
                  <p className="text-[16px] font-bold">${grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                </div>
                <div className="flex items-center justify-between px-3 py-2">
                  <p className="text-[11px] text-[var(--secondary)]">Gross Margin</p>
                  <p className={`text-[12px] font-semibold ${grossMargin >= 35 ? "text-[var(--green)]" : grossMargin >= 25 ? "text-[var(--orange)]" : "text-[var(--red)]"}`}>
                    {grossMargin.toFixed(1)}%
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer actions */}
      <div className="flex items-center justify-between border-t border-[var(--sep)] px-6 py-3">
        <p className="text-[11px] text-[var(--tertiary)]">
          {lines.filter((l) => l.description.trim()).length} line items
        </p>
        <div className="flex gap-2">
          <button onClick={onClose} className="rounded-lg border border-[var(--sep)] px-4 py-2 text-[13px] font-medium transition-colors hover:bg-[var(--bg)]">Cancel</button>
          <button onClick={() => handleSave(false)} disabled={saving} className="rounded-lg border border-[var(--sep)] bg-[var(--card)] px-4 py-2 text-[13px] font-medium transition-all hover:bg-[var(--bg)] disabled:opacity-50">
            {saving ? "Saving…" : "Save Draft"}
          </button>
          <button onClick={() => handleSave(true)} disabled={saving} className="rounded-lg bg-[var(--accent)] px-4 py-2 text-[13px] font-medium text-white transition-all active:scale-[0.97] disabled:opacity-50">
            {saving ? "Saving…" : "Save & Send"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function SummaryRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between px-3 py-2">
      <p className="text-[12px] text-[var(--secondary)]">{label}</p>
      <p className="text-[12px] font-medium">${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
    </div>
  );
}
```

**Step 2: Verify**

Run: `cd apps/desktop && npx tsc --noEmit`

**Step 3: Commit**

```bash
git add apps/desktop/src/renderer/src/components/EstimateEditorModal.tsx
git commit -m "feat: add full line-item estimate editor modal"
```

---

### Task 3: Wire Estimate Editor into App.tsx and EstimatesList

**Files:**
- Modify: `apps/desktop/src/renderer/src/App.tsx`
- Modify: `apps/desktop/src/renderer/src/components/EstimatesList.tsx`
- Modify: `apps/desktop/src/renderer/src/components/FormModals.tsx`

**Step 1: Update App.tsx**

Add modal type for editing, import EstimateEditorModal, render it:

At line 14, add import:
```typescript
import { EstimateEditorModal } from "./components/EstimateEditorModal";
```

Update ModalType at line 17:
```typescript
type ModalType = null | "new-estimate" | "add-client" | "add-product" | "upload-invoice" | "edit-profile" | "edit-estimate";
```

Add state for the estimate being edited (after line 35):
```typescript
const [editingEstimate, setEditingEstimate] = useState<any>(null);
```

Add a handler to open the editor (after openCall):
```typescript
const openEstimateEditor = useCallback((estimate: any) => {
  setEditingEstimate(estimate);
  setModal("edit-estimate");
}, []);
```

Update the Page component to pass the editor opener (line 49):
```typescript
<Page onNavigate={setActive} onCallAlex={openCall} onModal={(m) => setModal(m as ModalType)} onEditEstimate={openEstimateEditor} />
```

Add the EstimateEditorModal after existing modals (before `</>`):
```typescript
<EstimateEditorModal
  open={modal === "edit-estimate"}
  onClose={() => { setModal(null); setEditingEstimate(null); }}
  estimate={editingEstimate}
/>
```

**Step 2: Update NewEstimateModal to open editor after creation**

In FormModals.tsx, update `NewEstimateModal` to accept `onEditEstimate` prop and call it after creating:

```typescript
interface NewEstimateModalProps {
  open: boolean;
  onClose: () => void;
  onCreated?: (estimate: any) => void;
}
```

Update handleSubmit to pass the created estimate:
```typescript
const handleSubmit = async () => {
  setSaving(true);
  const est = await createEstimate();
  if (est && supabase) {
    await supabase.from("estimates").update({
      project_type: projectType,
      project_address: address || null,
      tier,
      site_conditions: notes || null,
    }).eq("id", est.id);
  }
  setSaving(false);
  resetAndClose();
  if (est) onCreated?.(est);
};
```

**Step 3: Update App.tsx NewEstimateModal usage**

Wire `onCreated` to open the editor:
```typescript
<NewEstimateModal
  open={modal === "new-estimate"}
  onClose={() => setModal(null)}
  onCreated={(est) => { openEstimateEditor(est); }}
/>
```

**Step 4: Update EstimatesList to support editing**

Add `onEditEstimate` prop and wire "Open Estimate" button in DetailPanel.

Update EstimatesList props:
```typescript
export function EstimatesList({ onModal, onEditEstimate }: {
  onNavigate?: (page: string) => void;
  onCallAlex?: () => void;
  onModal?: (m: string) => void;
  onEditEstimate?: (estimate: Estimate) => void;
}) {
```

In DetailPanel, wire the "Open Estimate" button (line 191):
```typescript
<button onClick={() => onEditEstimate?.(estimate)} className="w-full rounded-lg bg-[var(--accent)] py-2.5 text-[13px] font-medium text-white transition-all active:scale-[0.99]">
  Open Estimate
</button>
```

Also update the pages Record type in App.tsx to include `onEditEstimate`:
```typescript
const pages: Record<string, React.FC<{
  onNavigate?: (page: string) => void;
  onCallAlex?: () => void;
  onModal?: (m: string) => void;
  onEditEstimate?: (estimate: any) => void;
}>> = { ... };
```

**Step 5: Verify**

Run: `cd apps/desktop && npx tsc --noEmit`

**Step 6: Commit**

```bash
git add apps/desktop/src/renderer/src/App.tsx apps/desktop/src/renderer/src/components/EstimatesList.tsx apps/desktop/src/renderer/src/components/FormModals.tsx
git commit -m "feat: wire estimate editor into app — create opens editor, estimates list has edit button"
```

---

### Task 4: Enhance Dashboard — Activity Feed & Quote of the Day

**Files:**
- Modify: `apps/desktop/src/renderer/src/components/Dashboard.tsx`

**Step 1: Rewrite Dashboard.tsx**

Replace the existing Dashboard with an enhanced layout:
- Keep KPI cards (4-column grid)
- Replace right column with: Quote of the Day card + Activity Feed
- Keep Recent Estimates list (left column)
- Keep Quick Actions but move below Recent Estimates
- Add Pipeline breakdown as a row below KPIs

Key additions:

**Quote of the Day array** (construction/business themed):
```typescript
const QUOTES = [
  { text: "The bitterness of poor quality remains long after the sweetness of low price is forgotten.", author: "Benjamin Franklin" },
  { text: "Quality means doing it right when no one is looking.", author: "Henry Ford" },
  { text: "Measure twice, cut once.", author: "Proverb" },
  // ... ~30 more
];
const todayQuote = QUOTES[Math.floor(Date.now() / 86400000) % QUOTES.length];
```

**Activity Feed component** using `useActivityFeed()`:
```typescript
function ActivityFeed() {
  const entries = useActivityFeed();
  // renders list with icons per type, relative timestamps
}
```

**Relative time helper:**
```typescript
function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}
```

The new layout:
```
┌─────────────────────────────────────────────┐
│  Dashboard Header + Date + Status           │
├──────┬──────┬──────┬──────┬─────────────────┤
│ KPI  │ KPI  │ KPI  │ KPI  │                 │
├──────┴──────┴──────┴──────┤  Quote of Day   │
│                           │                 │
│  Recent Estimates (8)     ├─────────────────┤
│                           │                 │
│                           │  Activity Feed  │
│                           │  (15 entries)   │
├───────────────────────────┤                 │
│  Quick Actions + Pipeline │                 │
└───────────────────────────┴─────────────────┘
```

**Step 2: Verify**

Run: `cd apps/desktop && npx tsc --noEmit`

**Step 3: Commit**

```bash
git add apps/desktop/src/renderer/src/components/Dashboard.tsx
git commit -m "feat: enhance dashboard with activity feed, quote of the day, improved layout"
```

---

### Task 5: Expand Settings Page with Editable Tabs

**Files:**
- Modify: `apps/desktop/src/renderer/src/components/SettingsPage.tsx`

**Step 1: Rewrite SettingsPage with tabbed layout**

Replace the current static settings with 4 tabs backed by `useCompanySettings()` and `upsertSetting()`:

**Tabs:**
1. **Company** — company name, license #, phone, email, address (editable inline)
2. **Estimates** — default tier, markup %, contingency %, tax rate, valid-for days, payment terms, warranty text, scope templates
3. **Notifications** — toggle switches for email alerts (estimate accepted, expiring, invoice processed), in-app notifications
4. **Integrations** — Supabase connection status, ElevenLabs agent ID display, future placeholders

Each setting saves immediately on change via `upsertSetting()`. Toggles are instant. Text fields save on blur.

Layout:
```
┌──────────────────────────────────────┐
│  Settings                            │
│  Company | Estimates | Notif | Integ │
├──────────────────────────────────────┤
│                                      │
│  [Active tab content]                │
│  - Editable rows with save on blur   │
│  - Toggles save immediately          │
│                                      │
└──────────────────────────────────────┘
```

**Step 2: Verify**

Run: `cd apps/desktop && npx tsc --noEmit`

**Step 3: Commit**

```bash
git add apps/desktop/src/renderer/src/components/SettingsPage.tsx
git commit -m "feat: expand settings with company, estimates, notifications, integrations tabs"
```

---

### Task 6: Enable realtime on company_settings

**Files:**
- Create: `supabase/migrations/00004_settings_realtime.sql`

**Step 1: Add migration**

```sql
-- Enable realtime for company_settings so settings sync across clients
ALTER PUBLICATION supabase_realtime ADD TABLE company_settings;
ALTER TABLE company_settings REPLICA IDENTITY FULL;
```

**Step 2: Commit**

```bash
git add supabase/migrations/00004_settings_realtime.sql
git commit -m "feat: enable realtime on company_settings table"
```

---

### Task 7: Final integration verification

**Step 1: Type check**

Run: `cd apps/desktop && npx tsc --noEmit`

**Step 2: Dev server check**

Run: `pnpm dev:desktop` and verify:
- New Estimate button opens creation modal → after creation opens the editor modal
- Estimate editor shows line items, calculates totals live
- "Open Estimate" button in EstimatesList detail panel opens editor
- Dashboard shows activity feed with real data, quote of the day
- Settings has 4 tabs, editable fields save to Supabase
- All data updates in realtime

**Step 3: Final commit if any fixes needed**
