"use client";

import { useAppContext } from "./AppContext";

interface UpgradePromptProps {
  /** Name of the feature being gated (e.g. "Analytics", "Change Orders") */
  feature?: string;
  /** Which usage limit was hit */
  limitType?: "estimates" | "team_members";
  /** Current usage count */
  current?: number;
  /** Maximum allowed by plan */
  limit?: number;
}

const LIMIT_LABELS: Record<string, string> = {
  estimates: "estimates this month",
  team_members: "team members",
};

export function UpgradePrompt({ feature, limitType, current, limit }: UpgradePromptProps) {
  const { onNavigate } = useAppContext();

  const heading = feature
    ? `${feature} is a Pro feature`
    : "You've reached your plan limit";

  const description = limitType && current !== undefined && limit !== undefined
    ? `You've used ${current} of ${limit} ${LIMIT_LABELS[limitType] ?? limitType} included in your current plan.`
    : feature
      ? `Upgrade your plan to unlock ${feature} and other powerful features.`
      : "Upgrade your plan to continue.";

  return (
    <div className="flex items-center justify-center p-8">
      <div className="w-full max-w-md rounded-xl border border-[var(--sep)] bg-[var(--card)] p-6 text-center shadow-sm">
        {/* Lock icon */}
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--accent)]/10">
          <svg
            width="24"
            height="24"
            fill="none"
            viewBox="0 0 24 24"
            stroke="var(--accent)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>

        <h3 className="mb-2 text-[15px] font-semibold text-[var(--foreground)]">
          {heading}
        </h3>

        <p className="mb-5 text-[13px] leading-relaxed text-[var(--secondary)]">
          {description}
        </p>

        {/* Usage bar when showing limit info */}
        {limitType && current !== undefined && limit !== undefined && (
          <div className="mb-5">
            <div className="mb-1.5 flex items-center justify-between text-[11px] text-[var(--secondary)]">
              <span>{current} used</span>
              <span>{limit} max</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--gray5)]">
              <div
                className="h-full rounded-full bg-[var(--accent)] transition-all"
                style={{ width: `${Math.min((current / limit) * 100, 100)}%` }}
              />
            </div>
          </div>
        )}

        <button
          onClick={() => onNavigate("upgrade")}
          className="rounded-lg bg-[var(--accent)] px-5 py-2.5 text-[13px] font-medium text-white transition-all hover:opacity-90 active:scale-[0.97]"
        >
          Upgrade Plan
        </button>

        <p className="mt-3 text-[11px] text-[var(--secondary)]">
          View plans and pricing
        </p>
      </div>
    </div>
  );
}
