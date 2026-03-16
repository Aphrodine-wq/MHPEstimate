import { useEstimates, useClients } from "../lib/store";
import {
  useAnalyticsSummary,
  SummaryCards,
  RevenueByTier,
} from "./analytics/AnalyticsSummaryCards";
import {
  useProjectTypeAnalysis,
  useMonthlyTrends,
  useTopClients,
  useAgeAnalysis,
  ProjectTypeBreakdown,
  ConversionFunnel,
  MonthlyTrendsSection,
  MarginAnalysisTable,
  TopClientsSection,
  EstimateAgeSection,
} from "./analytics/AnalyticsFilters";
import { AnalyticsCharts } from "./analytics/AnalyticsCharts";

export function AnalyticsPage() {
  const { data: estimates } = useEstimates();
  const { data: clients } = useClients();

  const summary = useAnalyticsSummary(estimates);
  const { byType, byTypeMax, marginByType } = useProjectTypeAnalysis(estimates);
  const monthlyTrends = useMonthlyTrends(estimates);
  const topClients = useTopClients(estimates, clients);
  const ageAnalysis = useAgeAnalysis(estimates);

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <header className="px-4 md:px-8 pt-4 pb-1">
        <p className="text-[12px] text-[var(--secondary)]">Performance metrics and trends</p>
      </header>

      <SummaryCards estimates={estimates} summary={summary} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 px-4 md:px-8 pb-6">
        <ProjectTypeBreakdown byType={byType} byTypeMax={byTypeMax} />
        <ConversionFunnel
          estimates={estimates}
          sent={summary.sent}
          accepted={summary.accepted}
          declined={summary.declined}
        />
      </div>

      <MonthlyTrendsSection {...monthlyTrends} />

      <MarginAnalysisTable marginByType={marginByType} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 px-4 md:px-8 pb-6">
        <TopClientsSection topClients={topClients} />
        <EstimateAgeSection ageAnalysis={ageAnalysis} />
      </div>

      <RevenueByTier accepted={summary.accepted} />

      <AnalyticsCharts />
    </div>
  );
}
