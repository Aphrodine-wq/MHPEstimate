"use client";

import { useState, useEffect, useCallback } from "react";
import { CheckIcon } from "@heroicons/react/24/solid";

interface PlanData {
  id: string;
  name: string;
  price: string;
  period: string;
  estimatesPerMonth: string;
  alexMinutes: string;
  teamMembers: string;
  portal: boolean;
  features: string[];
}

const PLANS: PlanData[] = [
  {
    id: "apprentice",
    name: "Apprentice",
    price: "$0",
    period: "/mo",
    estimatesPerMonth: "5",
    alexMinutes: "None",
    teamMembers: "1",
    portal: false,
    features: [
      "Basic material tracking",
      "PDF estimate export",
      "Email support",
    ],
  },
  {
    id: "journeyman",
    name: "Journeyman",
    price: "$39",
    period: "/mo",
    estimatesPerMonth: "25",
    alexMinutes: "30 min",
    teamMembers: "5",
    portal: true,
    features: [
      "Client portal & digital signatures",
      "Historical pricing database",
      "Change order tracking",
      "Analytics dashboard",
      "Priority email support",
    ],
  },
  {
    id: "master",
    name: "Master",
    price: "$79",
    period: "/mo",
    estimatesPerMonth: "100",
    alexMinutes: "2 hours",
    teamMembers: "15",
    portal: true,
    features: [
      "Everything in Journeyman",
      "Invoicing & payment tracking",
      "Priority email & chat support",
    ],
  },
  {
    id: "gc",
    name: "General Contractor",
    price: "$199",
    period: "/mo",
    estimatesPerMonth: "Unlimited",
    alexMinutes: "Unlimited",
    teamMembers: "Unlimited",
    portal: true,
    features: [
      "Everything in Master",
      "Custom integrations",
      "Dedicated account manager",
      "API access",
      "SLA guarantee",
    ],
  },
];

