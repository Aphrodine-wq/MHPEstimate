"use client";

import { useState, useCallback } from "react";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { Dashboard } from "./Dashboard";
import { EstimatesList } from "./EstimatesList";
import { MaterialsPage } from "./MaterialsPage";
import { InvoicesPage } from "./InvoicesPage";
import { ClientsPage } from "./ClientsPage";
import { CallHistoryPage } from "./CallHistoryPage";
import { AnalyticsPage } from "./AnalyticsPage";
import { SettingsPage } from "./SettingsPage";
import { Profile } from "./Profile";
import { CallAlexFAB, CallAlexPanel } from "./CallAlex";
import { SplashScreen } from "./SplashScreen";
import { NewEstimateModal, AddClientModal, LogExpenseModal, UploadInvoiceModal, EditProfileModal } from "./FormModals";
import { EstimateEditorModal } from "./EstimateEditorModal";
import { useCurrentUser } from "../lib/store";

type ModalType = null | "new-estimate" | "add-client" | "log-expense" | "upload-invoice" | "edit-profile" | "edit-estimate";

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
        <div className="flex flex-1 flex-col overflow-hidden">
          <TopBar
            title={PAGE_TITLES[active] ?? "Dashboard"}
            onModal={(m) => setModal(m as ModalType)}
            onNavigate={setActive}
            user={user}
          />
          <main className="flex-1 overflow-hidden">
            <Page onNavigate={setActive} onCallAlex={openCall} onModal={(m) => setModal(m as ModalType)} onEditEstimate={openEstimateEditor} />
          </main>
        </div>
        {!callOpen && <CallAlexFAB onCall={openCall} />}
        {callOpen && <CallAlexPanel onClose={() => setCallOpen(false)} />}
      </div>
      <NewEstimateModal open={modal === "new-estimate"} onClose={() => setModal(null)} onCreated={(est) => { openEstimateEditor(est); }} />
      <AddClientModal open={modal === "add-client"} onClose={() => setModal(null)} />
      <LogExpenseModal open={modal === "log-expense"} onClose={() => setModal(null)} />
      <UploadInvoiceModal open={modal === "upload-invoice"} onClose={() => setModal(null)} />
      <EditProfileModal open={modal === "edit-profile"} onClose={() => setModal(null)} user={user} />
      <EstimateEditorModal open={modal === "edit-estimate"} onClose={() => { setModal(null); setEditingEstimate(null); }} estimate={editingEstimate} />
    </>
  );
}
