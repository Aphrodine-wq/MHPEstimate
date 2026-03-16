# Moasure Import Integration — ProEstimate AI

**MS Home Pros** | Version 1.0 | March 8, 2026 | DRAFT — Internal

---

## 1. Purpose

This document describes how to add Moasure file import support to ProEstimate AI so that estimators can import device-captured measurements directly into estimates instead of typing them in manually.

---

## 2. The Problem

Estimators currently enter measurements by hand — typed into the Electron app, dictated to Alex, or keyed from handwritten notes. This causes transcription errors, struggles with irregular shapes, and a disconnect between what was measured in the field and what ends up in the estimate. Moasure captures area, perimeter, volume, and elevation data by walking the space and exports it as structured files we can parse.

---

## 3. What We're Building

A file import feature in the Electron app and web dashboard that accepts Moasure export files and auto-populates measurement fields on an estimate.

```
Moasure Device  →  Moasure App (export file)  →  ProEstimate AI (import + parse)
```

That's it. No live API sync, no voice integration — just a clean import pathway.

---

## 4. Import Flow

```
1. Estimator measures the job site with Moasure 2 PRO (or LX1 when available)

2. Moasure app generates an export file (DXF, CSV, or JSON)

3. Estimator opens ProEstimate AI → starts or opens an estimate
   → clicks "Import Moasure Measurements"

4. Selects the Moasure export file from their device

5. Parser extracts:
   - Total area (sq ft)
   - Perimeter (linear ft)
   - Elevation changes (ft)
   - Individual segment lengths
   - Volume (cubic yards), if applicable

6. Extracted data auto-populates the estimate measurement fields

7. Estimator reviews, adjusts waste factors, and continues as normal
```

---

## 5. Supported Export Formats

| Format | What It Contains | How We Parse It |
|--------|-----------------|-----------------|
| **CSV** | Area, perimeter, coordinates, elevation | Direct field mapping — lightweight and preferred |
| **DXF** | Full geometric data, polylines, layers | `dxf-parser` npm package to extract coordinates and compute area/perimeter |
| **JSON** | Structured measurement objects (if available) | Direct deserialization — ideal |

Note: The exact fields and structure of Moasure's exports need to be confirmed with a physical unit. This is a Day 1 task during the evaluation phase.

---

## 6. Where It Lives in the Codebase

New modules inside the existing estimation engine package:

```
packages/
  estimation-engine/
    src/
      importers/
        moasure-parser.ts       # Parses Moasure export files
        moasure-mapper.ts       # Maps parsed data → estimate line items
        moasure-validator.ts    # Validates data integrity before import
```

---

## 7. UI Changes

**Electron App (Estimate Builder):**

- "Import Moasure Measurements" button in the measurements section
- File picker accepts `.csv`, `.dxf`, `.json`
- Preview panel showing the imported area/shape before applying
- Source tag on line items: "Measured with Moasure 2 PRO" for traceability

**Web Dashboard (Estimate Detail Page):**

- Drag-and-drop upload zone for Moasure files
- Measurement source indicator (manual vs. Moasure) in the estimate view

---

## 8. Mapping Moasure Data to Project Types

| Project Type | Moasure Data Used | What It Populates |
|-------------|-------------------|-------------------|
| Flooring | Area (sq ft) | Material quantity + waste factor |
| Decking / Patio | Area + elevation | Surface material + slope adjustments |
| Fencing | Perimeter (linear ft) | Panel count + post count |
| Painting (exterior) | Area per wall | Paint gallons (area ÷ coverage rate) |
| Roofing | Area + pitch/elevation | Squares + pitch factor |
| Landscaping | Area + volume (cu yd) | Sod / mulch / gravel quantities |
| Excavation / Grading | Volume + elevation | Cut/fill quantities |
| Concrete / Asphalt | Area + volume | Material volume at depth |

---

## 9. Implementation Plan

| Phase | Timeline | What Happens |
|-------|----------|-------------|
| **Evaluation** | Weeks 1–2 | Buy 1 Moasure 2 PRO Kit. Test on 5 active jobs. Document the exact export file formats. Compare accuracy against tape/laser. |
| **Build** | Weeks 3–5 | Build the parser, mapper, and validator. Add import UI to Electron app and web dashboard. QA with real field data from the evaluation phase. |
| **Rollout** | Week 6 | Deploy to production. Train estimators. Run side-by-side with traditional methods for 2 weeks to build confidence. |

---

## 10. Hardware

| Item | Qty | Purpose |
|------|-----|---------|
| Moasure 2 PRO Kit | 1 (to start) | Outdoor job sites — decks, fencing, patios, landscaping |
| Moasure LX1 | 1 (when available) | Indoor floor plans — kitchens, bathrooms, basements |

Start with one unit, validate the workflow, then expand to the rest of the team.

---

## 11. Risks

| Risk | Mitigation |
|------|------------|
| Export format changes between firmware versions | Version-check in the parser; pin to known-good format |
| No public documentation on export file structure | Hands-on testing with a purchased unit during evaluation |
| Team pushback ("I'm faster with my tape") | Side-by-side comparisons on real jobs to show time savings |
| LX1 not yet available for indoor work | Not blocking — Moasure 2 PRO covers outdoor use cases now |

---

## 12. Open Questions

1. What are the exact fields and structure of Moasure's CSV and DXF exports? (Answered by purchasing a unit and testing.)
2. Does Moasure offer any developer documentation or partnership program for integrators?
3. When is the LX1 expected to ship, and can we get early access?

---

## 13. Recommendation

Buy one Moasure 2 PRO Kit this week and start field testing. That gives us real export files to build the parser against and costs nothing in engineering time. The import feature itself is a 2–3 week build once we know the file formats.
