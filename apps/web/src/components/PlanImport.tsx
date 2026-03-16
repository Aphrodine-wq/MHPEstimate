import { useRef, useState, useCallback } from "react";
import * as Sentry from "@sentry/nextjs";
import {
  generateTakeoffFromPlan,
  type PlanAnalysisResult,
  type PlanPageAnalysis,
  type PlanTakeoffItem,
} from "@proestimate/estimation-engine";
import type { DraftLine } from "./estimate-editor/types";

interface PlanImportProps {
  /** Called with generated line items when the user confirms import */
  onImport: (lineItems: DraftLine[]) => void;
  /** Project type for takeoff generation */
  projectType?: string;
}

type ImportStep = "idle" | "uploading" | "analyzing" | "review" | "error";

const fmt = (n: number) =>
  n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const CONFIDENCE_COLORS: Record<string, string> = {
  high: "bg-green-50 text-green-700 border-green-200",
  medium: "bg-yellow-50 text-yellow-700 border-yellow-200",
  low: "bg-red-50 text-red-700 border-red-200",
};

const PLAN_TYPE_LABELS: Record<string, string> = {
  floor_plan: "Floor Plan",
  elevation: "Elevation",
  roof_plan: "Roof Plan",
  foundation: "Foundation",
  site_plan: "Site Plan",
  detail: "Detail",
  electrical: "Electrical",
  plumbing: "Plumbing",
  mechanical: "Mechanical",
  other: "Other",
};

let keyCounter = 0;
const nextKey = () => `plan-${++keyCounter}-${Date.now()}`;

/** Convert a File to a base64 string (without the data URL prefix) */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1] ?? result);
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

/** Render a PDF page to a base64 PNG string using pdfjs-dist */
async function renderPdfPage(pdfData: ArrayBuffer, pageNum: number): Promise<string> {
  const pdfjsLib = await import("pdfjs-dist");

  // Set worker source
  if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
  }

  const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;
  const page = await pdf.getPage(pageNum);

  // Render at 2x for better quality
  const scale = 2;
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement("canvas");
  canvas.width = viewport.width;
  canvas.height = viewport.height;

  const ctx = canvas.getContext("2d")!;
  await page.render({ canvasContext: ctx, viewport, canvas } as Parameters<typeof page.render>[0]).promise;

  // Convert to base64 PNG (strip the data URL prefix)
  const dataUrl = canvas.toDataURL("image/png");
  return dataUrl.split(",")[1] ?? dataUrl;
}

/** Get total page count from a PDF */
async function getPdfPageCount(pdfData: ArrayBuffer): Promise<number> {
  const pdfjsLib = await import("pdfjs-dist");

  if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
  }

  const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;
  return pdf.numPages;
}

