import { useState } from "react";
import toast from "react-hot-toast";
import { Button } from "@proestimate/ui";

interface PhaseEditorProps {
  estimateId: string;
  phase: {
    id: string;
    name: string;
    startDate: string;
    endDate: string;
    crew: string[];
    status: string;
    notes: string;
  };
  onSaved?: () => void;
  onCancel?: () => void;
}

const STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "delayed", label: "Delayed" },
  { value: "blocked", label: "Blocked" },
];

const inputClass = "w-full rounded-lg border border-[var(--sep)] bg-[var(--bg)] px-3 py-2 text-[13px] text-[var(--label)] placeholder:text-[var(--gray2)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 focus:border-[var(--accent)]";
const selectClass = inputClass;
const textareaClass = inputClass + " resize-none";

export function PhaseEditor({ estimateId, phase, onSaved, onCancel }: PhaseEditorProps) {
  const [name, setName] = useState(phase.name);
  const [startDate, setStartDate] = useState(phase.startDate);
  const [endDate, setEndDate] = useState(phase.endDate);
  const [crew, setCrew] = useState(phase.crew.join(", "));
  const [status, setStatus] = useState(phase.status);
  const [notes, setNotes] = useState(phase.notes);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) { toast.error("Phase name is required"); return; }
    setSaving(true);
    try {
      const res = await fetch(`/api/schedule/${estimateId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phaseId: phase.id, name: name.trim(), startDate, endDate,
          crew: crew.split(",").map((c) => c.trim()).filter(Boolean),
          status, notes: notes.trim(),
        }),
      });
      if (!res.ok) { const err = await res.json().catch(() => ({ error: "Save failed" })); throw new Error(err.error || "Save failed"); }
      toast.success("Phase updated");
      onSaved?.();
    } catch (err) { toast.error(err instanceof Error ? err.message : "Failed to save phase"); } finally { setSaving(false); }
  };

  return (
    <div className="rounded-xl border border-[var(--sep)] bg-[var(--card)] p-4 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[12px] font-semibold text-[var(--label)]">Edit Phase</p>
        <button onClick={onCancel} className="text-[11px] text-[var(--secondary)] hover:text-[var(--label)]">Cancel</button>
      </div>
      <div><label className="block text-[11px] font-medium text-[var(--secondary)] mb-1">Phase Name</label><input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} placeholder="e.g. Foundation" /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="block text-[11px] font-medium text-[var(--secondary)] mb-1">Start Date</label><input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputClass} /></div>
        <div><label className="block text-[11px] font-medium text-[var(--secondary)] mb-1">End Date</label><input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={inputClass} /></div>
      </div>
      <div><label className="block text-[11px] font-medium text-[var(--secondary)] mb-1">Crew (comma-separated)</label><input value={crew} onChange={(e) => setCrew(e.target.value)} className={inputClass} placeholder="e.g. John, Mike, Sarah" /></div>
      <div><label className="block text-[11px] font-medium text-[var(--secondary)] mb-1">Status</label><select value={status} onChange={(e) => setStatus(e.target.value)} className={selectClass}>{STATUS_OPTIONS.map((opt) => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}</select></div>
      <div><label className="block text-[11px] font-medium text-[var(--secondary)] mb-1">Notes</label><textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className={textareaClass} placeholder="Any notes about this phase..." /></div>
      <div className="flex justify-end"><Button onClick={handleSave} loading={saving} size="sm">Save Phase</Button></div>
    </div>
  );
}
