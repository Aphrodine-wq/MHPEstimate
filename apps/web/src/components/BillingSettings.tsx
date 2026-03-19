"use client";

import { useState, useEffect, useCallback } from "react";

// ── Types ────────────────────────────────────────────────────────────────────

interface PlanInfo {
  id: string;
  name: string;
  price_monthly_cents: number;
  max_team_members: number | null;
  max_estimates_per_month: number | null;
  features: Record<string, boolean>;
}

interface SubscriptionInfo {
  id: string;
  plan_id: string;
  status: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
}

interface UsageStats {
  estimatesThisMonth: number;
  teamMembers: number;
}

interface BillingData {
  plan: PlanInfo | null;
  subscription: SubscriptionInfo | null;
  usage: UsageStats;
  hasStripeCustomer: boolean;
}

// ── Status Colors ────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  active: { bg: "bg-green-50", text: "text-green-700", label: "Active" },
  trialing: { bg: "bg-blue-50", text: "text-blue-700", label: "Trial" },
  past_due: { bg: "bg-amber-50", text: "text-amber-700", label: "Past Due" },
  canceled: { bg: "bg-red-50", text: "text-red-700", label: "Canceled" },
  unpaid: { bg: "bg-red-50", text: "text-red-700", label: "Unpaid" },
  incomplete: { bg: "bg-gray-50", text: "text-gray-600", label: "Incomplete" },
};

// ── Plan Details (static, for display) ───────────────────────────────────────

const PLAN_DISPLAY: Record<string, { name: string; price: string; color: string }> = {
  free: { name: "Apprentice", price: "$0/mo", color: "var(--secondary)" },
  apprentice: { name: "Apprentice", price: "$0/mo", color: "var(--secondary)" },
  pro: { name: "Journeyman", price: "$39/mo", color: "var(--accent)" },
  journeyman: { name: "Journeyman", price: "$39/mo", color: "var(--accent)" },
  master: { name: "Master", price: "$79/mo", color: "var(--orange)" },
  enterprise: { name: "General Contractor", price: "$199/mo", color: "#8b5cf6" },
  gc: { name: "General Contractor", price: "$199/mo", color: "#8b5cf6" },
};

// ── Component ────────────────────────────────────────────────────────────────

