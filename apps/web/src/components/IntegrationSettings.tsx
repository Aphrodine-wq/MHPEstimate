import { useState, useEffect } from "react";

interface IntegrationStatus {
  name: string;
  key: string;
  icon: React.ReactNode;
  connected: boolean;
  description: string;
  detail: string;
  color: string;
}

function CheckIcon() {
  return (
    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="var(--green)" strokeWidth="2" strokeLinecap="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="var(--gray2)" strokeWidth="2" strokeLinecap="round">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

export function IntegrationSettings() {
  const [stripeConfigured, setStripeConfigured] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Check Stripe status by hitting the payment link endpoint
    async function checkIntegrations() {
      try {
        // We just need to know if Stripe is configured — use a dummy estimate ID
        const res = await fetch("/api/estimates/check/payment-link");
        if (res.ok) {
          const data = await res.json();
          setStripeConfigured(data.configured === true);
        }
      } catch {
        // Stripe check failed — treat as not configured
      }
      setChecking(false);
    }
    checkIntegrations();
  }, []);

  const integrations: IntegrationStatus[] = [
    {
      name: "QuickBooks",
      key: "quickbooks",
      icon: (
        <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#2ca01c" strokeWidth="1.5" strokeLinecap="round">
          <rect x="2" y="3" width="20" height="18" rx="2" />
          <path d="M8 7v10M12 7v10M16 7v10" />
        </svg>
      ),
      connected: true, // Export is always available (no API key needed)
      description: "Export estimates to QuickBooks IIF or CSV format",
      detail: "Use the Export button on any estimate to download in QuickBooks-compatible format. Import the IIF file directly into QuickBooks Desktop, or use CSV for QuickBooks Online, Xero, or spreadsheets.",
      color: "#2ca01c",
    },
    {
      name: "Stripe Payments",
      key: "stripe",
      icon: (
        <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#635bff" strokeWidth="1.5" strokeLinecap="round">
          <rect x="1" y="4" width="22" height="16" rx="2" />
          <path d="M1 10h22" />
        </svg>
      ),
      connected: stripeConfigured,
      description: "Accept online payments for estimates via Stripe Checkout",
      detail: stripeConfigured
        ? "Stripe is connected. Payment links can be generated from the estimate editor. Clients receive a secure Checkout page to pay by card."
        : "Set the STRIPE_SECRET_KEY environment variable to enable payment link generation. Get your API key from dashboard.stripe.com.",
      color: "#635bff",
    },
    {
      name: "Digital Signatures",
      key: "signatures",
      icon: (
        <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#e67e22" strokeWidth="1.5" strokeLinecap="round">
          <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
        </svg>
      ),
      connected: true, // Built-in, always available
      description: "Capture legally binding digital signatures on estimates",
      detail: "Built-in signature capture is always available. Clients can sign estimates directly in the app using their mouse or touchscreen. Signatures are timestamped and stored with the estimate record.",
      color: "#e67e22",
    },
  ];

  if (checking) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 animate-pulse rounded-xl border border-[var(--sep)] bg-[var(--gray5)]" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[14px] font-semibold text-[var(--label)]">Integrations</p>
          <p className="text-[11px] text-[var(--secondary)]">
            Connect third-party services to extend MHP Estimate
          </p>
        </div>
      </div>

      {integrations.map((integration) => (
        <IntegrationCard key={integration.key} integration={integration} />
      ))}
    </div>
  );
}

function IntegrationCard({ integration }: { integration: IntegrationStatus }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-xl border border-[var(--sep)] bg-[var(--card)] overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-[var(--bg)]"
      >
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-[var(--gray5)]">
          {integration.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-[13px] font-medium text-[var(--label)]">{integration.name}</p>
            <span
              className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                integration.connected
                  ? "bg-green-50 text-green-700"
                  : "bg-[var(--gray5)] text-[var(--gray2)]"
              }`}
            >
              {integration.connected ? <CheckIcon /> : <XIcon />}
              {integration.connected ? "Active" : "Not configured"}
            </span>
          </div>
          <p className="text-[11px] text-[var(--secondary)] truncate">{integration.description}</p>
        </div>
        <svg
          width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="var(--gray2)" strokeWidth="2" strokeLinecap="round"
          className={`flex-shrink-0 transition-transform ${expanded ? "rotate-180" : ""}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {expanded && (
        <div className="border-t border-[var(--sep)] px-4 py-3">
          <p className="text-[12px] text-[var(--secondary)] leading-relaxed">
            {integration.detail}
          </p>
        </div>
      )}
    </div>
  );
}
