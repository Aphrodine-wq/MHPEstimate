import { useState, useRef, useEffect } from "react";
import type { PricingSuggestion } from "@proestimate/estimation-engine";
import { fmt } from "./types";

const CONFIDENCE_CONFIG = {
  high: {
    label: "High",
    pct: 90,
    dot: "bg-[var(--green)]",
    text: "text-[var(--green)]",
    bg: "bg-[var(--green)]/10",
    border: "border-[var(--green)]/20",
    ring: "var(--green)",
  },
  medium: {
    label: "Med",
    pct: 70,
    dot: "bg-[var(--accent)]",
    text: "text-[var(--accent)]",
    bg: "bg-[var(--accent)]/10",
    border: "border-[var(--accent)]/20",
    ring: "var(--accent)",
  },
  low: {
    label: "Low",
    pct: 40,
    dot: "bg-[var(--yellow)]",
    text: "text-yellow-600",
    bg: "bg-yellow-400/10",
    border: "border-yellow-400/20",
    ring: "var(--yellow)",
  },
} as const;

interface ConfidenceBadgeProps {
  suggestion: PricingSuggestion;
  className?: string;
}

/**
 * Compact confidence badge for individual line items.
 * Shows colored dot + label; on hover/click reveals price range tooltip.
 */
export function ConfidenceBadge({ suggestion, className = "" }: ConfidenceBadgeProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const cfg = CONFIDENCE_CONFIG[suggestion.confidence];

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const hasRange = suggestion.priceRange.min > 0 || suggestion.priceRange.max > 0;

  return (
    <div ref={ref} className={`relative inline-flex ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium transition-all ${cfg.bg} ${cfg.text} border ${cfg.border} hover:brightness-110`}
      >
        <span className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
        {cfg.label}
      </button>

      {/* Tooltip popover */}
      {open && hasRange && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 z-50 animate-in fade-in slide-in-from-bottom-1 duration-150">
          <div className="rounded-lg border border-[var(--sep)] bg-[var(--card)] px-3 py-2 shadow-lg whitespace-nowrap">
            {/* Price range */}
            <div className="flex items-center gap-1.5 text-[11px]">
              <span className="text-[var(--secondary)]">Range:</span>
              <span className="font-semibold tabular-nums text-[var(--label)]">
                ${fmt(suggestion.priceRange.min)} &ndash; ${fmt(suggestion.priceRange.max)}
              </span>
            </div>

            {/* Confidence detail */}
            <div className="flex items-center gap-1.5 mt-1 text-[10px]">
              <span className={`font-medium ${cfg.text}`}>{cfg.pct}% confidence</span>
              <span className="text-[var(--tertiary)]">&middot;</span>
              <span className="text-[var(--tertiary)]">{suggestion.basedOn} data pts</span>
            </div>

            {/* Mini range bar */}
            <div className="mt-1.5 h-1 w-full rounded-full bg-[var(--fill)]">
              <div
                className="h-1 rounded-full transition-all"
                style={{
                  width: `${cfg.pct}%`,
                  backgroundColor: cfg.ring,
                }}
              />
            </div>

            {/* Caret */}
            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px">
              <div className="h-1.5 w-1.5 rotate-45 border-b border-r border-[var(--sep)] bg-[var(--card)]" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export { CONFIDENCE_CONFIG };