export function PlanImport({ onImport, projectType = "General" }: PlanImportProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<ImportStep>("idle");
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<PlanAnalysisResult | null>(null);
  const [takeoffItems, setTakeoffItems] = useState<PlanTakeoffItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const [pageImages, setPageImages] = useState<string[]>([]);
  const [analyzingPage, setAnalyzingPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const reset = useCallback(() => {
    setStep("idle");
    setError(null);
    setFileName(null);
    setAnalysisResult(null);
    setTakeoffItems([]);
    setSelectedItems(new Set());
    setPageImages([]);
    setAnalyzingPage(0);
    setTotalPages(0);
  }, []);

  const handleButtonClick = () => {
    reset();
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input so same file can be re-selected
    e.target.value = "";

    setError(null);
    setFileName(file.name);
    setStep("uploading");

    try {
      let images: string[];

      if (file.type === "application/pdf") {
        // Render PDF pages to images client-side
        const arrayBuffer = await file.arrayBuffer();
        const pageCount = await getPdfPageCount(arrayBuffer);
        setTotalPages(pageCount);

        const maxPages = Math.min(pageCount, 10);
        images = [];

        for (let i = 1; i <= maxPages; i++) {
          setAnalyzingPage(i);
          const pageImage = await renderPdfPage(arrayBuffer, i);
          images.push(pageImage);
        }
      } else if (file.type.startsWith("image/")) {
        // Single image file
        setTotalPages(1);
        setAnalyzingPage(1);
        const base64 = await fileToBase64(file);
        images = [base64];
      } else {
        setError("Unsupported file type. Please upload a PDF or image (PNG, JPG).");
        setStep("error");
        return;
      }

      setPageImages(images);
      setStep("analyzing");
      setAnalyzingPage(0);

      // Send to API for Claude Vision analysis
      const response = await fetch("/api/plans/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ images }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({ error: "Analysis failed" }));
        throw new Error(errData.error ?? `Analysis failed (${response.status})`);
      }

      const result: { pages: PlanPageAnalysis[]; summary: PlanAnalysisResult["summary"] } =
        await response.json();
      const fullResult: PlanAnalysisResult = {
        pages: result.pages,
        summary: result.summary,
        takeoff: [],
      };

      // Generate takeoff items from the analysis
      const items = generateTakeoffFromPlan(fullResult, projectType);
      fullResult.takeoff = items;

      setAnalysisResult(fullResult);
      setTakeoffItems(items);
      // Select all items by default
      setSelectedItems(new Set(items.map((_, i) => i)));
      setStep("review");
    } catch (err) {
      Sentry.captureException(err);
      setError(err instanceof Error ? err.message : "Failed to analyze plan. Please try again.");
      setStep("error");
    }
  };

  const toggleItem = (index: number) => {
    setSelectedItems((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedItems.size === takeoffItems.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(takeoffItems.map((_, i) => i)));
    }
  };

  const handleImport = () => {
    const lines: DraftLine[] = takeoffItems
      .filter((_, i) => selectedItems.has(i))
      .map((item) => ({
        _key: nextKey(),
        category: item.category,
        description: item.description,
        quantity: item.quantity,
        unit: item.unit,
        unit_price: item.suggested_price ?? 0,
        material_cost: 0,
        labor_cost: 0,
        retail_price: 0,
      }));

    onImport(lines);
    reset();
  };

  // Group takeoff items by source for organized display
  const groupedItems = takeoffItems.reduce<Record<string, { items: PlanTakeoffItem[]; indices: number[] }>>(
    (acc, item, index) => {
      const group = item.source;
      if (!acc[group]) acc[group] = { items: [], indices: [] };
      acc[group].items.push(item);
      acc[group].indices.push(index);
      return acc;
    },
    {},
  );

  return (
    <div className="space-y-3">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.png,.jpg,.jpeg,.tiff,.bmp"
        className="hidden"
        onChange={handleFileChange}
        aria-label="Import building plan file"
      />

      {/* Trigger button */}
      {step === "idle" && (
        <button
          type="button"
          onClick={handleButtonClick}
          className="flex items-center gap-2 rounded-lg border border-[var(--sep)] px-3.5 py-2 text-[13px] font-medium transition-colors hover:bg-[var(--bg)]"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="3" width="20" height="18" rx="2" />
            <line x1="2" y1="9" x2="22" y2="9" />
            <line x1="9" y1="3" x2="9" y2="21" />
          </svg>
          Import from Building Plans
        </button>
      )}

      {/* Loading state */}
      {(step === "uploading" || step === "analyzing") && (
        <div className="rounded-xl border border-[var(--sep)] bg-[var(--card)] p-6 text-center space-y-3">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-3 border-[var(--sep)] border-t-[var(--accent)]" />
          <p className="text-[13px] font-semibold">
            {step === "uploading"
              ? `Processing ${fileName}...`
              : "Analyzing building plans with AI..."}
          </p>
          {step === "uploading" && totalPages > 1 && (
            <p className="text-[11px] text-[var(--secondary)]">
              Rendering page {analyzingPage} of {totalPages}
            </p>
          )}
          {step === "analyzing" && (
            <p className="text-[11px] text-[var(--secondary)]">
              Extracting rooms, dimensions, materials, and openings
            </p>
          )}
        </div>
      )}

      {/* Error state */}
      {step === "error" && error && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-[12px] text-red-700">
          <svg className="mt-0.5 flex-shrink-0" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" />
          </svg>
          <div>
            <p className="font-medium">Plan analysis failed</p>
            <p className="mt-0.5">{error}</p>
          </div>
          <button
            type="button"
            onClick={reset}
            className="ml-auto flex-shrink-0 rounded p-0.5 hover:bg-red-100 transition-colors"
            aria-label="Dismiss error"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Review state */}
      {step === "review" && analysisResult && (
        <div className="rounded-xl border border-[var(--sep)] bg-[var(--card)] p-4 space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-[13px] font-semibold">Plan Analysis Results</p>
              <p className="text-[11px] text-[var(--secondary)]">
                {fileName} &middot; {analysisResult.pages.length} page{analysisResult.pages.length !== 1 ? "s" : ""} analyzed
              </p>
            </div>
            <button
              type="button"
              onClick={reset}
              className="rounded-md p-1 hover:bg-[var(--bg)] transition-colors"
              aria-label="Cancel import"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--gray1)" strokeWidth="2" strokeLinecap="round">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Summary chips */}
          <div className="flex flex-wrap gap-1.5">
            {analysisResult.summary.total_area_sqft && (
              <span className="rounded-full bg-blue-50 border border-blue-200 px-2 py-0.5 text-[10px] font-medium text-blue-700">
                {fmt(analysisResult.summary.total_area_sqft)} sq ft
              </span>
            )}
            {analysisResult.summary.total_rooms > 0 && (
              <span className="rounded-full bg-[var(--gray5)] px-2 py-0.5 text-[10px] text-[var(--secondary)]">
                {analysisResult.summary.total_rooms} rooms
              </span>
            )}
            {analysisResult.summary.total_bedrooms > 0 && (
              <span className="rounded-full bg-[var(--gray5)] px-2 py-0.5 text-[10px] text-[var(--secondary)]">
                {analysisResult.summary.total_bedrooms} bed
              </span>
            )}
            {analysisResult.summary.total_bathrooms > 0 && (
              <span className="rounded-full bg-[var(--gray5)] px-2 py-0.5 text-[10px] text-[var(--secondary)]">
                {analysisResult.summary.total_bathrooms} bath
              </span>
            )}
            {analysisResult.summary.garage_bays > 0 && (
              <span className="rounded-full bg-[var(--gray5)] px-2 py-0.5 text-[10px] text-[var(--secondary)]">
                {analysisResult.summary.garage_bays}-car garage
              </span>
            )}
            {analysisResult.summary.stories > 1 && (
              <span className="rounded-full bg-[var(--gray5)] px-2 py-0.5 text-[10px] text-[var(--secondary)]">
                {analysisResult.summary.stories} stories
              </span>
            )}
          </div>

          {/* Page-by-page details (collapsible) */}
          <details className="group">
            <summary className="cursor-pointer text-[12px] font-medium text-[var(--accent)] hover:underline">
              View extracted data by page
            </summary>
            <div className="mt-2 space-y-3">
              {analysisResult.pages.map((page) => (
                <div key={page.page} className="rounded-lg border border-[var(--sep)] p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-[12px] font-medium">
                      Page {page.page}: {PLAN_TYPE_LABELS[page.plan_type] ?? page.plan_type}
                    </p>
                    <span
                      className={`inline-flex rounded-full border px-1.5 py-0.5 text-[10px] font-medium ${
                        page.confidence >= 0.7
                          ? "bg-green-50 text-green-700 border-green-200"
                          : page.confidence >= 0.4
                            ? "bg-yellow-50 text-yellow-700 border-yellow-200"
                            : "bg-red-50 text-red-700 border-red-200"
                      }`}
                    >
                      {Math.round(page.confidence * 100)}% confidence
                    </span>
                  </div>
                  <p className="text-[11px] text-[var(--secondary)]">{page.raw_description}</p>
                  {page.rooms.length > 0 && (
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse text-[11px]">
                        <thead>
                          <tr className="border-b border-[var(--sep)]">
                            <th className="pb-1 text-left font-medium text-[var(--secondary)]">Room</th>
                            <th className="pb-1 text-right font-medium text-[var(--secondary)]">L &times; W</th>
                            <th className="pb-1 text-right font-medium text-[var(--secondary)]">Area</th>
                            <th className="pb-1 text-center font-medium text-[var(--secondary)]">Win</th>
                            <th className="pb-1 text-center font-medium text-[var(--secondary)]">Door</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--sep)]">
                          {page.rooms.map((room, ri) => (
                            <tr key={ri} className="hover:bg-[var(--bg)]">
                              <td className="py-1 font-medium">{room.name}</td>
                              <td className="py-1 text-right tabular-nums text-[var(--secondary)]">
                                {room.length_ft && room.width_ft
                                  ? `${room.length_ft}' × ${room.width_ft}'`
                                  : "—"}
                              </td>
                              <td className="py-1 text-right tabular-nums font-semibold">
                                {room.area_sqft ? `${fmt(room.area_sqft)} sf` : "—"}
                              </td>
                              <td className="py-1 text-center">{room.window_count || "—"}</td>
                              <td className="py-1 text-center">{room.door_count || "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </details>

          {/* Takeoff line items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[12px] font-semibold">
                Generated Takeoff — {takeoffItems.length} Line Items
              </p>
              <button
                type="button"
                onClick={toggleAll}
                className="text-[11px] text-[var(--accent)] hover:underline"
              >
                {selectedItems.size === takeoffItems.length ? "Deselect All" : "Select All"}
              </button>
            </div>

            <div className="max-h-[400px] overflow-y-auto space-y-3">
              {Object.entries(groupedItems).map(([group, { items, indices }]) => (
                <div key={group}>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--secondary)] mb-1">
                    {group}
                  </p>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-[12px]">
                      <thead>
                        <tr className="border-b border-[var(--sep)]">
                          <th className="pb-1 w-6" />
                          <th className="pb-1 text-left font-medium text-[var(--secondary)] text-[11px]">Description</th>
                          <th className="pb-1 text-left font-medium text-[var(--secondary)] text-[11px]">Cat</th>
                          <th className="pb-1 text-right font-medium text-[var(--secondary)] text-[11px]">Qty</th>
                          <th className="pb-1 text-left pl-2 font-medium text-[var(--secondary)] text-[11px]">Unit</th>
                          <th className="pb-1 text-right font-medium text-[var(--secondary)] text-[11px]">Est Price</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--sep)]">
                        {items.map((item, localIdx) => {
                          const globalIdx = indices[localIdx]!;
                          const isSelected = selectedItems.has(globalIdx);
                          return (
                            <tr
                              key={globalIdx}
                              className={`cursor-pointer transition-colors ${isSelected ? "hover:bg-[var(--bg)]" : "opacity-40 hover:opacity-70"}`}
                              onClick={() => toggleItem(globalIdx)}
                            >
                              <td className="py-1.5 text-center">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => toggleItem(globalIdx)}
                                  className="rounded border-[var(--sep)] text-[var(--accent)]"
                                  onClick={(e) => e.stopPropagation()}
                                />
                              </td>
                              <td className="py-1.5 font-medium text-[var(--label)]">
                                {item.description}
                              </td>
                              <td className="py-1.5 text-[var(--secondary)]">
                                <span className={`inline-flex rounded px-1.5 py-0.5 text-[10px] ${
                                  item.category === "material"
                                    ? "bg-blue-50 text-blue-700"
                                    : item.category === "labor"
                                      ? "bg-orange-50 text-orange-700"
                                      : "bg-purple-50 text-purple-700"
                                }`}>
                                  {item.category}
                                </span>
                              </td>
                              <td className="py-1.5 text-right tabular-nums font-semibold">
                                {fmt(item.quantity)}
                              </td>
                              <td className="py-1.5 pl-2 text-[var(--secondary)]">{item.unit}</td>
                              <td className="py-1.5 text-right tabular-nums">
                                {item.suggested_price ? (
                                  <span className="flex items-center justify-end gap-1">
                                    ${fmt(item.suggested_price)}
                                    {item.price_confidence && (
                                      <span className={`inline-flex rounded-full border px-1 py-0 text-[9px] font-medium ${CONFIDENCE_COLORS[item.price_confidence] ?? ""}`}>
                                        {item.price_confidence}
                                      </span>
                                    )}
                                  </span>
                                ) : (
                                  <span className="text-[var(--tertiary)]">—</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Estimated total */}
          {selectedItems.size > 0 && (
            <div className="flex items-center justify-between rounded-lg bg-[var(--bg)] px-3 py-2 text-[12px]">
              <span className="text-[var(--secondary)]">
                Estimated total for {selectedItems.size} selected items:
              </span>
              <span className="font-bold text-[14px]">
                ${fmt(
                  takeoffItems
                    .filter((_, i) => selectedItems.has(i))
                    .reduce((sum, item) => sum + (item.suggested_price ?? 0) * item.quantity, 0),
                )}
              </span>
            </div>
          )}

          {/* Note */}
          <p className="text-[11px] text-[var(--tertiary)]">
            Line items will be added to your estimate. Prices are suggested from MHP&rsquo;s historical database — review and adjust as needed.
          </p>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={reset}
              className="flex-1 rounded-lg border border-[var(--sep)] py-2 text-[13px] font-medium transition-colors hover:bg-[var(--bg)]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleImport}
              disabled={selectedItems.size === 0}
              className="flex-1 rounded-lg bg-[var(--accent)] py-2 text-[13px] font-medium text-white transition-all active:scale-[0.98] disabled:opacity-50"
            >
              Import {selectedItems.size} Line Item{selectedItems.size !== 1 ? "s" : ""}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
