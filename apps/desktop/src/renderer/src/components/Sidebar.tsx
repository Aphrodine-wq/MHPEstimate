import { useState } from "react";
import { useCurrentUser } from "../lib/store";
import {
  HomeIcon,
  DocumentTextIcon,
  ReceiptPercentIcon,
  UsersIcon,
  PhoneIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  ChevronDoubleLeftIcon,
  ChevronDoubleRightIcon,
  FolderIcon,
} from "@heroicons/react/24/outline";
import {
  HomeIcon as HomeIconSolid,
  DocumentTextIcon as DocumentTextIconSolid,
  ReceiptPercentIcon as ReceiptPercentIconSolid,
  UsersIcon as UsersIconSolid,
  PhoneIcon as PhoneIconSolid,
  ChartBarIcon as ChartBarIconSolid,
  Cog6ToothIcon as Cog6ToothIconSolid,
  FolderIcon as FolderIconSolid,
} from "@heroicons/react/24/solid";
import type { ComponentType, SVGProps } from "react";

import mhpLogo from "../assets/mhp-logo.png";

type HeroIcon = ComponentType<SVGProps<SVGSVGElement>>;

interface SidebarProps {
  active: string;
  onNavigate: (page: string) => void;
  callActive?: boolean;
  onCall?: () => void;
}

const navItems = [
  { id: "home", label: "Dashboard", icon: HomeIcon, iconActive: HomeIconSolid },
  { id: "estimates", label: "Estimates", icon: DocumentTextIcon, iconActive: DocumentTextIconSolid },
  { id: "projects", label: "Projects", icon: FolderIcon, iconActive: FolderIconSolid },
  { id: "clients", label: "Clients", icon: UsersIcon, iconActive: UsersIconSolid },
  { id: "invoices", label: "Invoices", icon: ReceiptPercentIcon, iconActive: ReceiptPercentIconSolid },
  { id: "reports", label: "Reports", icon: ChartBarIcon, iconActive: ChartBarIconSolid },
  { id: "settings", label: "Settings", icon: Cog6ToothIcon, iconActive: Cog6ToothIconSolid },
];

