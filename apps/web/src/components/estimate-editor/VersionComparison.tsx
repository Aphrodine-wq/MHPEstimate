import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import type { Estimate } from "@proestimate/shared/types";

interface Version {
  id: string;
  version_number: number;
  snapshot: Record<string, unknown>;
  change_summary: string | null;
  created_at: string;
}

interface VersionComparisonProps {
  estimateId: string;
  currentEstimate: Estimate;
}

export function VersionComparison({ estimateId, currentEstimate }: VersionComparisonProps) {
  const [versions, setVersions] = useState<Version[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVersion, setSelectedVersion] = useState<Version | null>(null);

  useEffect(() => {
    if (!supabase) { setLoading(false); return; }
    supabase
      .from("estimate_versions")
      .select("*")
      .eq("estimate_id", estimateId)
      .order("version_number", { ascending: false })
      .then(({ data }) => {
        setVersions((data as Version[]) ?? []);
        if (data && data.length > 0) setSelectedVersion(data[0] as Version);
        setLoading(false);
      });
  }, [estimateId]);

  if (loading) return <div className="animate-pulse h-32 rounded-xl bg-[var(--gray5)]" />;
  if (versions.length === 0) return (
    <div className="rounded-xl border border-[var(--sep)] bg-[var(--card)] p-8 text-center">
      <p className="text-[13px] text-[var(--secondary)]">No previous versions. Versions are created each time you save.</p>
    </div>
  );

  const prev = selectedVersion?.snapshot as Record<string, unknown> | undefined;
  const curr = currentEstimate as unknown as Record<string, unknown>;

  const fields = [
    { key: "project_type", label: "Project Type" },
    { key: "tier", label: "Tier" },
    { key: "grand_total", label: "Grand Total", format: (v: unknown) => `$${Number(v || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}` },
    { key: "materials_subtotal", label: "Materials", format: (v: unknown) => `$${Number(v || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}` },
    { key: "labor_subtotal", label: "Labor", format: (v: unknown) => `$${Number(v || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}` },
    { key: "project_address", label: "Address" },
    { key: "site_conditions", label: "Site Conditions" },
  ];

  const formatValue = (field: typeof fields[number], value: unknown) =>
    field.format ? field.format(value) : String(value ?? "\u2014");

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <label className="text-[12px] font-medium text-[var(--secondary)]">Compare with:</label>
        <select
          className="rounded-lg border border-[var(--sep)] bg-[var(--card)] px-3 py-1.5 text-[13px]"
          value={selectedVersion?.id ?? ""}
          onChange={(e) => setSelectedVersion(versions.find(v => v.id === e.target.value) ?? null)}
        >
          {versions.map(v => (
            <option key={v.id} value={v.id}>
              v{v.version_number} -- {new Date(v.created_at).toLocaleDateString()} {new Date(v.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </option>
          ))}
        </select>
      </div>

      {selectedVersion?.change_summary && (
        <p className="text-[12px] text-[var(--secondary)] italic">{selectedVersion.change_summary}</p>
      )}

      <div className="rounded-xl border border-[var(--sep)] bg-[var(--card)] overflow-hidden">
        <div className="grid grid-cols-3 gap-px bg-[var(--sep)] text-[11px] font-semibold uppercase tracking-wide text-[var(--secondary)]">
          <div className="bg-[var(--card)] px-4 py-2">Field</div>
          <div className="bg-[var(--card)] px-4 py-2">v{selectedVersion?.version_number} (Previous)</div>
          <div className="bg-[var(--card)] px-4 py-2">Current</div>
        </div>
        {fields.map(field => {
          const prevVal = prev?.[field.key];
          const currVal = curr[field.key];
          const changed = String(prevVal) !== String(currVal);
          return (
            <div key={field.key} className="grid grid-cols-3 gap-px bg-[var(--sep)] text-[13px]">
              <div className="bg-[var(--card)] px-4 py-2 font-medium">{field.label}</div>
              <div className={`px-4 py-2 ${changed ? "bg-red-50 text-red-700" : "bg-[var(--card)]"}`}>{formatValue(field, prevVal)}</div>
              <div className={`px-4 py-2 ${changed ? "bg-green-50 text-green-700" : "bg-[var(--card)]"}`}>{formatValue(field, currVal)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
