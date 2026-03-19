import { useState, useEffect } from "react";
import Link from "next/link";
import { useCurrentUser } from "../lib/store";
const mhpLogo = "/mhp-logo.png";
import {
  Squares2X2Icon,
  DocumentTextIcon,
  CubeIcon,
  ReceiptPercentIcon,
  UsersIcon,
  PhoneIcon,
  Cog6ToothIcon,
  UserGroupIcon,
  ChevronDoubleLeftIcon,
  ChevronDoubleRightIcon,
  SparklesIcon,
  CalendarDaysIcon,
  ClockIcon,
  WrenchScrewdriverIcon,
} from "@heroicons/react/24/outline";
import {
  Squares2X2Icon as Squares2X2IconSolid,
  DocumentTextIcon as DocumentTextIconSolid,
  CubeIcon as CubeIconSolid,
  ReceiptPercentIcon as ReceiptPercentIconSolid,
  UsersIcon as UsersIconSolid,
  PhoneIcon as PhoneIconSolid,
  Cog6ToothIcon as Cog6ToothIconSolid,
  UserGroupIcon as UserGroupIconSolid,
  SparklesIcon as SparklesIconSolid,
  CalendarDaysIcon as CalendarDaysIconSolid,
  ClockIcon as ClockIconSolid,
  WrenchScrewdriverIcon as WrenchScrewdriverIconSolid,
} from "@heroicons/react/24/solid";
import type { ComponentType, SVGProps } from "react";

type HeroIcon = ComponentType<SVGProps<SVGSVGElement>>;

const PAGE_ROUTES: Record<string, string> = {
  dashboard: "/dashboard",
  estimates: "/estimates",
  materials: "/materials",
  invoices: "/invoices",
  clients: "/clients",
  schedule: "/schedule",
  "time-tracking": "/time-tracking",
  subcontractors: "/subcontractors",
  calls: "/calls",
  analytics: "/analytics",
  settings: "/settings",
  profile: "/profile",
  team: "/team",
  upgrade: "/upgrade",
};

interface SidebarProps {
  active: string;
  onNavigate: (page: string) => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
  callActive?: boolean;
  onCall?: () => void;
}

const mainNav = [
  { id: "dashboard", label: "Dashboard", icon: Squares2X2Icon, iconActive: Squares2X2IconSolid },
  { id: "estimates", label: "Estimates", icon: DocumentTextIcon, iconActive: DocumentTextIconSolid },
  { id: "calls", label: "Calls", icon: PhoneIcon, iconActive: PhoneIconSolid },
  { id: "clients", label: "Clients", icon: UsersIcon, iconActive: UsersIconSolid },
  { id: "schedule", label: "Schedule", icon: CalendarDaysIcon, iconActive: CalendarDaysIconSolid },
  { id: "time-tracking", label: "Time Tracking", icon: ClockIcon, iconActive: ClockIconSolid },
  { id: "invoices", label: "Invoices", icon: ReceiptPercentIcon, iconActive: ReceiptPercentIconSolid },
];

const toolsNav = [
  { id: "materials", label: "Materials", icon: CubeIcon, iconActive: CubeIconSolid },
  { id: "subcontractors", label: "Subs", icon: WrenchScrewdriverIcon, iconActive: WrenchScrewdriverIconSolid },
  { id: "team", label: "Team", icon: UserGroupIcon, iconActive: UserGroupIconSolid },
  { id: "settings", label: "Settings", icon: Cog6ToothIcon, iconActive: Cog6ToothIconSolid },
];

const upgradeNav = [
  { id: "upgrade", label: "Upgrade", icon: SparklesIcon, iconActive: SparklesIconSolid },
];

