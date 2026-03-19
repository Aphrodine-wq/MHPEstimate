import { useState, useEffect, useCallback } from "react";
import { isConnected } from "../lib/supabase";
import { useCompanySettings } from "../lib/store";
import { useDarkMode } from "../lib/useDarkMode";
import { BillingSettings } from "./BillingSettings";
import { IntegrationSettings } from "./IntegrationSettings";
import { CompanySettings } from "./settings/CompanySettings";
import { AppearanceSettings } from "./settings/AppearanceSettings";
import { NotificationSettings } from "./settings/NotificationSettings";
import { LaborRatesSettings } from "./settings/LaborRatesSettings";
import { Row, Group } from "./settings/shared";

const tabs = ["Company", "Estimates", "Labor Rates", "Appearance", "Notifications", "Pricing & MCP", "Billing", "Integrations"] as const;
type Tab = (typeof tabs)[number];

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("Company");
  const { data: settings, loading } = useCompanySettings();

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <header className="px-8 pt-4 pb-1">
        <p className="text-[12px] text-[var(--secondary)]">Company configuration and preferences</p>
      </header>

      {/* Tab selector */}
      <div className="px-8 pt-3 pb-2">
        <div className="inline-flex flex-wrap rounded-lg bg-[var(--gray5)] p-1">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`rounded-md px-4 py-1.5 text-[13px] font-medium transition-colors ${
                activeTab === tab
                  ? "bg-[var(--card)] text-[var(--foreground)] shadow-sm"
                  : "text-[var(--secondary)] hover:text-[var(--foreground)]"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="mx-auto w-full max-w-2xl px-8 py-4">
        {loading ? (
          <p className="text-[13px] text-[var(--secondary)]">Loading settings...</p>
        ) : (
          <>
            {activeTab === "Company" && <CompanySettings settings={settings} />}
            {activeTab === "Estimates" && <AppearanceSettings settings={settings} />}
            {activeTab === "Labor Rates" && <LaborRatesSettings />}
            {activeTab === "Appearance" && <ThemeTab />}
            {activeTab === "Notifications" && <NotificationSettings settings={settings} />}
            {activeTab === "Pricing & MCP" && <PricingMcpTab />}
            {activeTab === "Billing" && <BillingSettings />}
            {activeTab === "Integrations" && <IntegrationsTab />}
          </>
        )}
      </div>
    </div>
  );
}

function ThemeTab() {
  const { theme, setTheme } = useDarkMode();
  const options: Array<{ value: "light" | "dark" | "system"; label: string }> = [
    { value: "light", label: "Light" },
    { value: "dark", label: "Dark" },
    { value: "system", label: "System" },
  ];

  return (
    <Group title="Theme">
      <div className="px-4 py-3">
        <p className="text-[13px] mb-2">Color Mode</p>
        <div className="inline-flex rounded-lg bg-[var(--gray5)] p-1">
          {options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setTheme(opt.value)}
              className={`rounded-md px-4 py-1.5 text-[13px] font-medium transition-colors ${
                theme === opt.value
                  ? "bg-[var(--card)] text-[var(--foreground)] shadow-sm"
                  : "text-[var(--secondary)] hover:text-[var(--foreground)]"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <p className="mt-2 text-[11px] text-[var(--secondary)]">
          {theme === "system" ? "Follows your operating system preference" : `Using ${theme} mode`}
        </p>
      </div>
    </Group>
  );
}

type McpStatus = "connected" | "down" | "rate_limited" | "auth_required" | "unknown";

interface RetailerHealth {
  name: string;
  status: McpStatus;
  lastChecked: string | null;
  responseTimeMs: number | null;
}

const RETAILERS: RetailerHealth[] = [
  { name: "Home Depot", status: "unknown", lastChecked: null, responseTimeMs: null },
  { name: "Lowe's", status: "unknown", lastChecked: null, responseTimeMs: null },
  { name: "Ferguson", status: "unknown", lastChecked: null, responseTimeMs: null },
  { name: "Amazon", status: "unknown", lastChecked: null, responseTimeMs: null },
];

