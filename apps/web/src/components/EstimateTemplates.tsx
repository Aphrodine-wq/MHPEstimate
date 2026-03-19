import { useState } from "react";
import toast from "react-hot-toast";
import { supabase } from "../lib/supabase";
import { useTemplates } from "../lib/store";
import type { DraftLine } from "./estimate-editor/types";

interface SaveTemplateProps {
  projectType: string;
  tier: string;
  lines: DraftLine[];
  inclusions: string[];
  exclusions: string[];
  organizationId: string;
}

export function SaveTemplateButton({ projectType, tier, lines, inclusions, exclusions, organizationId }: SaveTemplateProps) {
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!supabase || !name.trim()) return;
    setSaving(true);
    try {
      const { data: authData } = await supabase.auth.getUser();
      const { error } = await supabase.from("estimate_templates").insert({
        organization_id: organizationId,
        name: name.trim(),
        project_type: projectType,
        tier,
        line_items: lines.filter(l => l.description.trim()).map(l => ({
          category: l.category, description: l.description, quantity: l.quantity,
          unit: l.unit, unit_price: l.unit_price, material_cost: l.material_cost,
          labor_cost: l.labor_cost, retail_price: l.retail_price,
        })),
        inclusions,
        exclusions,
        created_by: authData.user?.id ?? null,
      });
      if (error) { toast.error("Failed to save template"); return; }
      toast.success("Template saved");
      setShowModal(false);
      setName("");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="flex items-center gap-1.5 rounded-lg border border-[var(--sep)] px-3 py-1.5 text-[12px] font-medium transition-colors hover:bg-[var(--fill)]"
        title="Save as template"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
          <polyline points="17 21 17 13 7 13 7 21" />
          <polyline points="7 3 7 8 15 8" />
        </svg>
        Save Template
      </button>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowModal(false)}>
          <div className="bg-[var(--card)] rounded-xl shadow-xl p-5 w-[360px] space-y-3" onClick={e => e.stopPropagation()}>
            <p className="text-[14px] font-semibold">Save as Template</p>
            <input
              autoFocus
              placeholder="Template name..."
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full rounded-lg border border-[var(--sep)] bg-[var(--bg)] px-3 py-2 text-[13px] outline-none focus:border-[var(--accent)]"
            />
            <div className="flex gap-2">
              <button onClick={() => setShowModal(false)} className="flex-1 rounded-lg border border-[var(--sep)] py-2 text-[13px] font-medium">Cancel</button>
              <button onClick={handleSave} disabled={saving || !name.trim()} className="flex-1 rounded-lg bg-[var(--accent)] py-2 text-[13px] font-medium text-white disabled:opacity-50">
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

interface TemplatePickerProps {
  onSelect: (template: { project_type: string | null; tier: string | null; line_items: DraftLine[]; inclusions: string[]; exclusions: string[] }) => void;
}

let keyCounter = 0;
const nextKey = () => `tpl-${++keyCounter}-${Date.now()}`;

export function TemplatePicker({ onSelect }: TemplatePickerProps) {
  const { data: templates, loading } = useTemplates();
  const [open, setOpen] = useState(false);

  if (loading || templates.length === 0) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 rounded-lg border border-[var(--sep)] px-3 py-1.5 text-[12px] font-medium transition-colors hover:bg-[var(--fill)]"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 21V9" />
        </svg>
        From Template
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 w-64 rounded-xl border border-[var(--sep)] bg-[var(--card)] shadow-lg z-50 py-1 max-h-60 overflow-y-auto">
          {templates.map(t => (
            <button
              key={t.id}
              onClick={() => {
                onSelect({
                  project_type: t.project_type,
                  tier: t.tier,
                  line_items: (t.line_items as any[]).map(li => ({ _key: nextKey(), ...li })),
                  inclusions: t.inclusions ?? [],
                  exclusions: t.exclusions ?? [],
                });
                setOpen(false);
              }}
              className="w-full text-left px-3 py-2 text-[13px] hover:bg-[var(--bg)] transition-colors"
            >
              <p className="font-medium">{t.name}</p>
              <p className="text-[11px] text-[var(--secondary)]">{t.project_type ?? "General"} -- {(t.line_items as unknown[]).length} items</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
