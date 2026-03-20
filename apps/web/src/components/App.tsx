"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import dynamic from "next/dynamic";
import type { Estimate } from "@proestimate/shared/types";

function PageSkeleton() {
  return (
    <div className="p-6 space-y-4">
      <div className="h-24 rounded-xl bg-[var(--fill)] animate-pulse" />
      <div className="h-24 rounded-xl bg-[var(--fill)] animate-pulse" />
    </div>
  );
}

const Dashboard = dynamic(() => import("./Dashboard").then(m => ({ default: m.Dashboard })), { ssr: false, loading: () => <PageSkeleton /> });
const EstimatesList = dynamic(() => import("./EstimatesList").then(m => ({ default: m.EstimatesList })), { ssr: false, loading: () => <PageSkeleton /> });
const MaterialsPage = dynamic(() => import("./MaterialsPage").then(m => ({ default: m.MaterialsPage })), { ssr: false, loading: () => <PageSkeleton /> });
const InvoicesPage = dynamic(() => import("./InvoicesPage").then(m => ({ default: m.InvoicesPage })), { ssr: false, loading: () => <PageSkeleton /> });
const ClientsPage = dynamic(() => import("./ClientsPage").then(m => ({ default: m.ClientsPage })), { ssr: false, loading: () => <PageSkeleton /> });
const CallHistoryPage = dynamic(() => import("./CallHistoryPage").then(m => ({ default: m.CallHistoryPage })), { ssr: false, loading: () => <PageSkeleton /> });
const AnalyticsPage = dynamic(() => import("./AnalyticsPage").then(m => ({ default: m.AnalyticsPage })), { ssr: false, loading: () => <PageSkeleton /> });
const SettingsPage = dynamic(() => import("./SettingsPage").then(m => ({ default: m.SettingsPage })), { ssr: false, loading: () => <PageSkeleton /> });
const Profile = dynamic(() => import("./Profile").then(m => ({ default: m.Profile })), { ssr: false, loading: () => <PageSkeleton /> });
const TeamMembersPage = dynamic(() => import("./TeamMembersPage").then(m => ({ default: m.TeamMembersPage })), { ssr: false, loading: () => <PageSkeleton /> });
const ScheduleView = dynamic(() => import("./ScheduleView").then(m => ({ default: m.ScheduleView })), { ssr: false, loading: () => <PageSkeleton /> });
const CallAlexFAB = dynamic(() => import("./CallAlex").then(m => ({ default: m.CallAlexFAB })), { ssr: false });
const CallAlexPanel = dynamic(() => import("./CallAlex").then(m => ({ default: m.CallAlexPanel })), { ssr: false });
import { SplashScreen } from "./SplashScreen";
import { AuthScreen } from "./AuthScreen";
import { OnboardingWizard } from "./OnboardingWizard";
import { NewEstimateModal } from "./NewEstimateModal";
import { AutoEstimateModal } from "./AutoEstimateModal";
import { CloneEstimateModal } from "./CloneEstimateModal";
import { QuickEstimate } from "./QuickEstimate";
import { AddClientModal } from "./AddClientModal";
import { LogExpenseModal } from "./LogExpenseModal";
import { UploadInvoiceModal } from "./UploadInvoiceModal";
import { EditProfileModal } from "./EditProfileModal";
import { EstimateEditorModal } from "./EstimateEditorModal";
import { AppProvider, type AppContextValue } from "./AppContext";
import { ErrorBoundary } from "./ErrorBoundary";
import { useCurrentUser, useEstimates } from "../lib/store";
import { supabase, getSession, signOut } from "../lib/supabase";
import { setUserContext, clearUserContext } from "../lib/sentry";
import { useDarkMode } from "../lib/useDarkMode";
import { Toaster } from "react-hot-toast";

type ModalType = null | "new-estimate" | "add-client" | "log-expense" | "upload-invoice" | "edit-profile" | "edit-estimate" | "auto-estimate" | "clone-estimate" | "quick-estimate";
type AppPhase = "splash" | "auth" | "reset-password" | "ready";

// Pages no longer receive props — they use useAppContext() instead
const PAGE_TITLES: Record<string, string> = {
  dashboard: "Dashboard",
  estimates: "Estimates",
  materials: "Materials",
  invoices: "Invoices",
  clients: "Clients",
  calls: "Call History",
  analytics: "Analytics",
  settings: "Settings",
  profile: "Profile",
  team: "Team Members",
  schedule: "Schedule",
};

const pages: Record<string, React.ComponentType> = {
  dashboard: Dashboard,
  estimates: EstimatesList,
  materials: MaterialsPage,
  invoices: InvoicesPage,
  clients: ClientsPage,
  calls: CallHistoryPage,
  analytics: AnalyticsPage,
  settings: SettingsPage,
  profile: Profile,
  team: TeamMembersPage,
  schedule: ScheduleView,
};

