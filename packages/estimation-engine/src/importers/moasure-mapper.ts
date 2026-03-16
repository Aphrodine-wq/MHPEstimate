/**
 * Moasure → Estimate Mapper
 *
 * Maps a parsed MoasureMeasurement to estimate field values that can be
 * applied to ProEstimate AI line items. The mapper knows which Moasure
 * data points map to which project types and measurement fields.
 */

import { PROJECT_TYPES, type ProjectType } from "@proestimate/shared/constants";
import type { MoasureMeasurement } from "./moasure-parser";

// ── Types ──────────────────────────────────────────────────────────────

export interface MoasureMappedField {
  /** The estimate field this maps to (e.g., "quantity", "area", "linear_footage") */
  field: string;
  /** The value extracted from Moasure data */
  value: number;
  /** Human-readable unit */
  unit: string;
  /** Where the value came from */
  source: "area" | "perimeter" | "elevation" | "volume" | "segment" | "layer" | "computed";
  /** Confidence in the mapping */
  confidence: "high" | "medium" | "low";
}

export interface MoasureMapping {
  /** The project type this mapping applies to */
  project_type: ProjectType | string;
  /** Fields mapped from the measurement */
  fields: MoasureMappedField[];
  /** Measurement metadata for audit trail */
  metadata: {
    device_model: string;
    source_format: string;
    total_segments: number;
    total_layers: number;
    has_elevation: boolean;
    has_volume: boolean;
  };
}

// ── Mapping Rules ──────────────────────────────────────────────────────

/**
 * Defines which Moasure data feeds into which project type fields.
 * Each rule is a function that examines the measurement and returns
 * mapped fields if relevant data is present.
 */
type MappingRule = (m: MoasureMeasurement) => MoasureMappedField[];

