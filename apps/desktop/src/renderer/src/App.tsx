import { useState, useCallback, useEffect, useMemo, lazy, Suspense } from "react";
import { Sidebar } from "./components/Sidebar";
import { TopBar } from "./components/TopBar";
import { Dashboard } from "./components/Dashboard";

// Lazy load heavy pages
const EstimatesList = lazy(() => import("./components/EstimatesList").then(m => ({ default: m.EstimatesList })));
const ProjectsPage = lazy(() => import("./components/ProjectsPage").then(m => ({ default: m.ProjectsPage })));
const MaterialsPage = lazy(() => import("./components/MaterialsPage").then(m => ({ default: m.MaterialsPage })));
const InvoicesPage = lazy(() => import("./components/InvoicesPage").then(m => ({ default: m.InvoicesPage })));
const ClientsPage = lazy(() => import("./components/ClientsPage").then(m => ({ default: m.ClientsPage })));
const CallHistoryPage = lazy(() => import("./components/CallHistoryPage").then(m => ({ default: m.CallHistoryPage })));
const AnalyticsPage = lazy(() => import("./components/AnalyticsPage").then(m => ({ default: m.AnalyticsPage })));
const SettingsPage = lazy(() => import("./components/SettingsPage").then(m => ({ default: m.SettingsPage })));
const Profile = lazy(() => import("./components/Profile").then(m => ({ default: m.Profile })));
const TeamMembersPage = lazy(() => import("./components/TeamMembersPage").then(m => ({ default: m.TeamMembersPage })));
const SchedulePage = lazy(() => import("./components/SchedulePage").then(m => ({ default: m.SchedulePage })));
const SubcontractorsPage = lazy(() => import("./components/SubcontractorsPage").then(m => ({ default: m.SubcontractorsPage })));
const WarrantyPage = lazy(() => import("./components/WarrantyPage").then(m => ({ default: m.WarrantyPage })));
const FinancialReportsPage = lazy(() => import("./components/FinancialReportsPage").then(m => ({ default: m.FinancialReportsPage })));
const ProposalPage = lazy(() => import("./components/ProposalPage").then(m => ({ default: m.ProposalPage })));
const PhotoLogPage = lazy(() => import("./components/PhotoLogPage").then(m => ({ default: m.PhotoLogPage })));
const DailyLogPage = lazy(() => import("./components/DailyLogPage").then(m => ({ default: m.DailyLogPage })));
const TakeoffPage = lazy(() => import("./components/TakeoffPage").then(m => ({ default: m.TakeoffPage })));
const SelectionsPage = lazy(() => import("./components/SelectionsPage").then(m => ({ default: m.SelectionsPage })));
const PurchaseOrdersPage = lazy(() => import("./components/PurchaseOrdersPage").then(m => ({ default: m.PurchaseOrdersPage })));
const TimeTrackingPage = lazy(() => import("./components/TimeTrackingPage").then(m => ({ default: m.TimeTrackingPage })));
import { CallAlexFAB, CallAlexPanel } from "./components/CallAlex";
import { SplashScreen } from "./components/SplashScreen";
import { AuthScreen } from "./components/AuthScreen";
import { OnboardingWizard } from "./components/OnboardingWizard";
import { NewEstimateModal, AddClientModal, LogExpenseModal, UploadInvoiceModal, EditProfileModal } from "./components/FormModals";
import { EstimateEditorModal } from "./components/EstimateEditorModal";
import { UpdateBanner } from "./components/UpdateBanner";
import { OfflineIndicator } from "./components/OfflineIndicator";
import { AppProvider, type AppContextValue } from "./components/AppContext";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { useCurrentUser, useEstimates } from "./lib/store";
import { supabase, getSession, signOut } from "./lib/supabase";
import { initSyncHandler } from "./lib/sync-handler";

type ModalType = null | "new-estimate" | "add-client" | "log-expense" | "upload-invoice" | "edit-profile" | "edit-estimate";
type AppPhase = "splash" | "auth" | "reset-password" | "ready";