export function App() {
  const [phase, setPhase] = useState<AppPhase>("splash");
  const [active, setActive] = useState("dashboard");
  const [callOpen, setCallOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [modal, setModal] = useState<ModalType>(null);
  const [editingEstimate, setEditingEstimate] = useState<Estimate | null>(null);
  const [sourceEstimate, setSourceEstimate] = useState<Estimate | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const { user } = useCurrentUser();
  const { data: estimates, loading: estimatesLoading } = useEstimates();
  useDarkMode();

  const openCall = useCallback(() => setCallOpen(true), []);
  const handleModal = useCallback((m: string) => setModal(m as ModalType), []);
  const openEstimateEditor = useCallback((estimate: Estimate) => {
    setEditingEstimate(estimate);
    setModal("edit-estimate");
  }, []);

  const handleEstimateCreated = useCallback((estimate: Estimate) => {
    setCallOpen(false);
    openEstimateEditor(estimate);
  }, [openEstimateEditor]);

  // After splash completes, go straight to app (auth disabled for now)
  const handleSplashReady = useCallback(async () => {
    setPhase("ready");
  }, []);

  const handleDevBypass = useCallback(() => {
    setPhase("ready");
  }, []);

  const handleAuthenticated = useCallback(() => {
    setPhase("ready");
  }, []);

  const handleSignOut = useCallback(async () => {
    await signOut();
    setPhase("auth");
    setActive("dashboard");
  }, []);

  // Check if onboarding should show (new user with no estimates)
  useEffect(() => {
    if (phase !== "ready" || estimatesLoading) return;
    const alreadyDone = localStorage.getItem("onboarding_complete") === "true";
    if (!alreadyDone && estimates.length === 0) {
      setShowOnboarding(true);
    }
  }, [phase, estimates, estimatesLoading]);

  const handleOnboardingComplete = useCallback(() => {
    setShowOnboarding(false);
  }, []);

  // Auth disabled for now — no auth state listener needed

  // Sync authenticated user identity to Sentry so errors include who was affected
  useEffect(() => {
    if (phase === "ready" && user) {
      setUserContext(user.id, user.email ?? undefined, user.role);
    } else if (phase === "auth") {
      clearUserContext();
    }
  }, [phase, user]);

  const Page = pages[active] ?? Dashboard;

  const appCtx = useMemo<AppContextValue>(() => ({
    onNavigate: setActive,
    onCallAlex: openCall,
    onModal: handleModal,
    onEditEstimate: openEstimateEditor,
    onSignOut: handleSignOut,
  }), [openCall, handleModal, openEstimateEditor, handleSignOut]);

  return (
    <ErrorBoundary>
      <AppProvider value={appCtx}>
      {phase === "splash" && <SplashScreen onReady={handleSplashReady} />}
      {showOnboarding && phase === "ready" && (
        <OnboardingWizard
          userName={user?.full_name?.split(" ")[0] ?? null}
          onComplete={handleOnboardingComplete}
          onNavigate={setActive}
          onNewEstimate={() => handleModal("new-estimate")}
          onCallAlex={openCall}
        />
      )}
      <div className={`flex h-screen overflow-hidden bg-[var(--bg)] ${phase !== "ready" ? "invisible" : ""}`}
          aria-hidden={phase !== "ready"}>
        <Sidebar active={active} onNavigate={(page) => { setActive(page); setMobileMenuOpen(false); }} mobileOpen={mobileMenuOpen} onMobileClose={() => setMobileMenuOpen(false)} callActive={callOpen} onCall={openCall} />
        <div className="flex flex-1 flex-col overflow-hidden">
          <TopBar
            title={PAGE_TITLES[active] ?? "Dashboard"}
            onModal={handleModal}
            onNavigate={setActive}
            user={user}
            onSignOut={handleSignOut}
            onToggleMobileMenu={() => setMobileMenuOpen((v) => !v)}
          />
          <main id="main-content" key={active} className="flex-1 overflow-hidden animate-page-enter" tabIndex={-1}>
            <ErrorBoundary>
              <Page />
            </ErrorBoundary>
          </main>
        </div>
        {!callOpen && <CallAlexFAB onCall={openCall} />}
        {callOpen && <CallAlexPanel onClose={() => setCallOpen(false)} onEstimateCreated={handleEstimateCreated} />}
      </div>
      <QuickEstimate open={modal === "quick-estimate"} onClose={() => setModal(null)} />
      <NewEstimateModal open={modal === "new-estimate"} onClose={() => setModal(null)} onCreated={(est) => { openEstimateEditor(est); }} />
      <AutoEstimateModal open={modal === "auto-estimate"} onClose={() => setModal(null)} onCreated={(est) => { openEstimateEditor(est); }} />
      <CloneEstimateModal open={modal === "clone-estimate"} onClose={() => { setModal(null); setSourceEstimate(null); }} sourceEstimate={sourceEstimate} onCreated={(est) => { openEstimateEditor(est); }} />
      <AddClientModal open={modal === "add-client"} onClose={() => setModal(null)} />
      <LogExpenseModal open={modal === "log-expense"} onClose={() => setModal(null)} />
      <UploadInvoiceModal open={modal === "upload-invoice"} onClose={() => setModal(null)} />
      <EditProfileModal open={modal === "edit-profile"} onClose={() => setModal(null)} user={user} />
      <EstimateEditorModal open={modal === "edit-estimate"} onClose={() => { setModal(null); setEditingEstimate(null); }} estimate={editingEstimate} />
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: "var(--card)",
            color: "var(--label)",
            borderRadius: "16px",
            fontSize: "13px",
            boxShadow: "var(--shadow-lg)",
            border: "1px solid var(--sep)",
            padding: "12px 16px",
          },
          success: { duration: 3000 },
          error: { duration: 5000 },
        }}
      />
      <div aria-live="polite" aria-atomic="true" className="sr-only" id="live-region" />
      </AppProvider>
    </ErrorBoundary>
  );
}
