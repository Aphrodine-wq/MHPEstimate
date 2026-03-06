export type ValidationSeverity = "PASS" | "WARN" | "FAIL";

export interface ValidationCheck {
  id: number;
  name: string;
  description: string;
  severity: ValidationSeverity;
  category: string;
}

export interface ValidationResult {
  check_id: number;
  name: string;
  status: ValidationSeverity;
  message: string;
}
