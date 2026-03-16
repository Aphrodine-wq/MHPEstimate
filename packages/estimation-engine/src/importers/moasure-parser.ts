/**
 * Moasure File Parser
 *
 * Parses measurement export files from Moasure devices (Moasure 2 PRO, LX1)
 * into a unified MoasureMeasurement structure that can be mapped to estimate
 * line items.
 *
 * Supported formats:
 *   - CSV  — Moasure's tabular export (area, perimeter, segments, elevation)
 *   - DXF  — CAD polyline export (coordinates parsed → area/perimeter computed)
 *   - JSON — Structured measurement export (direct deserialization)
 */

// ── Types ──────────────────────────────────────────────────────────────

export interface MoasureSegment {
  /** Length of this segment in feet */
  length_ft: number;
  /** Bearing in degrees (0 = north, 90 = east) */
  bearing_deg: number | null;
}

export interface MoasureLayer {
  /** Layer / zone / room name */
  name: string;
  /** Area of this layer in square feet */
  area_sqft: number;
}

export interface MoasurePoint {
  x: number;
  y: number;
  z: number;
}

export interface MoasurePath {
  /** Path index (from Moasure export) */
  index: number;
  /** Path type — "Dot2Dot" is the perimeter outline, "PointsPath" is interior grid */
  type: string;
  /** Points in this path */
  points: MoasurePoint[];
}

export interface MoasureMeasurement {
  /** Source device model */
  device_model: "Moasure 2 PRO" | "Moasure 2" | "Moasure LX1" | string;
  /** Total area in square feet */
  area_sqft: number | null;
  /** Total perimeter in linear feet */
  perimeter_lft: number | null;
  /** Total elevation change in feet */
  elevation_change_ft: number | null;
  /** Volume in cubic yards (grading/excavation) */
  volume_cuyd: number | null;
  /** Individual perimeter segments */
  segments: MoasureSegment[];
  /** Named layers / zones / rooms */
  layers: MoasureLayer[];
  /** Raw coordinate points (from DXF or detailed exports) */
  points: MoasurePoint[];
  /** Grouped paths from Moasure export (perimeter vs interior) */
  paths: MoasurePath[];
  /** The original file format that was parsed */
  source_format: "csv" | "dxf" | "json";
  /** Raw file content preserved for audit trail */
  raw_content: string;
}

export type MoasureFileFormat = "csv" | "dxf" | "json";

export class MoasureParseError extends Error {
  constructor(
    message: string,
    public readonly format: MoasureFileFormat,
    public readonly details?: string,
  ) {
    super(message);
    this.name = "MoasureParseError";
  }
}

// ── Main Parser ────────────────────────────────────────────────────────

/**
 * Detect file format from content or extension and parse accordingly.
 */
export function parseMoasureFile(
  content: string,
  filenameOrFormat?: string,
): MoasureMeasurement {
  const format = detectFormat(content, filenameOrFormat);

  switch (format) {
    case "csv":
      return parseCsv(content);
    case "dxf":
      return parseDxf(content);
    case "json":
      return parseJson(content);
    default:
      throw new MoasureParseError(
        `Unsupported file format: ${format}`,
        format as MoasureFileFormat,
      );
  }
}

/**
 * Detect format from file extension or content sniffing.
 */
export function detectFormat(
  content: string,
  filenameOrFormat?: string,
): MoasureFileFormat {
  // If an explicit format or extension hint is provided, use it
  if (filenameOrFormat) {
    const lower = filenameOrFormat.toLowerCase().trim();
    if (lower === "csv" || lower.endsWith(".csv")) return "csv";
    if (lower === "dxf" || lower.endsWith(".dxf")) return "dxf";
    if (lower === "json" || lower.endsWith(".json")) return "json";
  }

  // Content sniffing
  const trimmed = content.trimStart();

  // JSON starts with { or [
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) return "json";

  // DXF files start with a section marker (line "0" followed by "SECTION")
  if (/^\s*0\s*\n\s*SECTION/i.test(trimmed)) return "dxf";

  // Default to CSV for anything else (comma/tab separated)
  return "csv";
}

