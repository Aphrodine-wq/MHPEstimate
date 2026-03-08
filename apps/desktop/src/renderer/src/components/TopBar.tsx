import { useState } from "react";
import { useNotifications } from "../lib/store";

interface TopBarProps {
  title: string;
  onModal: (m: string) => void;
  onNavigate: (page: string) => void;
  user: any;
  onSignOut?: () => void;
}

export function TopBar({ title, onModal, onNavigate, user, onSignOut }: TopBarProps) {
  return (
    <header className="flex h-12 flex-shrink-0 items-center justify-between border-b border-[var(--sep)] bg-[var(--card)]">
      {/* Left: Draggable area + breadcrumb */}
      <div className="drag flex flex-1 items-center gap-2 pl-4 h-full">
        <nav className="no-drag flex items-center gap-1.5 text-[13px]">
          <button
            onClick={() => onNavigate("dashboard")}
            className="text-[var(--secondary)] transition-colors hover:text-[var(--label)]"
          >
            Home
          </button>
          <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="var(--gray3)" strokeWidth="2.5" strokeLinecap="round">
            <path d="m9 18 6-6-6-6" />
          </svg>
          <span className="font-medium text-[var(--label)]">{title}</span>
        </nav>
      </div>

      {/* Right: Actions (not draggable) */}
      <div className="no-drag flex items-center gap-1 pr-4">
        {/* Quick add */}
        <QuickAddButton onModal={onModal} />

        {/* Notifications */}
        <NotificationsButton />

        {/* User menu */}
        <UserMenu user={user} onNavigate={onNavigate} onSignOut={onSignOut} />

        {/* Divider */}
        <div className="mx-1 h-5 w-px bg-[var(--sep)]" />

        {/* Window controls */}
        <button onClick={() => window.electronAPI?.minimize()} className="rounded p-1.5 text-[#636366] hover:bg-[var(--bg)]" title="Minimize">
          <svg width="12" height="12" viewBox="0 0 12 12"><rect x="2" y="5.5" width="8" height="1" rx="0.5" fill="currentColor" /></svg>
        </button>
        <button onClick={() => window.electronAPI?.maximize()} className="rounded p-1.5 text-[#636366] hover:bg-[var(--bg)]" title="Maximize">
          <svg width="12" height="12" viewBox="0 0 12 12"><rect x="2" y="2" width="8" height="8" rx="1" stroke="currentColor" strokeWidth="1.2" fill="none" /></svg>
        </button>
        <button onClick={() => window.electronAPI?.close()} className="rounded p-1.5 text-[#636366] hover:bg-[var(--red)]/10 hover:text-[var(--red)]" title="Close">
          <svg width="12" height="12" viewBox="0 0 12 12"><path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg>
        </button>
      </div>
    </header>
  );
}

