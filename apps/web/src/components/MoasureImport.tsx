import { useRef, useState } from "react";
import * as Sentry from "@sentry/nextjs";
import {
  parseMoasureFile,
  mapMoasureToEstimate,
  generateEstimateFromPad,
  type MoasureMapping,
  type PadEstimateResult,
  type GradingAnalysis,
} from "@proestimate/estimation-engine";
import type { DraftLine } from "./estimate-editor/types";

interface MoasureImportProps {
  /** Called with mapped line items when the user confirms import */
  onImport: (lineItems: DraftLine[]) => void;
  /** Project type to use for measurement mapping (defaults to "general") */
  projectType?: string;
}

const fmt = (n: number) =>
  n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const CONFIDENCE_STYLES: Record<string, string> = {
  high: "bg-green-50 text-green-700 border-green-200",
  medium: "bg-yellow-50 text-yellow-700 border-yellow-200",
  low: "bg-gray-50 text-gray-600 border-gray-200",
};

/** Project types that trigger full pad-to-estimate generation */
const PAD_ESTIMATE_TYPES = new Set([
  "new_build", "New Home Build", "new_construction",
  "addition_remodel", "Addition",
  "guest_house", "Guest House / ADU",
  "infrastructure", "Infrastructure (Site/Utility)",
]);

/** Convert MoasureMapping fields to DraftLine objects */
function mappingToLineItems(mapping: MoasureMapping): Omit<DraftLine, "_key">[] {
  return mapping.fields.map((field) => ({
    category: "material" as const,
    description: field.field.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    quantity: field.value,
    unit: field.unit,
    unit_price: 0,
    material_cost: 0,
    labor_cost: 0,
    retail_price: 0,
  }));
}

/** Convert PadEstimateResult takeoff items to DraftLine objects */
function padEstimateToLineItems(estimate: PadEstimateResult): Omit<DraftLine, "_key">[] {
  return estimate.takeoff.map((item) => ({
    category: item.category,
    description: item.description,
    quantity: item.quantity,
    unit: item.unit,
    unit_price: item.suggested_price ?? 0,
    material_cost: item.category === "material" ? (item.suggested_price ?? 0) * item.quantity : 0,
    labor_cost: item.category === "labor" ? (item.suggested_price ?? 0) * item.quantity : 0,
    retail_price: (item.suggested_price ?? 0) * item.quantity,
  }));
}

let keyCounter = 0;
const nextKey = () => `moasure-${++keyCounter}-${Date.now()}`;

