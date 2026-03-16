import { Field, inputClass, selectClass } from "../Modal";
import {
  ALL_PROJECT_TYPES,
  TIERS,
  TIER_LABELS,
  TIER_DESC,
  ESTIMATE_CATEGORIES,
  FOUNDATION_OPTIONS,
  SQFT_TARGET,
  type TierKey,
  type EstimateCategory,
  type FoundationType,
} from "./types";

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
  estimateCategory: EstimateCategory;
  setEstimateCategory: (v: EstimateCategory) => void;
  foundationType: FoundationType | null;
  setFoundationType: (v: FoundationType | null) => void;
  foundationBlockHeight: number | null;
  setFoundationBlockHeight: (v: number | null) => void;
  squareFootage: number | null;
  setSquareFootage: (v: number | null) => void;
  costPerSqft: number | null;
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
  estimateCategory,
  setEstimateCategory,
  foundationType,
  setFoundationType,
  foundationBlockHeight,
  setFoundationBlockHeight,
  squareFootage,
  setSquareFootage,
  costPerSqft,
}: EstimateHeaderSectionProps) {
  const sqftInRange = costPerSqft !== null && costPerSqft >= SQFT_TARGET.min && costPerSqft <= SQFT_TARGET.max;
  const sqftColor = costPerSqft === null
    ? "text-[var(--tertiary)]"
    : sqftInRange
      ? "text-[var(--green)]"
      : costPerSqft < SQFT_TARGET.min
        ? "text-[var(--orange)]"
        : "text-[var(--red)]";

  return (
    <div className="border-b border-[var(--sep)] pb-5 space-y-3">
      {/* Row 0: Estimate Category toggle */}
      <div className="flex items-center gap-3">
        <span className="text-[11px] font-medium uppercase tracking-wide text-[var(--secondary)]">Estimate Type</span>
        <div className="flex rounded-lg bg-[var(--gray5)] p-0.5">
          {ESTIMATE_CATEGORIES.map((cat) => (
            <button
              key={cat.key}
              type="button"
              onClick={() => setEstimateCategory(cat.key)}
              className={`rounded-md px-3 py-1.5 text-[12px] font-medium transition-all ${
                estimateCategory === cat.key
                  ? "bg-[var(--card)] text-[var(--label)] shadow-sm"
                  : "text-[var(--secondary)]"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
        <span className="text-[10px] text-[var(--tertiary)]">
          {estimateCategory === "infrastructure"
            ? "Separate contract — keeps site costs off building $/sqft"
            : "Structure, finishes, and MEP"}
        </span>
      </div>

      {/* Row 1: Project Type / Client / Tier */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <Field label="Project Type">
          <select
            className={selectClass}
            value={projectType}
            onChange={(e) => setProjectType(e.target.value)}
          >
            {ALL_PROJECT_TYPES.map((t) => (
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

      {/* Row 2: Address / Valid Through / Square Footage */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
        <Field label="Square Footage">
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="0"
              step="1"
              className={inputClass}
              placeholder="e.g. 2200"
              value={squareFootage ?? ""}
              onChange={(e) => setSquareFootage(e.target.value ? parseFloat(e.target.value) : null)}
            />
            {costPerSqft !== null && squareFootage && squareFootage > 0 && (
              <span className={`whitespace-nowrap text-[12px] font-semibold tabular-nums ${sqftColor}`}>
                ${costPerSqft.toFixed(0)}/sqft
              </span>
            )}
          </div>
          {estimateCategory === "building" && (
            <p className="mt-1 text-[10px] text-[var(--tertiary)]">
              Target: {SQFT_TARGET.min}–{SQFT_TARGET.max} $/sqft
            </p>
          )}
        </Field>
      </div>

      {/* Row 3: Foundation (building estimates only) */}
      {estimateCategory === "building" && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Field label="Foundation Type">
            <select
              className={selectClass}
              value={foundationType ?? ""}
              onChange={(e) => setFoundationType(e.target.value as FoundationType || null)}
            >
              <option value="">Select foundation...</option>
              {FOUNDATION_OPTIONS.map((f) => (
                <option key={f.key} value={f.key}>{f.label}</option>
              ))}
            </select>
            {foundationType && (
              <p className="mt-1 text-[10px] text-[var(--tertiary)]">
                {FOUNDATION_OPTIONS.find((f) => f.key === foundationType)?.desc}
              </p>
            )}
          </Field>

          {foundationType === "raised_slab" && (
            <Field label="Block Height (courses)">
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="2"
                  max="6"
                  step="1"
                  className={inputClass}
                  value={foundationBlockHeight ?? 3}
                  onChange={(e) => setFoundationBlockHeight(parseInt(e.target.value) || 3)}
                />
                <span className="text-[11px] text-[var(--tertiary)] whitespace-nowrap">
                  blocks tall ({((foundationBlockHeight ?? 3) * 8)}″ stem wall)
                </span>
              </div>
            </Field>
          )}
        </div>
      )}
    </div>
  );
}
