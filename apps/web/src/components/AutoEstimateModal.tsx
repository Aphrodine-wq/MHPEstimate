import { useState } from "react";
import toast from "react-hot-toast";
import * as Sentry from "@sentry/nextjs";
import { Modal, Field, inputClass, selectClass, textareaClass } from "./Modal";
import { Button, SegmentedControl } from "@proestimate/ui";
import type { Estimate } from "@proestimate/shared/types";
import { ALL_PROJECT_TYPES } from "./estimate-editor/types";

interface AutoEstimateModalProps {
  open: boolean;
  onClose: () => void;
  onCreated?: (estimate: Estimate) => void;
}

export function AutoEstimateModal({ open, onClose, onCreated }: AutoEstimateModalProps) {
  const [projectType, setProjectType] = useState("General");
  const [sqft, setSqft] = useState("");
  const [zip, setZip] = useState("");
  const [tier, setTier] = useState("midrange");
  const [specialRequests, setSpecialRequests] = useState("");
  const [generating, setGenerating] = useState(false);

  const handleGenerate = async () => {
    if (!sqft || !zip) {
      toast.error("Square footage and zip code are required");
      return;
    }
    setGenerating(true);
    try {
      const res = await fetch("/api/estimates/auto-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectType,
          squareFootage: parseFloat(sqft),
          zipCode: zip,
          tier,
          specialRequests: specialRequests || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Generation failed" }));
        throw new Error(err.error || "Generation failed");
      }
      const estimate = await res.json();
      toast.success("Estimate generated successfully");
      resetAndClose();
      onCreated?.(estimate);
    } catch (err) {
      Sentry.captureException(err);
      toast.error(err instanceof Error ? err.message : "Failed to generate estimate");
    } finally {
      setGenerating(false);
    }
  };

  const resetAndClose = () => {
    setProjectType("General");
    setSqft("");
    setZip("");
    setTier("midrange");
    setSpecialRequests("");
    onClose();
  };

  return (
    <Modal open={open} onClose={resetAndClose} title="Smart Estimate" description="Auto-generate an estimate using AI" width="w-full max-w-[540px]">
      <div className="px-6 py-5 space-y-5">
        <Field label="Project Type">
          <select value={projectType} onChange={(e) => setProjectType(e.target.value)} className={selectClass}>
            {ALL_PROJECT_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Square Footage">
            <input
              type="number"
              min="0"
              value={sqft}
              onChange={(e) => setSqft(e.target.value)}
              placeholder="e.g. 2200"
              className={inputClass}
            />
          </Field>
          <Field label="Zip Code">
            <input
              value={zip}
              onChange={(e) => setZip(e.target.value)}
              placeholder="e.g. 28601"
              maxLength={10}
              className={inputClass}
            />
          </Field>
        </div>

        <Field label="Pricing Tier">
          <SegmentedControl
            options={[
              { label: "Budget", value: "budget" },
              { label: "Midrange", value: "midrange" },
              { label: "High End", value: "high_end" },
            ]}
            value={tier}
            onChange={setTier}
            size="sm"
            className="w-full"
          />
          <p className="mt-1.5 text-[11px] text-[var(--tertiary)]">
            {tier === "budget" && "Economy-grade materials, basic finishes, cost-effective labor."}
            {tier === "midrange" && "Quality brand-name materials, standard upgrades, professional finishes."}
            {tier === "high_end" && "Premium and designer-grade materials, custom craftsmanship, luxury finishes."}
          </p>
        </Field>

        <Field label="Special Requests (optional)">
          <textarea
            value={specialRequests}
            onChange={(e) => setSpecialRequests(e.target.value)}
            placeholder="Any specific requirements, materials, or preferences..."
            rows={3}
            className={textareaClass}
          />
        </Field>
      </div>
      <div className="flex items-center justify-between border-t border-[var(--sep)] px-6 py-3">
        <Button variant="secondary" onClick={resetAndClose}>Cancel</Button>
        <Button onClick={handleGenerate} loading={generating}>Generate Estimate</Button>
      </div>
    </Modal>
  );
}
