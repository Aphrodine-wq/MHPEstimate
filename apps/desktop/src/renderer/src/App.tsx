import { useState, useCallback } from "react";
import { Sidebar } from "./components/Sidebar";
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
import { NewEstimateModal, AddClientModal, LogExpenseModal, UploadInvoiceModal, EditProfileModal } from "./components/FormModals";
import { EstimateEditorModal } from "./components/EstimateEditorModal";
import { useCurrentUser } from "./lib/store";

type ModalType = null | "new-estimate" | "add-client" | "log-expense" | "upload-invoice" | "edit-profile" | "edit-estimate";

const pages: Record<string, React.FC<{ onNavigate?: (page: string) => void; onCallAlex?: () => void; onModal?: (m: string) => void; onEditEstimate?: (estimate: any) => void }>> = {
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
  const [booted, setBooted] = useState(false);
  const [active, setActive] = useState("dashboard");
  const [callOpen, setCallOpen] = useState(false);
  const [modal, setModal] = useState<ModalType>(null);
  const [editingEstimate, setEditingEstimate] = useState<any>(null);
  const { user } = useCurrentUser();

  const openCall = () => setCallOpen(true);
  const openEstimateEditor = useCallback((estimate: any) => {
    setEditingEstimate(estimate);
    setModal("edit-estimate");
  }, []);
  const handleReady = useCallback(() => setBooted(true), []);

  const Page = pages[active] ?? Dashboard;

  return (
    <>
      {!booted && <SplashScreen onReady={handleReady} />}
      <div className="flex h-screen overflow-hidden bg-[var(--bg)]">
        <Sidebar active={active} onNavigate={setActive} />
        <main className="flex-1 overflow-hidden">
          <Page onNavigate={setActive} onCallAlex={openCall} onModal={(m) => setModal(m as ModalType)} onEditEstimate={openEstimateEditor} />
        </main>
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