const PAGE_TITLES: Record<string, string> = {
  dashboard: "Dashboard",
  estimates: "Estimates",
  projects: "Projects",
  materials: "Materials",
  invoices: "Invoices",
  clients: "Clients",
  calls: "Call History",
  analytics: "Analytics",
  settings: "Settings",
  profile: "Profile",
  team: "Team Members",
  schedule: "Schedule",
  subcontractors: "Subcontractors",
  warranty: "Warranty",
  reports: "Financial Reports",
  proposal: "Proposal",
  photos: "Photo Log",
  dailylog: "Daily Log",
  takeoff: "Takeoff",
  selections: "Selections",
  purchaseorders: "Purchase Orders",
  timetracking: "Time Tracking",
};

const pages: Record<string, React.ComponentType<any>> = {
  dashboard: Dashboard,
  estimates: EstimatesList,
  projects: ProjectsPage,
  materials: MaterialsPage,
  invoices: InvoicesPage,
  clients: ClientsPage,
  calls: CallHistoryPage,
  analytics: AnalyticsPage,
  settings: SettingsPage,
  profile: Profile,
  team: TeamMembersPage,
  schedule: SchedulePage,
  subcontractors: SubcontractorsPage,
  warranty: WarrantyPage,
  reports: FinancialReportsPage,
  proposal: ProposalPage,
  photos: PhotoLogPage,
  dailylog: DailyLogPage,
  takeoff: TakeoffPage,
  selections: SelectionsPage,
  purchaseorders: PurchaseOrdersPage,
  timetracking: TimeTrackingPage,
};

function PageSkeleton() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--sep)] border-t-[var(--accent)]" />
    </div>
  );
}