export function UpgradePage() {
  const [currentPlan, setCurrentPlan] = useState<string>("apprentice");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [usage, setUsage] = useState({ estimates: 0, maxEstimates: 5, callMinutes: 0, maxCallMinutes: 0, teamMembers: 0, maxTeamMembers: 1 });

  useEffect(() => {
    fetch("/api/billing/status")
      .then((res) => res.json())
      .then((data) => {
        const planId = data.subscription?.plan_id ?? data.plan?.id ?? "apprentice";
        setCurrentPlan(planId === "free" ? "apprentice" : planId === "pro" ? "journeyman" : planId === "enterprise" ? "gc" : planId);
        setUsage({
          estimates: data.usage?.estimatesThisMonth ?? 0,
          maxEstimates: data.plan?.max_estimates_per_month ?? 5,
          callMinutes: data.usage?.callMinutesThisMonth ?? 0,
          maxCallMinutes: data.plan?.call_alex_minutes_per_month ?? 0,
          teamMembers: data.usage?.teamMembers ?? 0,
          maxTeamMembers: data.plan?.max_team_members ?? 1,
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleUpgrade = useCallback(async (planId: string) => {
    if (planId === "apprentice") return;
    if (planId === "gc") {
      window.location.href = "mailto:sales@mhpestimate.cloud?subject=General%20Contractor%20Plan";
      return;
    }
    setActionLoading(planId);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch {
      // Handle error silently
    } finally {
      setActionLoading(null);
    }
  }, []);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--gray4)] border-t-[var(--accent)]" />
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-6xl px-4 md:px-8 py-8">
        <div className="text-center mb-10">
          <h1 className="text-[28px] font-bold tracking-tight">Choose Your Plan</h1>
          <p className="text-[14px] text-[var(--secondary)] mt-2">
            Simple pricing that grows with your business. No hidden fees.
          </p>
        </div>

        {/* Usage summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
          <UsageMeter label="Estimates" current={usage.estimates} max={usage.maxEstimates} />
          <UsageMeter label="Alex" current={usage.callMinutes} max={usage.maxCallMinutes} unit="min" />
          <UsageMeter label="Team Members" current={usage.teamMembers} max={usage.maxTeamMembers} />
        </div>

        {/* Plan cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {PLANS.map((plan, i) => {
            const isCurrent = currentPlan === plan.id;
            const isDowngrade = PLANS.findIndex((p) => p.id === currentPlan) > i;
            return (
              <div
                key={plan.id}
                className={`animate-fade-in-up hover-lift relative flex flex-col rounded-xl border bg-[var(--card)] p-6 ${
                  isCurrent ? "border-[var(--accent)] ring-1 ring-[var(--accent)]" : "border-[var(--sep)]"
                }`}
                style={{ animationDelay: `${i * 100}ms` }}
              >
                {isCurrent && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[var(--accent)] px-3 py-0.5 text-[11px] font-semibold text-white">
                    Current Plan
                  </span>
                )}
                <h2 className="text-[18px] font-bold">{plan.name}</h2>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-[36px] font-extrabold">{plan.price}</span>
                  <span className="text-[14px] text-[var(--secondary)]">{plan.period}</span>
                </div>

                <div className="mt-5 space-y-2 text-[13px]">
                  <div className="flex justify-between">
                    <span className="text-[var(--secondary)]">Estimates/mo</span>
                    <span className="font-medium">{plan.estimatesPerMonth}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--secondary)]">Alex</span>
                    <span className="font-medium">{plan.alexMinutes}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--secondary)]">Team</span>
                    <span className="font-medium">{plan.teamMembers}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--secondary)]">Client Portal</span>
                    <span className="font-medium">{plan.portal ? "Yes" : "No"}</span>
                  </div>
                </div>

                <div className="my-5 h-px bg-[var(--sep)]" />

                <ul className="flex-1 space-y-2">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-[13px]">
                      <CheckIcon className="mt-0.5 h-4 w-4 flex-shrink-0 text-[var(--accent)]" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleUpgrade(plan.id)}
                  disabled={isCurrent || isDowngrade || actionLoading !== null}
                  className={`mt-6 w-full rounded-lg py-2.5 text-[14px] font-semibold transition-all disabled:opacity-50 ${
                    isCurrent
                      ? "border border-[var(--sep)] bg-[var(--gray5)] text-[var(--secondary)] cursor-default"
                      : isDowngrade
                      ? "border border-[var(--sep)] bg-[var(--card)] text-[var(--secondary)] cursor-default"
                      : "bg-[var(--accent)] text-white active:scale-[0.97]"
                  }`}
                >
                  {actionLoading === plan.id
                    ? "Loading..."
                    : isCurrent
                    ? "Current Plan"
                    : isDowngrade
                    ? "Downgrade"
                    : plan.id === "gc"
                    ? "Contact Sales"
                    : plan.id === "apprentice"
                    ? "Free"
                    : "Upgrade"}
                </button>
              </div>
            );
          })}
        </div>

        <p className="mt-6 text-center text-[12px] text-[var(--secondary)]">
          All paid plans include a 14-day free trial. Cancel anytime.
        </p>
      </div>
    </div>
  );
}

function UsageMeter({ label, current, max, unit }: { label: string; current: number; max: number; unit?: string }) {
  const pct = max > 0 ? Math.min((current / max) * 100, 100) : 0;
  const isUnlimited = max === 0 || max >= 999999;
  return (
    <div className="rounded-xl border border-[var(--sep)] bg-[var(--card)] p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[13px] font-medium">{label}</p>
        <p className="text-[12px] text-[var(--secondary)]">
          {current}{unit ? ` ${unit}` : ""} / {isUnlimited ? "Unlimited" : `${max}${unit ? ` ${unit}` : ""}`}
        </p>
      </div>
      {!isUnlimited && (
        <div className="h-1.5 w-full rounded-full bg-[var(--gray5)] overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${pct}%`,
              backgroundColor: pct > 90 ? "var(--red)" : pct > 70 ? "var(--orange)" : "var(--accent)",
            }}
          />
        </div>
      )}
    </div>
  );
}
