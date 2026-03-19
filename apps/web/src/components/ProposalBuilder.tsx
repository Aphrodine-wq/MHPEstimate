"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { supabase } from "../lib/supabase";
import { useOrg } from "../lib/org-context";
import { useLineItems, useJobPhases } from "../lib/store";
import type {
  Estimate,
  Client,
  EstimateLineItem,
  JobPhase,
} from "@proestimate/shared/types";

// ── Types ──

interface ProposalTemplate {
  id: string;
  name: string;
  is_default: boolean;
  cover_page: boolean;
  show_logo: boolean;
  show_timeline: boolean;
  show_payment_schedule: boolean;
  show_terms: boolean;
  show_warranty: boolean;
  accent_color: string;
  header_text: string | null;
  footer_text: string | null;
  terms_text: string | null;
  warranty_text: string | null;
  sections: string[];
}

interface Milestone {
  id: string;
  name: string;
  percentage: number;
  amount: number;
  due_trigger: string | null;
  status: string;
  sort_order: number;
}

interface SectionToggle {
  cover: boolean;
  scope: boolean;
  line_items: boolean;
  timeline: boolean;
  payment_schedule: boolean;
  terms: boolean;
  warranty: boolean;
  signature: boolean;
}

// ── Helpers ──

function fmt(n: number): string {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(dateStr: string | null): string {
  if (!dateStr) return "--";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const STATUS_COLORS: Record<string, string> = {
  not_started: "bg-[var(--gray4)]",
  in_progress: "bg-[var(--accent)]",
  completed: "bg-[var(--green)]",
  blocked: "bg-[var(--red)]",
  skipped: "bg-[var(--tertiary)]",
};

const DEFAULT_TERMS =
  "This estimate is valid for 30 days from the date of issue. A 50% deposit is required to begin work. Final payment is due upon completion. All work comes with a 1-year warranty on labor.";
const DEFAULT_WARRANTY =
  "All work is warranted for a period of one (1) year from the date of completion against defects in workmanship. Manufacturer warranties on materials apply separately.";

const ACCENT_PALETTE = [
  "#991b1b",
  "#1e3a5f",
  "#065f46",
  "#78350f",
  "#4c1d95",
  "#1e293b",
  "#701a75",
  "#3730a3",
];

// ── Group line items by category ──

function groupByCategory(items: EstimateLineItem[]): Map<string, EstimateLineItem[]> {
  const map = new Map<string, EstimateLineItem[]>();
  for (const item of items) {
    const cat = item.category || "Uncategorized";
    if (!map.has(cat)) map.set(cat, []);
    map.get(cat)!.push(item);
  }
  return map;
}

// ── Section Components ──

function CoverSection({
  companyName,
  estimate,
  client,
  accentColor,
}: {
  companyName: string;
  estimate: Estimate;
  client: Client | null;
  accentColor: string;
}) {
  const dateStr = new Date(estimate.created_at).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="relative pb-12 mb-10">
      <div className="h-2 w-full rounded-t-sm" style={{ backgroundColor: accentColor }} />
      <div className="pt-10 px-8">
        <h1
          className="text-[36px] font-bold leading-tight"
          style={{ fontFamily: "'DM Serif Display', 'Bricolage Grotesque', serif" }}
        >
          {companyName}
        </h1>
        <div className="mt-8 grid grid-cols-2 gap-8">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--secondary)] mb-2">
              Proposal For
            </p>
            <p className="text-[16px] font-semibold">{client?.full_name ?? "Client"}</p>
            {client?.address_line1 && (
              <p className="text-[13px] text-[var(--secondary)] mt-0.5">{client.address_line1}</p>
            )}
            {(client?.city || client?.state || client?.zip) && (
              <p className="text-[13px] text-[var(--secondary)]">
                {[client?.city, client?.state].filter(Boolean).join(", ")}
                {client?.zip ? ` ${client.zip}` : ""}
              </p>
            )}
            {client?.email && (
              <p className="text-[13px] text-[var(--secondary)] mt-1">{client.email}</p>
            )}
          </div>
          <div className="text-right">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--secondary)] mb-2">
              Estimate Details
            </p>
            <p className="text-[14px] font-semibold">{estimate.estimate_number}</p>
            <p className="text-[13px] text-[var(--secondary)] mt-0.5">{estimate.project_type}</p>
            <p className="text-[13px] text-[var(--secondary)]">{dateStr}</p>
            {estimate.project_address && (
              <p className="text-[13px] text-[var(--secondary)] mt-1">{estimate.project_address}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ScopeSection({ estimate }: { estimate: Estimate }) {
  return (
    <div className="px-8 mb-8">
      <h2
        className="text-[20px] font-bold mb-4 pb-2 border-b-2 border-[var(--sep)]"
        style={{ fontFamily: "'DM Serif Display', 'Bricolage Grotesque', serif" }}
      >
        Scope of Work
      </h2>
      {estimate.scope_inclusions && estimate.scope_inclusions.length > 0 && (
        <div className="mb-4">
          <p className="text-[12px] font-semibold uppercase tracking-wide text-[var(--secondary)] mb-2">
            Included
          </p>
          <ul className="space-y-1.5">
            {estimate.scope_inclusions.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-[13px]">
                <svg
                  className="mt-0.5 shrink-0 text-[var(--green)]"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {estimate.scope_exclusions && estimate.scope_exclusions.length > 0 && (
        <div className="mb-4">
          <p className="text-[12px] font-semibold uppercase tracking-wide text-[var(--secondary)] mb-2">
            Not Included
          </p>
          <ul className="space-y-1.5">
            {estimate.scope_exclusions.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-[13px] text-[var(--secondary)]">
                <svg
                  className="mt-0.5 shrink-0 text-[var(--tertiary)]"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                >
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {estimate.site_conditions && (
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-wide text-[var(--secondary)] mb-2">
            Site Conditions
          </p>
          <p className="text-[13px] leading-relaxed">{estimate.site_conditions}</p>
        </div>
      )}
    </div>
  );
}

function LineItemsSection({
  lineItems,
  estimate,
  accentColor,
}: {
  lineItems: EstimateLineItem[];
  estimate: Estimate;
  accentColor: string;
}) {
  const grouped = useMemo(() => groupByCategory(lineItems), [lineItems]);

  return (
    <div className="px-8 mb-8">
      <h2
        className="text-[20px] font-bold mb-4 pb-2 border-b-2 border-[var(--sep)]"
        style={{ fontFamily: "'DM Serif Display', 'Bricolage Grotesque', serif" }}
      >
        Line Items
      </h2>
      <div className="overflow-hidden rounded-lg border border-[var(--sep)]">
        <table className="w-full text-[12px]">
          <thead>
            <tr style={{ backgroundColor: accentColor }}>
              <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-white">
                Description
              </th>
              <th className="px-3 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wide text-white w-16">
                Qty
              </th>
              <th className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-white w-16">
                Unit
              </th>
              <th className="px-3 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wide text-white w-24">
                Unit Price
              </th>
              <th className="px-4 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wide text-white w-28">
                Amount
              </th>
            </tr>
          </thead>
          <tbody>
            {Array.from(grouped.entries()).map(([category, items]) => {
              const catTotal = items.reduce((s, i) => s + (Number(i.extended_price) || 0), 0);
              return (
                <tbody key={category}>
                  {/* Category header */}
                  <tr className="bg-[var(--fill)]">
                    <td colSpan={5} className="px-4 py-2 text-[11px] font-bold uppercase tracking-wide">
                      {category}
                    </td>
                  </tr>
                  {/* Line items */}
                  {items.map((item) => (
                    <tr key={item.id} className="border-b border-[var(--sep)]">
                      <td className="px-4 py-2">{item.description}</td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {item.quantity ?? "--"}
                      </td>
                      <td className="px-3 py-2 text-[var(--secondary)]">{item.unit ?? ""}</td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {item.unit_price != null ? `$${fmt(item.unit_price)}` : "--"}
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums font-medium">
                        {item.extended_price != null ? `$${fmt(item.extended_price)}` : "--"}
                      </td>
                    </tr>
                  ))}
                  {/* Category subtotal */}
                  <tr className="border-b border-[var(--sep)] bg-[var(--fill)]/50">
                    <td colSpan={4} className="px-4 py-1.5 text-[11px] text-right font-semibold text-[var(--secondary)]">
                      {category} Subtotal
                    </td>
                    <td className="px-4 py-1.5 text-right text-[12px] font-bold tabular-nums">
                      ${fmt(catTotal)}
                    </td>
                  </tr>
                </tbody>
              );
            })}
          </tbody>
        </table>

        {/* Grand total */}
        <div className="border-t-2 border-[var(--sep)] bg-[var(--fill)] px-4 py-3">
          <div className="space-y-1 text-[12px]">
            {estimate.materials_subtotal > 0 && (
              <div className="flex justify-between text-[var(--secondary)]">
                <span>Materials</span>
                <span className="tabular-nums">${fmt(estimate.materials_subtotal)}</span>
              </div>
            )}
            {estimate.labor_subtotal > 0 && (
              <div className="flex justify-between text-[var(--secondary)]">
                <span>Labor</span>
                <span className="tabular-nums">${fmt(estimate.labor_subtotal)}</span>
              </div>
            )}
            {estimate.subcontractor_total > 0 && (
              <div className="flex justify-between text-[var(--secondary)]">
                <span>Subcontractors</span>
                <span className="tabular-nums">${fmt(estimate.subcontractor_total)}</span>
              </div>
            )}
            {estimate.overhead_profit > 0 && (
              <div className="flex justify-between text-[var(--secondary)]">
                <span>Overhead & Profit</span>
                <span className="tabular-nums">${fmt(estimate.overhead_profit)}</span>
              </div>
            )}
            {estimate.contingency > 0 && (
              <div className="flex justify-between text-[var(--secondary)]">
                <span>Contingency</span>
                <span className="tabular-nums">${fmt(estimate.contingency)}</span>
              </div>
            )}
            {estimate.tax > 0 && (
              <div className="flex justify-between text-[var(--secondary)]">
                <span>Tax</span>
                <span className="tabular-nums">${fmt(estimate.tax)}</span>
              </div>
            )}
            <div className="flex justify-between pt-2 border-t border-[var(--sep)] text-[15px] font-bold">
              <span>Grand Total</span>
              <span className="tabular-nums">${fmt(estimate.grand_total)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TimelineSection({
  phases,
  accentColor,
}: {
  phases: JobPhase[];
  accentColor: string;
}) {
  if (phases.length === 0) return null;

  return (
    <div className="px-8 mb-8">
      <h2
        className="text-[20px] font-bold mb-4 pb-2 border-b-2 border-[var(--sep)]"
        style={{ fontFamily: "'DM Serif Display', 'Bricolage Grotesque', serif" }}
      >
        Project Timeline
      </h2>
      <div className="space-y-0">
        {phases.map((phase, i) => {
          const isLast = i === phases.length - 1;
          return (
            <div key={phase.id} className="flex gap-4">
              {/* Timeline line + dot */}
              <div className="flex flex-col items-center">
                <div
                  className="w-3 h-3 rounded-full border-2 shrink-0 mt-1"
                  style={{ borderColor: accentColor, backgroundColor: phase.status === "completed" ? accentColor : "transparent" }}
                />
                {!isLast && (
                  <div className="w-px flex-1 bg-[var(--sep)]" />
                )}
              </div>
              {/* Phase content */}
              <div className={`pb-5 ${isLast ? "" : ""}`}>
                <p className="text-[14px] font-semibold leading-tight">{phase.phase_name}</p>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-[12px] text-[var(--secondary)]">
                    {fmtDate(phase.start_date)} - {fmtDate(phase.end_date)}
                  </span>
                  <span
                    className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold text-white ${
                      STATUS_COLORS[phase.status] ?? "bg-[var(--gray3)]"
                    }`}
                  >
                    {phase.status.replace(/_/g, " ")}
                  </span>
                </div>
                {phase.notes && (
                  <p className="text-[12px] text-[var(--secondary)] mt-1">{phase.notes}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PaymentScheduleSection({
  milestones,
}: {
  milestones: Milestone[];
}) {
  if (milestones.length === 0) return null;

  return (
    <div className="px-8 mb-8">
      <h2
        className="text-[20px] font-bold mb-4 pb-2 border-b-2 border-[var(--sep)]"
        style={{ fontFamily: "'DM Serif Display', 'Bricolage Grotesque', serif" }}
      >
        Payment Schedule
      </h2>
      <div className="rounded-lg border border-[var(--sep)] overflow-hidden">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-[var(--sep)] bg-[var(--fill)]">
              <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-[var(--secondary)]">
                Milestone
              </th>
              <th className="px-4 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wide text-[var(--secondary)]">
                %
              </th>
              <th className="px-4 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wide text-[var(--secondary)]">
                Amount
              </th>
              <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-[var(--secondary)]">
                When Due
              </th>
            </tr>
          </thead>
          <tbody>
            {milestones.map((m) => (
              <tr key={m.id} className="border-b border-[var(--sep)] last:border-b-0">
                <td className="px-4 py-2.5 font-medium">{m.name}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{m.percentage}%</td>
                <td className="px-4 py-2.5 text-right tabular-nums font-medium">
                  ${fmt(m.amount)}
                </td>
                <td className="px-4 py-2.5 text-[var(--secondary)]">{m.due_trigger ?? "--"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TermsSection({
  termsText,
  warrantyText,
  showWarranty,
}: {
  termsText: string;
  warrantyText: string;
  showWarranty: boolean;
}) {
  return (
    <div className="px-8 mb-8">
      <h2
        className="text-[20px] font-bold mb-4 pb-2 border-b-2 border-[var(--sep)]"
        style={{ fontFamily: "'DM Serif Display', 'Bricolage Grotesque', serif" }}
      >
        Terms & Conditions
      </h2>
      <p className="text-[13px] leading-relaxed whitespace-pre-line">{termsText}</p>
      {showWarranty && warrantyText && (
        <div className="mt-6">
          <h3 className="text-[15px] font-bold mb-2">Warranty</h3>
          <p className="text-[13px] leading-relaxed whitespace-pre-line">{warrantyText}</p>
        </div>
      )}
    </div>
  );
}

function SignatureSection({ companyName }: { companyName: string }) {
  return (
    <div className="px-8 mt-10 mb-8">
      <h2
        className="text-[20px] font-bold mb-6 pb-2 border-b-2 border-[var(--sep)]"
        style={{ fontFamily: "'DM Serif Display', 'Bricolage Grotesque', serif" }}
      >
        Acceptance
      </h2>
      <div className="grid grid-cols-2 gap-12">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--secondary)] mb-8">
            Accepted By (Client)
          </p>
          <div className="border-b border-[var(--label)] mb-2 h-12" />
          <div className="flex justify-between text-[12px] text-[var(--secondary)]">
            <span>Signature</span>
            <span>Date</span>
          </div>
          <div className="border-b border-[var(--label)] mb-2 h-8 mt-4" />
          <p className="text-[12px] text-[var(--secondary)]">Printed Name</p>
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--secondary)] mb-8">
            Company Representative
          </p>
          <div className="border-b border-[var(--label)] mb-2 h-12" />
          <div className="flex justify-between text-[12px] text-[var(--secondary)]">
            <span>Signature</span>
            <span>Date</span>
          </div>
          <div className="border-b border-[var(--label)] mb-2 h-8 mt-4" />
          <p className="text-[12px] text-[var(--secondary)]">{companyName}</p>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ──

interface ProposalBuilderProps {
  estimateId: string;
}

export function ProposalBuilder({ estimateId }: ProposalBuilderProps) {
  const { organization } = useOrg();
  const { data: lineItems, loading: lineItemsLoading } = useLineItems(estimateId);
  const { data: phases, loading: phasesLoading } = useJobPhases(estimateId);

  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [templates, setTemplates] = useState<ProposalTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accentColor, setAccentColor] = useState("#991b1b");

  const [sections, setSections] = useState<SectionToggle>({
    cover: true,
    scope: true,
    line_items: true,
    timeline: true,
    payment_schedule: true,
    terms: true,
    warranty: true,
    signature: true,
  });

  const previewRef = useRef<HTMLDivElement>(null);

  // ── Load estimate, client, milestones, templates ──
  useEffect(() => {
    if (!supabase || !estimateId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    (async () => {
      try {
        // Fetch estimate
        const { data: est, error: estErr } = await supabase
          .from("estimates")
          .select("*")
          .eq("id", estimateId)
          .single();

        if (estErr || !est) {
          setError("Estimate not found");
          setLoading(false);
          return;
        }
        setEstimate(est as unknown as Estimate);

        // Fetch client
        if (est.client_id) {
          const { data: cl } = await supabase
            .from("clients")
            .select("*")
            .eq("id", est.client_id)
            .single();
          setClient(cl as unknown as Client | null);
        }

        // Fetch milestones
        const { data: ms } = await supabase
          .from("payment_milestones")
          .select("*")
          .eq("estimate_id", estimateId)
          .order("sort_order");
        setMilestones((ms ?? []) as unknown as Milestone[]);

        // Fetch proposal templates
        if (est.organization_id) {
          const { data: tpls } = await supabase
            .from("proposal_templates")
            .select("*")
            .eq("organization_id", est.organization_id)
            .order("is_default", { ascending: false });

          const typedTemplates = (tpls ?? []) as unknown as ProposalTemplate[];
          setTemplates(typedTemplates);

          // Select default template
          const defaultTpl = typedTemplates.find((t) => t.is_default) ?? typedTemplates[0];
          if (defaultTpl) {
            setSelectedTemplateId(defaultTpl.id);
            setAccentColor(defaultTpl.accent_color || "#991b1b");
            // Apply template section visibility
            setSections({
              cover: defaultTpl.cover_page,
              scope: true,
              line_items: true,
              timeline: defaultTpl.show_timeline,
              payment_schedule: defaultTpl.show_payment_schedule,
              terms: defaultTpl.show_terms,
              warranty: defaultTpl.show_warranty,
              signature: true,
            });
          }
        }

        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load proposal data");
        setLoading(false);
      }
    })();
  }, [estimateId]);

  const selectedTemplate = useMemo(
    () => templates.find((t) => t.id === selectedTemplateId) ?? null,
    [templates, selectedTemplateId],
  );

  const companyName = organization?.name ?? "Your Company";

  const handleTemplateChange = useCallback(
    (templateId: string) => {
      setSelectedTemplateId(templateId);
      const tpl = templates.find((t) => t.id === templateId);
      if (tpl) {
        setAccentColor(tpl.accent_color || "#991b1b");
        setSections({
          cover: tpl.cover_page,
          scope: true,
          line_items: true,
          timeline: tpl.show_timeline,
          payment_schedule: tpl.show_payment_schedule,
          terms: tpl.show_terms,
          warranty: tpl.show_warranty,
          signature: true,
        });
      }
    },
    [templates],
  );

  const toggleSection = useCallback((key: keyof SectionToggle) => {
    setSections((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const handleExportPDF = useCallback(async () => {
    if (!estimate || !previewRef.current) return;

    // Use html2canvas + jsPDF approach or just print
    // For now, use the browser print dialog targeting the preview
    const printContent = previewRef.current.innerHTML;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${estimate.estimate_number} - Proposal</title>
          <link rel="preconnect" href="https://fonts.googleapis.com">
          <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Inter', sans-serif; color: #171717; background: white; }
            h1, h2, h3, .font-display { font-family: 'DM Serif Display', serif; }
            @media print {
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            }
          </style>
          <link rel="stylesheet" href="/globals.css" />
        </head>
        <body>
          <div style="max-width: 800px; margin: 0 auto; padding: 20px;">
            ${printContent}
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 500);
  }, [estimate]);

  // ── Loading ──
  if (loading || lineItemsLoading || phasesLoading) {
    return (
      <div className="h-full overflow-y-auto p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="h-8 w-64 rounded bg-[var(--gray5)] animate-pulse" />
          <div className="h-96 rounded-xl bg-[var(--gray5)] animate-pulse" />
        </div>
      </div>
    );
  }

  // ── Error ──
  if (error || !estimate) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--red)]/10">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--red)" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v4M12 16h.01" />
            </svg>
          </div>
          <p className="text-[14px] font-semibold mb-1">
            {error ?? "No estimate selected"}
          </p>
          <p className="text-[13px] text-[var(--secondary)]">
            Select an estimate to build a proposal.
          </p>
        </div>
      </div>
    );
  }

  const termsText = selectedTemplate?.terms_text ?? DEFAULT_TERMS;
  const warrantyText = selectedTemplate?.warranty_text ?? DEFAULT_WARRANTY;

  return (
    <div className="h-full flex overflow-hidden">
      {/* ── Controls Sidebar ── */}
      <div className="w-72 shrink-0 border-r border-[var(--sep)] bg-[var(--card)] overflow-y-auto">
        <div className="p-5 space-y-6">
          <div>
            <h3 className="text-[14px] font-bold mb-1">Proposal Builder</h3>
            <p className="text-[12px] text-[var(--secondary)]">
              {estimate.estimate_number}
            </p>
          </div>

          {/* Template selector */}
          {templates.length > 0 && (
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wide text-[var(--secondary)] mb-1.5">
                Template
              </label>
              <select
                value={selectedTemplateId ?? ""}
                onChange={(e) => handleTemplateChange(e.target.value)}
                className="w-full rounded-lg border border-[var(--sep)] bg-[var(--bg)] px-3 py-2 text-[13px] outline-none focus:border-[var(--accent)]"
              >
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} {t.is_default ? "(Default)" : ""}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Section toggles */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wide text-[var(--secondary)] mb-2">
              Sections
            </label>
            <div className="space-y-2">
              {(
                [
                  ["cover", "Cover Page"],
                  ["scope", "Scope of Work"],
                  ["line_items", "Line Items"],
                  ["timeline", "Timeline"],
                  ["payment_schedule", "Payment Schedule"],
                  ["terms", "Terms & Conditions"],
                  ["warranty", "Warranty"],
                  ["signature", "Signature Block"],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="flex items-center gap-2.5 cursor-pointer group">
                  <div
                    className={`w-4 h-4 rounded border transition-all flex items-center justify-center ${
                      sections[key]
                        ? "bg-[var(--accent)] border-[var(--accent)]"
                        : "border-[var(--gray3)] group-hover:border-[var(--gray2)]"
                    }`}
                    onClick={() => toggleSection(key)}
                  >
                    {sections[key] && (
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </div>
                  <span className="text-[13px]" onClick={() => toggleSection(key)}>{label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Accent color */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wide text-[var(--secondary)] mb-2">
              Accent Color
            </label>
            <div className="flex flex-wrap gap-2">
              {ACCENT_PALETTE.map((color) => (
                <button
                  key={color}
                  className={`w-7 h-7 rounded-full transition-all ${
                    accentColor === color
                      ? "ring-2 ring-offset-2 ring-[var(--label)] scale-110"
                      : "hover:scale-105"
                  }`}
                  style={{ backgroundColor: color }}
                  onClick={() => setAccentColor(color)}
                />
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-2 pt-2 border-t border-[var(--sep)]">
            <button
              onClick={handleExportPDF}
              className="w-full rounded-lg bg-[var(--accent)] px-4 py-2.5 text-[13px] font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="12" y1="18" x2="12" y2="12" />
                <polyline points="9 15 12 12 15 15" />
              </svg>
              Export PDF
            </button>
            <button
              className="w-full rounded-lg border border-[var(--sep)] px-4 py-2.5 text-[13px] font-semibold transition-all hover:bg-[var(--fill)] flex items-center justify-center gap-2"
              onClick={() => {
                // Link to existing send flow
                window.location.href = `/estimates?send=${estimateId}`;
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
              Send to Client
            </button>
          </div>
        </div>
      </div>

      {/* ── Preview Panel ── */}
      <div className="flex-1 overflow-y-auto bg-[var(--gray5)]">
        <div className="py-8 px-6">
          <div
            ref={previewRef}
            className="max-w-[800px] mx-auto bg-white rounded-lg shadow-[var(--shadow-lg)] overflow-hidden"
            style={{ color: "#171717" }}
          >
            {/* Cover Page */}
            {sections.cover && (
              <CoverSection
                companyName={companyName}
                estimate={estimate}
                client={client}
                accentColor={accentColor}
              />
            )}

            {/* Scope of Work */}
            {sections.scope && <ScopeSection estimate={estimate} />}

            {/* Line Items */}
            {sections.line_items && (
              <LineItemsSection
                lineItems={lineItems}
                estimate={estimate}
                accentColor={accentColor}
              />
            )}

            {/* Timeline */}
            {sections.timeline && phases.length > 0 && (
              <TimelineSection phases={phases} accentColor={accentColor} />
            )}

            {/* Payment Schedule */}
            {sections.payment_schedule && milestones.length > 0 && (
              <PaymentScheduleSection milestones={milestones} />
            )}

            {/* Terms & Warranty */}
            {sections.terms && (
              <TermsSection
                termsText={termsText}
                warrantyText={warrantyText}
                showWarranty={sections.warranty}
              />
            )}

            {/* Signature Block */}
            {sections.signature && <SignatureSection companyName={companyName} />}

            {/* Footer bar */}
            <div className="h-2 w-full" style={{ backgroundColor: accentColor }} />
          </div>
        </div>
      </div>
    </div>
  );
}
