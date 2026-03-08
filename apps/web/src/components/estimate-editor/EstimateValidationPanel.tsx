import { useMemo } from "react";
import type { ValidationResult } from "./types";

export interface EstimateValidationPanelProps {
  validationResults: ValidationResult[];
  validationOpen: boolean;
  setValidationOpen: (v: boolean) => void;
}

export function EstimateValidationPanel({
  validationResults,
  validationOpen,
  setValidationOpen,
}: EstimateValidationPanelProps) {
  const validationCounts = useMemo(() => {
    const pass = validationResults.filter((r) => r.status === "PASS").length;
    const warn = validationResults.filter((r) => r.status === "WARN").length;
    const fail = validationResults.filter((r) => r.status === "FAIL").length;
    return { pass, warn, fail, total: validationResults.length };
  }, [validationResults]);

  if (validationResults.length === 0) return null;

  return (
    <div className="px-6 pb-4">
      <div className="rounded-xl border border-[var(--sep)] bg-[var(--bg)] overflow-hidden">
        {/* Collapsible header */}
        <button
          type="button"
          onClick={() => setValidationOpen(!validationOpen)}
          className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-[var(--card)]"
        >
          <div className="flex items-center gap-2">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              className={`transition-transform ${validationOpen ? "rotate-90" : ""}`}
            >
              <path d="m9 18 6-6-6-6" />
            </svg>
            <span className="text-[12px] font-semibold">Validation Checklist</span>
          </div>
          <div className="flex items-center gap-3">
            {validationCounts.pass > 0 && (
              <span className="flex items-center gap-1 text-[11px] font-medium text-[var(--green)]">
                <span className="inline-block h-2 w-2 rounded-full bg-[var(--green)]" />
                {validationCounts.pass} Pass
              </span>
            )}
            {validationCounts.warn > 0 && (
              <span className="flex items-center gap-1 text-[11px] font-medium text-[var(--orange)]">
                <span className="inline-block h-2 w-2 rounded-full bg-[var(--orange)]" />
                {validationCounts.warn} Warn
              </span>
            )}
            {validationCounts.fail > 0 && (
              <span className="flex items-center gap-1 text-[11px] font-medium text-[var(--red)]">
                <span className="inline-block h-2 w-2 rounded-full bg-[var(--red)]" />
                {validationCounts.fail} Fail
              </span>
            )}
          </div>
        </button>

        {/* Expandable results list */}
        {validationOpen && (
          <div className="border-t border-[var(--sep)] px-4 py-2 space-y-1 max-h-[220px] overflow-y-auto">
            {validationResults.map((r) => {
              const statusColor =
                r.status === "PASS"
                  ? "text-[var(--green)]"
                  : r.status === "WARN"
                    ? "text-[var(--orange)]"
                    : "text-[var(--red)]";
              const dotColor =
                r.status === "PASS"
                  ? "bg-[var(--green)]"
                  : r.status === "WARN"
                    ? "bg-[var(--orange)]"
                    : "bg-[var(--red)]";
              return (
                <div
                  key={r.check_id}
                  className="flex items-start gap-2 rounded-lg px-2 py-1.5 hover:bg-[var(--card)]"
                >
                  <span className={`mt-1 inline-block h-2 w-2 shrink-0 rounded-full ${dotColor}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[12px] font-medium">{r.name}</span>
                      <span className={`text-[10px] font-semibold uppercase ${statusColor}`}>
                        {r.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-[var(--tertiary)] leading-tight">{r.message}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
