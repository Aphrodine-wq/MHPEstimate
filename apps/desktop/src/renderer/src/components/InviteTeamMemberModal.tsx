import { useState } from "react";
import { Modal, Field, inputClass, selectClass } from "./Modal";
import { supabase } from "../lib/supabase";
import type { TeamRole } from "@proestimate/shared/types";

interface InviteTeamMemberModalProps {
  open: boolean;
  onClose: () => void;
  onInviteSent?: () => void;
}

const INVITE_ROLES: { value: TeamRole; label: string }[] = [
  { value: "admin",      label: "Admin" },
  { value: "pm",         label: "Project Manager" },
  { value: "estimator",  label: "Estimator" },
  { value: "field_tech", label: "Field Tech" },
  { value: "sales",      label: "Sales" },
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function InviteTeamMemberModal({ open, onClose, onInviteSent }: InviteTeamMemberModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<TeamRole>("estimator");
  const [saving, setSaving] = useState(false);
  const [emailErr, setEmailErr] = useState("");

  const validateEmail = (val: string) => {
    if (!val) { setEmailErr(""); return true; }
    if (!EMAIL_RE.test(val)) { setEmailErr("Enter a valid email address"); return false; }
    setEmailErr("");
    return true;
  };

  const handleSubmit = async () => {
    if (!name.trim()) return;
    if (!validateEmail(email)) return;
    if (!email.trim()) { setEmailErr("Email is required"); return; }
    if (!supabase) return;

    setSaving(true);
    try {
      const { error } = await supabase.from("team_members").insert({
        full_name: name.trim(),
        email: email.trim().toLowerCase(),
        role,
        is_active: false,
      });

      if (error) {
        console.error("Failed to send invite", error);
        setSaving(false);
        return;
      }

      console.log(`Invite created for ${email.trim().toLowerCase()}`);
      setSaving(false);
      onInviteSent?.();
      resetAndClose();
    } catch (err) {
      console.error("Failed to send invite", err);
      setSaving(false);
    }
  };

  const resetAndClose = () => {
    setName(""); setEmail(""); setRole("estimator"); setEmailErr("");
    onClose();
  };

  const canSubmit = name.trim().length > 0 && email.trim().length > 0 && !emailErr && !saving;

  return (
    <Modal open={open} onClose={resetAndClose} title="Invite Team Member" description="Add a new team member">
      <div className="space-y-4 px-6 py-5">
        <Field label="Full Name *">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Jane Smith"
            className={inputClass}
            onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
          />
        </Field>

        <Field label="Email Address *">
          <input
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); validateEmail(e.target.value); }}
            onBlur={(e) => validateEmail(e.target.value)}
            placeholder="jane@mhpestimate.cloud"
            className={`${inputClass} ${emailErr ? "border-red-400 focus:border-red-400 focus:ring-red-400/20" : ""}`}
            onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
          />
          {emailErr && (
            <p className="mt-1 text-[11px] text-red-500">{emailErr}</p>
          )}
        </Field>

        <Field label="Role">
          <div className="relative">
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as TeamRole)}
              className={selectClass}
            >
              {INVITE_ROLES.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>
        </Field>
      </div>

      <div className="flex justify-end gap-2 border-t border-[var(--sep)] px-6 py-3">
        <button
          onClick={resetAndClose}
          className="rounded-lg border border-[var(--sep)] px-4 py-2 text-[13px] font-medium transition-colors hover:bg-[var(--bg)]"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="rounded-lg bg-[var(--accent)] px-4 py-2 text-[13px] font-medium text-white transition-all active:scale-[0.97] disabled:opacity-50"
        >
          {saving ? "Adding..." : "Add Member"}
        </button>
      </div>
    </Modal>
  );
}
