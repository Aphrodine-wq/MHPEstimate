import { useState, useRef, useEffect } from "react";

interface QuickBooksExportProps {
  estimateId: string;
  estimateNumber: string;
}

export function QuickBooksExport({ estimateId, estimateNumber }: QuickBooksExportProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleExport = async (format: "iif" | "csv") => {
    setLoading(true);
    try {
      const res = await fetch(`/api/integrations/quickbooks/export?format=${format}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estimateId }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Export failed");
      }

      const blob = await res.blob();
      const ext = format === "csv" ? "csv" : "iif";
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${estimateNumber}_export.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setOpen(false);
    } catch (err) {
      console.error("Export failed:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        disabled={loading}
        className="flex items-center gap-1.5 rounded-lg border border-[var(--sep)] px-3 py-2 text-[12px] font-medium text-[var(--label)] transition-colors hover:bg-[var(--bg)] disabled:opacity-50"
      >
        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        {loading ? "Exporting..." : "Export"}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-10 mt-1 w-52 rounded-lg border border-[var(--sep)] bg-[var(--card)] py-1 shadow-lg">
          <button
            onClick={() => handleExport("iif")}
            className="flex w-full items-center gap-2 px-3 py-2 text-[12px] text-[var(--label)] transition-colors hover:bg-[var(--bg)]"
          >
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#2ca01c" strokeWidth="1.5" strokeLinecap="round">
              <rect x="2" y="3" width="20" height="18" rx="2" />
              <path d="M8 7v10M12 7v10M16 7v10" />
            </svg>
            <div className="text-left">
              <p className="font-medium">QuickBooks (IIF)</p>
              <p className="text-[10px] text-[var(--secondary)]">Import directly into QuickBooks</p>
            </div>
          </button>
          <button
            onClick={() => handleExport("csv")}
            className="flex w-full items-center gap-2 px-3 py-2 text-[12px] text-[var(--label)] transition-colors hover:bg-[var(--bg)]"
          >
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
              <path d="M14 2v6h6" />
              <path d="M8 13h8" />
              <path d="M8 17h8" />
            </svg>
            <div className="text-left">
              <p className="font-medium">CSV Spreadsheet</p>
              <p className="text-[10px] text-[var(--secondary)]">Excel, Google Sheets, Xero</p>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}
