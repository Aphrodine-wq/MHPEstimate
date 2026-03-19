import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import { supabase } from "../../lib/supabase";

interface Milestone {
  id?: string;
  name: string;
  percentage: number;
  amount: number;
  due_trigger: string;
  status: string;
}

interface MilestonePaymentsProps {
  estimateId: string;
  organizationId: string;
  grandTotal: number;
}

const DEFAULT_MILESTONES: Omit<Milestone, "id" | "amount">[] = [
  { name: "Deposit", percentage: 30, due_trigger: "Upon signing", status: "pending" },
  { name: "Rough-in Complete", percentage: 30, due_trigger: "Framing & rough MEP complete", status: "pending" },
  { name: "Final Completion", percentage: 40, due_trigger: "Final walkthrough & punch list", status: "pending" },
];

export function MilestonePayments({ estimateId, organizationId, grandTotal }: MilestonePaymentsProps) {
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!supabase) { setLoading(false); return; }
    supabase
      .from("payment_milestones")
      .select("*")
      .eq("estimate_id", estimateId)
      .order("sort_order")
      .then(({ data }) => {
        if (data && data.length > 0) {
          setMilestones(data.map((m: any) => ({
            id: m.id, name: m.name, percentage: Number(m.percentage),
            amount: Number(m.amount), due_trigger: m.due_trigger ?? "", status: m.status,
          })));
        }
        setLoading(false);
      });
  }, [estimateId]);

  const totalPct = milestones.reduce((s, m) => s + m.percentage, 0);

  const updateMilestone = (idx: number, field: keyof Milestone, value: string | number) => {
    setMilestones(prev => prev.map((m, i) => {
      if (i !== idx) return m;
      const updated = { ...m, [field]: value };
      if (field === "percentage") {
        updated.amount = Math.round(grandTotal * (Number(value) / 100) * 100) / 100;
      }
      return updated;
    }));
  };

  const addMilestone = () => {
    setMilestones(prev => [...prev, { name: "", percentage: 0, amount: 0, due_trigger: "", status: "pending" }]);
  };

  const removeMilestone = (idx: number) => {
    setMilestones(prev => prev.filter((_, i) => i !== idx));
  };

  const useDefaults = () => {
    setMilestones(DEFAULT_MILESTONES.map(m => ({
      ...m, amount: Math.round(grandTotal * (m.percentage / 100) * 100) / 100,
    })));
  };

  const handleSave = useCallback(async () => {
    if (!supabase) return;
    setSaving(true);
    try {
      await supabase.from("payment_milestones").delete().eq("estimate_id", estimateId);
      if (milestones.length > 0) {
        const { error } = await supabase.from("payment_milestones").insert(
          milestones.map((m, i) => ({
            estimate_id: estimateId,
            organization_id: organizationId,
            name: m.name, percentage: m.percentage,
            amount: m.amount, due_trigger: m.due_trigger,
            sort_order: i, status: m.status,
          }))
        );
        if (error) { toast.error("Failed to save milestones"); return; }
      }
      toast.success("Milestones saved");
    } finally {
      setSaving(false);
    }
  }, [estimateId, organizationId, milestones]);

  if (loading) return <div className="animate-pulse h-32 rounded-xl bg-[var(--gray5)]" />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-[15px] font-semibold">Payment Milestones</h3>
          <p className="text-[12px] text-[var(--secondary)]">Define payment schedule for this estimate</p>
        </div>
        <div className="flex gap-2">
          {milestones.length === 0 && (
            <button onClick={useDefaults} className="rounded-lg border border-[var(--sep)] px-3 py-1.5 text-[12px] font-medium hover:bg-[var(--fill)]">
              Use Defaults (30/30/40)
            </button>
          )}
          <button onClick={addMilestone} className="rounded-lg border border-[var(--sep)] px-3 py-1.5 text-[12px] font-medium hover:bg-[var(--fill)]">
            + Add Milestone
          </button>
        </div>
      </div>

      {milestones.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--sep)] p-8 text-center">
          <p className="text-[13px] text-[var(--tertiary)]">No milestones defined. Use defaults or add custom milestones.</p>
        </div>
      ) : (
        <>
          <div className="rounded-xl border border-[var(--sep)] bg-[var(--card)] overflow-hidden">
            <div className="grid grid-cols-[1fr_80px_100px_1fr_40px] gap-2 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--secondary)] border-b border-[var(--sep)]">
              <span>Name</span><span className="text-right">%</span><span className="text-right">Amount</span><span>Trigger</span><span />
            </div>
            {milestones.map((m, i) => (
              <div key={i} className="grid grid-cols-[1fr_80px_100px_1fr_40px] gap-2 px-4 py-2 items-center border-b border-[var(--sep)] last:border-b-0">
                <input value={m.name} onChange={e => updateMilestone(i, "name", e.target.value)} placeholder="Milestone name" className="rounded border border-[var(--sep)] bg-transparent px-2 py-1 text-[13px] outline-none" />
                <input type="number" min="0" max="100" value={m.percentage} onChange={e => updateMilestone(i, "percentage", parseFloat(e.target.value) || 0)} className="rounded border border-[var(--sep)] bg-transparent px-2 py-1 text-[13px] text-right outline-none" />
                <span className="text-[13px] font-medium text-right tabular-nums">${m.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                <input value={m.due_trigger} onChange={e => updateMilestone(i, "due_trigger", e.target.value)} placeholder="When due..." className="rounded border border-[var(--sep)] bg-transparent px-2 py-1 text-[13px] outline-none" />
                <button onClick={() => removeMilestone(i)} className="rounded p-1 text-[var(--gray2)] hover:text-[var(--red)] hover:bg-[var(--fill)]">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
                </button>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between">
            <span className={`text-[12px] font-medium ${Math.abs(totalPct - 100) < 0.01 ? "text-[var(--green)]" : "text-[var(--orange)]"}`}>
              Total: {totalPct.toFixed(0)}% {Math.abs(totalPct - 100) >= 0.01 && "(should be 100%)"}
            </span>
            <button onClick={handleSave} disabled={saving} className="rounded-lg bg-[var(--accent)] px-4 py-2 text-[13px] font-medium text-white disabled:opacity-50">
              {saving ? "Saving..." : "Save Milestones"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
