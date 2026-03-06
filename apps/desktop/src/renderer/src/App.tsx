import { useState } from "react";
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

const pages: Record<string, React.FC<{ onNavigate?: (page: string) => void; onCallAlex?: () => void }>> = {
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
  const [active, setActive] = useState("dashboard");
  const [callOpen, setCallOpen] = useState(false);

  const openCall = () => setCallOpen(true);
  const Page = pages[active] ?? Dashboard;

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--bg)]">
      <Sidebar active={active} onNavigate={setActive} />
      <main className="flex-1 overflow-hidden">
        <Page onNavigate={setActive} onCallAlex={openCall} />
      </main>
      {!callOpen && <CallAlexFAB onCall={openCall} />}
      {callOpen && <CallAlexPanel onClose={() => setCallOpen(false)} />}
    </div>
  );
}
