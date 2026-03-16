import { useState } from "react";
import toast from "react-hot-toast";
import * as Sentry from "@sentry/nextjs";
import { Modal, Field, inputClass, textareaClass } from "./Modal";
import { supabase } from "../lib/supabase";

interface AddClientModalProps {
  open: boolean;
  onClose: () => void;
}

export function AddClientModal({ open, onClose }: AddClientModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zip, setZip] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim() || !supabase) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("clients").insert({
        full_name: name.trim(),
        email: email || null,
        phone: phone || null,
        address_line1: address || null,
        city: city || null,
        state: state || null,
        zip: zip || null,
        notes: notes || null,
        source: "manual",
      });
      if (error) { Sentry.captureException(error); toast.error("Failed to add client"); setSaving(false); return; }
      toast.success("Client added");
      setSaving(false);
      resetAndClose();
    } catch (err) {
      Sentry.captureException(err);
      toast.error("Failed to add client");
      setSaving(false);
    }
  };

  const resetAndClose = () => {
    setName(""); setEmail(""); setPhone(""); setAddress(""); setCity(""); setState(""); setZip(""); setNotes("");
    onClose();
  };

  return (
    <Modal open={open} onClose={resetAndClose} title="Add Client" description="Add a new client to your database">
      <div className="space-y-4 px-6 py-5">
        <Field label="Full Name *">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="John Smith" className={inputClass} />
        </Field>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Email">
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="john@example.com" className={inputClass} />
          </Field>
          <Field label="Phone">
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(555) 123-4567" className={inputClass} />
          </Field>
        </div>
        <Field label="Street Address">
          <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="123 Main St" className={inputClass} />
        </Field>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Field label="City">
            <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="City" className={inputClass} />
          </Field>
          <Field label="State">
            <input value={state} onChange={(e) => setState(e.target.value)} placeholder="TX" className={inputClass} />
          </Field>
          <Field label="ZIP">
            <input value={zip} onChange={(e) => setZip(e.target.value)} placeholder="75001" className={inputClass} />
          </Field>
        </div>
        <Field label="Notes">
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes..." rows={2} className={textareaClass} />
        </Field>
      </div>
      <div className="flex justify-end gap-2 border-t border-[var(--sep)] px-6 py-3">
        <button onClick={resetAndClose} className="rounded-lg border border-[var(--sep)] px-4 py-2 text-[13px] font-medium transition-colors hover:bg-[var(--bg)]">Cancel</button>
        <button onClick={handleSubmit} disabled={saving || !name.trim()} className="rounded-lg bg-[var(--accent)] px-4 py-2 text-[13px] font-medium text-white transition-all active:scale-[0.97] disabled:opacity-50">
          {saving ? "Saving..." : "Add Client"}
        </button>
      </div>
    </Modal>
  );
}