function NotificationsButton() {
  const [open, setOpen] = useState(false);
  const { notifications, markRead, markAllRead } = useNotifications();
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative rounded-lg p-2 text-[#636366] transition-colors hover:bg-[var(--bg)] hover:text-[var(--label)]"
      >
        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[var(--red)] ring-2 ring-[var(--card)]" />
        )}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-50 mt-1.5 w-80 rounded-xl border border-[var(--sep)] bg-[var(--card)] shadow-lg shadow-black/8 animate-modal-content">
            <div className="flex items-center justify-between border-b border-[var(--sep)] px-4 py-3">
              <p className="text-[13px] font-semibold">Notifications</p>
              {unreadCount > 0 && (
                <button onClick={markAllRead} className="text-[11px] font-medium text-[var(--accent)] hover:underline">
                  Mark all read
                </button>
              )}
            </div>
            <div className="max-h-[360px] overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="flex items-center justify-center py-8">
                  <p className="text-[13px] text-[var(--secondary)]">No notifications</p>
                </div>
              ) : (
                notifications.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => markRead(n.id)}
                    className={`flex w-full flex-col gap-0.5 px-4 py-3 text-left transition-colors hover:bg-[var(--bg)] border-b border-[var(--sep)] last:border-b-0 ${!n.read ? "bg-[var(--accent)]/[0.03]" : ""}`}
                  >
                    <div className="flex items-center gap-2">
                      {!n.read && <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[var(--accent)]" />}
                      <span className={`text-[13px] font-medium ${!n.read ? "" : "text-[var(--secondary)]"}`}>{n.title}</span>
                    </div>
                    <p className="text-[11px] text-[var(--secondary)] pl-3.5">{n.desc}</p>
                    <p className="text-[10px] text-[var(--tertiary)] pl-3.5">{n.time}</p>
                  </button>
                ))
              )}
            </div>
            <div className="border-t border-[var(--sep)] px-4 py-2">
              <button className="w-full text-center text-[12px] font-medium text-[var(--accent)] hover:underline">
                View All Notifications
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function QuickAddButton({ onModal }: { onModal: (m: string) => void }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-3 py-1.5 text-[12px] font-semibold text-white shadow-sm shadow-[var(--accent)]/20 transition-all hover:brightness-110 active:scale-[0.98]"
      >
        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <path d="M12 5v14M5 12h14" />
        </svg>
        New
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-50 mt-1.5 w-52 rounded-xl border border-[var(--sep)] bg-[var(--card)] p-1.5 shadow-lg shadow-black/8 animate-modal-content">
            <DropdownItem label="New Estimate" desc="Start from scratch" onClick={() => { onModal("new-estimate"); setOpen(false); }} />
            <DropdownItem label="Add Client" desc="New client record" onClick={() => { onModal("add-client"); setOpen(false); }} />
            <DropdownItem label="Log Expense" desc="Record a purchase" onClick={() => { onModal("log-expense"); setOpen(false); }} />
            <DropdownItem label="Upload Invoice" desc="Supplier invoice" onClick={() => { onModal("upload-invoice"); setOpen(false); }} />
          </div>
        </>
      )}
    </div>
  );
}

function UserMenu({ user, onNavigate, onSignOut }: { user: any; onNavigate: (page: string) => void; onSignOut?: () => void }) {
  const [open, setOpen] = useState(false);
  const initials = user ? user.full_name.split(" ").map((n: string) => n[0]).join("").slice(0, 2) : "--";

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 rounded-lg px-1.5 py-1 transition-colors hover:bg-[var(--bg)]"
      >
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--accent)] text-[9px] font-bold text-white">
          {initials}
        </div>
        <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="var(--gray2)" strokeWidth="2.5" strokeLinecap="round">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-50 mt-1.5 w-48 rounded-xl border border-[var(--sep)] bg-[var(--card)] p-1.5 shadow-lg shadow-black/8 animate-modal-content">
            {user && (
              <div className="px-3 py-2 border-b border-[var(--sep)] mb-1">
                <p className="text-[13px] font-medium truncate">{user.full_name}</p>
                <p className="text-[11px] text-[var(--secondary)] truncate">{user.email}</p>
              </div>
            )}
            <button
              onClick={() => { onNavigate("profile"); setOpen(false); }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[13px] transition-colors hover:bg-[var(--bg)]"
            >
              Profile
            </button>
            <button
              onClick={() => { onNavigate("settings"); setOpen(false); }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[13px] transition-colors hover:bg-[var(--bg)]"
            >
              Settings
            </button>
            {onSignOut && (
              <>
                <div className="my-1 h-px bg-[var(--sep)]" />
                <button
                  onClick={() => { onSignOut(); setOpen(false); }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[13px] text-[var(--red)] transition-colors hover:bg-[var(--red)]/5"
                >
                  Sign Out
                </button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function DropdownItem({ label, desc, onClick }: { label: string; desc: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex w-full flex-col rounded-lg px-3 py-2 text-left transition-colors hover:bg-[var(--bg)]"
    >
      <span className="text-[13px] font-medium">{label}</span>
      <span className="text-[11px] text-[var(--secondary)]">{desc}</span>
    </button>
  );
}
