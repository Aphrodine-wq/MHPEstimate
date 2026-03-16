const FILTERS = ["All", "Draft", "In Review", "Sent", "Approved", "Accepted", "Declined"];

export interface EstimatesFiltersProps {
  search: string;
  setSearch: (v: string) => void;
  filter: string;
  setFilter: (v: string) => void;
  page: number;
  setPage: (v: number) => void;
}

export function EstimatesFilters({ search, setSearch, filter, setFilter, page, setPage }: EstimatesFiltersProps) {
  return (
    <div className="px-4 md:px-8 py-3">
      <div className="relative mb-2 flex gap-2">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="var(--gray2)" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="text"
            placeholder="Search by number, type, or address..."
            aria-label="Search estimates by number, type, or address"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-[var(--sep)] bg-[var(--card)] py-2 pl-9 pr-3 text-[13px] outline-none placeholder:text-[var(--gray3)] focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/20"
          />
        </div>
        {(search || filter !== "All" || page !== 0) && (
          <button
            onClick={() => { setSearch(""); setFilter("All"); setPage(0); }}
            className="flex-shrink-0 rounded-lg border border-[var(--sep)] px-3 py-2 text-[12px] font-medium text-[var(--secondary)] transition-colors hover:bg-[var(--bg)] hover:text-[var(--label)]"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Segmented control */}
      <div className="flex overflow-x-auto rounded-lg bg-[var(--gray5)] p-0.5">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            aria-pressed={filter === f}
            className={`flex-1 shrink-0 rounded-md px-2 md:px-1 py-1.5 text-[11px] font-medium transition-all whitespace-nowrap ${
              filter === f ? "bg-[var(--card)] text-[var(--label)] shadow-sm" : "text-[var(--secondary)]"
            }`}
          >
            {f}
          </button>
        ))}
      </div>
    </div>
  );
}