export function Sidebar({ active, mobileOpen, onMobileClose, callActive, onCall }: SidebarProps) {
  const { user } = useCurrentUser();
  const [collapsed, setCollapsed] = useState(false);
  const [ttsReady, setTtsReady] = useState(false);
  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_TTS_HEALTH_URL;
    if (!url) return;
    const controller = new AbortController();
    fetch(url, { signal: controller.signal })
      .then((res) => setTtsReady(res.ok))
      .catch(() => {});
    return () => controller.abort();
  }, []);
  const initials = user?.full_name
    ? user.full_name.split(" ").filter(Boolean).map((n: string) => n[0]).join("").slice(0, 2) || "--"
    : "--";

  const handleMobileClose = () => {
    onMobileClose?.();
  };

  return (
    <>
      {/* Mobile overlay backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden"
          onClick={onMobileClose}
        />
      )}
      <div className={`sidebar-root flex h-screen flex-shrink-0 flex-col bg-[var(--card)] transition-all duration-[var(--duration-normal)] ${collapsed ? "w-[68px]" : "w-[280px]"} fixed inset-y-0 left-0 z-50 ${mobileOpen ? "translate-x-0" : "-translate-x-full"} md:relative md:translate-x-0`}>
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

      {/* Alex Voice Bot Card */}
      {process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID && (
        collapsed ? (
          <div className="px-3 mb-2">
            <button
              onClick={() => onCall?.()}
              className={`flex w-full items-center justify-center rounded-xl p-3 transition-all ${
                callActive
                  ? "bg-[var(--accent)] text-white"
                  : "bg-[var(--accent-light)] text-[var(--accent)] hover:bg-[var(--accent-medium)]"
              }`}
              title={callActive ? "Alex is listening..." : "Alex"}
            >
              {callActive ? (
                <span className="relative flex h-5 w-5 items-center justify-center">
                  <span className="absolute h-3 w-3 rounded-full bg-red-400 animate-call-pulse" />
                </span>
              ) : (
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
              )}
            </button>
          </div>
        ) : (
          <div className="mx-3 mb-3 mt-1">
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
                    <span className="absolute h-3 w-3 rounded-full bg-red-400 animate-call-pulse" />
                  </span>
                ) : (
                  <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke={callActive ? "#fff" : "var(--accent)"} strokeWidth="1.5" strokeLinecap="round">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                  </svg>
                )}
              </div>
              <div className="min-w-0 text-left">
                <p className={`text-[14px] font-semibold leading-tight ${callActive ? "text-white" : "text-[var(--accent)]"}`}>
                  {callActive ? "Alex is listening..." : "Alex"}
                </p>
                <p className={`text-[12px] leading-tight mt-0.5 ${callActive ? "text-white/70" : "text-[var(--secondary)]"}`}>
                  {callActive ? "Click to open call" : "Voice estimation assistant"}
                </p>
              </div>
            </button>
          </div>
        )
      )}

      {/* Main Nav */}
      <nav role="navigation" aria-label="Main navigation" className="flex-1 overflow-y-auto px-3 pt-1">
        <p className="mb-1.5 px-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--tertiary)]">
          {collapsed ? "" : "Main"}
        </p>
        <NavGroup items={mainNav} active={active} onMobileClose={handleMobileClose} collapsed={collapsed} />
        <p className="mt-4 mb-1.5 px-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--tertiary)]">
          {collapsed ? "" : "Tools"}
        </p>
        <NavGroup items={toolsNav} active={active} onMobileClose={handleMobileClose} collapsed={collapsed} />
        <div className="mt-3" />
        <NavGroup items={upgradeNav} active={active} onMobileClose={handleMobileClose} collapsed={collapsed} />
      </nav>

      {/* Collapse toggle */}
      <div className="px-3 pb-1">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex w-full items-center justify-center rounded-lg p-2 text-[var(--gray2)] transition-colors hover:bg-[var(--fill)] hover:text-[var(--gray1)]"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronDoubleRightIcon className="h-4 w-4" /> : <ChevronDoubleLeftIcon className="h-4 w-4" />}
        </button>
      </div>

      {/* Separator above user section */}
      <div className="mx-3 h-px bg-[var(--sep)]" />

      {/* User */}
      <div className="p-3">
        <Link
          href="/profile"
          onClick={handleMobileClose}
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
        </Link>
      </div>
    </div>
    </>
  );
}

function NavGroup({
  items,
  active,
  onMobileClose,
  collapsed,
}: {
  items: { id: string; label: string; icon: HeroIcon; iconActive: HeroIcon }[];
  active: string;
  onMobileClose: () => void;
  collapsed: boolean;
}) {
  return (
    <div className="space-y-1">
      {items.map((item) => {
        const isActive = active === item.id;
        const Icon = isActive ? item.iconActive : item.icon;
        const href = PAGE_ROUTES[item.id] || `/${item.id}`;
        return (
          <Link
            key={item.id}
            href={href}
            onClick={onMobileClose}
            title={collapsed ? item.label : undefined}
            aria-current={isActive ? "page" : undefined}
            className={`group flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[14px] transition-all duration-[var(--duration-fast)] ${
              isActive
                ? "bg-[var(--accent-light)] text-[var(--accent)] font-semibold border-l-2 border-[var(--accent)]"
                : "font-medium text-[var(--label)] hover:bg-[var(--fill)] hover:translate-x-0.5"
            } ${collapsed ? "justify-center" : ""}`}
          >
            <Icon className={`h-5 w-5 flex-shrink-0 ${isActive ? "text-[var(--accent)]" : "text-[var(--gray1)]"}`} />
            {!collapsed && <span className="flex-1 text-left">{item.label}</span>}
          </Link>
        );
      })}
    </div>
  );
}