const PROJECT_MAPPING_RULES: Record<string, MappingRule> = {
  // ── Outdoor / Area-Based ──

  deck: (m) => {
    const fields: MoasureMappedField[] = [];
    if (m.area_sqft !== null) {
      fields.push({
        field: "decking_area_sqft",
        value: m.area_sqft,
        unit: "sq ft",
        source: "area",
        confidence: "high",
      });
    }
    if (m.elevation_change_ft !== null) {
      fields.push({
        field: "elevation_change_ft",
        value: m.elevation_change_ft,
        unit: "ft",
        source: "elevation",
        confidence: "high",
      });
    }
    if (m.perimeter_lft !== null) {
      fields.push({
        field: "railing_linear_ft",
        value: m.perimeter_lft,
        unit: "LF",
        source: "perimeter",
        confidence: "medium",
      });
    }
    return fields;
  },

  porch: (m) => {
    const fields: MoasureMappedField[] = [];
    if (m.area_sqft !== null) {
      fields.push({
        field: "porch_area_sqft",
        value: m.area_sqft,
        unit: "sq ft",
        source: "area",
        confidence: "high",
      });
    }
    if (m.perimeter_lft !== null) {
      fields.push({
        field: "railing_linear_ft",
        value: m.perimeter_lft,
        unit: "LF",
        source: "perimeter",
        confidence: "medium",
      });
    }
    return fields;
  },

  fencing: (m) => {
    const fields: MoasureMappedField[] = [];
    if (m.perimeter_lft !== null) {
      fields.push({
        field: "fence_linear_ft",
        value: m.perimeter_lft,
        unit: "LF",
        source: "perimeter",
        confidence: "high",
      });
      // Compute post count: one post every 8 ft (standard spacing)
      const postCount = Math.ceil(m.perimeter_lft / 8) + 1;
      fields.push({
        field: "post_count",
        value: postCount,
        unit: "EA",
        source: "computed",
        confidence: "medium",
      });
      // Compute panel count: one panel per 8 ft section
      const panelCount = Math.ceil(m.perimeter_lft / 8);
      fields.push({
        field: "panel_count",
        value: panelCount,
        unit: "EA",
        source: "computed",
        confidence: "medium",
      });
    }
    return fields;
  },

  roofing: (m) => {
    const fields: MoasureMappedField[] = [];
    if (m.area_sqft !== null) {
      fields.push({
        field: "roof_area_sqft",
        value: m.area_sqft,
        unit: "sq ft",
        source: "area",
        confidence: "high",
      });
      // Compute squares (1 roofing square = 100 sq ft)
      fields.push({
        field: "roofing_squares",
        value: Math.ceil(m.area_sqft / 100),
        unit: "squares",
        source: "computed",
        confidence: "high",
      });
    }
    if (m.elevation_change_ft !== null) {
      fields.push({
        field: "pitch_rise_ft",
        value: m.elevation_change_ft,
        unit: "ft",
        source: "elevation",
        confidence: "low",
      });
    }
    return fields;
  },

  concrete_hardscape: (m) => {
    const fields: MoasureMappedField[] = [];
    if (m.area_sqft !== null) {
      fields.push({
        field: "surface_area_sqft",
        value: m.area_sqft,
        unit: "sq ft",
        source: "area",
        confidence: "high",
      });
    }
    if (m.volume_cuyd !== null) {
      fields.push({
        field: "concrete_volume_cuyd",
        value: m.volume_cuyd,
        unit: "cu yd",
        source: "volume",
        confidence: "high",
      });
    }
    if (m.perimeter_lft !== null) {
      fields.push({
        field: "form_linear_ft",
        value: m.perimeter_lft,
        unit: "LF",
        source: "perimeter",
        confidence: "high",
      });
    }
    return fields;
  },

  retaining_wall: (m) => {
    const fields: MoasureMappedField[] = [];
    if (m.perimeter_lft !== null) {
      fields.push({
        field: "wall_linear_ft",
        value: m.perimeter_lft,
        unit: "LF",
        source: "perimeter",
        confidence: "high",
      });
    }
    if (m.elevation_change_ft !== null) {
      fields.push({
        field: "wall_height_ft",
        value: m.elevation_change_ft,
        unit: "ft",
        source: "elevation",
        confidence: "medium",
      });
    }
    return fields;
  },

  painting: (m) => {
    const fields: MoasureMappedField[] = [];
    if (m.area_sqft !== null) {
      fields.push({
        field: "paint_area_sqft",
        value: m.area_sqft,
        unit: "sq ft",
        source: "area",
        confidence: "high",
      });
      // Compute gallons (1 gallon covers ~350 sq ft)
      fields.push({
        field: "paint_gallons",
        value: Math.ceil(m.area_sqft / 350),
        unit: "gal",
        source: "computed",
        confidence: "medium",
      });
    }
    return fields;
  },

  // ── Indoor / Renovation ──

  kitchen_renovation: (m) => {
    const fields: MoasureMappedField[] = [];
    if (m.area_sqft !== null) {
      fields.push({
        field: "floor_area_sqft",
        value: m.area_sqft,
        unit: "sq ft",
        source: "area",
        confidence: "high",
      });
    }
    if (m.perimeter_lft !== null) {
      fields.push({
        field: "cabinet_wall_linear_ft",
        value: m.perimeter_lft,
        unit: "LF",
        source: "perimeter",
        confidence: "low",
      });
    }
    // Map individual layers to zones (e.g., "Kitchen", "Pantry")
    for (const layer of m.layers) {
      fields.push({
        field: `zone_${sanitizeFieldName(layer.name)}_sqft`,
        value: layer.area_sqft,
        unit: "sq ft",
        source: "layer",
        confidence: "medium",
      });
    }
    return fields;
  },

  bathroom_renovation: (m) => {
    const fields: MoasureMappedField[] = [];
    if (m.area_sqft !== null) {
      fields.push({
        field: "floor_area_sqft",
        value: m.area_sqft,
        unit: "sq ft",
        source: "area",
        confidence: "high",
      });
    }
    if (m.perimeter_lft !== null) {
      fields.push({
        field: "wall_linear_ft",
        value: m.perimeter_lft,
        unit: "LF",
        source: "perimeter",
        confidence: "high",
      });
    }
    return fields;
  },

  addition_remodel: (m) => {
    const fields: MoasureMappedField[] = [];
    if (m.area_sqft !== null) {
      fields.push({
        field: "addition_area_sqft",
        value: m.area_sqft,
        unit: "sq ft",
        source: "area",
        confidence: "high",
      });
    }
    if (m.perimeter_lft !== null) {
      fields.push({
        field: "foundation_linear_ft",
        value: m.perimeter_lft,
        unit: "LF",
        source: "perimeter",
        confidence: "medium",
      });
    }
    for (const layer of m.layers) {
      fields.push({
        field: `zone_${sanitizeFieldName(layer.name)}_sqft`,
        value: layer.area_sqft,
        unit: "sq ft",
        source: "layer",
        confidence: "medium",
      });
    }
    return fields;
  },

  new_build: (m) => {
    const fields: MoasureMappedField[] = [];
    if (m.area_sqft !== null) {
      fields.push({
        field: "pad_area_sqft",
        value: m.area_sqft,
        unit: "sq ft",
        source: "area",
        confidence: "high",
      });
    }
    if (m.perimeter_lft !== null) {
      fields.push({
        field: "foundation_linear_ft",
        value: m.perimeter_lft,
        unit: "LF",
        source: "perimeter",
        confidence: "high",
      });
    }
    if (m.elevation_change_ft !== null) {
      fields.push({
        field: "site_elevation_change_ft",
        value: m.elevation_change_ft,
        unit: "ft",
        source: "elevation",
        confidence: "high",
      });
    }
    if (m.volume_cuyd !== null) {
      fields.push({
        field: "excavation_volume_cuyd",
        value: m.volume_cuyd,
        unit: "cu yd",
        source: "volume",
        confidence: "high",
      });
    }
    return fields;
  },

  infrastructure: (m) => {
    const fields: MoasureMappedField[] = [];
    if (m.area_sqft !== null) {
      fields.push({
        field: "site_area_sqft",
        value: m.area_sqft,
        unit: "sq ft",
        source: "area",
        confidence: "high",
      });
    }
    if (m.perimeter_lft !== null) {
      fields.push({
        field: "site_perimeter_lft",
        value: m.perimeter_lft,
        unit: "LF",
        source: "perimeter",
        confidence: "high",
      });
    }
    if (m.elevation_change_ft !== null) {
      fields.push({
        field: "elevation_change_ft",
        value: m.elevation_change_ft,
        unit: "ft",
        source: "elevation",
        confidence: "high",
      });
    }
    if (m.volume_cuyd !== null) {
      fields.push({
        field: "fill_volume_cuyd",
        value: m.volume_cuyd,
        unit: "cu yd",
        source: "volume",
        confidence: "high",
      });
    }
    return fields;
  },

  garage_carport: (m) => {
    const fields: MoasureMappedField[] = [];
    if (m.area_sqft !== null) {
      fields.push({
        field: "floor_area_sqft",
        value: m.area_sqft,
        unit: "sq ft",
        source: "area",
        confidence: "high",
      });
    }
    if (m.perimeter_lft !== null) {
      fields.push({
        field: "foundation_linear_ft",
        value: m.perimeter_lft,
        unit: "LF",
        source: "perimeter",
        confidence: "medium",
      });
    }
    return fields;
  },
};

