import { memo, useCallback, useRef, useState } from "react";
import toast from "react-hot-toast";
import * as Sentry from "@sentry/nextjs";
import { useCurrentUser, createEstimate } from "../../lib/store";
import { supabase } from "../../lib/supabase";
import { EmptyState } from "../EmptyState";
import { StatusBadge } from "@proestimate/ui/components";
import { generateEstimatePDF } from "../EstimatePDF";
import { PaymentStatus } from "../PaymentStatus";
import { QuickBooksExport } from "../QuickBooksExport";
import type { Estimate, Client, EstimateLineItem } from "@proestimate/shared/types";

const PAGE_SIZE = 25;

export interface EstimatesTableProps {
  estimates: Estimate[];
  filtered: Estimate[];
  loading: boolean;
  search: string;
  filter: string;
  page: number;
  setPage: (v: number) => void;
  onModal?: (m: string) => void;
  onEditEstimate?: (estimate: Estimate) => void;
}

export function EstimatesTable({
  estimates,
  filtered,
  loading,
  search,
  filter,
  page,
  setPage,
  onModal,
  onEditEstimate,
}: EstimatesTableProps) {
  const [selected, setSelected] = useState<string | null>(null);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const paged = filtered.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  const detail = selected ? estimates.find((e) => e.id === selected) : null;
  const listRef = useRef<HTMLDivElement>(null);

  const handleListKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!listRef.current) return;
      const items = listRef.current.querySelectorAll<HTMLElement>('[data-estimate-item]');
      if (items.length === 0) return;
      const currentIndex = Array.from(items).findIndex((el) => el === document.activeElement);
      if (e.key === "ArrowDown") {
        e.preventDefault();
        const next = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
        items[next]?.focus();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        const prev = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
        items[prev]?.focus();
      }
    },
    []
  );

  return (
    <div className="flex flex-1 gap-0 overflow-hidden px-4 md:px-8 pb-6">
      <div ref={listRef} onKeyDown={handleListKeyDown} role="listbox" aria-label="Estimates list" className={`flex flex-col overflow-y-auto rounded-xl border border-[var(--sep)] bg-[var(--card)] ${detail ? "hidden md:flex md:w-[55%]" : "w-full"}`}>
        {loading ? (
          <LoadingRows />
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No estimates found"
            description={search || filter !== "All" ? "Try adjusting your filters" : "Create your first estimate to get started"}
            action={!search && filter === "All" ? "New Estimate" : undefined}
            onAction={() => onModal?.("new-estimate")}
          />
        ) : (
          <>
            {paged.map((est, i, arr) => (
              <button
                key={est.id}
                data-estimate-item
                role="option"
                aria-selected={est.id === selected}
                aria-label={`${est.estimate_number} - ${est.project_type} - $${Number(est.grand_total).toLocaleString()}`}
                onClick={() => setSelected(est.id === selected ? null : est.id)}
                className={`flex items-center gap-3 px-4 py-3.5 text-left transition-colors ${
                  est.id === selected ? "bg-[var(--accent)]/5" : "hover:bg-[var(--bg)]"
                } ${i < arr.length - 1 ? "border-b border-[var(--sep)]" : ""}`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-[13px] font-medium truncate">{est.estimate_number}</p>
                    <StatusBadge status={est.status} />
                  </div>
                  <p className="text-[12px] text-[var(--secondary)] truncate">{est.project_type}</p>
                  <p className="text-[11px] text-[var(--tertiary)] truncate">{est.project_address}</p>
                </div>
                <div className="flex-shrink-0 text-right">
                  <p className="text-[14px] font-semibold">${Number(est.grand_total).toLocaleString()}</p>
                  {est.gross_margin_pct != null && (
                    <p className="text-[11px] text-[var(--secondary)]">{Number(est.gross_margin_pct).toFixed(1)}%</p>
                  )}
                </div>
              </button>
            ))}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-[var(--sep)] px-4 py-2.5">
                <p className="text-[11px] text-[var(--secondary)]">
                  {safePage * PAGE_SIZE + 1}&ndash;{Math.min((safePage + 1) * PAGE_SIZE, filtered.length)} of {filtered.length}
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage(Math.max(0, safePage - 1))}
                    disabled={safePage === 0}
                    aria-label="Previous page"
                    className="rounded-md px-2 py-1 text-[11px] font-medium transition-colors hover:bg-[var(--bg)] disabled:opacity-30"
                  >
                    Prev
                  </button>
                  {Array.from({ length: totalPages }).map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setPage(i)}
                      aria-label={`Page ${i + 1}`}
                      aria-current={i === safePage ? "page" : undefined}
                      className={`h-6 w-6 rounded-md text-[11px] font-medium transition-colors ${
                        i === safePage ? "bg-[var(--accent)] text-white" : "hover:bg-[var(--bg)]"
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                  <button
                    onClick={() => setPage(Math.min(totalPages - 1, safePage + 1))}
                    disabled={safePage >= totalPages - 1}
                    aria-label="Next page"
                    className="rounded-md px-2 py-1 text-[11px] font-medium transition-colors hover:bg-[var(--bg)] disabled:opacity-30"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {detail && (
        <div className="w-full md:ml-3 md:w-[45%] overflow-y-auto rounded-xl border border-[var(--sep)] bg-[var(--card)] p-5">
          <DetailPanel estimate={detail} onClose={() => setSelected(null)} onEditEstimate={onEditEstimate} />
        </div>
      )}
    </div>
  );
}

/* ── Detail Panel ── */

const DetailPanel = memo(function DetailPanel({ estimate, onClose, onEditEstimate }: { estimate: Estimate; onClose: () => void; onEditEstimate?: (estimate: Estimate) => void }) {
  const [duplicating, setDuplicating] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const [copyingLink, setCopyingLink] = useState(false);
  const { user } = useCurrentUser();
  const isAdmin = user?.role === "admin" || user?.role === "owner";

  const handleDownloadPDF = async () => {
    if (!supabase || generatingPdf) return;
    setGeneratingPdf(true);
    try {
      const { data: lineItems } = await supabase
        .from("estimate_line_items")
        .select("*")
        .eq("estimate_id", estimate.id)
        .order("line_number");

      let client: Client | null = null;
      if (estimate.client_id) {
        const { data: clientData } = await supabase
          .from("clients")
          .select("*")
          .eq("id", estimate.client_id)
          .single();
        client = clientData as Client | null;
      }

      await generateEstimatePDF(estimate, lineItems ?? [], client);
    } catch (err) {
      Sentry.captureException(err);
      toast.error("Failed to generate PDF. Please try again.");
    } finally {
      setGeneratingPdf(false);
    }
  };

  const handleTransition = async (newStatus: string, successMsg: string) => {
    if (!supabase || transitioning) return;
    setTransitioning(true);
    try {
      const { error } = await supabase
        .from("estimates")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", estimate.id);
      if (error) throw error;
      toast.success(successMsg);
    } catch (err) {
      Sentry.captureException(err);
      toast.error("Failed to update status. Please try again.");
    } finally {
      setTransitioning(false);
    }
  };

  const handleDuplicate = async () => {
    if (!supabase || duplicating) return;
    setDuplicating(true);
    try {
      const newEst = await createEstimate();
      if (!newEst) { setDuplicating(false); return; }

      const {
        id: _id, estimate_number: _num, status: _status,
        created_at: _ca, updated_at: _ua,
        ...copyFields
      } = estimate;

      await supabase.from("estimates").update({
        ...copyFields,
        status: "draft",
      }).eq("id", newEst.id);

      const { data: lineItems } = await supabase
        .from("estimate_line_items")
        .select("*")
        .eq("estimate_id", estimate.id)
        .order("line_number");

      if (lineItems && lineItems.length > 0) {
        const copiedItems = lineItems.map((item: EstimateLineItem) => {
          const { id: _itemId, estimate_id: _estId, created_at: _itemCa, ...rest } = item;
          return { ...rest, estimate_id: newEst.id };
        });
        await supabase.from("estimate_line_items").insert(copiedItems);
      }
      toast.success("Estimate duplicated");
    } catch (err) {
      Sentry.captureException(err);
      toast.error("Failed to duplicate estimate. Please try again.");
    } finally {
      setDuplicating(false);
    }
  };

  const handleCopyPortalLink = async () => {
    if (copyingLink) return;
    setCopyingLink(true);
    try {
      const res = await fetch(`/api/estimates/${estimate.id}/share`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to generate portal link");
      await navigator.clipboard.writeText(data.url);
      toast.success("Portal link copied to clipboard");
    } catch (err) {
      Sentry.captureException(err);
      toast.error(err instanceof Error ? err.message : "Failed to copy portal link");
    } finally {
      setCopyingLink(false);
    }
  };

  return (
    <div>
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-[11px] text-[var(--secondary)]">{estimate.estimate_number}</p>
          <h2 className="text-[18px] font-bold">{estimate.project_type}</h2>
          <StatusBadge status={estimate.status} className="mt-1 inline-block" />
        </div>
        <button onClick={onClose} aria-label="Close detail panel" className="rounded-md p-1 hover:bg-[var(--bg)]">
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="var(--gray1)" strokeWidth="2" strokeLinecap="round">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      <Section title="Details">
        <Row label="Address" value={estimate.project_address ?? "\u2014"} />
        <Row label="Tier" value={({ budget: "Budget", midrange: "Midrange", high_end: "High End", good: "Budget", better: "Midrange", best: "High End" } as Record<string, string>)[estimate.tier] ?? estimate.tier} />
        <Row label="Source" value={estimate.source} />
      </Section>

      <Section title="Financials">
        <Row label="Materials" value={`$${Number(estimate.materials_subtotal).toLocaleString()}`} />
        <Row label="Labor" value={`$${Number(estimate.labor_subtotal).toLocaleString()}`} />
        <Row label="Subcontractors" value={`$${Number(estimate.subcontractor_total).toLocaleString()}`} />
        <Row label="Permits & Fees" value={`$${Number(estimate.permits_fees).toLocaleString()}`} />
        <Row label="Overhead & Profit" value={`$${Number(estimate.overhead_profit).toLocaleString()}`} />
        <Row label="Contingency" value={`$${Number(estimate.contingency).toLocaleString()}`} />
        <Row label="Tax" value={`$${Number(estimate.tax).toLocaleString()}`} />
        <Row label="Grand Total" value={`$${Number(estimate.grand_total).toLocaleString()}`} bold />
      </Section>

      <Section title="Validation">
        <Row label="Passed" value={estimate.validation_passed ? "Yes" : "No"} />
      </Section>

      <Section title="Timeline">
        <Row label="Created" value={new Date(estimate.created_at).toLocaleDateString()} />
        <Row label="Updated" value={new Date(estimate.updated_at).toLocaleDateString()} />
        {estimate.valid_through && <Row label="Valid Through" value={new Date(estimate.valid_through).toLocaleDateString()} />}
      </Section>

      {["sent", "approved", "accepted"].includes(estimate.status) && (
        <Section title="Payment">
          <div className="px-3 py-2">
            <PaymentStatus
              estimateId={estimate.id}
              estimateNumber={estimate.estimate_number}
              grandTotal={Number(estimate.grand_total)}
            />
          </div>
        </Section>
      )}

      <div className="mt-4 space-y-2">
        <button onClick={() => onEditEstimate?.(estimate)} className="w-full rounded-lg bg-[var(--accent)] py-2.5 text-[13px] font-medium text-white transition-all active:scale-[0.99]">
          Open Estimate
        </button>

        {estimate.status === "draft" && (
          <button
            onClick={() => handleTransition("in_review", "Submitted for review")}
            disabled={transitioning}
            className="w-full rounded-lg border border-[var(--sep)] py-2.5 text-[13px] font-medium transition-all hover:bg-[var(--bg)] disabled:opacity-50"
          >
            {transitioning ? "Submitting\u2026" : "Submit for Review"}
          </button>
        )}
        {estimate.status === "in_review" && (
          <div className="flex gap-2">
            <button
              onClick={() => handleTransition("draft", "Returned to draft")}
              disabled={transitioning}
              className="flex-1 rounded-lg border border-[var(--sep)] py-2.5 text-[13px] font-medium transition-all hover:bg-[var(--bg)] disabled:opacity-50"
            >
              Return to Draft
            </button>
            {isAdmin && (
              <button
                onClick={() => handleTransition("approved", "Estimate approved")}
                disabled={transitioning}
                className="flex-1 rounded-lg bg-[var(--green)] py-2.5 text-[13px] font-medium text-white transition-all hover:brightness-110 disabled:opacity-50"
              >
                {transitioning ? "Approving\u2026" : "Approve"}
              </button>
            )}
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={handleDuplicate}
            disabled={duplicating}
            className="flex-1 rounded-lg border border-[var(--sep)] py-2.5 text-[13px] font-medium transition-all hover:bg-[var(--bg)] disabled:opacity-50"
          >
            {duplicating ? "Duplicating..." : "Duplicate"}
          </button>
          <button
            onClick={handleDownloadPDF}
            disabled={generatingPdf}
            className="flex-1 rounded-lg border border-[var(--sep)] py-2.5 text-[13px] font-medium transition-all hover:bg-[var(--bg)] disabled:opacity-50"
          >
            {generatingPdf ? "Generating..." : "PDF"}
          </button>
          <QuickBooksExport estimateId={estimate.id} estimateNumber={estimate.estimate_number} />
        </div>

        {["sent", "approved", "accepted"].includes(estimate.status) && (
          <button
            onClick={handleCopyPortalLink}
            disabled={copyingLink}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-[var(--sep)] py-2.5 text-[13px] font-medium transition-all hover:bg-[var(--bg)] disabled:opacity-50"
          >
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
            {copyingLink ? "Copying\u2026" : "Copy Portal Link"}
          </button>
        )}
      </div>
    </div>
  );
});

/* ── Shared small components ── */

const Section = memo(function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-[var(--secondary)]">{title}</p>
      <div className="rounded-lg border border-[var(--sep)] divide-y divide-[var(--sep)]">{children}</div>
    </div>
  );
});

const Row = memo(function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between px-3 py-2">
      <p className="text-[12px] text-[var(--secondary)]">{label}</p>
      <p className={`text-[12px] ${bold ? "font-bold" : "font-medium"}`}>{value}</p>
    </div>
  );
});

const LoadingRows = memo(function LoadingRows() {
  return (
    <div className="p-4 space-y-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <div className="h-3 w-28 animate-pulse rounded bg-[var(--gray5)]" />
          <div className="h-2.5 w-40 animate-pulse rounded bg-[var(--gray5)]" />
        </div>
      ))}
    </div>
  );
});
