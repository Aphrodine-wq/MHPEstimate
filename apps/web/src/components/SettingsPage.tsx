import { useState, useEffect } from "react";
import { isConnected } from "../lib/supabase";
import { useCompanySettings, upsertSetting } from "../lib/store";

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
            {activeTab === "Company" && <CompanyTab settings={settings} />}
            {activeTab === "Estimates" && <EstimatesTab settings={settings} />}
            {activeTab === "Notifications" && <NotificationsTab settings={settings} />}
            {activeTab === "Integrations" && <IntegrationsTab />}
          </>
        )}
      </div>
    </div>
  );
}

/* ── Tab Components ── */

function CompanyTab({ settings }: { settings: Record<string, any> }) {
  return (
    <>
      <Group title="Business Info">
        <EditableRow label="Company Name" settingKey="company_name" settings={settings} defaultValue="MS Home Pros" />
        <EditableRow label="License Number" settingKey="license_number" settings={settings} />
        <EditableRow label="Phone" settingKey="company_phone" settings={settings} />
        <EditableRow label="Email" settingKey="company_email" settings={settings} />
        <EditableRow label="Address" settingKey="company_address" settings={settings} />
      </Group>
      <Group title="Default Rates">
        <EditableRow label="Default Tax Rate %" settingKey="default_tax_rate" settings={settings} defaultValue={8.25} type="number" />
        <EditableRow label="Default Markup %" settingKey="default_markup" settings={settings} defaultValue={17.5} type="number" />
        <EditableRow label="Default Contingency %" settingKey="default_contingency" settings={settings} defaultValue={15} type="number" />
      </Group>
    </>
  );
}

function EstimatesTab({ settings }: { settings: Record<string, any> }) {
  return (
    <>
      <Group title="Pricing">
        <SegmentedRow
          label="Default Pricing Tier"
          settingKey="default_tier"
          settings={settings}
          options={["budget", "midrange", "high_end"]}
          labels={{ budget: "Budget", midrange: "Midrange", high_end: "High End" }}
          defaultValue="midrange"
        />
        <EditableRow label="Estimate Validity Days" settingKey="valid_for_days" settings={settings} defaultValue={30} type="number" />
        <EditableRow label="Target Gross Margin %" settingKey="target_margin" settings={settings} defaultValue="35-42" />
      </Group>
      <Group title="Uploaded Documents">
        <EditableRow label="Payment Terms" settingKey="payment_terms" settings={settings} multiline />
        <EditableRow label="Warranty Text" settingKey="warranty_text" settings={settings} multiline />
        <EditableRow label="Default Scope Inclusions" settingKey="scope_inclusions_template" settings={settings} multiline />
        <EditableRow label="Default Scope Exclusions" settingKey="scope_exclusions_template" settings={settings} multiline />
      </Group>
    </>
  );
}

function NotificationsTab({ settings }: { settings: Record<string, any> }) {
  return (
    <Group title="Notifications">
      <ToggleRow label="Estimate Accepted" settingKey="notify_estimate_accepted" settings={settings} defaultValue={true} />
      <ToggleRow label="Estimate Expiring" settingKey="notify_estimate_expiring" settings={settings} defaultValue={true} />
      <ToggleRow label="Invoice Processed" settingKey="notify_invoice_processed" settings={settings} defaultValue={true} />
      <ToggleRow label="Price Alerts" settingKey="notify_price_alerts" settings={settings} defaultValue={true} />
      <ToggleRow label="Daily Summary Email" settingKey="notify_daily_summary" settings={settings} defaultValue={false} />
    </Group>
  );
}

function IntegrationsTab() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined;
  const agentId = process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID as string | undefined;

  return (
    <>
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

/* ── Shared Components ── */

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <p className="mb-1.5 px-1 text-[11px] font-medium uppercase tracking-wide text-[var(--secondary)]">{title}</p>
      <div className="rounded-xl border border-[var(--sep)] bg-[var(--card)] divide-y divide-[var(--sep)]">{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <p className="text-[13px]">{label}</p>
      <p className="text-[13px] text-[var(--secondary)]">{value}</p>
    </div>
  );
}

const inputClass =
  "bg-transparent text-right text-[13px] text-[var(--secondary)] outline-none border border-transparent rounded px-2 py-0.5 focus:border-[var(--accent)] focus:text-[var(--foreground)] transition-colors w-48";

