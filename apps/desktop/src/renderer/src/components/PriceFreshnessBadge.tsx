import type { PriceFreshness } from "@proestimate/shared/types";

const CFG: Record<PriceFreshness, { label: string; dot: string; text: string; bg: string }> = {
  green:  { label: "Current", dot: "bg-[var(--green)]",  text: "text-[var(--green)]",  bg: "bg-[var(--green)]/10" },
  yellow: { label: "Recent",  dot: "bg-yellow-400",      text: "text-yellow-600",       bg: "bg-yellow-400/10" },
  orange: { label: "Aging",   dot: "bg-[var(--orange)]", text: "text-[var(--orange)]", bg: "bg-[var(--orange)]/10" },
  red:    { label: "Stale",   dot: "bg-[var(--red)]",    text: "text-[var(--red)]",    bg: "bg-[var(--red)]/10" },
};

function timeAgo(dateStr: string): string {
  const d = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
  if (d === 0) return "today";
  if (d === 1) return "1d ago";
  if (d < 30) return `${d}d ago`;
  if (d < 365) return `${Math.floor(d / 30)}mo ago`;
  return `${Math.floor(d / 365)}y ago`;
}

export function PriceFreshnessBadge({ freshness, lastUpdated, className = "" }: { freshness: PriceFreshness; lastUpdated?: string | null; className?: string }) {
  const c = CFG[freshness];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ${c.bg} ${c.text} ${className}`}>
      <span className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${c.dot}`} />
      {c.label}
      {lastUpdated && <span className="opacity-70">· {timeAgo(lastUpdated)}</span>}
    </span>
  );
}
