import { useState } from "react";
import { isConnected } from "../lib/supabase";

export function SettingsPage() {
  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <header className="px-8 pt-6 pb-1">
        <h1 className="text-[24px] font-bold tracking-tight">Settings</h1>
        <p className="text-[12px] text-[var(--secondary)]">Company configuration and preferences</p>
      </header>

      <div className="mx-auto w-full max-w-2xl px-8 py-4">
        <Group title="Connection">
          <Row label="Supabase" value={isConnected() ? "Connected" : "Not connected"} />
          <Row label="Status" value={isConnected() ? "Online" : "Add VITE_SUPABASE_URL to .env"} />
        </Group>

        <Group title="Company">
          <Row label="Company Name" value="MS Home Pros" action />
          <Row label="License Number" value="—" action />
          <Row label="Phone" value="—" action />
          <Row label="Email" value="—" action />
        </Group>

        <Group title="Estimation Defaults">
          <Row label="Material Markup" value="17.5%" action />
          <Row label="Labor Markup" value="25%" action />
          <Row label="Target Gross Margin" value="35–42%" action />
          <Row label="Default Contingency" value="15%" action />
          <Row label="Estimate Validity" value="30 days" action />
        </Group>

        <Group title="Pricing">
          <Row label="Price Freshness (Green)" value="0–30 days" />
          <Row label="Price Freshness (Yellow)" value="31–60 days" />
          <Row label="Price Freshness (Orange)" value="61–90 days" />
          <Row label="Price Freshness (Red)" value="90+ days" />
        </Group>

        <Group title="Notifications">
          <ToggleRow label="Estimate Updates" on />
          <ToggleRow label="Price Alerts" on />
          <ToggleRow label="Invoice Processing" on />
          <ToggleRow label="Daily Summary Email" on={false} />
        </Group>

        <Group title="Application">
          <Row label="Theme" value="System" action />
          <Row label="Offline Mode" value="Enabled" action />
          <Row label="Auto-update" value="Enabled" action />
          <Row label="Version" value="1.0.0-dev" />
        </Group>
      </div>
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <p className="mb-1.5 px-1 text-[11px] font-medium uppercase tracking-wide text-[var(--secondary)]">{title}</p>
      <div className="rounded-xl border border-[var(--sep)] bg-[var(--card)] divide-y divide-[var(--sep)]">{children}</div>
    </div>
  );
}

function Row({ label, value, action }: { label: string; value: string; action?: boolean }) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <p className="text-[13px]">{label}</p>
      <div className="flex items-center gap-1">
        <p className="text-[13px] text-[var(--secondary)]">{value}</p>
        {action && (
          <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="var(--gray3)" strokeWidth="2.5" strokeLinecap="round"><path d="m9 18 6-6-6-6" /></svg>
        )}
      </div>
    </div>
  );
}

function ToggleRow({ label, on }: { label: string; on: boolean }) {
  const [enabled, setEnabled] = useState(on);
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <p className="text-[13px]">{label}</p>
      <button
        onClick={() => setEnabled(!enabled)}
        className={`relative h-[28px] w-[46px] rounded-full transition-colors ${enabled ? "bg-[var(--green)]" : "bg-[var(--gray4)]"}`}
      >
        <div className={`absolute top-[2px] h-[24px] w-[24px] rounded-full bg-white shadow transition-transform ${enabled ? "translate-x-[20px]" : "translate-x-[2px]"}`} />
      </button>
    </div>
  );
}
