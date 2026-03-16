import { useState } from "react";
import { isConnected } from "../lib/supabase";
import { useCompanySettings } from "../lib/store";
import { IntegrationSettings } from "./IntegrationSettings";
import { CompanySettings } from "./settings/CompanySettings";
import { AppearanceSettings } from "./settings/AppearanceSettings";
import { NotificationSettings } from "./settings/NotificationSettings";
import { Row, Group } from "./settings/shared";

const tabs = ["Company", "Estimates", "Notifications", "Integrations"] as const;
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
        <div className="inline-flex rounded-lg bg-[var(--gray5)] p-1">
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
            {activeTab === "Notifications" && <NotificationSettings settings={settings} />}
            {activeTab === "Integrations" && <IntegrationsTab />}
          </>
        )}
      </div>
    </div>
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
        <Row label="ElevenLabs Agent" value={agentId || "Not configured"} />
      </Group>
      <Group title="Application">
        <Row label="Version" value="1.0.0-dev" />
      </Group>
    </>
  );
}
