import { useCallback, useState } from "react";
import { runValidation } from "@proestimate/estimation-engine";
import type { Estimate, EstimateLineItem } from "@proestimate/shared/types";
import type { ValidationResult } from "./types";

export interface UseEstimateValidationResult {
  validationResults: ValidationResult[];
  setValidationResults: (results: ValidationResult[]) => void;
  validationOpen: boolean;
  setValidationOpen: (v: boolean) => void;
  validating: boolean;
  handleRunValidation: () => Promise<void>;
  runAndReturn: () => Promise<ValidationResult[]>;
}

/**
 * Hook that encapsulates estimate validation state and logic.
 *
 * `buildEstimateSnapshot` must return the current in-memory estimate + line items
 * so they can be validated without saving first.
 */
export function useEstimateValidation(
  estimate: Estimate | null,
  buildEstimateSnapshot: () => { estimate: Estimate; lineItems: EstimateLineItem[] }
): UseEstimateValidationResult {
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([]);
  const [validationOpen, setValidationOpen] = useState(false);
  const [validating, setValidating] = useState(false);

  const handleRunValidation = useCallback(async () => {
    if (!estimate) return;
    setValidating(true);
    try {
      const { estimate: snap, lineItems } = buildEstimateSnapshot();
      const results: ValidationResult[] = await runValidation({ estimate: snap, lineItems });
      setValidationResults(results);
      setValidationOpen(true);
    } finally {
      setValidating(false);
    }
  }, [estimate, buildEstimateSnapshot]);

  /** Run validation and return the results (used by save flow). */
  const runAndReturn = useCallback(async (): Promise<ValidationResult[]> => {
    if (!estimate) return validationResults;
    try {
      const { estimate: snap, lineItems } = buildEstimateSnapshot();
      const results: ValidationResult[] = await runValidation({ estimate: snap, lineItems });
      setValidationResults(results);
      return results;
    } catch (err) {
      console.warn("Validation failed, proceeding with previous results:", err);
      return validationResults;
    }
  }, [estimate, buildEstimateSnapshot, validationResults]);

  return {
    validationResults,
    setValidationResults,
    validationOpen,
    setValidationOpen,
    validating,
    handleRunValidation,
    runAndReturn,
  };
}
