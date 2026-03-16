import { useState, useEffect } from "react";
import { upsertSetting } from "../../lib/store";

/* ── Layout Components ── */

export function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <p className="mb-1.5 px-1 text-[11px] font-medium uppercase tracking-wide text-[var(--secondary)]">{title}</p>
      <div className="rounded-xl border border-[var(--sep)] bg-[var(--card)] divide-y divide-[var(--sep)]">{children}</div>
    </div>
  );
}

export function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <p className="text-[13px]">{label}</p>
      <p className="text-[13px] text-[var(--secondary)]">{value}</p>
    </div>
  );
}

/* ── Editable Row ── */

const inputClass =
  "bg-transparent text-right text-[13px] text-[var(--secondary)] outline-none border border-transparent rounded px-2 py-0.5 focus:border-[var(--accent)] focus:text-[var(--foreground)] transition-colors w-48";

export function EditableRow({
  label,
  settingKey,
  settings,
  defaultValue = "",
  type = "text",
  multiline = false,
}: {
  label: string;
  settingKey: string;
  settings: Record<string, unknown>;
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

/* ── Segmented Row ── */

export function SegmentedRow({
  label,
  settingKey,
  settings,
  options,
  labels,
  defaultValue,
}: {
  label: string;
  settingKey: string;
  settings: Record<string, unknown>;
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

/* ── Toggle Rows ── */

export function ToggleRow({
  label,
  settingKey,
  settings,
  defaultValue,
}: {
  label: string;
  settingKey: string;
  settings: Record<string, unknown>;
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

export function ToggleRowWithDesc({
  label,
  description,
  settingKey,
  settings,
  defaultValue,
}: {
  label: string;
  description: string;
  settingKey: string;
  settings: Record<string, unknown>;
  defaultValue: boolean;
}) {
  const enabled = (settings[settingKey] as boolean | undefined) ?? defaultValue;

  const toggle = () => {
    upsertSetting(settingKey, !enabled);
  };

  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3">
      <div className="min-w-0">
        <p className="text-[13px]">{label}</p>
        <p className="text-[11px] text-[var(--secondary)] mt-0.5 leading-snug">{description}</p>
      </div>
      <button
        onClick={toggle}
        role="switch"
        aria-checked={enabled}
        aria-label={label}
        className={`relative flex-shrink-0 h-[28px] w-[46px] rounded-full transition-colors ${enabled ? "bg-[var(--green)]" : "bg-[var(--gray4)]"}`}
      >
        <div className={`absolute top-[2px] h-[24px] w-[24px] rounded-full bg-white shadow transition-transform ${enabled ? "translate-x-[20px]" : "translate-x-[2px]"}`} />
      </button>
    </div>
  );
}
