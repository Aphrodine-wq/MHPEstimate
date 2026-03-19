import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "../lib/supabase";
import { DEMO_MODE, demoEstimates, demoJobActuals, demoTimeEntries, demoClients } from "../lib/demo-data";
import { EmptyState } from "./EmptyState";
import {
  BanknotesIcon,
  ArrowPathIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
} from "@heroicons/react/24/outline";

interface Estimate {
  id: string;
  estimate_number: string;
  client_id: string | null;
  grand_total: number;
  materials_subtotal: number;
  labor_subtotal: number;
  gross_margin_pct: number | null;
  status: string;
  created_at: string;
}

interface JobActual {
  id: string;
  estimate_id: string;
  actual_materials: number | null;
  actual_labor: number | null;
  actual_total: number | null;
  actual_margin_pct: number | null;
  variance_total: number | null;
}

interface TimeEntry {
  id: string;
  estimate_id: string;
  labor_cost: number | null;
  hours_worked: number | null;
}

interface Client {
  id: string;
  full_name: string;
}

type Period = "month" | "quarter" | "year";

function fmtMoney(n: number | null): string {
  if (n == null) return "--";
  return `$${Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtPct(n: number | null): string {
  if (n == null) return "--";
  return `${Number(n).toFixed(1)}%`;
}

function inPeriod(dateStr: string, period: Period): boolean {
  const d = new Date(dateStr);
  const now = new Date();
  switch (period) {
    case "month":
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    case "quarter": {
      const q = Math.floor(now.getMonth() / 3);
      const dq = Math.floor(d.getMonth() / 3);
      return d.getFullYear() === now.getFullYear() && dq === q;
    }
    case "year":
      return d.getFullYear() === now.getFullYear();
  }
}

export function FinancialReportsPage() {
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [actuals, setActuals] = useState<JobActual[]>([]);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>("year");

  const demoEst = DEMO_MODE ? demoEstimates.map((e) => ({
    id: e.id, estimate_number: e.estimate_number, client_id: e.client_id,
    grand_total: e.grand_total, materials_subtotal: e.materials_subtotal,
    labor_subtotal: e.labor_subtotal, gross_margin_pct: e.gross_margin_pct,
    status: e.status, created_at: e.created_at,
  })) as Estimate[] : [];
  const demoCli = DEMO_MODE ? demoClients.map((c) => ({ id: c.id, full_name: c.full_name })) as Client[] : [];

  const refresh = useCallback(async () => {
    if (!supabase) {
      if (DEMO_MODE) {
        setEstimates(demoEst);
        setActuals(demoJobActuals as unknown as JobActual[]);
        setTimeEntries(demoTimeEntries as unknown as TimeEntry[]);
        setClients(demoCli);
      }
      setLoading(false);
      return;
    }
    setLoading(true);
    const [
      { data: estData },
      { data: actData },
      { data: teData },
      { data: cliData },
    ] = await Promise.all([
      supabase.from("estimates").select("id, estimate_number, client_id, grand_total, materials_subtotal, labor_subtotal, gross_margin_pct, status, created_at").order("created_at", { ascending: false }),
      supabase.from("job_actuals").select("id, estimate_id, actual_materials, actual_labor, actual_total, actual_margin_pct, variance_total"),
      supabase.from("time_entries").select("id, estimate_id, labor_cost, hours_worked").not("clock_out", "is", null),
      supabase.from("clients").select("id, full_name"),
    ]);
    const fetchedEst = (estData as Estimate[]) ?? [];
    const fetchedAct = (actData as JobActual[]) ?? [];
    const fetchedTe = (teData as TimeEntry[]) ?? [];
    const fetchedCli = (cliData as Client[]) ?? [];
    setEstimates(fetchedEst.length > 0 || !DEMO_MODE ? fetchedEst : demoEst);
    setActuals(fetchedAct.length > 0 || !DEMO_MODE ? fetchedAct : demoJobActuals as unknown as JobActual[]);
    setTimeEntries(fetchedTe.length > 0 || !DEMO_MODE ? fetchedTe : demoTimeEntries as unknown as TimeEntry[]);
    setClients(fetchedCli.length > 0 || !DEMO_MODE ? fetchedCli : demoCli);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const clientMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const c of clients) map[c.id] = c.full_name;
    return map;
  }, [clients]);

  const actualsMap = useMemo(() => {
    const map: Record<string, JobActual> = {};
    for (const a of actuals) map[a.estimate_id] = a;
    return map;
  }, [actuals]);

  const laborByEstimate = useMemo(() => {
    const map: Record<string, number> = {};
    for (const te of timeEntries) {
      if (te.labor_cost != null) {
        map[te.estimate_id] = (map[te.estimate_id] ?? 0) + Number(te.labor_cost);
      }
    }
    return map;
  }, [timeEntries]);

  const filteredEstimates = useMemo(() => {
    return estimates.filter((e) => inPeriod(e.created_at, period));
  }, [estimates, period]);

  const summary = useMemo(() => {
    const totalEstimated = filteredEstimates.reduce((s, e) => s + Number(e.grand_total), 0);
    let totalActual = 0;
    let jobsWithActuals = 0;
    for (const e of filteredEstimates) {
      const a = actualsMap[e.id];
      if (a?.actual_total != null) {
        totalActual += Number(a.actual_total);
        jobsWithActuals++;
      }
    }
    const trackedLabor = filteredEstimates.reduce((s, e) => s + (laborByEstimate[e.id] ?? 0), 0);
    const profit = totalEstimated - (totalActual || trackedLabor || 0);
    const margin = totalEstimated > 0 ? (profit / totalEstimated) * 100 : 0;

    return { totalEstimated, totalActual, trackedLabor, profit, margin, jobsWithActuals };
  }, [filteredEstimates, actualsMap, laborByEstimate]);

  if (!supabase) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-[14px] text-[var(--secondary)]">Supabase not configured</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto animate-page-enter">
      <header className="flex items-center justify-between px-8 pt-4 pb-1">
        <p className="text-[12px] text-[var(--secondary)]">{filteredEstimates.length} estimates in period</p>
        <div className="flex items-center gap-2">
          <button onClick={refresh} className="rounded-lg border border-[var(--sep)] p-1.5 transition-colors hover:bg-[var(--bg)]">
            <ArrowPathIcon className="h-3.5 w-3.5 text-[var(--secondary)]" />
          </button>
        </div>
      </header>

      {/* Period selector */}
      <div className="px-8 py-3">
        <div className="flex gap-1.5">
          {(["month", "quarter", "year"] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`rounded-lg px-4 py-1.5 text-[12px] font-medium capitalize transition-colors ${
                period === p ? "bg-[var(--accent)] text-white" : "bg-[var(--gray5)] text-[var(--secondary)] hover:bg-[var(--gray4)]"
              }`}
            >
              This {p}
            </button>
          ))}
        </div>
      </div>

      {/* Summary cards */}
      <div className="px-8 pb-3">
        <div className="grid grid-cols-4 gap-3">
          <div className="rounded-xl border border-[var(--sep)] bg-[var(--card)] p-4 shadow-[var(--shadow-card)]">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--secondary)]">Total Estimated</p>
            <p className="text-[22px] font-bold mt-1">{fmtMoney(summary.totalEstimated)}</p>
            <p className="text-[11px] text-[var(--secondary)]">{filteredEstimates.length} estimates</p>
          </div>
          <div className="rounded-xl border border-[var(--sep)] bg-[var(--card)] p-4 shadow-[var(--shadow-card)]">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--secondary)]">Total Actual</p>
            <p className="text-[22px] font-bold mt-1">{summary.totalActual > 0 ? fmtMoney(summary.totalActual) : fmtMoney(summary.trackedLabor)}</p>
            <p className="text-[11px] text-[var(--secondary)]">
              {summary.jobsWithActuals > 0 ? `${summary.jobsWithActuals} jobs reported` : "From time tracking"}
            </p>
          </div>
          <div className="rounded-xl border border-[var(--sep)] bg-[var(--card)] p-4 shadow-[var(--shadow-card)]">
            <div className="flex items-center gap-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--secondary)]">Profit</p>
              {summary.profit >= 0
                ? <ArrowTrendingUpIcon className="h-3 w-3 text-[#2e7d32]" />
                : <ArrowTrendingDownIcon className="h-3 w-3 text-[#c62828]" />
              }
            </div>
            <p className={`text-[22px] font-bold mt-1 ${summary.profit >= 0 ? "text-[#2e7d32]" : "text-[#c62828]"}`}>
              {fmtMoney(summary.profit)}
            </p>
          </div>
          <div className="rounded-xl border border-[var(--sep)] bg-[var(--card)] p-4 shadow-[var(--shadow-card)]">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--secondary)]">Margin %</p>
            <p className={`text-[22px] font-bold mt-1 ${summary.margin >= 20 ? "text-[#2e7d32]" : summary.margin >= 10 ? "text-[#e65100]" : "text-[#c62828]"}`}>
              {fmtPct(summary.margin)}
            </p>
          </div>
        </div>
      </div>

      {/* Job profitability table */}
      <div className="flex-1 overflow-y-auto px-8 pb-6">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--secondary)] mb-2">Job Profitability</p>
        {loading ? (
          <div className="rounded-xl bg-[var(--card)] p-4 shadow-[var(--shadow-card)] space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex justify-between">
                <div className="h-3 w-32 animate-skeleton rounded bg-[var(--gray5)]" />
                <div className="h-3 w-24 animate-skeleton rounded bg-[var(--gray5)]" />
              </div>
            ))}
          </div>
        ) : filteredEstimates.length === 0 ? (
          <EmptyState
            title="No data for this period"
            description="No estimates found for the selected time period"
          />
        ) : (
          <div className="rounded-xl bg-[var(--card)] shadow-[var(--shadow-card)]">
            <div className="flex items-center border-b border-[var(--sep)] px-4 py-2">
              <p className="w-28 text-[11px] font-medium text-[var(--secondary)]">Estimate #</p>
              <p className="flex-1 text-[11px] font-medium text-[var(--secondary)]">Client</p>
              <p className="w-24 text-right text-[11px] font-medium text-[var(--secondary)]">Estimated</p>
              <p className="w-24 text-right text-[11px] font-medium text-[var(--secondary)]">Actual</p>
              <p className="w-20 text-right text-[11px] font-medium text-[var(--secondary)]">Margin</p>
              <p className="w-16 text-right text-[11px] font-medium text-[var(--secondary)]">Status</p>
            </div>
            {filteredEstimates.map((e, i, arr) => {
              const actual = actualsMap[e.id];
              const labor = laborByEstimate[e.id];
              const actualTotal = actual?.actual_total ?? labor ?? null;
              const margin = actualTotal != null && Number(e.grand_total) > 0
                ? ((Number(e.grand_total) - Number(actualTotal)) / Number(e.grand_total)) * 100
                : e.gross_margin_pct;

              return (
                <div
                  key={e.id}
                  className={`flex items-center px-4 py-3 transition-colors hover:bg-[var(--bg)] animate-list-item ${i < arr.length - 1 ? "border-b border-[var(--sep)]" : ""}`}
                  style={{ animationDelay: `${i * 15}ms` }}
                >
                  <p className="w-28 text-[12px] font-medium">{e.estimate_number}</p>
                  <p className="flex-1 text-[12px] text-[var(--secondary)] truncate">{e.client_id ? (clientMap[e.client_id] ?? "--") : "--"}</p>
                  <p className="w-24 text-right text-[12px] font-medium">{fmtMoney(e.grand_total)}</p>
                  <p className="w-24 text-right text-[12px] text-[var(--secondary)]">{fmtMoney(actualTotal)}</p>
                  <p className={`w-20 text-right text-[12px] font-semibold ${
                    margin != null && margin >= 20 ? "text-[#2e7d32]" : margin != null && margin >= 10 ? "text-[#e65100]" : margin != null ? "text-[#c62828]" : ""
                  }`}>
                    {fmtPct(margin)}
                  </p>
                  <p className="w-16 text-right">
                    <span className="rounded bg-[var(--gray5)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--secondary)] capitalize">{e.status.replace(/_/g, " ")}</span>
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
