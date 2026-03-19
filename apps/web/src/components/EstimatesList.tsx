import { useEstimates } from "../lib/store";
import { useAppContext } from "./AppContext";
import { usePersistedState } from "../lib/usePersistedState";
import { EstimatesFilters } from "./estimates/EstimatesFilters";
import { EstimatesTable } from "./estimates/EstimatesTable";

const FILTER_MAP: Record<string, string> = {
  All: "", Draft: "draft", "In Review": "in_review", Sent: "sent",
  Approved: "approved", Accepted: "accepted", Declined: "declined",
};

export function EstimatesList() {
  const { onModal, onEditEstimate } = useAppContext();
  const { data: estimates, loading } = useEstimates();
  const [filter, setFilter] = usePersistedState("estimates_filter", "All");
  const [search, setSearch] = usePersistedState("estimates_search", "");
  const [page, setPage] = usePersistedState("estimates_page", 0);

  const filtered = estimates.filter((e) => {
    if (filter !== "All" && e.status !== FILTER_MAP[filter]) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        e.estimate_number.toLowerCase().includes(q) ||
        e.project_type.toLowerCase().includes(q) ||
        (e.project_address ?? "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between px-4 md:px-8 pt-4 pb-1">
        <p className="text-[12px] text-[var(--secondary)]">{estimates.length} total estimates</p>
        <div className="flex items-center gap-2">
          <button onClick={() => onModal?.("quick-estimate")} className="rounded-lg border border-[var(--accent)] px-3.5 py-1.5 text-[12px] font-semibold text-[var(--accent)] transition-all hover:bg-[var(--accent)]/5 active:scale-[0.98]">
            Quick Estimate
          </button>
          <button onClick={() => onModal?.("new-estimate")} className="rounded-lg bg-[var(--accent)] px-3.5 py-1.5 text-[12px] font-semibold text-white shadow-sm shadow-[var(--accent)]/20 transition-all hover:brightness-110 active:scale-[0.98]">
            New Estimate
          </button>
        </div>
      </header>

      <EstimatesFilters
        search={search}
        setSearch={setSearch}
        filter={filter}
        setFilter={setFilter}
        page={page}
        setPage={setPage}
      />

      <EstimatesTable
        estimates={estimates}
        filtered={filtered}
        loading={loading}
        search={search}
        filter={filter}
        page={page}
        setPage={setPage}
        onModal={onModal}
        onEditEstimate={onEditEstimate}
      />
    </div>
  );
}
