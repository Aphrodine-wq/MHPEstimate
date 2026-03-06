import { useState } from "react";
import { useCurrentUser } from "../lib/store";
const mhpLogo = "/mhp-logo.png";

interface SidebarProps {
  active: string;
  onNavigate: (page: string) => void;
}

const mainNav = [
  { id: "dashboard", label: "Dashboard", icon: IconGrid },
  { id: "estimates", label: "Estimates", icon: IconDoc },
  { id: "materials", label: "Materials", icon: IconBox },
  { id: "invoices", label: "Invoices", icon: IconReceipt },
  { id: "clients", label: "Clients", icon: IconPeople },
  { id: "calls", label: "Call History", icon: IconPhone },
];

const toolsNav = [
  { id: "analytics", label: "Analytics", icon: IconChart },
  { id: "settings", label: "Settings", icon: IconGear },
];

export function Sidebar({ active, onNavigate }: SidebarProps) {
  const { user } = useCurrentUser();
  const [collapsed, setCollapsed] = useState(false);
  const initials = user
    ? user.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2)
    : "--";

  return (
    <div className={`sidebar-root flex h-screen flex-shrink-0 flex-col border-r border-[var(--sep)] bg-[var(--card)] transition-[width] duration-200 ${collapsed ? "w-[68px]" : "w-[252px]"}`}>
      {/* Brand header */}
      <div className={`flex items-center gap-2.5 pt-5 pb-4 ${collapsed ? "justify-center px-3" : "px-5"}`}>
        <img src={mhpLogo} alt="MHP Construction" className="h-9 w-9 flex-shrink-0 rounded-lg object-contain" />
        {!collapsed && (
          <div className="min-w-0">
            <p className="text-[15px] font-bold tracking-tight leading-tight">ProEstimate AI</p>
            <p className="text-[11px] text-[var(--secondary)] leading-tight">MHP Construction</p>
          </div>
        )}
      </div>

      {/* Main Nav */}
      <nav className="flex-1 overflow-y-auto px-3 pt-1">
        <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-widest text-[var(--gray2)]">
          {collapsed ? "" : "Main"}
        </p>
        <NavGroup items={mainNav} active={active} onNavigate={onNavigate} collapsed={collapsed} />
        <p className="mt-4 mb-1 px-2 text-[10px] font-semibold uppercase tracking-widest text-[var(--gray2)]">
          {collapsed ? "" : "Tools"}
        </p>
        <NavGroup items={toolsNav} active={active} onNavigate={onNavigate} collapsed={collapsed} />
      </nav>

      {/* Collapse toggle */}
      <div className="px-3 pb-1">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex w-full items-center justify-center rounded-lg p-2 text-[var(--gray2)] transition-colors hover:bg-[var(--bg)] hover:text-[var(--gray1)]"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            {collapsed ? (
              <><path d="M13 17l5-5-5-5" /><path d="M6 17l5-5-5-5" /></>
            ) : (
              <><path d="M11 17l-5-5 5-5" /><path d="M18 17l-5-5 5-5" /></>
            )}
          </svg>
        </button>
      </div>

      {/* User */}
      <div className="border-t border-[var(--sep)] p-3">
        <button
          onClick={() => onNavigate("profile")}
          className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 transition-colors ${
            active === "profile" ? "bg-[var(--accent)]/8" : "hover:bg-[var(--bg)]"
          }`}
        >
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-[11px] font-bold text-white">
            {initials}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0 text-left">
              <p className="text-[13px] font-medium leading-tight truncate">{user?.full_name ?? "Not signed in"}</p>
              <p className="text-[11px] text-[var(--secondary)] truncate">{user?.role ?? "Connect Supabase"}</p>
            </div>
          )}
        </button>
      </div>
    </div>
  );
}

function NavGroup({
  items,
  active,
  onNavigate,
  collapsed,
}: {
  items: { id: string; label: string; icon: React.FC<{ active: boolean }> }[];
  active: string;
  onNavigate: (id: string) => void;
  collapsed: boolean;
}) {
  return (
    <div className="space-y-0.5">
      {items.map((item) => {
        const isActive = active === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            title={collapsed ? item.label : undefined}
            className={`group flex w-full items-center gap-2.5 rounded-lg px-2.5 py-[7px] text-[13px] transition-all ${
              isActive
                ? "bg-[var(--accent)] font-semibold text-white shadow-sm shadow-[var(--accent)]/20"
                : "font-medium text-[var(--label)] hover:bg-[var(--bg)]"
            } ${collapsed ? "justify-center" : ""}`}
          >
            <item.icon active={isActive} />
            {!collapsed && <span className="flex-1 text-left">{item.label}</span>}
          </button>
        );
      })}
    </div>
  );
}

/* -- Icons: #636366 for better contrast -- */

function IconGrid({ active }: { active: boolean }) {
  const c = active ? "#fff" : "#636366";
  return (
    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  );
}

function IconDoc({ active }: { active: boolean }) {
  const c = active ? "#fff" : "#636366";
  return (
    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
      <path d="M14 2v6h6" /><path d="M8 13h8" /><path d="M8 17h8" />
    </svg>
  );
}

function IconBox({ active }: { active: boolean }) {
  const c = active ? "#fff" : "#636366";
  return (
    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
      <path d="m3.3 7 8.7 5 8.7-5" /><path d="M12 22V12" />
    </svg>
  );
}

function IconReceipt({ active }: { active: boolean }) {
  const c = active ? "#fff" : "#636366";
  return (
    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" />
      <path d="M8 10h8" /><path d="M8 14h4" />
    </svg>
  );
}

function IconPeople({ active }: { active: boolean }) {
  const c = active ? "#fff" : "#636366";
  return (
    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function IconPhone({ active }: { active: boolean }) {
  const c = active ? "#fff" : "#636366";
  return (
    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

function IconChart({ active }: { active: boolean }) {
  const c = active ? "#fff" : "#636366";
  return (
    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 20V10" /><path d="M12 20V4" /><path d="M6 20v-6" />
    </svg>
  );
}

function IconGear({ active }: { active: boolean }) {
  const c = active ? "#fff" : "#636366";
  return (
    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
