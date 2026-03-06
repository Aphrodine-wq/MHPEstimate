"use client";

import { useCurrentUser } from "../lib/store";

export function Profile({ onModal }: { onNavigate?: (page: string) => void; onCallAlex?: () => void; onModal?: (m: string) => void }) {
  const { user, loading } = useCurrentUser();
  const initials = user ? user.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2) : "—";

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <header className="px-8 pt-6 pb-1">
        <h1 className="text-[24px] font-bold tracking-tight">Profile</h1>
        <p className="text-[12px] text-[var(--secondary)]">Account and preferences</p>
      </header>

      <div className="mx-auto w-full max-w-2xl px-8 py-4">
        {/* User card */}
        <div className="mb-5 flex items-center gap-4 rounded-xl border border-[var(--sep)] bg-[var(--card)] p-5">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--gray5)] text-[22px] font-semibold text-[var(--gray1)]">
            {loading ? "…" : initials}
          </div>
          <div className="flex-1">
            <h2 className="text-[20px] font-bold">{user?.full_name ?? "Not signed in"}</h2>
            <p className="text-[13px] text-[var(--secondary)]">{user?.role ?? "Connect Supabase to sign in"}</p>
            {user && <p className="mt-0.5 text-[11px] text-[var(--tertiary)]">Member since {new Date(user.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" })}</p>}
          </div>
          <button onClick={() => onModal?.("edit-profile")} className="rounded-lg border border-[var(--sep)] px-3 py-1.5 text-[13px] font-medium text-[var(--accent)] transition-colors hover:bg-[var(--bg)]">
            Edit
          </button>
        </div>

        <Group title="Contact">
          <Row label="Email" value={user?.email ?? "—"} />
          <Row label="Phone" value={user?.phone ?? "—"} />
          <Row label="Role" value={user?.role ?? "—"} />
        </Group>

        <Group title="Preferences">
          <ToggleRow label="Push Notifications" on />
          <ToggleRow label="Email Notifications" on />
          <ToggleRow label="Auto-save Drafts" on />
        </Group>

        <Group title="Estimation Defaults">
          <Row label="Default Markup" value="17.5%" action />
          <Row label="Target Margin" value="35–42%" action />
          <Row label="Contingency" value="15%" action />
        </Group>

        <div className="mt-2">
          <button className="w-full rounded-xl border border-[var(--sep)] bg-[var(--card)] px-4 py-3 text-left text-[13px] font-medium text-[var(--red)] transition-colors hover:bg-[var(--red)]/5">
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
      <p className="mb-1.5 px-1 text-[11px] font-medium uppercase tracking-wide text-[var(--secondary)]">{title}</p>
      <div className="rounded-xl border border-[var(--sep)] bg-[var(--card)] divide-y divide-[var(--sep)]">{children}</div>
    </div>
  );
}

function Row({ label, value, action }: { label: string; value: string; action?: boolean }) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <p className="text-[13px]">{label}</p>
      <div className="flex items-center gap-1">
        <p className="text-[13px] text-[var(--secondary)]">{value}</p>
        {action && <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="var(--gray3)" strokeWidth="2.5" strokeLinecap="round"><path d="m9 18 6-6-6-6" /></svg>}
      </div>
    </div>
  );
}

function ToggleRow({ label, on }: { label: string; on: boolean }) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <p className="text-[13px]">{label}</p>
      <div className={`relative h-[28px] w-[46px] rounded-full ${on ? "bg-[var(--green)]" : "bg-[var(--gray4)]"}`}>
        <div className={`absolute top-[2px] h-[24px] w-[24px] rounded-full bg-white shadow ${on ? "translate-x-[20px]" : "translate-x-[2px]"}`} />
      </div>
    </div>
  );
}
