export const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  in_review: "In Review",
  approved: "Approved",
  sent: "Sent",
  accepted: "Accepted",
  declined: "Declined",
  revision_requested: "Revision",
  expired: "Expired",
};

export const STATUS_STYLE: Record<string, string> = {
  draft: "bg-[var(--gray5)] text-[var(--gray1)]",
  in_review: "bg-[#fff3e0] text-[#e65100]",
  approved: "bg-[#e3f2fd] text-[#1565c0]",
  sent: "bg-[#f3e5f5] text-[#7b1fa2]",
  accepted: "bg-[#e8f5e9] text-[#2e7d32]",
  declined: "bg-[#ffebee] text-[#c62828]",
  revision_requested: "bg-[#fff8e1] text-[#f57f17]",
  expired: "bg-[var(--gray5)] text-[var(--gray1)]",
};

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className = "" }: StatusBadgeProps) {
  return (
    <span
      className={`flex-shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold ${STATUS_STYLE[status] ?? STATUS_STYLE.draft} ${className}`}
    >
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}