// ── Main Mapper ────────────────────────────────────────────────────────

/**
 * Map a Moasure measurement to estimate fields for a given project type.
 *
 * If no project-specific rules exist, falls back to a generic mapping
 * that exposes area, perimeter, elevation, and volume as raw fields.
 */
export function mapMoasureToEstimate(
  measurement: MoasureMeasurement,
  projectType: ProjectType | string,
): MoasureMapping {
  const rulesFn = PROJECT_MAPPING_RULES[projectType];
  const fields = rulesFn
    ? rulesFn(measurement)
    : buildGenericMapping(measurement);

  return {
    project_type: projectType,
    fields,
    metadata: {
      device_model: measurement.device_model,
      source_format: measurement.source_format,
      total_segments: measurement.segments.length,
      total_layers: measurement.layers.length,
      has_elevation: measurement.elevation_change_ft !== null,
      has_volume: measurement.volume_cuyd !== null,
    },
  };
}

/**
 * Get all project types that have specific mapping rules.
 */
export function getSupportedProjectTypes(): string[] {
  return Object.keys(PROJECT_MAPPING_RULES);
}

// ── Generic Fallback ───────────────────────────────────────────────────

function buildGenericMapping(m: MoasureMeasurement): MoasureMappedField[] {
  const fields: MoasureMappedField[] = [];

  if (m.area_sqft !== null) {
    fields.push({
      field: "area_sqft",
      value: m.area_sqft,
      unit: "sq ft",
      source: "area",
      confidence: "medium",
    });
  }
  if (m.perimeter_lft !== null) {
    fields.push({
      field: "perimeter_lft",
      value: m.perimeter_lft,
      unit: "LF",
      source: "perimeter",
      confidence: "medium",
    });
  }
  if (m.elevation_change_ft !== null) {
    fields.push({
      field: "elevation_change_ft",
      value: m.elevation_change_ft,
      unit: "ft",
      source: "elevation",
      confidence: "medium",
    });
  }
  if (m.volume_cuyd !== null) {
    fields.push({
      field: "volume_cuyd",
      value: m.volume_cuyd,
      unit: "cu yd",
      source: "volume",
      confidence: "medium",
    });
  }

  return fields;
}

// ── Utilities ──────────────────────────────────────────────────────────

function sanitizeFieldName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}
