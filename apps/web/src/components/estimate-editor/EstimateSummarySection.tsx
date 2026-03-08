import { Field, textareaClass } from "../Modal";
import { fmt, type Calculations } from "./types";

export interface EstimateSummarySectionProps {
  siteConditions: string;
  setSiteConditions: (v: string) => void;
  inclusionsText: string;
  setInclusionsText: (v: string) => void;
  exclusionsText: string;
  setExclusionsText: (v: string) => void;
  permitsFees: number;
  setPermitsFees: (v: number) => void;
  overheadPct: number;
  setOverheadPct: (v: number) => void;
  contingencyPct: number;
  setContingencyPct: (v: number) => void;
  taxPct: number;
  setTaxPct: (v: number) => void;
  calcs: Calculations;
  marginColor: string;
}

export function EstimateSummarySection({
  siteConditions,
  setSiteConditions,
  inclusionsText,
  setInclusionsText,
  exclusionsText,
  setExclusionsText,
  permitsFees,
  setPermitsFees,
  overheadPct,
  setOverheadPct,
  contingencyPct,
  setContingencyPct,
  taxPct,
  setTaxPct,
  calcs,
  marginColor,
}: EstimateSummarySectionProps) {
  return (
    <div className="border-t border-[var(--sep)] pt-5 grid grid-cols-1 md:grid-cols-2 gap-5">
      {/* Left: conditions + scope */}
      <div className="space-y-3">
        <Field label="Site Conditions">
          <textarea
            className={textareaClass}
            rows={3}
            placeholder="Describe site conditions, access, etc."
            value={siteConditions}
            onChange={(e) => setSiteConditions(e.target.value)}
          />
        </Field>
        <Field label="Scope Inclusions (one per line)">
          <textarea
            className={textareaClass}
            rows={3}
            placeholder="All materials and labor for..."
            value={inclusionsText}
            onChange={(e) => setInclusionsText(e.target.value)}
          />
        </Field>
        <Field label="Scope Exclusions (one per line)">
          <textarea
            className={textareaClass}
            rows={3}
            placeholder="Permit fees not included..."
            value={exclusionsText}
            onChange={(e) => setExclusionsText(e.target.value)}
          />
        </Field>
      </div>

      {/* Right: financial summary */}
      <div className="rounded-xl border border-[var(--sep)] bg-[var(--bg)] p-4 space-y-2">
        <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--secondary)] mb-2">
          Financial Summary
        </p>

        <SummaryRow label="Materials" value={`$${fmt(calcs.materialsSubtotal)}`} />
        <SummaryRow label="Labor" value={`$${fmt(calcs.laborSubtotal)}`} />
        <SummaryRow label="Subcontractors" value={`$${fmt(calcs.subcontractorTotal)}`} />

        <div className="border-t border-[var(--sep)] my-2" />

        {/* Permits & Fees - editable dollar */}
        <div className="flex items-center justify-between">
          <span className="text-[12px] text-[var(--secondary)]">Permits & Fees</span>
          <div className="flex items-center gap-1">
            <span className="text-[12px] text-[var(--secondary)]">$</span>
            <input
              type="number"
              min="0"
              step="0.01"
              className="w-[80px] rounded-md border border-[var(--sep)] bg-[var(--card)] px-2 py-0.5 text-right text-[12px] outline-none focus:border-[var(--accent)]"
              value={permitsFees}
              onChange={(e) => setPermitsFees(parseFloat(e.target.value) || 0)}
            />
          </div>
        </div>

        {/* Overhead & Profit */}
        <PctRow
          label="Overhead & Profit"
          pct={overheadPct}
          setPct={setOverheadPct}
          dollar={calcs.overheadDollar}
          step="1"
        />

        {/* Contingency */}
        <PctRow
          label="Contingency"
          pct={contingencyPct}
          setPct={setContingencyPct}
          dollar={calcs.contingencyDollar}
          step="1"
        />

        {/* Tax */}
        <PctRow
          label="Tax"
          pct={taxPct}
          setPct={setTaxPct}
          dollar={calcs.taxDollar}
          step="0.1"
        />

        <div className="border-t border-[var(--sep)] my-2" />

        {/* Grand Total */}
        <div className="flex items-center justify-between">
          <span className="text-[14px] font-bold">Grand Total</span>
          <span className="text-[16px] font-bold tabular-nums">
            ${fmt(calcs.grandTotal)}
          </span>
        </div>

        {/* Gross Margin */}
        <div className="flex items-center justify-between">
          <span className="text-[12px] text-[var(--secondary)]">Gross Margin</span>
          <span className={`text-[13px] font-semibold tabular-nums ${marginColor}`}>
            {calcs.grossMarginPct.toFixed(1)}%
          </span>
        </div>
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[12px] text-[var(--secondary)]">{label}</span>
      <span className="text-[12px] font-medium tabular-nums">{value}</span>
    </div>
  );
}

function PctRow({
  label,
  pct,
  setPct,
  dollar,
  step,
}: {
  label: string;
  pct: number;
  setPct: (v: number) => void;
  dollar: number;
  step: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[12px] text-[var(--secondary)]">{label}</span>
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-0.5">
          <input
            type="number"
            min="0"
            max="100"
            step={step}
            className="w-[48px] rounded-md border border-[var(--sep)] bg-[var(--card)] px-1.5 py-0.5 text-right text-[12px] outline-none focus:border-[var(--accent)]"
            value={pct}
            onChange={(e) => setPct(parseFloat(e.target.value) || 0)}
          />
          <span className="text-[11px] text-[var(--tertiary)]">%</span>
        </div>
        <span className="text-[12px] font-medium tabular-nums w-[80px] text-right">
          ${fmt(dollar)}
        </span>
      </div>
    </div>
  );
}
