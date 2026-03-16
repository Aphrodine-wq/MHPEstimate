import { createContext, useContext, type ReactNode } from "react";
import type { Estimate } from "@proestimate/shared/types";

export interface AppContextValue {
  onNavigate: (page: string) => void;
  onCallAlex: () => void;
  onModal: (m: string) => void;
  onEditEstimate: (estimate: Estimate) => void;
  onSignOut: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ value, children }: { value: AppContextValue; children: ReactNode }) {
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useAppContext must be used within <AppProvider>");
  return ctx;
}