export function BillingSettings() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<BillingData>({
    plan: null,
    subscription: null,
    usage: { estimatesThisMonth: 0, teamMembers: 0 },
    hasStripeCustomer: false,
  });
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch billing data
  const fetchBillingData = useCallback(async () => {
    try {
      const res = await fetch("/api/billing/status");
      if (res.ok) {
        const billingData = await res.json();
        setData(billingData);
      }
    } catch {
      // Silently fail — we'll show defaults
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBillingData();
  }, [fetchBillingData]);

  // ── Handlers ──

  const handleUpgrade = async (planId: string) => {
    setActionLoading(planId);
    setError(null);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to create checkout session");
      }

      const { url } = await res.json();
      if (url) {
        window.location.href = url;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setActionLoading(null);
    }
  };

  const handleManageBilling = async () => {
    setActionLoading("portal");
    setError(null);
    try {
      const res = await fetch("/api/billing/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to open billing portal");
      }

      const { url } = await res.json();
      if (url) {
        window.location.href = url;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setActionLoading(null);
    }
  };

  // ── Loading skeleton ──

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-32 animate-pulse rounded-xl border border-[var(--sep)] bg-[var(--gray5)]" />
        <div className="h-24 animate-pulse rounded-xl border border-[var(--sep)] bg-[var(--gray5)]" />
        <div className="h-20 animate-pulse rounded-xl border border-[var(--sep)] bg-[var(--gray5)]" />
      </div>
    );
  }

  const currentPlanId = data.subscription?.plan_id ?? data.plan?.id ?? "free";
  const planDisplay = PLAN_DISPLAY[currentPlanId] ?? PLAN_DISPLAY.free!;
  const subStatus = data.subscription?.status ?? "active";
  const statusStyle = STATUS_STYLES[subStatus] ?? STATUS_STYLES.active!;

  const maxEstimates = data.plan?.max_estimates_per_month;
  const maxMembers = data.plan?.max_team_members;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[14px] font-semibold text-[var(--label)]">Billing & Plan</p>
          <p className="text-[11px] text-[var(--secondary)]">
            Manage your subscription and billing details
          </p>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-[12px] text-red-700">{error}</p>
        </div>
      )}

      {/* Current Plan Card */}
      <div className="rounded-xl border border-[var(--sep)] bg-[var(--card)] overflow-hidden">
        <div className="flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-lg"
              style={{ backgroundColor: `${planDisplay.color}15` }}
            >
              <svg
                width="20" height="20" fill="none" viewBox="0 0 24 24"
                stroke={planDisplay.color} strokeWidth="1.5" strokeLinecap="round"
              >
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-[14px] font-semibold" style={{ color: planDisplay.color }}>
                  {planDisplay.name} Plan
                </p>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusStyle.bg} ${statusStyle.text}`}>
                  {statusStyle.label}
                </span>
              </div>
              <p className="text-[12px] text-[var(--secondary)]">{planDisplay.price}</p>
            </div>
          </div>

          {data.hasStripeCustomer && (
            <button
              onClick={handleManageBilling}
              disabled={actionLoading === "portal"}
              className="rounded-lg border border-[var(--sep)] px-3 py-1.5 text-[12px] font-medium text-[var(--label)] transition-colors hover:bg-[var(--gray5)] disabled:opacity-50"
            >
              {actionLoading === "portal" ? "Opening..." : "Manage Billing"}
            </button>
          )}
        </div>

        {/* Period info */}
        {data.subscription?.current_period_end && (
          <div className="border-t border-[var(--sep)] px-4 py-2.5">
            <p className="text-[11px] text-[var(--secondary)]">
              {data.subscription.cancel_at_period_end
                ? `Cancels on ${new Date(data.subscription.current_period_end).toLocaleDateString()}`
                : `Renews on ${new Date(data.subscription.current_period_end).toLocaleDateString()}`}
            </p>
          </div>
        )}

        {/* Past due warning */}
        {subStatus === "past_due" && (
          <div className="border-t border-amber-200 bg-amber-50 px-4 py-2.5">
            <p className="text-[11px] text-amber-700">
              Your payment is past due. Please update your payment method to avoid service interruption.
            </p>
          </div>
        )}
      </div>

      {/* Usage Stats */}
      <div className="rounded-xl border border-[var(--sep)] bg-[var(--card)]">
        <div className="px-4 py-3 border-b border-[var(--sep)]">
          <p className="text-[12px] font-semibold text-[var(--label)]">Usage This Month</p>
        </div>
        <div className="divide-y divide-[var(--sep)]">
          {/* Estimates */}
          <div className="px-4 py-3">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[13px] text-[var(--label)]">Estimates</p>
              <p className="text-[12px] text-[var(--secondary)]">
                {data.usage.estimatesThisMonth}
                {maxEstimates ? ` / ${maxEstimates}` : " / Unlimited"}
              </p>
            </div>
            {maxEstimates && (
              <div className="h-1.5 w-full rounded-full bg-[var(--gray5)] overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min((data.usage.estimatesThisMonth / maxEstimates) * 100, 100)}%`,
                    backgroundColor:
                      data.usage.estimatesThisMonth / maxEstimates > 0.9
                        ? "var(--red, #ef4444)"
                        : data.usage.estimatesThisMonth / maxEstimates > 0.7
                        ? "var(--amber, #f59e0b)"
                        : "var(--accent)",
                  }}
                />
              </div>
            )}
          </div>

          {/* Team Members */}
          <div className="px-4 py-3">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[13px] text-[var(--label)]">Team Members</p>
              <p className="text-[12px] text-[var(--secondary)]">
                {data.usage.teamMembers}
                {maxMembers ? ` / ${maxMembers}` : " / Unlimited"}
              </p>
            </div>
            {maxMembers && (
              <div className="h-1.5 w-full rounded-full bg-[var(--gray5)] overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min((data.usage.teamMembers / maxMembers) * 100, 100)}%`,
                    backgroundColor:
                      data.usage.teamMembers / maxMembers > 0.9
                        ? "var(--red, #ef4444)"
                        : data.usage.teamMembers / maxMembers > 0.7
                        ? "var(--amber, #f59e0b)"
                        : "var(--accent)",
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Upgrade / Downgrade Options */}
      {currentPlanId !== "gc" && currentPlanId !== "enterprise" && (
        <div className="rounded-xl border border-[var(--sep)] bg-[var(--card)]">
          <div className="px-4 py-3 border-b border-[var(--sep)]">
            <p className="text-[12px] font-semibold text-[var(--label)]">
              {currentPlanId === "free" || currentPlanId === "apprentice" ? "Upgrade Your Plan" : "Change Plan"}
            </p>
          </div>
          <div className="divide-y divide-[var(--sep)]">
            {(currentPlanId === "free" || currentPlanId === "apprentice") && (
              <PlanOption
                name="Journeyman"
                price="$39/mo"
                description="25 estimates/month, 30 min Alex, client portal, 5 team members"
                color="var(--accent)"
                loading={actionLoading === "journeyman"}
                onSelect={() => handleUpgrade("journeyman")}
              />
            )}
            {(currentPlanId === "free" || currentPlanId === "apprentice" || currentPlanId === "pro" || currentPlanId === "journeyman") && (
              <PlanOption
                name="Master"
                price="$79/mo"
                description="100 estimates/month, 2 hrs Alex, 15 team members, priority support"
                color="var(--orange, #d97706)"
                loading={actionLoading === "master"}
                onSelect={() => handleUpgrade("master")}
              />
            )}
            {currentPlanId !== "master" && (
              <PlanOption
                name="General Contractor"
                price="$199/mo"
                description="Unlimited estimates, unlimited Alex, unlimited team members, dedicated support"
                color="#8b5cf6"
                loading={actionLoading === "gc"}
                onSelect={() => handleUpgrade("gc")}
              />
            )}
          </div>
        </div>
      )}

      {/* Downgrade note */}
      {currentPlanId !== "free" && currentPlanId !== "apprentice" && data.hasStripeCustomer && (
        <p className="text-[11px] text-[var(--secondary)] px-1">
          To downgrade or cancel your plan, click &ldquo;Manage Billing&rdquo; above to access the Stripe Customer Portal.
        </p>
      )}
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────────────────────────

function PlanOption({
  name,
  price,
  description,
  color,
  loading,
  onSelect,
}: {
  name: string;
  price: string;
  description: string;
  color: string;
  loading: boolean;
  onSelect: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3.5">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-[13px] font-semibold" style={{ color }}>{name}</p>
          <p className="text-[12px] text-[var(--secondary)]">{price}</p>
        </div>
        <p className="text-[11px] text-[var(--secondary)] mt-0.5 leading-snug">{description}</p>
      </div>
      <button
        onClick={onSelect}
        disabled={loading}
        className="flex-shrink-0 rounded-lg px-4 py-1.5 text-[12px] font-semibold text-white transition-opacity disabled:opacity-50"
        style={{ backgroundColor: color }}
      >
        {loading ? "..." : "Upgrade"}
      </button>
    </div>
  );
}
