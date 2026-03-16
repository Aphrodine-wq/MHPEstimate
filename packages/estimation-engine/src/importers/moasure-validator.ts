/**
 * Moasure Measurement Validator
 *
 * Validates parsed Moasure measurements before they are mapped to estimate
 * line items. Catches data integrity issues, unreasonable values, and
 * missing required fields.
 */

import type { MoasureMeasurement } from "./moasure-parser";

// ── Types ──────────────────────────────────────────────────────────────

export type ValidationSeverity = "error" | "warning" | "info";

export interface MoasureValidationResult {
  check: string;
  severity: ValidationSeverity;
  message: string;
  passed: boolean;
}

export interface MoasureValidationSummary {
  /** All individual check results */
  results: MoasureValidationResult[];
  /** Overall pass/fail — true if no errors (warnings are OK) */
  valid: boolean;
  /** Count of errors, warnings, info */
  counts: { errors: number; warnings: number; info: number };
}

// ── Thresholds ─────────────────────────────────────────────────────────

/** Reasonable bounds for residential construction measurements */
const BOUNDS = {
  /** Max area for a single measurement (10 acres in sq ft) */
  MAX_AREA_SQFT: 435_600,
  /** Min area that's useful (1 sq ft) */
  MIN_AREA_SQFT: 1,
  /** Max perimeter for a single measurement (1 mile in ft) */
  MAX_PERIMETER_LFT: 5_280,
  /** Max elevation change (100 ft — covers most residential terrain) */
  MAX_ELEVATION_FT: 100,
  /** Max volume (5,000 cu yd — large excavation) */
  MAX_VOLUME_CUYD: 5_000,
  /** Max single segment length (1,000 ft) */
  MAX_SEGMENT_LENGTH_FT: 1_000,
  /** Min segment length (0.1 ft = ~1.2 inches) */
  MIN_SEGMENT_LENGTH_FT: 0.1,
};

// ── Main Validator ─────────────────────────────────────────────────────

/**
 * Run all validation checks against a parsed Moasure measurement.
 */
export function validateMoasureMeasurement(
  measurement: MoasureMeasurement,
): MoasureValidationSummary {
  const results: MoasureValidationResult[] = [
    checkHasUsableData(measurement),
    checkAreaBounds(measurement),
    checkPerimeterBounds(measurement),
    checkElevationBounds(measurement),
    checkVolumeBounds(measurement),
    checkSegmentIntegrity(measurement),
    checkAreaPerimeterConsistency(measurement),
    checkLayerConsistency(measurement),
    checkDeviceModel(measurement),
  ];

  const errors = results.filter((r) => !r.passed && r.severity === "error").length;
  const warnings = results.filter((r) => !r.passed && r.severity === "warning").length;
  const info = results.filter((r) => !r.passed && r.severity === "info").length;

  return {
    results,
    valid: errors === 0,
    counts: { errors, warnings, info },
  };
}

// ── Individual Checks ──────────────────────────────────────────────────

function checkHasUsableData(m: MoasureMeasurement): MoasureValidationResult {
  const hasArea = m.area_sqft !== null && m.area_sqft > 0;
  const hasPerimeter = m.perimeter_lft !== null && m.perimeter_lft > 0;
  const hasVolume = m.volume_cuyd !== null && m.volume_cuyd > 0;
  const hasSegments = m.segments.length > 0;
  const hasPoints = m.points.length > 0;

  const hasAnything = hasArea || hasPerimeter || hasVolume || hasSegments || hasPoints;

  return {
    check: "has_usable_data",
    severity: "error",
    message: hasAnything
      ? "Measurement contains usable data"
      : "Measurement contains no usable data — no area, perimeter, volume, segments, or points found",
    passed: hasAnything,
  };
}

function checkAreaBounds(m: MoasureMeasurement): MoasureValidationResult {
  if (m.area_sqft === null) {
    return {
      check: "area_bounds",
      severity: "info",
      message: "No area data in measurement",
      passed: true,
    };
  }

  if (m.area_sqft < BOUNDS.MIN_AREA_SQFT) {
    return {
      check: "area_bounds",
      severity: "error",
      message: `Area ${m.area_sqft} sq ft is below minimum (${BOUNDS.MIN_AREA_SQFT} sq ft)`,
      passed: false,
    };
  }

  if (m.area_sqft > BOUNDS.MAX_AREA_SQFT) {
    return {
      check: "area_bounds",
      severity: "warning",
      message: `Area ${m.area_sqft} sq ft exceeds typical residential max (${BOUNDS.MAX_AREA_SQFT.toLocaleString()} sq ft)`,
      passed: false,
    };
  }

  return {
    check: "area_bounds",
    severity: "info",
    message: `Area ${m.area_sqft} sq ft is within expected range`,
    passed: true,
  };
}

function checkPerimeterBounds(m: MoasureMeasurement): MoasureValidationResult {
  if (m.perimeter_lft === null) {
    return {
      check: "perimeter_bounds",
      severity: "info",
      message: "No perimeter data in measurement",
      passed: true,
    };
  }

  if (m.perimeter_lft > BOUNDS.MAX_PERIMETER_LFT) {
    return {
      check: "perimeter_bounds",
      severity: "warning",
      message: `Perimeter ${m.perimeter_lft} LF exceeds typical residential max (${BOUNDS.MAX_PERIMETER_LFT.toLocaleString()} LF)`,
      passed: false,
    };
  }

  return {
    check: "perimeter_bounds",
    severity: "info",
    message: `Perimeter ${m.perimeter_lft} LF is within expected range`,
    passed: true,
  };
}

