"use client";

import { useState, useCallback } from "react";

interface OnboardingWizardProps {
  userName: string | null;
  onComplete: () => void;
  onNavigate: (page: string) => void;
  onNewEstimate: () => void;
  onCallAlex?: () => void;
}

const TOTAL_STEPS = 4;

export function OnboardingWizard({ userName, onComplete, onNavigate, onNewEstimate, onCallAlex }: OnboardingWizardProps) {
  const [step, setStep] = useState(0);
  const [exiting, setExiting] = useState(false);
  const [direction, setDirection] = useState<"forward" | "backward">("forward");

  const finish = useCallback(() => {
    setExiting(true);
    setTimeout(() => {
      localStorage.setItem("onboarding_complete", "true");
      onComplete();
    }, 400);
  }, [onComplete]);

  const next = useCallback(() => {
    setDirection("forward");
    setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1));
  }, []);

  const prev = useCallback(() => {
    setDirection("backward");
    setStep((s) => Math.max(s - 1, 0));
  }, []);

  const handleAction = useCallback((action: string) => {
    localStorage.setItem("onboarding_complete", "true");
    if (action === "create") {
      onNewEstimate();
      onComplete();
    } else if (action === "dashboard") {
      onNavigate("dashboard");
      onComplete();
    } else if (action === "settings") {
      onNavigate("settings");
      onComplete();
    }
  }, [onComplete, onNavigate, onNewEstimate]);

  const progressPct = ((step + 1) / TOTAL_STEPS) * 100;
  const displayName = userName || "there";

  return (
    <div
      className={`fixed inset-0 z-[90] flex items-center justify-center transition-opacity duration-400 ${
        exiting ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
      style={{ background: "#f0f4f8" }}
    >
      {/* Decorative background elements */}
      <div
        className="absolute top-[-10%] right-[-5%] rounded-full blur-[120px] opacity-20"
        style={{ width: 500, height: 500, background: "#29abe2" }}
      />
      <div
        className="absolute bottom-[-10%] left-[-5%] rounded-full blur-[120px] opacity-15"
        style={{ width: 400, height: 400, background: "#007aff" }}
      />

      {/* Card */}
      <div
        className="relative w-full max-w-lg mx-4 rounded-2xl shadow-2xl overflow-hidden"
        style={{ background: "var(--card)" }}
      >
        {/* Progress bar */}
        <div className="h-1 w-full" style={{ background: "var(--gray5)" }}>
          <div
            className="h-full transition-[width] duration-500 ease-out rounded-r-full"
            style={{
              width: `${progressPct}%`,
              background: "#29abe2",
            }}
          />
        </div>

        {/* Content area */}
        <div className="px-8 pt-8 pb-6 min-h-[420px] flex flex-col">
          {/* Step content with transition */}
          <div
            key={step}
            className="flex-1 flex flex-col"
            style={{
              animation: `onboarding-slide-${direction === "forward" ? "in" : "in-back"} 0.35s cubic-bezier(0.16, 1, 0.3, 1) both`,
            }}
          >
            {step === 0 && <StepWelcome name={displayName} />}
            {step === 1 && <StepEstimateWorkflow />}
            {step === 2 && <StepMeetAlex />}
            {step === 3 && <StepAllSet onAction={handleAction} />}
          </div>

          {/* Footer: dots + buttons */}
          <div className="flex items-center justify-between mt-6 pt-4" style={{ borderTop: "1px solid var(--gray5)" }}>
            {/* Step dots */}
            <div className="flex gap-2">
              {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
                <div
                  key={i}
                  className="h-2 rounded-full transition-all duration-300"
                  style={{
                    width: i === step ? 24 : 8,
                    background: i === step
                      ? "#29abe2"
                      : i < step
                        ? "var(--accent)"
                        : "var(--gray4)",
                    opacity: i <= step ? 1 : 0.5,
                  }}
                />
              ))}
            </div>

            {/* Nav buttons */}
            <div className="flex gap-2">
              {step > 0 && step < TOTAL_STEPS - 1 && (
                <button
                  onClick={prev}
                  className="px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-[var(--gray5)]"
                  style={{ color: "var(--secondary)" }}
                >
                  Back
                </button>
              )}
              {step === 0 && (
                <button
                  onClick={next}
                  className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
                  style={{ background: "#007aff" }}
                >
                  Get Started
                </button>
              )}
              {step > 0 && step < TOTAL_STEPS - 1 && (
                <button
                  onClick={next}
                  className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
                  style={{ background: "#007aff" }}
                >
                  Next
                </button>
              )}
              {step === TOTAL_STEPS - 1 && (
                <button
                  onClick={finish}
                  className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
                  style={{ background: "#34c759" }}
                >
                  Done
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Skip button */}
        {step < TOTAL_STEPS - 1 && (
          <button
            onClick={finish}
            className="absolute top-4 right-4 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors hover:bg-[var(--gray5)]"
            style={{ color: "var(--gray1)" }}
          >
            Skip
          </button>
        )}
      </div>

      {/* Inline animations */}
      <style>{`
        @keyframes onboarding-slide-in {
          0% { opacity: 0; transform: translateX(30px); }
          100% { opacity: 1; transform: translateX(0); }
        }
        @keyframes onboarding-slide-in-back {
          0% { opacity: 0; transform: translateX(-30px); }
          100% { opacity: 1; transform: translateX(0); }
        }
        @keyframes onboarding-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
        @keyframes onboarding-pulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}

/* ── Step Components ── */

function StepWelcome({ name }: { name: string }) {
  return (
    <div className="flex flex-col items-center justify-center flex-1 text-center">
      {/* Icon */}
      <div
        className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6 shadow-lg"
        style={{
          background: "#007aff",
          animation: "onboarding-float 3s ease-in-out infinite",
        }}
      >
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      </div>

      <h2 className="text-2xl font-bold" style={{ color: "var(--label)" }}>
        Welcome to MHP Estimate
      </h2>
      <p className="mt-2 text-lg font-medium" style={{ color: "var(--accent)" }}>
        Hi, {name}!
      </p>
      <p className="mt-4 text-sm leading-relaxed max-w-sm" style={{ color: "var(--secondary)" }}>
        Let's get you set up in under 2 minutes. We'll walk you through the key features
        so you can start creating professional estimates right away.
      </p>
    </div>
  );
}

function StepEstimateWorkflow() {
  const steps = [
    { icon: "M12 4v16m8-8H4", label: "Create", desc: "Start a new estimate" },
    { icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2", label: "Add Items", desc: "Line items & materials" },
    { icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z", label: "Validate", desc: "AI checks pricing" },
    { icon: "M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z", label: "Send", desc: "Deliver to client" },
  ];

  const tiers = [
    { name: "Budget", color: "#34c759", desc: "Cost-effective" },
    { name: "Midrange", color: "#ff9500", desc: "Balanced quality" },
    { name: "High-End", color: "#af52de", desc: "Premium finish" },
  ];

  return (
    <div className="flex flex-col flex-1">
      <h2 className="text-xl font-bold text-center" style={{ color: "var(--label)" }}>
        Your First Estimate
      </h2>
      <p className="mt-2 text-sm text-center" style={{ color: "var(--secondary)" }}>
        Creating estimates is simple. Here's the workflow:
      </p>

      {/* Workflow steps */}
      <div className="flex items-center justify-between mt-6 px-2">
        {steps.map((s, i) => (
          <div key={i} className="flex flex-col items-center gap-1.5 flex-1">
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center"
              style={{ background: `${i === 0 ? "#29abe2" : i === 1 ? "#007aff" : i === 2 ? "#5856d6" : "#34c759"}20` }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={i === 0 ? "#29abe2" : i === 1 ? "#007aff" : i === 2 ? "#5856d6" : "#34c759"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d={s.icon} />
              </svg>
            </div>
            <span className="text-xs font-semibold" style={{ color: "var(--label)" }}>{s.label}</span>
            <span className="text-[10px]" style={{ color: "var(--gray1)" }}>{s.desc}</span>
            {i < steps.length - 1 && (
              <div className="absolute" style={{ display: "none" }} />
            )}
          </div>
        ))}
      </div>

      {/* Connector arrows between steps */}
      <div className="flex items-center justify-between px-14 -mt-[52px] pointer-events-none" aria-hidden>
        {[0, 1, 2].map((i) => (
          <svg key={i} width="16" height="16" viewBox="0 0 16 16" className="opacity-30">
            <path d="M4 8h8M9 5l3 3-3 3" fill="none" stroke="var(--gray1)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ))}
      </div>

      {/* Pricing tiers */}
      <div className="mt-auto">
        <p className="text-xs font-semibold mb-3 text-center" style={{ color: "var(--secondary)" }}>
          3 Pricing Tiers
        </p>
        <div className="flex gap-3">
          {tiers.map((t) => (
            <div
              key={t.name}
              className="flex-1 rounded-xl p-3 text-center border transition-transform hover:scale-[1.02]"
              style={{ borderColor: `${t.color}30`, background: `${t.color}08` }}
            >
              <div className="w-3 h-3 rounded-full mx-auto mb-1.5" style={{ background: t.color }} />
              <p className="text-xs font-bold" style={{ color: t.color }}>{t.name}</p>
              <p className="text-[10px] mt-0.5" style={{ color: "var(--gray1)" }}>{t.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StepMeetAlex() {
  return (
    <div className="flex flex-col items-center justify-center flex-1 text-center">
      {/* Phone icon */}
      <div
        className="w-20 h-20 rounded-full flex items-center justify-center mb-6 shadow-lg"
        style={{
          background: "#34c759",
          animation: "onboarding-float 3s ease-in-out infinite",
        }}
      >
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
        </svg>
      </div>

      <h2 className="text-xl font-bold" style={{ color: "var(--label)" }}>
        Meet Alex, Your AI Assistant
      </h2>
      <p className="mt-4 text-sm leading-relaxed max-w-sm" style={{ color: "var(--secondary)" }}>
        You can call Alex anytime to create estimates by voice. Just tap the phone
        button in the bottom-right corner to start a conversation.
      </p>

      {/* Feature pills */}
      <div className="flex flex-wrap gap-2 mt-6 justify-center">
        {["Voice estimates", "Smart pricing", "Instant answers", "24/7 available"].map((f) => (
          <span
            key={f}
            className="px-3 py-1.5 rounded-full text-xs font-medium"
            style={{ background: "var(--gray5)", color: "var(--secondary)" }}
          >
            {f}
          </span>
        ))}
      </div>

      {/* Pulsing indicator */}
      <div className="flex items-center gap-2 mt-6">
        <div
          className="w-2 h-2 rounded-full"
          style={{ background: "#34c759", animation: "onboarding-pulse 2s ease-in-out infinite" }}
        />
        <span className="text-xs" style={{ color: "var(--gray1)" }}>Alex is always ready</span>
      </div>
    </div>
  );
}

function StepAllSet({ onAction }: { onAction: (action: string) => void }) {
  const actions = [
    {
      id: "create",
      icon: "M12 4v16m8-8H4",
      title: "Create First Estimate",
      desc: "Jump right in",
      bg: "#007aff",
    },
    {
      id: "dashboard",
      icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4",
      title: "Explore Dashboard",
      desc: "See the overview",
      bg: "#5856d6",
    },
    {
      id: "settings",
      icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z",
      title: "View Settings",
      desc: "Customize your setup",
      bg: "#ff9500",
    },
  ];

  return (
    <div className="flex flex-col items-center flex-1">
      {/* Checkmark */}
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
        style={{ background: "#34c75920" }}
      >
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#34c759" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>

      <h2 className="text-xl font-bold" style={{ color: "var(--label)" }}>
        You're All Set!
      </h2>
      <p className="mt-2 text-sm" style={{ color: "var(--secondary)" }}>
        Choose where to start:
      </p>

      {/* Action cards */}
      <div className="flex flex-col gap-3 mt-6 w-full">
        {actions.map((a) => (
          <button
            key={a.id}
            onClick={() => onAction(a.id)}
            className="flex items-center gap-4 p-4 rounded-xl border text-left transition-all hover:shadow-md hover:scale-[1.01] active:scale-[0.99]"
            style={{ borderColor: "var(--gray5)", background: "var(--card)" }}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: a.bg }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d={a.icon} />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: "var(--label)" }}>{a.title}</p>
              <p className="text-xs" style={{ color: "var(--gray1)" }}>{a.desc}</p>
            </div>
            <svg className="ml-auto flex-shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--gray2)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        ))}
      </div>
    </div>
  );
}
