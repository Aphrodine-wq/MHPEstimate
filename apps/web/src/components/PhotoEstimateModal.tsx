import { useState } from "react";
import toast from "react-hot-toast";
import * as Sentry from "@sentry/nextjs";
import { Modal, Field, inputClass } from "./Modal";
import { Button, SegmentedControl } from "@proestimate/ui";
import { PhotoCapture, type CapturedPhoto } from "./PhotoCapture";
import type { Estimate } from "@proestimate/shared/types";

interface PhotoEstimateModalProps {
  open: boolean;
  onClose: () => void;
  onCreated?: (estimate: Estimate) => void;
}

type Step = "upload" | "analyzing" | "review";

interface AnalysisSummary {
  projectType: string;
  estimatedSqft: number;
  description: string;
  confidence: number;
}

export function PhotoEstimateModal({ open, onClose, onCreated }: PhotoEstimateModalProps) {
  const [photos, setPhotos] = useState<CapturedPhoto[]>([]);
  const [zip, setZip] = useState("");
  const [tier, setTier] = useState("midrange");
  const [step, setStep] = useState<Step>("upload");
  const [analysis, setAnalysis] = useState<AnalysisSummary | null>(null);
  const [generating, setGenerating] = useState(false);

  const handleAnalyze = async () => {
    if (photos.length === 0) {
      toast.error("Please upload at least one photo");
      return;
    }
    if (!zip) {
      toast.error("Zip code is required");
      return;
    }
    setStep("analyzing");
    setGenerating(true);
    try {
      const res = await fetch("/api/estimates/from-photos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          photos: photos.map((p) => ({ base64: p.base64, name: p.file.name })),
          zipCode: zip,
          tier,
          confirm: false,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Analysis failed" }));
        throw new Error(err.error || "Analysis failed");
      }
      const data = await res.json();
      setAnalysis(data.analysis);
      setStep("review");
    } catch (err) {
      Sentry.captureException(err);
      toast.error(err instanceof Error ? err.message : "Failed to analyze photos");
      setStep("upload");
    } finally {
      setGenerating(false);
    }
  };

  const handleConfirm = async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/estimates/from-photos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          photos: photos.map((p) => ({ base64: p.base64, name: p.file.name })),
          zipCode: zip,
          tier,
          confirm: true,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Generation failed" }));
        throw new Error(err.error || "Generation failed");
      }
      const estimate = await res.json();
      toast.success("Photo estimate created successfully");
      resetAndClose();
      onCreated?.(estimate);
    } catch (err) {
      Sentry.captureException(err);
      toast.error(err instanceof Error ? err.message : "Failed to create estimate from photos");
    } finally {
      setGenerating(false);
    }
  };

  const resetAndClose = () => {
    setPhotos([]);
    setZip("");
    setTier("midrange");
    setStep("upload");
    setAnalysis(null);
    onClose();
  };

  return (
    <Modal open={open} onClose={resetAndClose} title="Photo Estimate" description="Generate an estimate from project photos" width="w-full max-w-[600px]">
      <div className="px-6 py-5 space-y-5">
        {step === "upload" && (
          <>
            <PhotoCapture onPhotosChange={setPhotos} maxPhotos={8} />

            <div className="grid grid-cols-2 gap-4">
              <Field label="Zip Code">
                <input
                  value={zip}
                  onChange={(e) => setZip(e.target.value)}
                  placeholder="e.g. 28601"
                  maxLength={10}
                  className={inputClass}
                />
              </Field>
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
              </Field>
            </div>
          </>
        )}

        {step === "analyzing" && (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
            <p className="mt-4 text-[13px] font-medium text-[var(--label)]">Analyzing photos...</p>
            <p className="mt-1 text-[11px] text-[var(--secondary)]">This may take a moment</p>
          </div>
        )}

        {step === "review" && analysis && (
          <div className="space-y-4">
            <div className="rounded-lg border border-[var(--sep)] bg-[var(--bg)] p-4">
              <p className="text-[12px] font-semibold text-[var(--label)] mb-2">Analysis Summary</p>
              <div className="space-y-2 text-[12px]">
                <div className="flex justify-between">
                  <span className="text-[var(--secondary)]">Project Type</span>
                  <span className="font-medium text-[var(--label)]">{analysis.projectType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--secondary)]">Estimated Sqft</span>
                  <span className="font-medium text-[var(--label)]">{analysis.estimatedSqft.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--secondary)]">Confidence</span>
                  <span className="font-medium text-[var(--label)]">{analysis.confidence}%</span>
                </div>
              </div>
              <p className="mt-3 text-[11px] text-[var(--secondary)] leading-relaxed">{analysis.description}</p>
            </div>

            <div className="flex items-center gap-2 rounded-lg bg-[var(--accent-light)] px-3 py-2">
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 16v-4M12 8h.01" />
              </svg>
              <p className="text-[11px] text-[var(--accent)]">
                {photos.length} photo{photos.length !== 1 ? "s" : ""} analyzed. Confirm to generate the full estimate.
              </p>
            </div>
          </div>
        )}
      </div>
      <div className="flex items-center justify-between border-t border-[var(--sep)] px-6 py-3">
        <Button variant="secondary" onClick={step === "review" ? () => setStep("upload") : resetAndClose}>
          {step === "review" ? "Back" : "Cancel"}
        </Button>
        {step === "upload" && (
          <Button onClick={handleAnalyze} loading={generating} disabled={photos.length === 0}>
            Analyze &amp; Generate
          </Button>
        )}
        {step === "review" && (
          <Button onClick={handleConfirm} loading={generating}>
            Confirm &amp; Create
          </Button>
        )}
      </div>
    </Modal>
  );
}
