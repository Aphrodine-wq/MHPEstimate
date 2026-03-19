import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "../lib/supabase";
import { DEMO_MODE, demoEstimates, demoClients } from "../lib/demo-data";
import { EmptyState } from "./EmptyState";
import {
  DocumentTextIcon,
  PrinterIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";

interface Estimate {
  id: string;
  estimate_number: string;
  client_id: string | null;
  project_type: string;
  project_address: string | null;
  status: string;
  scope_inclusions: string[];
  scope_exclusions: string[];
  materials_subtotal: number;
  labor_subtotal: number;
  subcontractor_total: number;
  permits_fees: number;
  overhead_profit: number;
  contingency: number;
  tax: number;
  grand_total: number;
  estimated_start: string | null;
  estimated_end: string | null;
  valid_through: string | null;
  tier: string;
  created_at: string;
}

interface LineItem {
  id: string;
  estimate_id: string;
  line_number: number;
  category: string;
  description: string;
  quantity: number | null;
  unit: string | null;
  unit_price: number | null;
  extended_price: number | null;
}

interface Client {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  address_line1: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
}

function fmtMoney(n: number | null): string {
  if (n == null) return "--";
  return `$${Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function ProposalPage() {
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  const demoEst = DEMO_MODE ? demoEstimates as unknown as Estimate[] : [];
  const demoCli = DEMO_MODE ? demoClients.map((c) => ({
    id: c.id, full_name: c.full_name, email: c.email, phone: c.phone,
    address_line1: c.address_line1, city: c.city, state: c.state, zip: c.zip,
  })) as Client[] : [];

  const refresh = useCallback(async () => {
    if (!supabase) {
      if (DEMO_MODE) {
        setEstimates(demoEst);
        setClients(demoCli);
      }
      setLoading(false);
      return;
    }
    setLoading(true);
    const [{ data: estData }, { data: cliData }] = await Promise.all([
      supabase.from("estimates").select("*").order("created_at", { ascending: false }),
      supabase.from("clients").select("id, full_name, email, phone, address_line1, city, state, zip"),
    ]);
    const fetchedEst = (estData as Estimate[]) ?? [];
    const fetchedCli = (cliData as Client[]) ?? [];
    setEstimates(fetchedEst.length > 0 || !DEMO_MODE ? fetchedEst : demoEst);
    setClients(fetchedCli.length > 0 || !DEMO_MODE ? fetchedCli : demoCli);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  // Load line items when estimate is selected
  useEffect(() => {
    if (!supabase || !selectedId) { setLineItems([]); return; }
    supabase
      .from("estimate_line_items")
      .select("*")
      .eq("estimate_id", selectedId)
      .order("line_number", { ascending: true })
      .then(({ data }) => {
        setLineItems((data as LineItem[]) ?? []);
      });
  }, [selectedId]);

  const estimate = selectedId ? estimates.find((e) => e.id === selectedId) : null;
  const client = estimate?.client_id ? clients.find((c) => c.id === estimate.client_id) : null;

  const groupedItems = useMemo(() => {
    const groups: Record<string, LineItem[]> = {};
    for (const item of lineItems) {
      if (!groups[item.category]) groups[item.category] = [];
      groups[item.category]!.push(item);
    }
    return groups;
  }, [lineItems]);

  const handlePrint = () => {
    window.print();
  };

  if (!supabase) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-[14px] text-[var(--secondary)]">Supabase not configured</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto animate-page-enter">
      <header className="flex items-center justify-between px-8 pt-4 pb-1">
        <div className="flex items-center gap-3">
          <div>
            <label className="text-[11px] font-medium text-[var(--secondary)] mr-2">Estimate:</label>
            <select
              value={selectedId ?? ""}
              onChange={(e) => setSelectedId(e.target.value || null)}
              className="rounded-lg border border-[var(--sep)] bg-[var(--card)] px-3 py-1.5 text-[12px] outline-none focus:border-[var(--accent)]"
            >
              <option value="">Select an estimate...</option>
              {estimates.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.estimate_number} - {e.project_type} ({e.status})
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={refresh} className="rounded-lg border border-[var(--sep)] p-1.5 transition-colors hover:bg-[var(--bg)]">
            <ArrowPathIcon className="h-3.5 w-3.5 text-[var(--secondary)]" />
          </button>
          {estimate && (
            <button onClick={handlePrint} className="flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-3.5 py-1.5 text-[12px] font-semibold text-white shadow-sm shadow-[var(--accent)]/20 transition-all hover:brightness-110 active:scale-[0.98]">
              <PrinterIcon className="h-3.5 w-3.5" />
              Export PDF
            </button>
          )}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-8 py-4 pb-8">
        {loading ? (
          <div className="rounded-xl bg-[var(--card)] p-8 shadow-[var(--shadow-card)] space-y-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-4 animate-skeleton rounded bg-[var(--gray5)]" style={{ width: `${60 + Math.random() * 30}%` }} />
            ))}
          </div>
        ) : !estimate ? (
          <EmptyState
            title="Select an estimate"
            description="Choose an estimate from the dropdown above to generate a proposal preview"
          />
        ) : (
          /* Proposal Preview */
          <div className="mx-auto max-w-[800px] rounded-xl bg-white shadow-lg print:shadow-none print:rounded-none">
            {/* Header */}
            <div className="border-b border-gray-200 px-10 py-8">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-[24px] font-bold text-gray-900">Proposal</h1>
                  <p className="text-[14px] text-gray-500 mt-1">{estimate.estimate_number}</p>
                </div>
                <div className="text-right">
                  <p className="text-[12px] text-gray-500">Date: {new Date(estimate.created_at).toLocaleDateString()}</p>
                  {estimate.valid_through && (
                    <p className="text-[12px] text-gray-500">Valid Through: {new Date(estimate.valid_through).toLocaleDateString()}</p>
                  )}
                  <p className="text-[12px] text-gray-500 capitalize mt-1">{estimate.project_type}</p>
                </div>
              </div>

              {client && (
                <div className="mt-4 rounded-lg bg-gray-50 p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-1">Prepared For</p>
                  <p className="text-[14px] font-semibold text-gray-900">{client.full_name}</p>
                  {client.email && <p className="text-[12px] text-gray-600">{client.email}</p>}
                  {client.phone && <p className="text-[12px] text-gray-600">{client.phone}</p>}
                  {client.address_line1 && (
                    <p className="text-[12px] text-gray-600">{client.address_line1}{client.city ? `, ${client.city}` : ""}{client.state ? `, ${client.state}` : ""} {client.zip ?? ""}</p>
                  )}
                </div>
              )}

              {estimate.project_address && (
                <div className="mt-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-1">Project Location</p>
                  <p className="text-[13px] text-gray-700">{estimate.project_address}</p>
                </div>
              )}
            </div>

            {/* Scope */}
            {(estimate.scope_inclusions.length > 0 || estimate.scope_exclusions.length > 0) && (
              <div className="border-b border-gray-200 px-10 py-6">
                <h2 className="text-[16px] font-bold text-gray-900 mb-3">Scope of Work</h2>
                {estimate.scope_inclusions.length > 0 && (
                  <div className="mb-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-1">Inclusions</p>
                    <ul className="space-y-1">
                      {estimate.scope_inclusions.map((item, idx) => (
                        <li key={idx} className="text-[12px] text-gray-700 flex items-start gap-2">
                          <span className="text-green-600 mt-0.5 flex-shrink-0">&#x2713;</span>
                          {String(item)}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {estimate.scope_exclusions.length > 0 && (
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-1">Exclusions</p>
                    <ul className="space-y-1">
                      {estimate.scope_exclusions.map((item, idx) => (
                        <li key={idx} className="text-[12px] text-gray-700 flex items-start gap-2">
                          <span className="text-red-600 mt-0.5 flex-shrink-0">&#x2717;</span>
                          {String(item)}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Line Items by Category */}
            <div className="border-b border-gray-200 px-10 py-6">
              <h2 className="text-[16px] font-bold text-gray-900 mb-4">Estimate Breakdown</h2>
              {Object.keys(groupedItems).length === 0 ? (
                <p className="text-[12px] text-gray-500">No line items found</p>
              ) : (
                <div className="space-y-4">
                  {Object.entries(groupedItems).map(([category, catItems]) => {
                    const catTotal = catItems.reduce((s, item) => s + Number(item.extended_price ?? 0), 0);
                    return (
                      <div key={category}>
                        <div className="flex items-center justify-between mb-1.5">
                          <p className="text-[12px] font-semibold text-gray-900 uppercase tracking-wide">{category}</p>
                          <p className="text-[12px] font-semibold text-gray-700">{fmtMoney(catTotal)}</p>
                        </div>
                        <div className="rounded-lg border border-gray-200 overflow-hidden">
                          <table className="w-full text-[11px]">
                            <thead>
                              <tr className="bg-gray-50 text-gray-500">
                                <th className="text-left font-medium px-3 py-1.5">Description</th>
                                <th className="text-right font-medium px-3 py-1.5 w-16">Qty</th>
                                <th className="text-right font-medium px-3 py-1.5 w-16">Unit</th>
                                <th className="text-right font-medium px-3 py-1.5 w-20">Price</th>
                                <th className="text-right font-medium px-3 py-1.5 w-24">Total</th>
                              </tr>
                            </thead>
                            <tbody>
                              {catItems.map((item) => (
                                <tr key={item.id} className="border-t border-gray-100">
                                  <td className="px-3 py-1.5 text-gray-700">{item.description}</td>
                                  <td className="px-3 py-1.5 text-right text-gray-600">{item.quantity ?? "--"}</td>
                                  <td className="px-3 py-1.5 text-right text-gray-600">{item.unit ?? "--"}</td>
                                  <td className="px-3 py-1.5 text-right text-gray-600">{fmtMoney(item.unit_price)}</td>
                                  <td className="px-3 py-1.5 text-right font-medium text-gray-900">{fmtMoney(item.extended_price)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Totals */}
              <div className="mt-6 border-t border-gray-200 pt-4 space-y-1.5">
                <div className="flex justify-between text-[12px]">
                  <span className="text-gray-500">Materials</span>
                  <span className="text-gray-700">{fmtMoney(estimate.materials_subtotal)}</span>
                </div>
                <div className="flex justify-between text-[12px]">
                  <span className="text-gray-500">Labor</span>
                  <span className="text-gray-700">{fmtMoney(estimate.labor_subtotal)}</span>
                </div>
                {Number(estimate.subcontractor_total) > 0 && (
                  <div className="flex justify-between text-[12px]">
                    <span className="text-gray-500">Subcontractors</span>
                    <span className="text-gray-700">{fmtMoney(estimate.subcontractor_total)}</span>
                  </div>
                )}
                {Number(estimate.permits_fees) > 0 && (
                  <div className="flex justify-between text-[12px]">
                    <span className="text-gray-500">Permits &amp; Fees</span>
                    <span className="text-gray-700">{fmtMoney(estimate.permits_fees)}</span>
                  </div>
                )}
                {Number(estimate.overhead_profit) > 0 && (
                  <div className="flex justify-between text-[12px]">
                    <span className="text-gray-500">Overhead &amp; Profit</span>
                    <span className="text-gray-700">{fmtMoney(estimate.overhead_profit)}</span>
                  </div>
                )}
                {Number(estimate.contingency) > 0 && (
                  <div className="flex justify-between text-[12px]">
                    <span className="text-gray-500">Contingency</span>
                    <span className="text-gray-700">{fmtMoney(estimate.contingency)}</span>
                  </div>
                )}
                {Number(estimate.tax) > 0 && (
                  <div className="flex justify-between text-[12px]">
                    <span className="text-gray-500">Tax</span>
                    <span className="text-gray-700">{fmtMoney(estimate.tax)}</span>
                  </div>
                )}
                <div className="flex justify-between text-[14px] font-bold border-t border-gray-300 pt-2 mt-2">
                  <span className="text-gray-900">Total</span>
                  <span className="text-gray-900">{fmtMoney(estimate.grand_total)}</span>
                </div>
              </div>
            </div>

            {/* Timeline */}
            {(estimate.estimated_start || estimate.estimated_end) && (
              <div className="border-b border-gray-200 px-10 py-6">
                <h2 className="text-[16px] font-bold text-gray-900 mb-3">Timeline</h2>
                <div className="flex gap-8">
                  {estimate.estimated_start && (
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Start Date</p>
                      <p className="text-[13px] text-gray-700">{new Date(estimate.estimated_start).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</p>
                    </div>
                  )}
                  {estimate.estimated_end && (
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Completion Date</p>
                      <p className="text-[13px] text-gray-700">{new Date(estimate.estimated_end).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Terms */}
            <div className="px-10 py-6">
              <h2 className="text-[16px] font-bold text-gray-900 mb-3">Terms &amp; Conditions</h2>
              <div className="text-[11px] text-gray-600 space-y-2 leading-relaxed">
                <p>This estimate is valid for 30 days from the date of issue. A 50% deposit is required to begin work. Final payment is due upon completion.</p>
                <p>All work comes with a 1-year warranty on labor. Manufacturer warranties on materials apply separately.</p>
                <p>This estimate does not include work not explicitly listed in the scope of work. Any changes or additions will be documented as change orders and must be approved by both parties before proceeding.</p>
                <p>The contractor reserves the right to adjust the final price if unforeseen site conditions are discovered that materially affect the scope of work.</p>
              </div>
            </div>

            {/* Signature */}
            <div className="border-t border-gray-200 px-10 py-8">
              <div className="grid grid-cols-2 gap-8">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-8">Client Signature</p>
                  <div className="border-b border-gray-400 mb-2" />
                  <p className="text-[11px] text-gray-500">Date: _______________</p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-8">Contractor Signature</p>
                  <div className="border-b border-gray-400 mb-2" />
                  <p className="text-[11px] text-gray-500">Date: _______________</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
