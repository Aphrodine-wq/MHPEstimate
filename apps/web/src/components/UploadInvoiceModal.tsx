import { useState } from "react";
import toast from "react-hot-toast";
import * as Sentry from "@sentry/nextjs";
import { Modal, Field, inputClass } from "./Modal";
import { supabase } from "../lib/supabase";

interface UploadInvoiceModalProps {
  open: boolean;
  onClose: () => void;
}

export function UploadInvoiceModal({ open, onClose }: UploadInvoiceModalProps) {
  const [supplier, setSupplier] = useState("");
  const [invoiceNum, setInvoiceNum] = useState("");
  const [invoiceDate, setInvoiceDate] = useState("");
  const [fileName, setFileName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!supabase) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("invoices").insert({
        supplier_name: supplier || null,
        invoice_number: invoiceNum || null,
        invoice_date: invoiceDate || null,
        file_path: fileName || "pending-upload",
        status: "pending",
      });
      if (error) { Sentry.captureException(error); toast.error("Failed to upload invoice"); setSaving(false); return; }
      toast.success("Invoice uploaded");
      setSaving(false);
      resetAndClose();
    } catch (err) {
      Sentry.captureException(err);
      toast.error("Failed to upload invoice");
      setSaving(false);
    }
  };

  const resetAndClose = () => {
    setSupplier(""); setInvoiceNum(""); setInvoiceDate(""); setFileName(""); setFile(null);
    onClose();
  };

  return (
    <Modal open={open} onClose={resetAndClose} title="Upload Invoice" description="Add a supplier invoice for pricing extraction">
      <div className="space-y-4 px-6 py-5">
        {/* Drop zone */}
        <div
          className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-[var(--gray4)] bg-[var(--bg)] px-6 py-8 transition-colors hover:border-[var(--accent)]"
          onClick={() => {
            const input = document.createElement("input");
            input.type = "file";
            input.accept = ".pdf,.png,.jpg,.jpeg";
            input.onchange = (e) => {
              const f = (e.target as HTMLInputElement).files?.[0];
              if (f) {
                setFileName(f.name);
                setFile(f);
              }
            };
            input.click();
          }}
        >
          <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="var(--gray2)" strokeWidth="1.5" strokeLinecap="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          <p className="mt-2 text-[13px] font-medium text-[var(--secondary)]">
            {fileName ? `${fileName}` : "Click to select a file"}
          </p>
          {file && (
            <p className="mt-0.5 text-[11px] text-[var(--tertiary)]">
              {(file.size / 1024).toFixed(0)} KB
            </p>
          )}
          {!file && (
            <p className="mt-0.5 text-[11px] text-[var(--tertiary)]">PDF, PNG, or JPG</p>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Supplier Name">
            <input value={supplier} onChange={(e) => setSupplier(e.target.value)} placeholder="Home Depot" className={inputClass} />
          </Field>
          <Field label="Invoice Number">
            <input value={invoiceNum} onChange={(e) => setInvoiceNum(e.target.value)} placeholder="INV-00123" className={inputClass} />
          </Field>
        </div>
        <Field label="Invoice Date">
          <input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} className={inputClass} />
        </Field>
      </div>
      <div className="flex justify-end gap-2 border-t border-[var(--sep)] px-6 py-3">
        <button onClick={resetAndClose} className="rounded-lg border border-[var(--sep)] px-4 py-2 text-[13px] font-medium transition-colors hover:bg-[var(--bg)]">Cancel</button>
        <button onClick={handleSubmit} disabled={saving} className="rounded-lg bg-[var(--accent)] px-4 py-2 text-[13px] font-medium text-white transition-all active:scale-[0.97] disabled:opacity-50">
          {saving ? "Uploading..." : "Upload Invoice"}
        </button>
      </div>
    </Modal>
  );
}