function checkElevationBounds(m: MoasureMeasurement): MoasureValidationResult {
  if (m.elevation_change_ft === null) {
    return {
      check: "elevation_bounds",
      severity: "info",
      message: "No elevation data in measurement",
      passed: true,
    };
  }

  const absElev = Math.abs(m.elevation_change_ft);
  if (absElev > BOUNDS.MAX_ELEVATION_FT) {
    return {
      check: "elevation_bounds",
      severity: "warning",
      message: `Elevation change ${m.elevation_change_ft} ft exceeds typical max (${BOUNDS.MAX_ELEVATION_FT} ft)`,
      passed: false,
    };
  }

  return {
    check: "elevation_bounds",
    severity: "info",
    message: `Elevation change ${m.elevation_change_ft} ft is within expected range`,
    passed: true,
  };
}

function checkVolumeBounds(m: MoasureMeasurement): MoasureValidationResult {
  if (m.volume_cuyd === null) {
    return {
      check: "volume_bounds",
      severity: "info",
      message: "No volume data in measurement",
      passed: true,
    };
  }

  if (m.volume_cuyd <= 0) {
    return {
      check: "volume_bounds",
      severity: "error",
      message: `Volume ${m.volume_cuyd} cu yd is not positive`,
      passed: false,
    };
  }

  if (m.volume_cuyd > BOUNDS.MAX_VOLUME_CUYD) {
    return {
      check: "volume_bounds",
      severity: "warning",
      message: `Volume ${m.volume_cuyd} cu yd exceeds typical max (${BOUNDS.MAX_VOLUME_CUYD.toLocaleString()} cu yd)`,
      passed: false,
    };
  }

  return {
    check: "volume_bounds",
    severity: "info",
    message: `Volume ${m.volume_cuyd} cu yd is within expected range`,
    passed: true,
  };
}

function checkSegmentIntegrity(m: MoasureMeasurement): MoasureValidationResult {
  if (m.segments.length === 0) {
    return {
      check: "segment_integrity",
      severity: "info",
      message: "No segment data in measurement",
      passed: true,
    };
  }

  const badSegments = m.segments.filter(
    (s) => s.length_ft < BOUNDS.MIN_SEGMENT_LENGTH_FT || s.length_ft > BOUNDS.MAX_SEGMENT_LENGTH_FT,
  );

  if (badSegments.length > 0) {
    return {
      check: "segment_integrity",
      severity: "warning",
      message: `${badSegments.length} segment(s) outside expected range (${BOUNDS.MIN_SEGMENT_LENGTH_FT}–${BOUNDS.MAX_SEGMENT_LENGTH_FT} ft)`,
      passed: false,
    };
  }

  return {
    check: "segment_integrity",
    severity: "info",
    message: `All ${m.segments.length} segments within expected range`,
    passed: true,
  };
}

/**
 * Check that area and perimeter are roughly consistent with each other.
 * For a square, area = (perimeter/4)^2. Real shapes will differ, but
 * extreme ratios suggest a data problem.
 */
function checkAreaPerimeterConsistency(m: MoasureMeasurement): MoasureValidationResult {
  if (m.area_sqft === null || m.perimeter_lft === null || m.perimeter_lft === 0) {
    return {
      check: "area_perimeter_consistency",
      severity: "info",
      message: "Cannot check area/perimeter consistency — missing data",
      passed: true,
    };
  }

  // For a circle (most efficient shape), area = perimeter^2 / (4*pi)
  // Max possible area for a given perimeter
  const maxPossibleArea = (m.perimeter_lft * m.perimeter_lft) / (4 * Math.PI);

  if (m.area_sqft > maxPossibleArea * 1.1) {
    // 10% tolerance for floating point
    return {
      check: "area_perimeter_consistency",
      severity: "warning",
      message: `Area (${m.area_sqft} sq ft) is geometrically impossible for perimeter (${m.perimeter_lft} LF) — max possible is ${Math.round(maxPossibleArea)} sq ft`,
      passed: false,
    };
  }

  return {
    check: "area_perimeter_consistency",
    severity: "info",
    message: "Area and perimeter are geometrically consistent",
    passed: true,
  };
}

function checkLayerConsistency(m: MoasureMeasurement): MoasureValidationResult {
  if (m.layers.length === 0) {
    return {
      check: "layer_consistency",
      severity: "info",
      message: "No layer data in measurement",
      passed: true,
    };
  }

  // If we have both total area and layers, check that layers sum to roughly the total
  if (m.area_sqft !== null) {
    const layerSum = m.layers.reduce((sum, l) => sum + l.area_sqft, 0);
    if (layerSum > 0) {
      const ratio = layerSum / m.area_sqft;
      if (ratio < 0.5 || ratio > 2.0) {
        return {
          check: "layer_consistency",
          severity: "warning",
          message: `Layer areas sum to ${Math.round(layerSum)} sq ft but total area is ${m.area_sqft} sq ft — significant mismatch`,
          passed: false,
        };
      }
    }
  }

  return {
    check: "layer_consistency",
    severity: "info",
    message: `${m.layers.length} layer(s) are consistent`,
    passed: true,
  };
}

function checkDeviceModel(m: MoasureMeasurement): MoasureValidationResult {
  const knownModels = ["Moasure 2 PRO", "Moasure 2", "Moasure LX1"];
  const isKnown = knownModels.includes(m.device_model);

  return {
    check: "device_model",
    severity: "info",
    message: isKnown
      ? `Known device: ${m.device_model}`
      : `Unknown device model: "${m.device_model}" — data may still be valid`,
    passed: true, // Unknown model is not an error, just informational
  };
}
