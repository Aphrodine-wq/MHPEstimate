import { useState } from "react";

interface TopBarProps {
  title: string;
  onModal: (m: string) => void;
  onNavigate: (page: string) => void;
  user: any;
}

const MOCK_NOTIFICATIONS = [
  { id: "1", title: "Estimate Accepted", desc: "Kitchen Remodel #EST-0042 was accepted by client", time: "2m ago", read: false },
  { id: "2", title: "Invoice Processed", desc: "INV-00189 from Home Depot has been processed", time: "1h ago", read: false },
  { id: "3", title: "Estimate Expiring", desc: "#EST-0038 expires in 3 days — follow up with client", time: "3h ago", read: false },
  { id: "4", title: "Price Alert", desc: "Lumber prices updated — 2x4 up 4.2% this week", time: "5h ago", read: true },
  { id: "5", title: "New Client Added", desc: "Sarah Johnson was added to your client list", time: "1d ago", read: true },
];

export function TopBar({ title, onModal, onNavigate, user }: TopBarProps) {
  return (
    <header className="flex h-14 flex-shrink-0 items-center justify-between border-b border-[var(--sep)] bg-[var(--card)] px-6">
      {/* Left: Breadcrumb */}
      <div className="flex items-center gap-2">
        <nav className="flex items-center gap-1.5 text-[13px]">
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

      {/* Right: Actions */}
      <div className="flex items-center gap-1">
        {/* Quick add dropdown */}
        <QuickAddButton onModal={onModal} />

        {/* Notifications */}
        <NotificationsButton />

        {/* Help */}
        <button className="rounded-lg p-2 text-[var(--gray1)] transition-colors hover:bg-[var(--bg)] hover:text-[var(--label)]">
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
            <path d="M12 17h.01" />
          </svg>
        </button>

        {/* Divider */}
        <div className="mx-1.5 h-6 w-px bg-[var(--sep)]" />

        {/* User avatar in topbar */}
        <button
          onClick={() => onNavigate("profile")}
          className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-[var(--bg)]"
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--accent)] text-[10px] font-bold text-white">
            {user ? user.full_name.split(" ").map((n: string) => n[0]).join("").slice(0, 2) : "--"}
          </div>
          <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="var(--gray2)" strokeWidth="2.5" strokeLinecap="round">
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>
      </div>
    </header>
  );
}

function NotificationsButton() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS);
  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const markRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
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
