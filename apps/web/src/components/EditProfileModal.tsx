import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import * as Sentry from "@sentry/nextjs";
import { Modal, Field, inputClass } from "./Modal";
import { supabase } from "../lib/supabase";

interface EditProfileModalProps {
  open: boolean;
  onClose: () => void;
  user: { id: string; full_name: string; email: string; phone: string | null; role: string } | null;
}

export function EditProfileModal({ open, onClose, user }: EditProfileModalProps) {
  const [name, setName] = useState(user?.full_name ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [saving, setSaving] = useState(false);

  const userId = user?.id;

  // Sync form when user changes or modal opens
  useEffect(() => {
    if (open && user) {
      setName(user.full_name ?? "");
      setPhone(user.phone ?? "");
    }
  }, [open, user]);

  const handleSubmit = async () => {
    if (!supabase || !userId) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("team_members").update({
        full_name: name.trim(),
        phone: phone || null,
      }).eq("id", userId);
      if (error) { Sentry.captureException(error); toast.error("Failed to update profile"); setSaving(false); return; }
      toast.success("Profile updated");
      setSaving(false);
      onClose();
    } catch (err) {
      Sentry.captureException(err);
      toast.error("Failed to update profile");
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Edit Profile" width="w-full max-w-[400px]">
      <div className="space-y-4 px-6 py-5">
        <Field label="Full Name">
          <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
        </Field>
        <Field label="Email">
          <input value={user?.email ?? ""} disabled className={`${inputClass} opacity-50 cursor-not-allowed`} />
        </Field>
        <Field label="Phone">
          <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(555) 123-4567" className={inputClass} />
        </Field>
        <Field label="Role">
          <input value={user?.role ?? ""} disabled className={`${inputClass} opacity-50 cursor-not-allowed capitalize`} />
        </Field>
      </div>
      <div className="flex justify-end gap-2 border-t border-[var(--sep)] px-6 py-3">
        <button onClick={onClose} className="rounded-lg border border-[var(--sep)] px-4 py-2 text-[13px] font-medium transition-colors hover:bg-[var(--bg)]">Cancel</button>
        <button onClick={handleSubmit} disabled={saving || !name.trim()} className="rounded-lg bg-[var(--accent)] px-4 py-2 text-[13px] font-medium text-white transition-all active:scale-[0.97] disabled:opacity-50">
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </Modal>
  );
}
