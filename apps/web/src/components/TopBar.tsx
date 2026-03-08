import { useState } from "react";
import { useNotifications } from "../lib/store";

interface TopBarProps {
  title: string;
  onModal: (m: string) => void;
  onNavigate: (page: string) => void;
  user: any;
  onSignOut?: () => void;
  onToggleMobileMenu?: () => void;
}

export function TopBar({ title, onModal, onNavigate, user, onSignOut, onToggleMobileMenu }: TopBarProps) {
  return (
    <header className="flex h-14 flex-shrink-0 items-center justify-between border-b border-[var(--sep)] bg-[var(--card)] px-3 md:px-6">
      {/* Left: Hamburger + Breadcrumb */}
      <div className="flex items-center gap-2">
        {/* Mobile hamburger */}
        <button
          onClick={onToggleMobileMenu}
          aria-label="Toggle navigation menu"
          className="rounded-lg p-2 text-[var(--gray1)] transition-colors hover:bg-[var(--bg)] hover:text-[var(--label)] md:hidden"
        >
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <nav className="flex items-center gap-1.5 text-[13px]">
          <button
            onClick={() => onNavigate("dashboard")}
            className="hidden sm:inline text-[var(--secondary)] transition-colors hover:text-[var(--label)]"
          >
            Home
          </button>
          <svg className="hidden sm:block" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="var(--gray3)" strokeWidth="2.5" strokeLinecap="round">
            <path d="m9 18 6-6-6-6" />
          </svg>
          <span className="font-medium text-[var(--label)]">{title}</span>
        </nav>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-1">
        {/* Quick add dropdown */}
        <QuickAddButton onModal={onModal} />

        {/* Notifications */}
        <NotificationsButton />

        {/* Help */}
        <button aria-label="Help" className="hidden sm:flex rounded-lg p-2 text-[var(--gray1)] transition-colors hover:bg-[var(--bg)] hover:text-[var(--label)]">
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
            <path d="M12 17h.01" />
          </svg>
        </button>

        {/* Divider */}
        <div className="hidden sm:block mx-1.5 h-6 w-px bg-[var(--sep)]" />

        {/* User menu */}
        <UserMenu user={user} onNavigate={onNavigate} onSignOut={onSignOut} />
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
        aria-label={unreadCount > 0 ? `Notifications (${unreadCount} unread)` : "Notifications"}
        aria-expanded={open}
        aria-haspopup="true"
        className="relative rounded-lg p-2 text-[var(--gray1)] transition-colors hover:bg-[var(--bg)] hover:text-[var(--label)]"
      >
        <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
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
          <div role="menu" className="absolute right-0 top-full z-50 mt-1.5 w-80 rounded-xl border border-[var(--sep)] bg-[var(--card)] shadow-lg shadow-black/8 animate-modal-content">
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
                    role="menuitem"
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
        aria-expanded={open}
        aria-haspopup="true"
        aria-label="Create new item"
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
          <div role="menu" className="absolute right-0 top-full z-50 mt-1.5 w-52 rounded-xl border border-[var(--sep)] bg-[var(--card)] p-1.5 shadow-lg shadow-black/8 animate-modal-content">
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
  const initials = user?.full_name ? user.full_name.split(" ").filter(Boolean).map((n: string) => n[0]).join("").slice(0, 2) || "--" : "--";

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label="User menu"
        className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-[var(--bg)]"
      >
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--accent)] text-[10px] font-bold text-white">
          {initials}
        </div>
        <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="var(--gray2)" strokeWidth="2.5" strokeLinecap="round">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div role="menu" className="absolute right-0 top-full z-50 mt-1.5 w-48 rounded-xl border border-[var(--sep)] bg-[var(--card)] p-1.5 shadow-lg shadow-black/8 animate-modal-content">
            {user && (
              <div className="px-3 py-2 border-b border-[var(--sep)] mb-1">
                <p className="text-[13px] font-medium truncate">{user.full_name}</p>
                <p className="text-[11px] text-[var(--secondary)] truncate">{user.email}</p>
              </div>
            )}
            <button
              role="menuitem"
              onClick={() => { onNavigate("profile"); setOpen(false); }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[13px] transition-colors hover:bg-[var(--bg)]"
            >
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              Profile
            </button>
            <button
              role="menuitem"
              onClick={() => { onNavigate("settings"); setOpen(false); }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[13px] transition-colors hover:bg-[var(--bg)]"
            >
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
              Settings
            </button>
            {onSignOut && (
              <>
                <div className="my-1 h-px bg-[var(--sep)]" />
                <button
                  role="menuitem"
                  onClick={() => { onSignOut(); setOpen(false); }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[13px] text-[var(--red)] transition-colors hover:bg-[var(--red)]/5"
                >
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
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
      role="menuitem"
      onClick={onClick}
      className="flex w-full flex-col rounded-lg px-3 py-2 text-left transition-colors hover:bg-[var(--bg)]"
    >
      <span className="text-[13px] font-medium">{label}</span>
      <span className="text-[11px] text-[var(--secondary)]">{desc}</span>
    </button>
  );
}