export function Sidebar({ active, onNavigate, callActive, onCall }: SidebarProps) {
  const { user } = useCurrentUser();
  const [collapsed, setCollapsed] = useState(false);
  const initials = user
    ? user.full_name.split(" ").filter(Boolean).map((n: string) => n[0]).join("").slice(0, 2)
    : "--";

  return (
    <div className={`flex h-screen flex-shrink-0 flex-col border-r border-[var(--sep)] bg-[var(--card)] transition-all duration-[var(--duration-normal)] ${collapsed ? "w-[68px]" : "w-[280px]"}`}>
      {/* Drag region for frameless window */}
      <div className="drag h-3 w-full flex-shrink-0" />

      {/* Brand header */}
      <div className={`no-drag flex items-center gap-2.5 pt-2 pb-4 ${collapsed ? "justify-center px-3" : "px-5"}`}>
        <img src={mhpLogo} alt="MHP Construction" className="h-9 w-9 flex-shrink-0 rounded-lg object-contain" />
        {!collapsed && (
          <div className="min-w-0">
            <p className="text-[15px] font-bold tracking-tight leading-tight">MHP Estimate</p>
            <p className="text-[11px] text-[var(--secondary)] leading-tight">MHP Construction</p>
          </div>
        )}
      </div>

      {/* Call Alex Hero Card */}
      {collapsed ? (
        <div className="no-drag px-3 mb-2">
          <button
            onClick={() => onCall?.()}
            className={`flex w-full items-center justify-center rounded-xl p-3 transition-all ${
              callActive
                ? "bg-[var(--accent)] text-white"
                : "bg-[var(--accent-light)] text-[var(--accent)] hover:bg-[var(--accent-medium)]"
            }`}
            title={callActive ? "Alex is listening..." : "Call Alex"}
          >
            {callActive ? (
              <span className="relative flex h-5 w-5 items-center justify-center">
                <span className="absolute h-3 w-3 rounded-full bg-red-400 animate-pulse" />
              </span>
            ) : (
              <PhoneIcon className="h-5 w-5" />
            )}
          </button>
        </div>
      ) : (
        <div className="no-drag mx-3 mb-3 mt-1">
          <button
            onClick={() => onCall?.()}
            className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 transition-all ${
              callActive
                ? "border-[var(--accent)] bg-[var(--accent)] text-white shadow-md"
                : "border-[var(--accent-medium)] bg-[var(--accent-light)] hover:border-[var(--accent)] hover:shadow-sm"
            }`}
          >
            <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg ${
              callActive ? "bg-white/20" : "bg-[var(--accent)]/10"
            }`}>
              {callActive ? (
                <span className="relative flex h-5 w-5 items-center justify-center">
                  <span className="absolute h-3 w-3 rounded-full bg-red-400 animate-pulse" />
                </span>
              ) : (
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke={callActive ? "#fff" : "var(--accent)"} strokeWidth="1.5" strokeLinecap="round">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
              )}
            </div>
            <div className="min-w-0 text-left">
              <p className={`text-[14px] font-semibold leading-tight ${callActive ? "text-white" : "text-[var(--accent)]"}`}>
                {callActive ? "Alex is listening..." : "Call Alex"}
              </p>
              <p className={`text-[12px] leading-tight mt-0.5 ${callActive ? "text-white/70" : "text-[var(--secondary)]"}`}>
                {callActive ? "Click to open call" : "Voice estimation assistant"}
              </p>
            </div>
          </button>
        </div>
      )}

      {/* Nav */}
      <nav className="no-drag flex-1 overflow-y-auto px-3 pt-1">
        <NavGroup items={navItems} active={active} onNavigate={onNavigate} collapsed={collapsed} />
      </nav>

      {/* Separator + Collapse toggle */}
      <div className="mx-3 h-px bg-[var(--sep)]" />
      <div className="no-drag px-3 py-2">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[12px] font-medium text-[var(--secondary)] transition-colors hover:bg-[var(--fill)] hover:text-[var(--label)] ${collapsed ? "justify-center" : ""}`}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed
            ? <ChevronDoubleRightIcon className="h-3.5 w-3.5" />
            : <>
                <ChevronDoubleLeftIcon className="h-3.5 w-3.5" />
                <span>Collapse</span>
              </>
          }
        </button>
      </div>

      {/* User */}
      <div className="no-drag p-3">
        <button
          onClick={() => onNavigate("profile")}
          className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 transition-colors ${
            active === "profile" ? "bg-[var(--accent-light)]" : "hover:bg-[var(--fill)]"
          }`}
        >
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-[11px] font-bold text-white">
            {initials}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0 text-left">
              <p className="text-[14px] font-medium leading-tight truncate">{user?.full_name ?? "Not signed in"}</p>
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
  items: { id: string; label: string; icon: HeroIcon; iconActive: HeroIcon }[];
  active: string;
  onNavigate: (id: string) => void;
  collapsed: boolean;
}) {
  return (
    <div className="space-y-1">
      {items.map((item) => {
        const isActive = active === item.id;
        const Icon = isActive ? item.iconActive : item.icon;
        return (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            title={collapsed ? item.label : undefined}
            className={`group flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-[14.5px] transition-all duration-[var(--duration-fast)] ${
              isActive
                ? "bg-[var(--accent-light)] text-[var(--accent)] font-semibold border-l-[3px] border-[var(--accent)]"
                : "font-medium text-[var(--label)] hover:bg-[var(--fill)] hover:translate-x-0.5"
            } ${collapsed ? "justify-center" : ""}`}
          >
            <Icon className={`h-[19px] w-[19px] flex-shrink-0 ${isActive ? "text-[var(--accent)]" : "text-[var(--gray1)]"}`} />
            {!collapsed && <span className="flex-1 text-left">{item.label}</span>}
          </button>
        );
      })}
    </div>
  );
}
