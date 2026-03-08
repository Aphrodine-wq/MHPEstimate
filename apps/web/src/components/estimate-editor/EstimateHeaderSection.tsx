import { Field, inputClass, selectClass } from "../Modal";
import { PROJECT_TYPES, TIERS, TIER_LABELS, TIER_DESC, type TierKey } from "./types";

interface Client {
  id: string;
  full_name: string;
}

export interface EstimateHeaderSectionProps {
  projectType: string;
  setProjectType: (v: string) => void;
  clientId: string | null;
  setClientId: (v: string | null) => void;
  tier: TierKey;
  setTier: (v: TierKey) => void;
  projectAddress: string;
  setProjectAddress: (v: string) => void;
  validThrough: string;
  setValidThrough: (v: string) => void;
  clients: Client[];
}

export function EstimateHeaderSection({
  projectType,
  setProjectType,
  clientId,
  setClientId,
  tier,
  setTier,
  projectAddress,
  setProjectAddress,
  validThrough,
  setValidThrough,
  clients,
}: EstimateHeaderSectionProps) {
  return (
    <div className="border-b border-[var(--sep)] pb-5 space-y-3">
      {/* Row 1: Project Type / Client / Tier */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <Field label="Project Type">
          <select
            className={selectClass}
            value={projectType}
            onChange={(e) => setProjectType(e.target.value)}
          >
            {PROJECT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Client">
          <select
            className={selectClass}
            value={clientId ?? ""}
            onChange={(e) => setClientId(e.target.value || null)}
          >
            <option value="">No client</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.full_name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Pricing Tier">
          <div className="flex rounded-lg bg-[var(--gray5)] p-0.5">
            {TIERS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTier(t)}
                className={`flex-1 rounded-md px-2 py-1.5 text-[12px] font-medium transition-all ${
                  tier === t
                    ? "bg-[var(--card)] text-[var(--label)] shadow-sm"
                    : "text-[var(--secondary)]"
                }`}
              >
                {TIER_LABELS[t]}
              </button>
            ))}
          </div>
          <p className="mt-1 text-[10px] text-[var(--tertiary)]">{TIER_DESC[tier]}</p>
        </Field>
      </div>

      {/* Row 2: Address / Valid Through */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Project Address">
          <input
            className={inputClass}
            placeholder="123 Main St, City, ST 00000"
            value={projectAddress}
            onChange={(e) => setProjectAddress(e.target.value)}
          />
        </Field>
        <Field label="Valid Through">
          <input
            type="date"
            className={inputClass}
            value={validThrough}
            onChange={(e) => setValidThrough(e.target.value)}
          />
        </Field>
      </div>
    </div>
  );
}
