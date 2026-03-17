import type { ReactNode } from "react";

interface EmptyStateProps {
  title: string;
  description: string;
  action?: string;
  onAction?: () => void;
  icon?: ReactNode;
}

const DefaultIcon = () => (
  <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round">
    <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9Z" />
    <path d="M13 2v7h7" />
    <path d="M12 12v6" />
    <path d="M9 15h6" />
  </svg>
);

export function EmptyState({ title, description, action, onAction, icon }: EmptyStateProps) {
  return (
    <div className="fade-in flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--accent)]/[0.06]">
        {icon ?? <DefaultIcon />}
      </div>
      <p className="text-[15px] font-semibold text-[var(--label)]">{title}</p>
      <p className="mt-1 max-w-[260px] text-[13px] text-[var(--secondary)]">{description}</p>
      {action && (
        <button
          onClick={onAction}
          className="mt-5 rounded-lg bg-[var(--accent)] px-4 py-2 text-[13px] font-medium text-white shadow-sm shadow-[var(--accent)]/20 transition-all hover:bg-[var(--accent-hover)] active:scale-[0.97]"
        >
          {action}
        </button>
      )}
    </div>
  );
}