function EditableRow({
  label,
  settingKey,
  settings,
  defaultValue = "",
  type = "text",
  multiline = false,
}: {
  label: string;
  settingKey: string;
  settings: Record<string, any>;
  defaultValue?: string | number;
  type?: "text" | "number";
  multiline?: boolean;
}) {
  const stored = settings[settingKey];
  const initial = stored !== undefined ? String(stored) : String(defaultValue);
  const [value, setValue] = useState(initial);

  useEffect(() => {
    const next = stored !== undefined ? String(stored) : String(defaultValue);
    setValue(next);
  }, [stored, defaultValue]);

  const save = () => {
    const parsed = type === "number" ? parseFloat(value) || 0 : value;
    if (String(parsed) !== initial) {
      upsertSetting(settingKey, parsed);
    }
  };

  if (multiline) {
    return (
      <div className="px-4 py-3">
        <p className="text-[13px] mb-1.5">{label}</p>
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={save}
          rows={3}
          className="w-full rounded-md border border-[var(--sep)] bg-transparent px-3 py-2 text-[13px] text-[var(--secondary)] outline-none focus:border-[var(--accent)] focus:text-[var(--foreground)] transition-colors resize-none"
        />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between px-4 py-3">
      <p className="text-[13px]">{label}</p>
      <input
        type={type}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={save}
        className={inputClass}
      />
    </div>
  );
}

function SegmentedRow({
  label,
  settingKey,
  settings,
  options,
  labels,
  defaultValue,
}: {
  label: string;
  settingKey: string;
  settings: Record<string, any>;
  options: string[];
  labels?: Record<string, string>;
  defaultValue: string;
}) {
  const current = (settings[settingKey] as string) ?? defaultValue;

  const select = (opt: string) => {
    if (opt !== current) {
      upsertSetting(settingKey, opt);
    }
  };

  const TIER_DESC: Record<string, string> = {
    budget: "Economy-grade materials, basic finishes, cost-effective labor. Best for rental properties, quick flips, or tight budgets.",
    midrange: "Quality brand-name materials, standard upgrades, professional finishes. The most popular choice for homeowner renovations.",
    high_end: "Premium and designer-grade materials, custom craftsmanship, luxury finishes. For high-end homes and clients who want the best.",
  };

  return (
    <div className="px-4 py-3">
      <div className="flex items-center justify-between">
        <p className="text-[13px]">{label}</p>
        <div className="inline-flex rounded-md bg-[var(--gray5)] p-0.5">
          {options.map((opt) => (
            <button
              key={opt}
              onClick={() => select(opt)}
              className={`rounded px-3 py-1 text-[12px] font-medium transition-colors ${
                current === opt
                  ? "bg-[var(--card)] text-[var(--foreground)] shadow-sm"
                  : "text-[var(--secondary)] hover:text-[var(--foreground)]"
              }`}
            >
              {labels?.[opt] ?? opt}
            </button>
          ))}
        </div>
      </div>
      {TIER_DESC[current] && (
        <p className="mt-1.5 text-[11px] text-[var(--secondary)]">{TIER_DESC[current]}</p>
      )}
    </div>
  );
}

function ToggleRow({
  label,
  settingKey,
  settings,
  defaultValue,
}: {
  label: string;
  settingKey: string;
  settings: Record<string, any>;
  defaultValue: boolean;
}) {
  const enabled = (settings[settingKey] as boolean | undefined) ?? defaultValue;

  const toggle = () => {
    upsertSetting(settingKey, !enabled);
  };

  return (
    <div className="flex items-center justify-between px-4 py-3">
      <p className="text-[13px]">{label}</p>
      <button
        onClick={toggle}
        role="switch"
        aria-checked={enabled}
        aria-label={label}
        className={`relative h-[28px] w-[46px] rounded-full transition-colors ${enabled ? "bg-[var(--green)]" : "bg-[var(--gray4)]"}`}
      >
        <div className={`absolute top-[2px] h-[24px] w-[24px] rounded-full bg-white shadow transition-transform ${enabled ? "translate-x-[20px]" : "translate-x-[2px]"}`} />
      </button>
    </div>
  );
}