export function App() {
  const [phase, setPhase] = useState<AppPhase>("splash");
  const [active, setActive] = useState("dashboard");
  const [callOpen, setCallOpen] = useState(false);
  const [modal, setModal] = useState<ModalType>(null);
  const [editingEstimate, setEditingEstimate] = useState<any>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const { user } = useCurrentUser();
  const { data: estimates, loading: estimatesLoading } = useEstimates();

  const openCall = useCallback(() => setCallOpen(true), []);
  const handleModal = useCallback((m: string) => setModal(m as ModalType), []);
  const openEstimateEditor = useCallback((estimate: any) => {
    setEditingEstimate(estimate);
    setModal("edit-estimate");
  }, []);

  const handleEstimateCreated = useCallback((estimate: any) => {
    setCallOpen(false);
    openEstimateEditor(estimate);
  }, [openEstimateEditor]);

  // After splash completes, check auth
  const handleSplashReady = useCallback(async () => {
    const session = await getSession();
    setPhase(session ? "ready" : "auth");
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

  // Listen for auth state changes (e.g., token expiry, password recovery)
  useEffect(() => {
    if (!supabase) return;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        setPhase("auth");
      } else if (event === "PASSWORD_RECOVERY") {
        setPhase("reset-password");
      } else if (event === "SIGNED_IN") {
        setPhase("ready");
      }
    });
    return () => { subscription.unsubscribe(); };
  }, []);

  // Initialize background sync handler when authenticated
  useEffect(() => {
    if (phase !== "ready") return;
    const cleanup = initSyncHandler();
    return cleanup;
  }, [phase]);

  // Handle deep link auth callbacks (proestimate://auth/callback#access_token=...)
  useEffect(() => {
    if (!supabase) return;
    const cleanup = window.electronAPI?.onDeepLink(async (url: string) => {
      const hashIndex = url.indexOf("#");
      if (hashIndex === -1) return;
      const params = new URLSearchParams(url.substring(hashIndex + 1));
      const accessToken = params.get("access_token");
      const refreshToken = params.get("refresh_token");
      if (accessToken && refreshToken) {
        await supabase!.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
      }
    });
    return () => { cleanup?.(); };
  }, []);

  // Handle native menu actions
  useEffect(() => {
    const cleanup = window.electronAPI?.onMenuAction((action: string) => {
      // Navigation actions: "navigate:dashboard", "navigate:estimates", etc.
      if (action.startsWith("navigate:")) {
        const page = action.split(":")[1]!;
        setActive(page);
        return;
      }

      switch (action) {
        case "new-estimate":
          setModal("new-estimate");
          break;
        case "export-pdf":
        case "save-pdf":
          // Trigger PDF export — the EstimateEditorModal handles this internally
          // If on estimates page, this is a no-op (user needs to open an estimate first)
          break;
        case "import-moasure":
          setActive("estimates");
          break;
        case "import-plan":
          setActive("estimates");
          break;
        case "call-alex":
          setCallOpen(true);
          break;
        case "check-updates":
          window.electronAPI?.checkForUpdates();
          break;
        case "report-problem":
          // Navigate to settings page for support
          setActive("settings");
          break;
      }
    });
    return () => { cleanup?.(); };
  }, []);

  // Handle file open events (Finder "Open With" / drag to dock icon)
  useEffect(() => {
    const cleanup = window.electronAPI?.onFileOpened((filePath: string) => {
      // Auto-navigate to estimates page when a file is opened
      setActive("estimates");
      // Could trigger import modal based on file extension
    });
    return () => { cleanup?.(); };
  }, []);

  // Global error handler — report renderer errors to main process
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      window.electronAPI?.reportError({
        message: event.message,
        stack: event.error?.stack,
      });
    };
    const handleRejection = (event: PromiseRejectionEvent) => {
      const error = event.reason instanceof Error ? event.reason : new Error(String(event.reason));
      window.electronAPI?.reportError({
        message: error.message,
        stack: error.stack,
      });
    };
    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleRejection);
    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleRejection);
    };
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
      {phase === "auth" && <AuthScreen onAuthenticated={handleAuthenticated} onDevBypass={handleDevBypass} />}
      {phase === "reset-password" && <AuthScreen onAuthenticated={handleAuthenticated} initialView="reset-password" />}
      {showOnboarding && phase === "ready" && (
        <OnboardingWizard
          userName={user?.full_name?.split(" ")[0] ?? null}
          onComplete={handleOnboardingComplete}
          onNavigate={setActive}
          onNewEstimate={() => handleModal("new-estimate")}
        />
      )}
      <div className={`flex h-screen overflow-hidden bg-[var(--bg)] ${phase !== "ready" ? "invisible" : ""}`}
          aria-hidden={phase !== "ready"}>
        <Sidebar active={active} onNavigate={setActive} />
        <div className="flex flex-1 flex-col overflow-hidden">
          <TopBar
            title={PAGE_TITLES[active] ?? "Dashboard"}
            onModal={handleModal}
            onNavigate={setActive}
            user={user}
            onSignOut={handleSignOut}
          />
          <UpdateBanner />
          <main className="flex-1 overflow-hidden">
            <ErrorBoundary key={active}>
              <div className="h-full page-enter" key={`page-${active}`}>
                <Suspense fallback={<PageSkeleton />}>
                  <Page onNavigate={setActive} onCallAlex={openCall} onModal={handleModal} onEditEstimate={openEstimateEditor} onSignOut={handleSignOut} />
                </Suspense>
              </div>
            </ErrorBoundary>
          </main>
        </div>
        {callOpen && <CallAlexPanel onClose={() => setCallOpen(false)} onEstimateCreated={handleEstimateCreated} />}

        {/* Offline indicator — positioned at bottom-left */}
        <div className="fixed bottom-4 left-4 z-50">
          <OfflineIndicator />
        </div>
      </div>

      {/* Modals */}
      <NewEstimateModal
        open={modal === "new-estimate"}
        onClose={() => setModal(null)}
        onCreated={(est) => { openEstimateEditor(est); }}
      />
      <AddClientModal
        open={modal === "add-client"}
        onClose={() => setModal(null)}
      />
      <LogExpenseModal
        open={modal === "log-expense"}
        onClose={() => setModal(null)}
      />
      <UploadInvoiceModal
        open={modal === "upload-invoice"}
        onClose={() => setModal(null)}
      />
      <EditProfileModal
        open={modal === "edit-profile"}
        onClose={() => setModal(null)}
        user={user}
      />
      <EstimateEditorModal
        open={modal === "edit-estimate"}
        onClose={() => { setModal(null); setEditingEstimate(null); }}
        estimate={editingEstimate}
      />
      </AppProvider>
    </ErrorBoundary>
  );
}
