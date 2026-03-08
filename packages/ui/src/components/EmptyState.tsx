interface EmptyStateProps {
  title: string;
  description: string;
  action?: string;
  onAction?: () => void;
}

export function EmptyState({ title, description, action, onAction }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--gray5)]">
        <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="var(--gray2)" strokeWidth="1.5" strokeLinecap="round">
          <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9Z" />
          <path d="M13 2v7h7" />
        </svg>
      </div>
      <p className="text-[14px] font-medium text-[var(--label)]">{title}</p>
      <p className="mt-1 text-[12px] text-[var(--secondary)]">{description}</p>
      {action && (
        <button
          onClick={onAction}
          className="mt-4 rounded-lg bg-[var(--accent)] px-4 py-2 text-[13px] font-medium text-white transition-all active:scale-[0.97]"
        >
          {action}
        </button>
      )}
    </div>
  );
}