function PricingMcpTab() {
  const [retailers, setRetailers] = useState<RetailerHealth[]>(RETAILERS);
  const [checking, setChecking] = useState(false);
  const [defaultZip, setDefaultZip] = useState("");
  const [refreshInterval, setRefreshInterval] = useState("60");
  const [stalenessThreshold, setStalenessThreshold] = useState("7");
  const [requireLiveAbove, setRequireLiveAbove] = useState("");
  const [retailerPriority, setRetailerPriority] = useState(["Home Depot", "Lowe's", "Ferguson", "Amazon"]);

  const checkHealth = useCallback(async () => {
    setChecking(true);
    try {
      const res = await fetch("/api/pricing/health", { signal: AbortSignal.timeout(8000) });
      if (res.ok) {
        const data = await res.json();
        if (data.retailers) setRetailers(data.retailers);
      }
    } catch {
      // Endpoint may not exist yet
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => { checkHealth(); }, [checkHealth]);

  const statusDot = (s: McpStatus) => {
    switch (s) {
      case "connected": return "bg-[var(--green)]";
      case "down": return "bg-[var(--red)]";
      case "rate_limited": return "bg-yellow-400";
      case "auth_required": return "bg-[var(--orange)]";
      default: return "bg-[var(--gray3)]";
    }
  };

  const statusText = (s: McpStatus) => {
    switch (s) {
      case "connected": return "Connected";
      case "down": return "Offline";
      case "rate_limited": return "Rate Limited";
      case "auth_required": return "Auth Required";
      default: return "Not Checked";
    }
  };

  return (
    <>
      <Group title="MCP Retailer Status">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[13px] font-medium">Live Price Scraper Connections</p>
            <button
              onClick={checkHealth}
              disabled={checking}
              className="rounded-md border border-[var(--sep)] px-3 py-1 text-[12px] font-medium transition-colors hover:bg-[var(--fill)] disabled:opacity-50"
            >
              {checking ? "Checking..." : "Check All"}
            </button>
          </div>
          <div className="space-y-2">
            {retailers.map((r) => (
              <div key={r.name} className="flex items-center justify-between rounded-lg bg-[var(--fill)] px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className={`h-2.5 w-2.5 rounded-full ${statusDot(r.status)}`} />
                  <div>
                    <p className="text-[13px] font-medium">{r.name}</p>
                    {r.lastChecked && (
                      <p className="text-[10px] text-[var(--tertiary)]">Last checked: {new Date(r.lastChecked).toLocaleTimeString()}</p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-[12px] font-medium ${r.status === "connected" ? "text-[var(--green)]" : r.status === "down" ? "text-[var(--red)]" : "text-[var(--secondary)]"}`}>
                    {statusText(r.status)}
                  </p>
                  {r.responseTimeMs != null && (
                    <p className="text-[10px] text-[var(--tertiary)]">{r.responseTimeMs}ms</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Group>

      <Group title="Pricing Configuration">
        <div className="px-4 py-3 space-y-4">
          <div>
            <label className="text-[13px] font-medium block mb-1">Default ZIP Code</label>
            <input
              type="text"
              value={defaultZip}
              onChange={(e) => setDefaultZip(e.target.value)}
              placeholder="e.g. 38655"
              maxLength={5}
              className="w-40 rounded-lg border border-[var(--sep)] bg-[var(--bg)] px-3 py-1.5 text-[13px] outline-none focus:border-[var(--accent)]"
            />
            <p className="mt-1 text-[11px] text-[var(--secondary)]">Used when no ZIP is specified on an estimate</p>
          </div>

          <div>
            <label className="text-[13px] font-medium block mb-1">Auto-Refresh Interval (minutes)</label>
            <select
              value={refreshInterval}
              onChange={(e) => setRefreshInterval(e.target.value)}
              className="w-40 rounded-lg border border-[var(--sep)] bg-[var(--bg)] px-3 py-1.5 text-[13px] outline-none focus:border-[var(--accent)]"
            >
              <option value="15">15 minutes</option>
              <option value="30">30 minutes</option>
              <option value="60">1 hour</option>
              <option value="180">3 hours</option>
              <option value="0">Manual only</option>
            </select>
            <p className="mt-1 text-[11px] text-[var(--secondary)]">How often to refresh pricing data from retailers</p>
          </div>

          <div>
            <label className="text-[13px] font-medium block mb-1">Price Staleness Threshold (days)</label>
            <input
              type="number"
              value={stalenessThreshold}
              onChange={(e) => setStalenessThreshold(e.target.value)}
              min={1}
              max={90}
              className="w-40 rounded-lg border border-[var(--sep)] bg-[var(--bg)] px-3 py-1.5 text-[13px] outline-none focus:border-[var(--accent)]"
            />
            <p className="mt-1 text-[11px] text-[var(--secondary)]">Warn when pricing data is older than this</p>
          </div>

          <div>
            <label className="text-[13px] font-medium block mb-1">Require Live Pricing Above</label>
            <div className="flex items-center gap-2">
              <span className="text-[13px] text-[var(--secondary)]">$</span>
              <input
                type="number"
                value={requireLiveAbove}
                onChange={(e) => setRequireLiveAbove(e.target.value)}
                placeholder="Leave blank to disable"
                className="w-48 rounded-lg border border-[var(--sep)] bg-[var(--bg)] px-3 py-1.5 text-[13px] outline-none focus:border-[var(--accent)]"
              />
            </div>
            <p className="mt-1 text-[11px] text-[var(--secondary)]">Require live MCP pricing for estimates above this amount</p>
          </div>
        </div>
      </Group>

      <Group title="Retailer Priority">
        <div className="px-4 py-3">
          <p className="text-[13px] mb-2">When multiple retailers have pricing, prefer in this order:</p>
          <div className="space-y-1.5">
            {retailerPriority.map((name, i) => (
              <div key={name} className="flex items-center gap-3 rounded-lg bg-[var(--fill)] px-3 py-2">
                <span className="text-[12px] font-bold text-[var(--accent)] w-5">{i + 1}</span>
                <span className="text-[13px] flex-1">{name}</span>
                <div className="flex gap-1">
                  {i > 0 && (
                    <button
                      onClick={() => {
                        const next = [...retailerPriority];
                        const tmp = next[i - 1]!;
                        next[i - 1] = next[i]!;
                        next[i] = tmp;
                        setRetailerPriority(next);
                      }}
                      className="rounded px-1.5 py-0.5 text-[11px] text-[var(--secondary)] hover:bg-[var(--card)]"
                    >
                      Up
                    </button>
                  )}
                  {i < retailerPriority.length - 1 && (
                    <button
                      onClick={() => {
                        const next = [...retailerPriority];
                        const tmp = next[i]!;
                        next[i] = next[i + 1]!;
                        next[i + 1] = tmp;
                        setRetailerPriority(next);
                      }}
                      className="rounded px-1.5 py-0.5 text-[11px] text-[var(--secondary)] hover:bg-[var(--card)]"
                    >
                      Down
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Group>
    </>
  );
}

function IntegrationsTab() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined;
  const agentId = process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID as string | undefined;

  return (
    <>
      <IntegrationSettings />
      <div className="mt-4" />
      <Group title="Supabase">
        <Row label="Status" value={isConnected() ? "Connected" : "Not connected"} />
        <Row label="URL" value={url ? `${url.slice(0, 32)}...` : "Not configured"} />
      </Group>
      <Group title="AI Services">
        <Row label="Alex (ElevenLabs)" value={agentId || "Not configured"} />
      </Group>
      <Group title="MCP Price Scraper">
        <Row label="Connection" value="Configure in Pricing & MCP tab" />
      </Group>
      <Group title="Application">
        <Row label="Version" value="1.0.0-dev" />
      </Group>
    </>
  );
}