// ── CSV Parser ─────────────────────────────────────────────────────────

/**
 * Parse Moasure CSV export.
 *
 * Expected columns (flexible — we match by header name):
 *   Point, X, Y, Z, Distance, Bearing, Area, Perimeter, Elevation, Volume, Layer
 *
 * The parser handles both:
 *   - Summary rows (single row with totals: area, perimeter, volume)
 *   - Point-by-point rows (one row per measured point with X, Y, Z)
 */
function parseCsv(content: string): MoasureMeasurement {
  const lines = content
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 2) {
    throw new MoasureParseError(
      "CSV file must have at least a header row and one data row",
      "csv",
    );
  }

  // Normalize headers: strip unit suffixes (":ft", ":ft²") and convert hyphens to underscores
  // so real Moasure columns like "X:ft", "Area:ft²", "Path-Type" become "x", "area", "path_type"
  const rawHeaders = parseCSVRow(lines[0]!).map((h) => h.toLowerCase().trim());
  const headers = rawHeaders.map(normalizeHeader);
  const rows = lines.slice(1).map((line) => {
    const values = parseCSVRow(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      if (h) row[h] = values[i] ?? "";
    });
    return row;
  });

  // Extract what we can from each row
  const segments: MoasureSegment[] = [];
  const allPoints: MoasurePoint[] = [];
  const pathMap = new Map<string, { type: string; points: MoasurePoint[] }>();
  const layerMap = new Map<string, number>();

  let totalArea: number | null = null;
  let totalPerimeter: number | null = null;
  let totalElevation: number | null = null;
  let totalVolume: number | null = null;
  let deviceModel = "Moasure 2 PRO";

  for (const row of rows) {
    // Check for device model in a "device" or "model" column
    const model = row["device"] || row["model"] || row["device_model"];
    if (model) deviceModel = model;

    // Point coordinates
    const x = parseFloat(row["x"] ?? "");
    const y = parseFloat(row["y"] ?? "");
    const z = parseFloat(row["z"] ?? "");
    if (!isNaN(x) && !isNaN(y)) {
      const point: MoasurePoint = { x, y, z: isNaN(z) ? 0 : z };
      allPoints.push(point);

      // Group points by path index and track path type (Dot2Dot vs PointsPath)
      const pathIdx = row["path"] ?? "";
      const pathType = row["path_type"] ?? "";
      if (pathIdx) {
        const key = pathIdx;
        if (!pathMap.has(key)) {
          pathMap.set(key, { type: pathType, points: [] });
        }
        pathMap.get(key)!.points.push(point);
      }
    }

    // Segment data
    const dist = parseFloat(row["distance"] ?? row["length"] ?? row["segment_length"] ?? "");
    const bearing = parseFloat(row["bearing"] ?? row["bearing_deg"] ?? "");
    if (!isNaN(dist) && dist > 0) {
      segments.push({
        length_ft: dist,
        bearing_deg: isNaN(bearing) ? null : bearing,
      });
    }

    // Summary fields — take the last non-empty value found
    const area = parseFloat(row["area"] ?? row["area_sqft"] ?? row["total_area"] ?? "");
    if (!isNaN(area) && area > 0) totalArea = area;

    const perim = parseFloat(
      row["perimeter"] ?? row["perimeter_lft"] ?? row["total_perimeter"] ?? "",
    );
    if (!isNaN(perim) && perim > 0) totalPerimeter = perim;

    const elev = parseFloat(
      row["elevation"] ?? row["elevation_change"] ?? row["elevation_change_ft"] ?? "",
    );
    if (!isNaN(elev)) totalElevation = elev;

    const vol = parseFloat(row["volume"] ?? row["volume_cuyd"] ?? "");
    if (!isNaN(vol) && vol > 0) totalVolume = vol;

    // Layers — prefer "layer_name" (from "Layer-Name") over numeric "layer" column
    const layerName = row["layer_name"] ?? row["layer"] ?? row["zone"] ?? row["room"] ?? "";
    const layerArea = parseFloat(row["layer_area"] ?? row["zone_area"] ?? "");
    if (layerName && !/^\d+$/.test(layerName)) {
      layerMap.set(layerName, isNaN(layerArea) ? 0 : layerArea);
    }
  }

  // Build paths array
  const paths: MoasurePath[] = Array.from(pathMap.entries()).map(([idx, data]) => ({
    index: parseInt(idx, 10) || 0,
    type: data.type,
    points: data.points,
  }));

  // Use Dot2Dot (perimeter outline) points for area/perimeter if available,
  // otherwise fall back to all points
  const perimeterPath = paths.find((p) => p.type.toLowerCase() === "dot2dot");
  const calcPoints = perimeterPath && perimeterPath.points.length >= 3
    ? perimeterPath.points
    : allPoints;

  // If we have points but no explicit perimeter, compute from segments
  if (totalPerimeter === null && segments.length > 0) {
    totalPerimeter = segments.reduce((sum, s) => sum + s.length_ft, 0);
  }

  // If we have points but no area, compute from coordinates using shoelace formula
  if (totalArea === null && calcPoints.length >= 3) {
    totalArea = computeAreaFromPoints(calcPoints);
  }

  // If we have points but no perimeter, compute from coordinate distances
  if (totalPerimeter === null && calcPoints.length >= 2) {
    totalPerimeter = computePerimeterFromPoints(calcPoints);
  }

  // Compute elevation change from all points (not just perimeter)
  if (totalElevation === null && allPoints.length >= 2) {
    const zValues = allPoints.map((p) => p.z);
    const zRange = Math.max(...zValues) - Math.min(...zValues);
    if (zRange > 0.01) {
      totalElevation = round2(zRange);
    }
  }

  const layers: MoasureLayer[] = Array.from(layerMap.entries()).map(([name, area_sqft]) => ({
    name,
    area_sqft,
  }));

  return {
    device_model: deviceModel,
    area_sqft: totalArea,
    perimeter_lft: totalPerimeter,
    elevation_change_ft: totalElevation,
    volume_cuyd: totalVolume,
    segments,
    layers,
    points: allPoints,
    paths,
    source_format: "csv",
    raw_content: content,
  };
}

