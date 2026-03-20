"use client";

interface ComingSoonProps {
  title: string;
  description?: string;
}

export function ComingSoon({ title, description }: ComingSoonProps) {
  return (
    <div className="flex h-full items-center justify-center p-6">
      <div className="text-center max-w-md">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--fill)]">
          <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="var(--gray2)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
        </div>
        <h2 className="text-[20px] font-bold text-[var(--label)]">{title}</h2>
        <p className="mt-2 text-[14px] text-[var(--secondary)] leading-relaxed">
          {description ?? "This feature is coming soon. Check back later."}
        </p>
      </div>
    </div>
  );
}
