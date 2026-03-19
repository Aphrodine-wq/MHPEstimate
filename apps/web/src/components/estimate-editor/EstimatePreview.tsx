import type { Estimate, EstimateLineItem, Client } from "@proestimate/shared/types";
import type { CompanyInfo } from "../EstimatePDF";

interface EstimatePreviewProps {
  estimate: Estimate;
  lineItems: EstimateLineItem[];
  client: Client | null;
  company: CompanyInfo;
}

const TIER_LABELS: Record<string, string> = { budget: "Budget", midrange: "Midrange", high_end: "High End", good: "Budget", better: "Midrange", best: "High End" };

function fmt(n: number) { return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

export function EstimatePreview({ estimate, lineItems, client, company }: EstimatePreviewProps) {
  const materialLines = lineItems.filter(l => l.category === "material");
  const laborLines = lineItems.filter(l => l.category === "labor");
  const subLines = lineItems.filter(l => l.category === "subcontractor");

  return (
    <div className="bg-[#fafafa] rounded-xl border border-[var(--sep)] p-6 space-y-5 max-h-[70vh] overflow-y-auto">
      <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--accent)] text-center">Client Preview</p>

      {/* Hero */}
      <div className="bg-white rounded-2xl shadow-sm border border-[#e5e7eb] p-5 text-center">
        <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#991b1b]">{company.name}</p>
        <p className="text-[22px] font-bold mt-1">${fmt(Number(estimate.grand_total ?? 0))}</p>
        <p className="text-[13px] text-[#6b7280]">{estimate.estimate_number} -- {estimate.project_type}</p>
        {client && <p className="text-[13px] text-[#374151] mt-1">Prepared for {client.full_name}</p>}
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-xl shadow-sm border border-[#e5e7eb] p-4">
          <p className="text-[10px] font-bold uppercase tracking-wide text-[#991b1b] mb-2">Project</p>
          <div className="text-[12px] space-y-1">
            <div className="flex justify-between"><span className="text-[#6b7280]">Type</span><span className="font-medium">{estimate.project_type}</span></div>
            <div className="flex justify-between"><span className="text-[#6b7280]">Tier</span><span className="font-medium">{TIER_LABELS[estimate.tier] ?? estimate.tier}</span></div>
            {estimate.project_address && <div className="flex justify-between"><span className="text-[#6b7280]">Address</span><span className="font-medium text-right max-w-[60%] truncate">{estimate.project_address}</span></div>}
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-[#e5e7eb] p-4">
          <p className="text-[10px] font-bold uppercase tracking-wide text-[#991b1b] mb-2">Client</p>
          {client ? (
            <div className="text-[12px] space-y-0.5">
              <p className="font-medium">{client.full_name}</p>
              {client.email && <p className="text-[#6b7280]">{client.email}</p>}
              {client.phone && <p className="text-[#6b7280]">{client.phone}</p>}
            </div>
          ) : <p className="text-[12px] text-[#9ca3af] italic">No client assigned</p>}
        </div>
      </div>

      {/* Line items summary */}
      {[{ label: "Materials", lines: materialLines }, { label: "Labor", lines: laborLines }, { label: "Subcontractors", lines: subLines }]
        .filter(g => g.lines.length > 0)
        .map(group => (
          <div key={group.label} className="bg-white rounded-xl shadow-sm border border-[#e5e7eb] p-4">
            <p className="text-[10px] font-bold uppercase tracking-wide text-[#991b1b] mb-2">{group.label}</p>
            <div className="space-y-1">
              {group.lines.map((li, i) => (
                <div key={i} className="flex justify-between text-[12px]">
                  <span className="text-[#374151] truncate mr-2">{li.description} <span className="text-[#9ca3af]">x{Number(li.quantity)}</span></span>
                  <span className="font-medium flex-shrink-0">${fmt(Number(li.unit_price) * Number(li.quantity))}</span>
                </div>
              ))}
            </div>
          </div>
        ))}

      {/* Financial summary */}
      <div className="bg-white rounded-xl shadow-sm border border-[#e5e7eb] p-4">
        <p className="text-[10px] font-bold uppercase tracking-wide text-[#991b1b] mb-2">Summary</p>
        <div className="text-[12px] space-y-1">
          <div className="flex justify-between"><span className="text-[#6b7280]">Materials</span><span>${fmt(Number(estimate.materials_subtotal ?? 0))}</span></div>
          <div className="flex justify-between"><span className="text-[#6b7280]">Labor</span><span>${fmt(Number(estimate.labor_subtotal ?? 0))}</span></div>
          {Number(estimate.subcontractor_total) > 0 && <div className="flex justify-between"><span className="text-[#6b7280]">Subcontractors</span><span>${fmt(Number(estimate.subcontractor_total))}</span></div>}
          {Number(estimate.overhead_profit) > 0 && <div className="flex justify-between"><span className="text-[#6b7280]">Overhead & Profit</span><span>${fmt(Number(estimate.overhead_profit))}</span></div>}
          {Number(estimate.contingency) > 0 && <div className="flex justify-between"><span className="text-[#6b7280]">Contingency</span><span>${fmt(Number(estimate.contingency))}</span></div>}
          {Number(estimate.tax) > 0 && <div className="flex justify-between"><span className="text-[#6b7280]">Tax</span><span>${fmt(Number(estimate.tax))}</span></div>}
          <div className="flex justify-between pt-2 border-t border-[#e5e7eb] font-bold text-[14px]">
            <span>Total</span><span>${fmt(Number(estimate.grand_total ?? 0))}</span>
          </div>
        </div>
      </div>

      {/* Scope */}
      {(estimate.scope_inclusions?.length > 0 || estimate.scope_exclusions?.length > 0) && (
        <div className="grid grid-cols-2 gap-3">
          {estimate.scope_inclusions?.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-[#e5e7eb] p-4">
              <p className="text-[10px] font-bold uppercase tracking-wide text-[#991b1b] mb-2">Inclusions</p>
              <ul className="text-[12px] list-disc pl-4 space-y-0.5 text-[#374151]">
                {estimate.scope_inclusions.map((item: string, i: number) => <li key={i}>{item}</li>)}
              </ul>
            </div>
          )}
          {estimate.scope_exclusions?.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-[#e5e7eb] p-4">
              <p className="text-[10px] font-bold uppercase tracking-wide text-[#991b1b] mb-2">Exclusions</p>
              <ul className="text-[12px] list-disc pl-4 space-y-0.5 text-[#374151]">
                {estimate.scope_exclusions.map((item: string, i: number) => <li key={i}>{item}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