/** Simple CSV row parser that handles quoted fields */
function parseCSVRow(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

/**
 * Normalize a CSV header name from Moasure export format.
 * Strips unit suffixes (":ft", ":ft²", ":m") and converts hyphens to underscores.
 * Examples: "X:ft" → "x", "Area:ft²" → "area", "Path-Type" → "path_type"
 */
function normalizeHeader(header: string): string {
  return header
    .replace(/:[a-z0-9²]+$/i, "") // strip unit suffixes
    .replace(/-/g, "_"); // hyphens to underscores
}

// ── DXF Parser ─────────────────────────────────────────────────────────

/**
 * Parse Moasure DXF export.
 *
 * Extracts LWPOLYLINE and POLYLINE entities to get vertex coordinates,
 * then computes area and perimeter via the shoelace formula and
 * point-to-point distances.
 *
 * This is a lightweight parser — it does not attempt to handle the full
 * DXF spec, only the subset Moasure uses for measurement exports.
 */
function parseDxf(content: string): MoasureMeasurement {
  const points = extractDxfPolylinePoints(content);

  if (points.length < 2) {
    throw new MoasureParseError(
      "DXF file does not contain enough polyline vertices to form a measurement",
      "dxf",
      `Found ${points.length} points`,
    );
  }

  const area = points.length >= 3 ? computeAreaFromPoints(points) : null;
  const perimeter = computePerimeterFromPoints(points);

  // Compute elevation change (max Z - min Z) using all points
  const zValues = points.map((p) => p.z);
  const hasVariedZ = zValues.some((z) => z !== zValues[0]);
  const elevationChange = hasVariedZ
    ? Math.max(...zValues) - Math.min(...zValues)
    : null;

  // Build segments from consecutive points
  const segments: MoasureSegment[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const dx = points[i + 1]!.x - points[i]!.x;
    const dy = points[i + 1]!.y - points[i]!.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    const bearing = (Math.atan2(dx, dy) * 180) / Math.PI;
    segments.push({
      length_ft: round2(length),
      bearing_deg: round2((bearing + 360) % 360),
    });
  }

  return {
    device_model: "Moasure 2 PRO",
    area_sqft: area,
    perimeter_lft: perimeter,
    elevation_change_ft: elevationChange ? round2(elevationChange) : null,
    volume_cuyd: null,
    segments,
    layers: [],
    points,
    paths: [{ index: 1, type: "polyline", points }],
    source_format: "dxf",
    raw_content: content,
  };
}

/**
 * Extract polyline vertex coordinates from DXF content.
 * Handles LWPOLYLINE (group codes 10/20/30) and POLYLINE→VERTEX entities.
 */
function extractDxfPolylinePoints(content: string): MoasurePoint[] {
  const points: MoasurePoint[] = [];
  const lines = content.split(/\r?\n/).map((l) => l.trim());

  let inLwPolyline = false;
  let inVertex = false;
  let currentX: number | null = null;
  let currentY: number | null = null;
  let currentZ: number | null = null;

  for (let i = 0; i < lines.length - 1; i++) {
    const code = lines[i]!.trim();
    const value = lines[i + 1]?.trim() ?? "";

    // Detect LWPOLYLINE entity
    if (code === "0" && value === "LWPOLYLINE") {
      inLwPolyline = true;
      inVertex = false;
      continue;
    }

    // Detect VERTEX entity (inside POLYLINE)
    if (code === "0" && value === "VERTEX") {
      // Flush previous vertex
      if (inVertex && currentX !== null && currentY !== null) {
        points.push({ x: currentX, y: currentY, z: currentZ ?? 0 });
      }
      inVertex = true;
      currentX = null;
      currentY = null;
      currentZ = null;
      continue;
    }

    // End of entity
    if (code === "0" && value !== "LWPOLYLINE" && value !== "VERTEX") {
      // Flush last vertex
      if (inVertex && currentX !== null && currentY !== null) {
        points.push({ x: currentX, y: currentY, z: currentZ ?? 0 });
      }
      // Flush last LWPOLYLINE point
      if (inLwPolyline && currentX !== null && currentY !== null) {
        points.push({ x: currentX, y: currentY, z: currentZ ?? 0 });
        currentX = null;
        currentY = null;
        currentZ = null;
      }
      if (value !== "POLYLINE") {
        inLwPolyline = false;
      }
      inVertex = false;
      continue;
    }

    // Capture coordinates
    if (inLwPolyline || inVertex) {
      if (code === "10") {
        // Flush previous point for LWPOLYLINE (each 10 starts a new vertex)
        if (inLwPolyline && currentX !== null && currentY !== null) {
          points.push({ x: currentX, y: currentY, z: currentZ ?? 0 });
          currentZ = null;
        }
        currentX = parseFloat(value);
      } else if (code === "20") {
        currentY = parseFloat(value);
      } else if (code === "30") {
        currentZ = parseFloat(value);
      }
    }
  }

  // Flush final point
  if ((inLwPolyline || inVertex) && currentX !== null && currentY !== null) {
    points.push({ x: currentX, y: currentY, z: currentZ ?? 0 });
  }

  return points;
}

// ── JSON Parser ────────────────────────────────────────────────────────

/**
 * Parse Moasure JSON export.
 *
 * Accepts a flexible schema — fields are matched by common key names.
 */
function parseJson(content: string): MoasureMeasurement {
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(content);
  } catch {
    throw new MoasureParseError("Invalid JSON content", "json");
  }

  // Handle wrapper objects (e.g., { "measurement": { ... } } or { "data": { ... } })
  if (data["measurement"] && typeof data["measurement"] === "object") {
    data = { ...data, ...(data["measurement"] as Record<string, unknown>) };
  }
  if (data["data"] && typeof data["data"] === "object") {
    data = { ...data, ...(data["data"] as Record<string, unknown>) };
  }

  const area = toNumber(data["area_sqft"] ?? data["area"] ?? data["total_area"]);
  const perimeter = toNumber(data["perimeter_lft"] ?? data["perimeter"] ?? data["total_perimeter"]);
  const elevation = toNumber(
    data["elevation_change_ft"] ?? data["elevation_change"] ?? data["elevation"],
  );
  const volume = toNumber(data["volume_cuyd"] ?? data["volume"]);
  const deviceModel =
    (data["device_model"] as string) ?? (data["device"] as string) ?? "Moasure 2 PRO";

  // Parse segments
  const rawSegments = data["segments"] as Array<Record<string, unknown>> | undefined;
  const segments: MoasureSegment[] = (rawSegments ?? []).map((s) => ({
    length_ft: toNumber(s["length_ft"] ?? s["length"] ?? s["distance"]) ?? 0,
    bearing_deg: toNumber(s["bearing_deg"] ?? s["bearing"]),
  }));

  // Parse layers
  const rawLayers = data["layers"] as Array<Record<string, unknown>> | undefined;
  const layers: MoasureLayer[] = (rawLayers ?? []).map((l) => ({
    name: String(l["name"] ?? "Unnamed"),
    area_sqft: toNumber(l["area_sqft"] ?? l["area"]) ?? 0,
  }));

  // Parse points
  const rawPoints = data["points"] as Array<Record<string, unknown>> | undefined;
  const points: MoasurePoint[] = (rawPoints ?? []).map((p) => ({
    x: toNumber(p["x"]) ?? 0,
    y: toNumber(p["y"]) ?? 0,
    z: toNumber(p["z"]) ?? 0,
  }));

  return {
    device_model: deviceModel,
    area_sqft: area,
    perimeter_lft: perimeter,
    elevation_change_ft: elevation,
    volume_cuyd: volume,
    segments,
    layers,
    points,
    paths: points.length > 0 ? [{ index: 1, type: "points", points }] : [],
    source_format: "json",
    raw_content: content,
  };
}

// ── Geometry Helpers ───────────────────────────────────────────────────

/**
 * Compute area from 2D points using the shoelace formula.
 * Returns absolute area in the same units as the coordinates (sq ft).
 */
function computeAreaFromPoints(points: MoasurePoint[]): number {
  if (points.length < 3) return 0;

  let area = 0;
  const n = points.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += points[i]!.x * points[j]!.y;
    area -= points[j]!.x * points[i]!.y;
  }

  return round2(Math.abs(area) / 2);
}

/**
 * Compute perimeter from consecutive 2D points.
 * Includes closing segment (last point → first point).
 */
function computePerimeterFromPoints(points: MoasurePoint[]): number {
  if (points.length < 2) return 0;

  let perimeter = 0;
  for (let i = 0; i < points.length; i++) {
    const next = points[(i + 1) % points.length]!;
    const dx = next.x - points[i]!.x;
    const dy = next.y - points[i]!.y;
    perimeter += Math.sqrt(dx * dx + dy * dy);
  }

  return round2(perimeter);
}

// ── Utilities ──────────────────────────────────────────────────────────

function toNumber(val: unknown): number | null {
  if (val === null || val === undefined) return null;
  const n = Number(val);
  return isNaN(n) ? null : n;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
