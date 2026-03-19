import { useState } from "react";
import toast from "react-hot-toast";
import * as Sentry from "@sentry/nextjs";
import { Modal, Field, inputClass, selectClass } from "./Modal";
import { Button } from "@proestimate/ui";
import { useClients } from "../lib/store";
import type { Estimate } from "@proestimate/shared/types";

interface CloneEstimateModalProps {
  open: boolean;
  onClose: () => void;
  sourceEstimate: Estimate | null;
  onCreated?: (estimate: Estimate) => void;
}

export function CloneEstimateModal({ open, onClose, sourceEstimate, onCreated }: CloneEstimateModalProps) {
  const [sqft, setSqft] = useState("");
  const [zip, setZip] = useState("");
  const [clientId, setClientId] = useState("");
  const [cloning, setCloning] = useState(false);
  const { data: clients } = useClients();

  const handleClone = async () => {
    if (!sourceEstimate) return;
    setCloning(true);
    try {
      const res = await fetch("/api/estimates/clone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceEstimateId: sourceEstimate.id,
          squareFootage: sqft ? parseFloat(sqft) : undefined,
          zipCode: zip || undefined,
          clientId: clientId || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Clone failed" }));
        throw new Error(err.error || "Clone failed");
      }
      const estimate = await res.json();
      toast.success("Estimate cloned successfully");
      resetAndClose();
      onCreated?.(estimate);
    } catch (err) {
      Sentry.captureException(err);
      toast.error(err instanceof Error ? err.message : "Failed to clone estimate");
    } finally {
      setCloning(false);
    }
  };

  const resetAndClose = () => {
    setSqft("");
    setZip("");
    setClientId("");
    onClose();
  };

  const total = sourceEstimate ? Number(sourceEstimate.grand_total || 0) : 0;

  return (
    <Modal open={open} onClose={resetAndClose} title="Clone Estimate" description="Create a new estimate based on an existing one" width="w-full max-w-[480px]">
      <div className="px-6 py-5 space-y-5">
        {sourceEstimate && (
          <div className="rounded-lg border border-[var(--sep)] bg-[var(--bg)] px-4 py-3">
            <p className="text-[12px] font-medium text-[var(--label)]">Source Estimate</p>
            <div className="mt-1.5 flex items-center gap-3 text-[11px] text-[var(--secondary)]">
              <span>{sourceEstimate.estimate_number}</span>
              <span className="text-[var(--sep)]">|</span>
              <span>{sourceEstimate.project_type}</span>
              <span className="text-[var(--sep)]">|</span>
              <span>${total.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <Field label="New Square Footage">
            <input
              type="number"
              min="0"
              value={sqft}
              onChange={(e) => setSqft(e.target.value)}
              placeholder="Leave blank to keep"
              className={inputClass}
            />
          </Field>
          <Field label="New Zip Code">
            <input
              value={zip}
              onChange={(e) => setZip(e.target.value)}
              placeholder="Leave blank to keep"
              maxLength={10}
              className={inputClass}
            />
          </Field>
        </div>

        <Field label="Assign to Client">
          <select value={clientId} onChange={(e) => setClientId(e.target.value)} className={selectClass}>
            <option value="">-- Same as source --</option>
            {clients?.map((c) => (
              <option key={c.id} value={c.id}>{c.full_name}</option>
            ))}
          </select>
        </Field>
      </div>
      <div className="flex items-center justify-between border-t border-[var(--sep)] px-6 py-3">
        <Button variant="secondary" onClick={resetAndClose}>Cancel</Button>
        <Button onClick={handleClone} loading={cloning}>Clone Estimate</Button>
      </div>
    </Modal>
  );
}
