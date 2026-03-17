import { useState } from "react";
import { useCurrentUser } from "../lib/store";
import { signOut } from "../lib/supabase";

export function Profile({ onModal, onSignOut }: { onNavigate?: (page: string) => void; onCallAlex?: () => void; onModal?: (m: string) => void; onSignOut?: () => void }) {
  const { user, loading } = useCurrentUser();
  const [pushNotif, setPushNotif] = useState(true);
  const [emailNotif, setEmailNotif] = useState(true);
  const [autoSave, setAutoSave] = useState(true);
  const initials = user ? user.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2) : "—";

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <header className="px-8 pt-6 pb-4 slide-up">
        <div className="flex items-end justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="h-4 w-1 rounded-full bg-[var(--accent)]" />
              <p className="caps">Profile</p>
            </div>
            <h1 className="text-[20px] font-extrabold tight">Account & Preferences</h1>
          </div>
        </div>
      </header>

      <div className="slide-up mx-auto w-full max-w-2xl px-8 py-4">
        {/* User card */}
        <div className="surface-elevated mb-5 flex items-center gap-4 p-6">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[var(--accent)] text-[26px] font-bold text-white shadow-sm shadow-[var(--accent)]/20">
            {loading ? "…" : initials}
          </div>
          <div className="flex-1">
            <h2 className="tight text-[20px] font-bold">{user?.full_name ?? "Not signed in"}</h2>
            <p className="text-[13px] text-[var(--secondary)]">{user?.role ?? "Connect Supabase to sign in"}</p>
            {user && <p className="mt-0.5 text-[11px] text-[var(--tertiary)]">Member since {new Date(user.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" })}</p>}
          </div>
          <button onClick={() => onModal?.("edit-profile")} className="rounded-lg border border-[var(--sep)] px-3 py-1.5 text-[13px] font-medium text-[var(--accent)] shadow-sm shadow-[var(--accent)]/20 transition-colors hover:bg-[var(--accent-hover)] hover:text-white">
            Edit
          </button>
        </div>

        <Group title="Contact">
          <Row label="Email" value={user?.email ?? "—"} />
          <Row label="Phone" value={user?.phone ?? "—"} />
          <Row label="Role" value={user?.role ?? "—"} />
        </Group>

        <Group title="Preferences">
          <ToggleRow label="Push Notifications" on={pushNotif} onToggle={() => setPushNotif((v) => !v)} />
          <ToggleRow label="Email Notifications" on={emailNotif} onToggle={() => setEmailNotif((v) => !v)} />
          <ToggleRow label="Auto-save Drafts" on={autoSave} onToggle={() => setAutoSave((v) => !v)} />
        </Group>

        <Group title="Estimation Defaults">
          <Row label="Default Markup" value="17.5%" action />
          <Row label="Target Margin" value="35–42%" action />
          <Row label="Contingency" value="15%" action />
        </Group>

        <div className="mt-2">
          <button
            onClick={async () => {
              if (onSignOut) {
                onSignOut();
              } else {
                await signOut();
              }
            }}
            className="surface w-full px-4 py-3 text-left text-[13px] font-medium text-[var(--red)] transition-colors hover:bg-[var(--red)]/5"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <p className="caps mb-1.5 px-1">{title}</p>
      <div className="surface divide-y divide-[var(--sep)]">{children}</div>
    </div>
  );
}

function Row({ label, value, action }: { label: string; value: string; action?: boolean }) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <p className="text-[13px]">{label}</p>
      <div className="flex items-center gap-1">
        <p className={`text-[13px] text-[var(--secondary)]${value.includes("%") ? " tabular" : ""}`}>{value}</p>
        {action && <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="var(--gray3)" strokeWidth="2.5" strokeLinecap="round"><path d="m9 18 6-6-6-6" /></svg>}
      </div>
    </div>
  );
}

function ToggleRow({ label, on, onToggle }: { label: string; on: boolean; onToggle?: () => void }) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <p className="text-[13px]">{label}</p>
      <button
        onClick={onToggle}
        className={`relative h-[28px] w-[46px] rounded-full shadow-inner transition-colors ${on ? "bg-[var(--green)]" : "bg-[var(--gray4)]"}`}
      >
        <div className={`absolute top-[2px] h-[24px] w-[24px] rounded-full bg-white shadow transition-transform ${on ? "translate-x-[20px]" : "translate-x-[2px]"}`} />
      </button>
    </div>
  );
}