export function MoasureImport({ onImport, projectType = "general" }: MoasureImportProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mapping, setMapping] = useState<MoasureMapping | null>(null);
  const [padEstimate, setPadEstimate] = useState<PadEstimateResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const isPadEstimate = padEstimate !== null;
  const hasData = mapping || padEstimate;

  const handleButtonClick = () => {
    setError(null);
    setMapping(null);
    setPadEstimate(null);
    setFileName(null);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setMapping(null);
    setPadEstimate(null);
    setFileName(file.name);

    try {
      const content = await file.text();
      const parsed = parseMoasureFile(content, file.name);

      if (PAD_ESTIMATE_TYPES.has(projectType)) {
        // Full pad-to-estimate generation for new builds
        const estimate = generateEstimateFromPad(parsed, {
          foundation_type: "raised_slab",
          block_courses: 3,
          roof_pitch: "6/12",
          exterior_material: "hardie_board",
          roofing_material: "architectural_shingle",
        });
        setPadEstimate(estimate);
      } else {
        // Simple field mapping for other project types
        const mapped = mapMoasureToEstimate(parsed, projectType);
        setMapping(mapped);
      }
    } catch (err) {
      Sentry.captureException(err);
      setError("Could not parse file. Please check the format and try again.");
    }

    e.target.value = "";
  };

  const handleImport = () => {
    let lines: DraftLine[];
    if (padEstimate) {
      const rawLines = padEstimateToLineItems(padEstimate);
      lines = rawLines.map((l) => ({ ...l, _key: nextKey() }));
    } else if (mapping) {
      const rawLines = mappingToLineItems(mapping);
      lines = rawLines.map((l) => ({ ...l, _key: nextKey() }));
    } else {
      return;
    }
    onImport(lines);
    setMapping(null);
    setPadEstimate(null);
    setFileName(null);
  };

  const handleCancel = () => {
    setMapping(null);
    setPadEstimate(null);
    setError(null);
    setFileName(null);
  };

  const totalItems = padEstimate ? padEstimate.takeoff.length : (mapping?.fields.length ?? 0);

  return (
    <div className="space-y-3">
      <input
        ref={fileInputRef}
        type="file"
        accept=".moasure,.csv,.dxf,.json"
        className="hidden"
        onChange={handleFileChange}
        aria-label="Import Moasure measurement file"
      />

      {!hasData && (
        <button
          type="button"
          onClick={handleButtonClick}
          className="flex items-center gap-2 rounded-lg border border-[var(--sep)] px-3.5 py-2 text-[13px] font-medium transition-colors hover:bg-[var(--bg)]"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          Import from Moasure
        </button>
      )}

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-[12px] text-red-700">
          <svg className="mt-0.5 flex-shrink-0" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" />
          </svg>
          <div>
            <p className="font-medium">Parse error</p>
            <p className="mt-0.5">{error}</p>
          </div>
          <button
            type="button"
            onClick={() => { setError(null); setFileName(null); }}
            className="ml-auto flex-shrink-0 rounded p-0.5 hover:bg-red-100 transition-colors"
            aria-label="Dismiss error"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Full Pad Estimate Preview */}
      {padEstimate && (
        <div className="rounded-xl border border-[var(--sep)] bg-[var(--card)] p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-[13px] font-semibold">Moasure Pad Estimate</p>
              <p className="text-[11px] text-[var(--secondary)]">
                {fileName} · {padEstimate.takeoff.length} line items · {padEstimate.divisions.length} divisions
              </p>
            </div>
            <button type="button" onClick={handleCancel} className="rounded-md p-1 hover:bg-[var(--bg)] transition-colors" aria-label="Cancel import">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--gray1)" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
            </button>
          </div>

          {/* Site summary chips */}
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="rounded-lg bg-[var(--bg)] p-2">
              <p className="text-[var(--secondary)]">Pad Area</p>
              <p className="font-semibold tabular-nums">{fmt(padEstimate.summary.pad_area_sqft)} sq ft</p>
            </div>
            <div className="rounded-lg bg-[var(--bg)] p-2">
              <p className="text-[var(--secondary)]">Perimeter</p>
              <p className="font-semibold tabular-nums">{fmt(padEstimate.summary.perimeter_lft)} LF</p>
            </div>
            <div className="rounded-lg bg-[var(--bg)] p-2">
              <p className="text-[var(--secondary)]">Fill Needed</p>
              <p className="font-semibold tabular-nums">{fmt(padEstimate.summary.fill_volume_cuyd)} cu yd</p>
            </div>
            <div className="rounded-lg bg-[var(--bg)] p-2">
              <p className="text-[var(--secondary)]">Slab Concrete</p>
              <p className="font-semibold tabular-nums">{fmt(padEstimate.summary.slab_concrete_cuyd)} cu yd</p>
            </div>
          </div>

          {/* Grading callout */}
          {padEstimate.grading_analysis.net_fill_cuyd > 0 && (
            <GradingCallout analysis={padEstimate.grading_analysis} />
          )}

          {/* Division summary */}
          <div className="space-y-1">
            <p className="text-[11px] font-medium text-[var(--secondary)] uppercase tracking-wide">Divisions</p>
            <div className="max-h-48 overflow-y-auto space-y-0.5">
              {padEstimate.divisions.map((div, i) => (
                <div key={i} className="flex items-center justify-between py-1 px-1 rounded hover:bg-[var(--bg)] text-[11px]">
                  <span className="font-medium">{div.name}</span>
                  <span className="text-[var(--secondary)] tabular-nums">{div.items.length} items</span>
                </div>
              ))}
            </div>
          </div>

          <p className="text-[11px] text-[var(--tertiary)]">
            All {padEstimate.takeoff.length} line items will be imported with quantities from the Moasure measurement. Review and set unit prices.
          </p>

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={handleCancel} className="flex-1 rounded-lg border border-[var(--sep)] py-2 text-[13px] font-medium transition-colors hover:bg-[var(--bg)]">
              Cancel
            </button>
            <button type="button" onClick={handleImport} className="flex-1 rounded-lg bg-[var(--accent)] py-2 text-[13px] font-medium text-white transition-all active:scale-[0.98]">
              Import {padEstimate.takeoff.length} Line Items
            </button>
          </div>
        </div>
      )}

      {/* Simple mapping preview (non-pad project types) */}
      {mapping && (
        <div className="rounded-xl border border-[var(--sep)] bg-[var(--card)] p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-[13px] font-semibold">Moasure Measurements</p>
              <p className="text-[11px] text-[var(--secondary)]">
                {fileName} · {mapping.metadata.device_model} · {mapping.metadata.source_format.toUpperCase()}
              </p>
            </div>
            <button type="button" onClick={handleCancel} className="rounded-md p-1 hover:bg-[var(--bg)] transition-colors" aria-label="Cancel import">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--gray1)" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {mapping.metadata.has_elevation && (
              <span className="rounded-full bg-[var(--gray5)] px-2 py-0.5 text-[10px] text-[var(--secondary)]">Elevation data</span>
            )}
            {mapping.metadata.has_volume && (
              <span className="rounded-full bg-[var(--gray5)] px-2 py-0.5 text-[10px] text-[var(--secondary)]">Volume data</span>
            )}
            {mapping.metadata.total_segments > 0 && (
              <span className="rounded-full bg-[var(--gray5)] px-2 py-0.5 text-[10px] text-[var(--secondary)]">{mapping.metadata.total_segments} segments</span>
            )}
            {mapping.metadata.total_layers > 0 && (
              <span className="rounded-full bg-[var(--gray5)] px-2 py-0.5 text-[10px] text-[var(--secondary)]">{mapping.metadata.total_layers} layers</span>
            )}
          </div>

          {mapping.fields.length === 0 ? (
            <p className="text-[12px] text-[var(--tertiary)] py-3 text-center">No measurements found in this file.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[12px]">
                <thead>
                  <tr className="border-b border-[var(--sep)]">
                    <th className="pb-1.5 text-left font-medium text-[var(--secondary)] text-[11px] uppercase tracking-wide">Measurement</th>
                    <th className="pb-1.5 text-right font-medium text-[var(--secondary)] text-[11px] uppercase tracking-wide">Value</th>
                    <th className="pb-1.5 text-left pl-3 font-medium text-[var(--secondary)] text-[11px] uppercase tracking-wide">Unit</th>
                    <th className="pb-1.5 text-left pl-3 font-medium text-[var(--secondary)] text-[11px] uppercase tracking-wide">Confidence</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--sep)]">
                  {mapping.fields.map((field, i) => (
                    <tr key={i} className="hover:bg-[var(--bg)]">
                      <td className="py-1.5 pr-2 font-medium text-[var(--label)]">
                        {field.field.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                      </td>
                      <td className="py-1.5 text-right tabular-nums font-semibold">{fmt(field.value)}</td>
                      <td className="py-1.5 pl-3 text-[var(--secondary)]">{field.unit}</td>
                      <td className="py-1.5 pl-3">
                        <span className={`inline-flex rounded-full border px-1.5 py-0.5 text-[10px] font-medium ${CONFIDENCE_STYLES[field.confidence] ?? ""}`}>
                          {field.confidence}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <p className="text-[11px] text-[var(--tertiary)]">
            Line items will be added to the Materials tab with quantity pre-filled. Set unit prices manually or use &ldquo;Suggest&rdquo;.
          </p>

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={handleCancel} className="flex-1 rounded-lg border border-[var(--sep)] py-2 text-[13px] font-medium transition-colors hover:bg-[var(--bg)]">
              Cancel
            </button>
            <button
              type="button"
              onClick={handleImport}
              disabled={mapping.fields.length === 0}
              className="flex-1 rounded-lg bg-[var(--accent)] py-2 text-[13px] font-medium text-white transition-all active:scale-[0.98] disabled:opacity-50"
            >
              Import {mapping.fields.length} Line Item{mapping.fields.length !== 1 ? "s" : ""}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Grading analysis callout for pad estimates */
function GradingCallout({ analysis }: { analysis: GradingAnalysis }) {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-[11px]">
      <p className="font-semibold text-amber-800">Dirtwork Required</p>
      <div className="mt-1.5 grid grid-cols-3 gap-2 text-amber-700">
        <div>
          <p className="text-[10px] text-amber-600">Fill Volume</p>
          <p className="font-semibold tabular-nums">{fmt(analysis.fill_volume_cuyd)} cu yd</p>
        </div>
        <div>
          <p className="text-[10px] text-amber-600">Avg Fill Depth</p>
          <p className="font-semibold tabular-nums">{fmt(analysis.avg_fill_depth_ft)} ft</p>
        </div>
        <div>
          <p className="text-[10px] text-amber-600">Truckloads</p>
          <p className="font-semibold tabular-nums">~{analysis.truckloads}</p>
        </div>
      </div>
      <p className="mt-1.5 text-[10px] text-amber-600">
        Computed from {analysis.data_points} elevation points. Elevation range: {analysis.min_elevation_ft} to {analysis.max_elevation_ft} ft.
      </p>
    </div>
  );
}
