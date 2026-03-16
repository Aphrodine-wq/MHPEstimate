import { useState } from "react";
import toast from "react-hot-toast";
import * as Sentry from "@sentry/nextjs";
import { Modal, Field, inputClass, selectClass, textareaClass } from "./Modal";
import { supabase } from "../lib/supabase";

interface LogExpenseModalProps {
  open: boolean;
  onClose: () => void;
}

export function LogExpenseModal({ open, onClose }: LogExpenseModalProps) {
  const [category, setCategory] = useState("Materials");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [vendor, setVendor] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [paymentMethod, setPaymentMethod] = useState("Company Card");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!description.trim() || !amount || !supabase) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("company_settings").upsert({
        key: `expense_${Date.now()}`,
        value: {
          category,
          description: description.trim(),
          amount: parseFloat(amount),
          vendor: vendor || null,
          date,
          payment_method: paymentMethod,
          notes: notes || null,
          created_at: new Date().toISOString(),
        },
        updated_at: new Date().toISOString(),
      }, { onConflict: "key" });
      if (error) { Sentry.captureException(error); toast.error("Failed to log expense"); setSaving(false); return; }
      toast.success("Expense logged");
      setSaving(false);
      resetAndClose();
    } catch (err) {
      Sentry.captureException(err);
      toast.error("Failed to log expense");
      setSaving(false);
    }
  };

  const resetAndClose = () => {
    setCategory("Materials");
    setDescription("");
    setAmount("");
    setVendor("");
    setDate(new Date().toISOString().split("T")[0]);
    setPaymentMethod("Company Card");
    setNotes("");
    onClose();
  };

  return (
    <Modal open={open} onClose={resetAndClose} title="Log Expense" description="Record a business expense">
      <div className="space-y-4 px-6 py-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Category">
            <select value={category} onChange={(e) => setCategory(e.target.value)} className={selectClass}>
              {["Materials", "Labor", "Equipment Rental", "Permits", "Fuel & Travel", "Office / Admin", "Insurance", "Subcontractor", "Tools", "Other"].map((c) => <option key={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Date">
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
          </Field>
        </div>
        <Field label="Description *">
          <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Lumber for framing — 2x4s" className={inputClass} />
        </Field>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Amount *">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-[var(--secondary)]">$</span>
              <input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className={`${inputClass} pl-7`} />
            </div>
          </Field>
          <Field label="Vendor">
            <input value={vendor} onChange={(e) => setVendor(e.target.value)} placeholder="Home Depot" className={inputClass} />
          </Field>
        </div>
        <Field label="Payment Method">
          <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className={selectClass}>
            {["Company Card", "Personal Card", "Cash", "Check", "ACH / Transfer", "Other"].map((m) => <option key={m}>{m}</option>)}
          </select>
        </Field>
        <Field label="Notes">
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Receipt #, job reference, etc." rows={2} className={textareaClass} />
        </Field>
      </div>
      <div className="flex justify-end gap-2 border-t border-[var(--sep)] px-6 py-3">
        <button onClick={resetAndClose} className="rounded-lg border border-[var(--sep)] px-4 py-2 text-[13px] font-medium transition-colors hover:bg-[var(--bg)]">Cancel</button>
        <button onClick={handleSubmit} disabled={saving || !description.trim() || !amount} className="rounded-lg bg-[var(--accent)] px-4 py-2 text-[13px] font-medium text-white transition-all active:scale-[0.97] disabled:opacity-50">
          {saving ? "Saving..." : "Log Expense"}
        </button>
      </div>
    </Modal>
  );
}
