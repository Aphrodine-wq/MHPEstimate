import { useState, useCallback, useEffect } from "react";
import { Sidebar } from "./components/Sidebar";
import { TopBar } from "./components/TopBar";
import { Dashboard } from "./components/Dashboard";
import { EstimatesList } from "./components/EstimatesList";
import { MaterialsPage } from "./components/MaterialsPage";
import { InvoicesPage } from "./components/InvoicesPage";
import { ClientsPage } from "./components/ClientsPage";
import { CallHistoryPage } from "./components/CallHistoryPage";
import { AnalyticsPage } from "./components/AnalyticsPage";
import { SettingsPage } from "./components/SettingsPage";
import { Profile } from "./components/Profile";
import { CallAlexFAB, CallAlexPanel } from "./components/CallAlex";
import { SplashScreen } from "./components/SplashScreen";
import { AuthScreen } from "./components/AuthScreen";
import { NewEstimateModal, AddClientModal, LogExpenseModal, UploadInvoiceModal, EditProfileModal } from "./components/FormModals";
import { EstimateEditorModal } from "./components/EstimateEditorModal";
import { useCurrentUser } from "./lib/store";
import { supabase, getSession, signOut } from "./lib/supabase";

type ModalType = null | "new-estimate" | "add-client" | "log-expense" | "upload-invoice" | "edit-profile" | "edit-estimate";
type AppPhase = "splash" | "auth" | "reset-password" | "ready";

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
};

const pages: Record<string, React.FC<{ onNavigate?: (page: string) => void; onCallAlex?: () => void; onModal?: (m: string) => void; onEditEstimate?: (estimate: any) => void; onSignOut?: () => void }>> = {
  dashboard: Dashboard,
  estimates: EstimatesList,
  materials: MaterialsPage,
  invoices: InvoicesPage,
  clients: ClientsPage,
  calls: CallHistoryPage,
  analytics: AnalyticsPage,
  settings: SettingsPage,
  profile: Profile,
};

export function App() {
  const [phase, setPhase] = useState<AppPhase>("splash");
  const [active, setActive] = useState("dashboard");
  const [callOpen, setCallOpen] = useState(false);
  const [modal, setModal] = useState<ModalType>(null);
  const [editingEstimate, setEditingEstimate] = useState<any>(null);
  const { user } = useCurrentUser();

  const openCall = useCallback(() => setCallOpen(true), []);
  const handleModal = useCallback((m: string) => setModal(m as ModalType), []);
  const openEstimateEditor = useCallback((estimate: any) => {
    setEditingEstimate(estimate);
    setModal("edit-estimate");
  }, []);

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

  // Handle deep link auth callbacks (proestimate://auth/callback#access_token=...)
  useEffect(() => {
    if (!supabase) return;
    const cleanup = window.electronAPI?.onDeepLink(async (url: string) => {
      // Supabase appends tokens as hash fragment: proestimate://auth/callback#access_token=...&refresh_token=...
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

  const Page = pages[active] ?? Dashboard;

  return (
    <>
      {phase === "splash" && <SplashScreen onReady={handleSplashReady} />}
      {phase === "auth" && <AuthScreen onAuthenticated={handleAuthenticated} onDevBypass={handleDevBypass} />}
      {phase === "reset-password" && <AuthScreen onAuthenticated={handleAuthenticated} initialView="reset-password" />}
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
          <main className="flex-1 overflow-hidden">
            <Page onNavigate={setActive} onCallAlex={openCall} onModal={handleModal} onEditEstimate={openEstimateEditor} onSignOut={handleSignOut} />
          </main>
        </div>
        {!callOpen && <CallAlexFAB onCall={openCall} />}
        {callOpen && <CallAlexPanel onClose={() => setCallOpen(false)} />}
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
    </>
  );
}
