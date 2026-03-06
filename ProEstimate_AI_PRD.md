# ProEstimate AI — Product Requirements Document

**MS Home Pros** | Version 1.0.0 | March 6, 2026 | DRAFT — Internal Confidential

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [System Architecture Overview](#2-system-architecture-overview)
3. [Voice AI & Telephony System](#3-voice-ai--telephony-system)
4. [Pricing Intelligence System](#4-pricing-intelligence-system)
5. [Estimation Engine (Core)](#5-estimation-engine-core)
6. [Estimate Document Package](#6-estimate-document-package)
7. [Continuous Learning System](#7-continuous-learning-system)
8. [Electron Desktop Application](#8-electron-desktop-application)
9. [Web Dashboard](#9-web-dashboard)
10. [Database Schema (Supabase)](#10-database-schema-supabase)
11. [Authentication & Authorization](#11-authentication--authorization)
12. [API Design](#12-api-design)
13. [Hosting & Deployment (Vercel)](#13-hosting--deployment-vercel)
14. [Integration Map](#14-integration-map)
15. [Development Phases & Roadmap](#15-development-phases--roadmap)
16. [Non-Functional Requirements](#16-non-functional-requirements)
17. [Risk Register](#17-risk-register)
18. [Appendix — Alex Agent Prompt Reference](#18-appendix--alex-agent-prompt-reference)

---

## 1. Executive Summary

ProEstimate AI is a custom-built, AI-powered estimation platform designed exclusively for MS Home Pros. The system combines a conversational voice AI agent ("Alex") with real-time material pricing, automated document generation, and continuous machine learning to produce professional, margin-optimized project estimates in a fraction of the time required by traditional methods.

The platform will be delivered as two primary interfaces:

- **Electron Desktop Application** — For estimators and field staff. Includes a one-tap "Call Alex" button, estimate builder, material lookup, and invoice upload.
- **Next.js Web Dashboard** — Hosted on Vercel. For leadership, project managers, and administrative review. Includes estimate review queues, pricing analytics, team performance, and learning system oversight.

All data will be persisted in **Supabase** (PostgreSQL + real-time subscriptions + file storage), ensuring a single source of truth across every touchpoint.

The voice AI component, already operational on **ElevenLabs**, will be extended with **Twilio**-powered inbound and outbound phone capabilities, enabling estimators to call in from the field, receive instant ballpark pricing, and trigger full estimate generation workflows entirely by voice.

### 1.1 Vision Statement

> To build the fastest, most accurate, and most profitable estimation engine in residential home improvement — one that learns from every job, adapts to real-time market pricing, and empowers every team member to produce client-ready estimates with confidence.

### 1.2 Key Outcomes

- Reduce average estimate creation time from 2–4 hours to **under 30 minutes**
- Improve gross margin consistency to **32–42%** across all project types
- Eliminate the top 15 estimation errors through **automated validation**
- Provide **real-time, location-adjusted material pricing** from Home Depot, Lowe's, and local supplier invoices
- Generate **complete, presentation-ready estimate packages**: Cover Sheet, Table of Contents, Scope of Service, Line-Item Estimates, Pricing Schedules, Terms & Conditions
- Enable **voice-driven estimation** from any phone via Twilio + ElevenLabs integration
- **Continuously improve** pricing accuracy through feedback loops and job-completion data

### 1.3 Target Users

| Role | Primary Use Case | Interface |
|------|-----------------|-----------|
| Estimators | Build, revise, and review estimates; voice-call Alex from the field | Electron App + Phone |
| Project Managers | Review estimate queues, track active jobs, manage change orders | Web Dashboard |
| Field Technicians | Access material lists, project specs, and job-site instructions | Electron App (read-only views) |
| Sales Representatives | Quick ballparks for leads, estimate presentation prep | Electron App + Phone |
| Leadership / Owners | Revenue reporting, margin analytics, team performance, pricing trends | Web Dashboard |

---

## 2. System Architecture Overview

The ProEstimate AI platform follows a modular, event-driven architecture with clear separation between the voice/phone layer, the estimation engine, the pricing intelligence layer, the learning system, and the client-facing interfaces.

### 2.1 Architecture Layers

| Layer | Components | Hosting |
|-------|-----------|---------|
| **Voice & Phone** | ElevenLabs Conversational AI, Twilio Programmable Voice, WebSocket bridge | ElevenLabs Cloud / Twilio |
| **Estimation Engine** | Alex AI Agent (Claude API), Prompt Orchestration, Template Engine, Validation Pipeline | Vercel Serverless Functions |
| **Pricing Intelligence** | Home Depot scraper, Lowe's scraper, Invoice OCR pipeline, Price normalization engine | Vercel Cron + Supabase Edge Functions |
| **Data & Storage** | Supabase PostgreSQL, Supabase Storage (files/PDFs), Supabase Realtime, Row-Level Security | Supabase Cloud |
| **Client Interfaces** | Electron Desktop App, Next.js Web Dashboard, PDF/DOCX generation service | Local (Electron) / Vercel (Web) |

### 2.2 Technology Stack

| Category | Technology | Rationale |
|----------|-----------|-----------|
| Frontend (Web) | Next.js 14+ (App Router), React 18, Tailwind CSS, shadcn/ui | SSR, API routes, Vercel-native deployment |
| Frontend (Desktop) | Electron 28+, React, Tailwind CSS, electron-builder | Cross-platform desktop with native OS integration |
| Backend / API | Vercel Serverless Functions (Node.js), Supabase Edge Functions (Deno) | Zero-infra serverless, auto-scaling |
| Database | Supabase PostgreSQL 15+, pgvector extension | Relational + vector search for ML, real-time subscriptions |
| File Storage | Supabase Storage (S3-compatible) | PDF/DOCX estimate storage, invoice uploads |
| Voice AI | ElevenLabs Conversational AI (existing agent) | Already built and operational |
| Phone / Telephony | Twilio Programmable Voice, Twilio Phone Numbers | Inbound/outbound calling, call recording |
| AI / LLM | Anthropic Claude API (primary), OpenAI GPT-4o (fallback) | Estimation reasoning, document generation |
| PDF Generation | Puppeteer (HTML→PDF), @react-pdf/renderer | Pixel-perfect estimate documents |
| OCR | Tesseract.js, Google Document AI | Invoice data extraction |
| Auth | Supabase Auth (email + magic link) | Team-only access, role-based |
| CI/CD | GitHub Actions, Vercel Git Integration | Automated testing and deployment |
| Monitoring | Vercel Analytics, Supabase Dashboard, Sentry | Error tracking, performance monitoring |

### 2.3 Data Flow Diagram (Logical)

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────────┐
│   ESTIMATOR      │     │   TWILIO          │     │   ELEVENLABS        │
│   (Phone/App)    │────▶│   Media Streams   │────▶│   Conversational AI │
└────────┬────────┘     └──────────────────┘     │   (Alex Agent)      │
         │                                        └──────────┬──────────┘
         │                                                   │
         │  ┌────────────────────────────────────────────────┘
         │  │  Function Calls (pricing lookup, estimate creation)
         ▼  ▼
┌─────────────────────────────────────────────────────────────────┐
│                    VERCEL API LAYER                              │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────────┐  │
│  │ Estimation   │  │ Pricing      │  │ Document Generation   │  │
│  │ Engine       │  │ Service      │  │ Service (PDF/DOCX)    │  │
│  └──────┬───────┘  └──────┬───────┘  └───────────┬───────────┘  │
└─────────┼─────────────────┼──────────────────────┼──────────────┘
          │                 │                      │
          ▼                 ▼                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                      SUPABASE                                   │
│  ┌──────────┐  ┌───────────┐  ┌──────────┐  ┌───────────────┐  │
│  │ Postgres │  │ Realtime  │  │ Storage  │  │ Edge Functions│  │
│  │ (Data)   │  │ (Live UI) │  │ (Files)  │  │ (Cron/OCR)   │  │
│  └──────────┘  └───────────┘  └──────────┘  └───────────────┘  │
└─────────────────────────────────────────────────────────────────┘
          │                 │
          ▼                 ▼
┌──────────────────┐  ┌──────────────────┐
│  ELECTRON APP    │  │  WEB DASHBOARD   │
│  (Desktop)       │  │  (Vercel/Next.js)│
└──────────────────┘  └──────────────────┘
```

---

## 3. Voice AI & Telephony System

The voice system is the primary field interface for estimators. It enables hands-free estimation from a truck, a job site, or a client's kitchen. The ElevenLabs conversational AI agent (Alex) is already built and operational. This section defines how to extend it with Twilio phone integration and connect it to the estimation engine backend.

### 3.1 ElevenLabs Agent (Existing)

- **Agent Name:** Alex
- **Personality:** Sharp estimator, warm, witty. Uses nickname rotation (Twin / Big Dawg / Chief).
- **Capabilities:** Ballpark pricing, scope definition, material takeoff assistance, estimate review, coaching, encouragement
- **Current Deployment:** ElevenLabs hosted conversational AI with the custom system prompt (see Appendix)
- **Voice Model:** Custom-tuned ElevenLabs voice (male, professional, conversational)

### 3.2 Twilio Integration

Twilio provides the telephone layer connecting the voice AI to the public phone network.

#### 3.2.1 Phone Number Provisioning

- Provision 1–3 dedicated Twilio phone numbers for ProEstimate AI
- **Primary number:** Estimation hotline (team-facing only, not published to clients)
- **Secondary number (Phase 2):** Outbound callback for estimate follow-ups
- Numbers should be local area codes matching MS Home Pros service regions

#### 3.2.2 Inbound Call Flow

```
1. Estimator dials ProEstimate AI phone number
   (or taps "Call Alex" in Electron app)
        │
2. Twilio receives inbound call → triggers webhook → Vercel API
        │
3. API authenticates caller (caller ID lookup against team_members in Supabase)
        │
4. API opens WebSocket bridge:  Twilio Media Streams  ⟷  ElevenLabs Conversational AI
        │
5. Alex greets caller with context:
   - Recent estimates in progress
   - Current active jobs
   - Time-of-day appropriate greeting
        │
6. Conversation proceeds with REAL-TIME FUNCTION CALLING:
   - Query pricing database
   - Create draft estimate
   - Look up project history
   - Calculate material quantities
   - Run margin analysis
        │
7. On call end, system saves to Supabase:
   - Full call transcript
   - Extracted estimate data (structured JSON)
   - Draft estimates created during the call
   - Call recording (if enabled)
        │
8. Post-call processing:
   - Structured data written to estimates table
   - Draft estimates appear in dashboard review queue
   - Learning system logs interaction data
```

#### 3.2.3 Twilio Configuration

| Feature | Configuration | Notes |
|---------|--------------|-------|
| Media Streams | Enabled, bidirectional, 16-bit PCM mulaw | Required for real-time AI voice |
| Call Recording | Optional, per team preference | Stored in Supabase Storage |
| Caller ID Lookup | Match against `team_members` table | Reject unknown callers → voicemail |
| Fallback | If ElevenLabs unreachable → play message + voicemail | High availability |
| Concurrent Calls | Up to 5 simultaneous | Verify ElevenLabs concurrency limits |
| Max Call Duration | 30 minutes (configurable) | Prevent runaway charges |

#### 3.2.4 ElevenLabs ↔ Twilio WebSocket Bridge

The bridge is a Vercel serverless function (or long-running edge function) that:

- Receives raw audio from Twilio Media Streams (mulaw 8kHz)
- Upsamples/converts to format expected by ElevenLabs WebSocket API
- Forwards to ElevenLabs, receives generated speech audio
- Converts back to mulaw and pushes to Twilio Media Stream
- Intercepts function-call events from ElevenLabs to execute backend operations (pricing lookups, estimate creation)
- Logs all events for transcript generation

### 3.3 In-App Call Button (Electron)

The Electron app includes a prominent "Call Alex" floating action button:

- **WebRTC connection** directly to ElevenLabs Conversational AI WebSocket (bypasses Twilio — lower latency, no per-minute cost)
- Push-to-talk and always-on mic modes
- Visual waveform / voice activity indicator
- Real-time transcript panel alongside voice call
- One-click "Save as Estimate Draft" from conversation context
- "Quick Actions" triggered by voice: "Create new estimate," "Look up pricing for [material]," "What's my margin on [project]?"

### 3.4 Function Calling Schema (Alex → Backend)

During a conversation, Alex can invoke these backend functions in real-time:

| Function | Parameters | Returns |
|----------|-----------|---------|
| `get_material_price` | product_name, category, quantity | unit_price, source, last_updated |
| `create_draft_estimate` | project_type, client_name, scope_notes | estimate_id, status |
| `add_line_item` | estimate_id, category, description, qty, unit, unit_price | line_item_id |
| `calculate_labor` | project_type, sq_ft, complexity | crew_size, days, total_cost |
| `get_ballpark` | project_type, size, grade | low_range, high_range, assumptions |
| `lookup_estimate` | estimate_id or client_name | estimate summary |
| `check_margin` | estimate_id | gross_margin_pct, markup_pct, recommendation |
| `run_validation` | estimate_id | checklist results (15 checks) |

---

## 4. Pricing Intelligence System

Accurate pricing is the backbone of every estimate. ProEstimate AI maintains a continuously updated pricing database sourced from three channels: Home Depot, Lowe's, and company supplier invoices.

### 4.1 Home Depot Integration

- **Method:** Automated web scraping (no official contractor API available)
- **Target Categories:** Flooring (LVP, tile, hardwood), Countertops, Cabinetry, Paint, Roofing, Lumber, Plumbing fixtures, Electrical, Hardware
- **Data per product:** SKU, product name, price (regular + sale), unit of measure, local store availability, brand, specifications
- **Refresh cadence:** Weekly full scan; daily delta scan for top-100 most-used products
- **Location awareness:** Pull prices for the 2–3 closest Home Depot stores to MS Home Pros service area
- **Compliance:** Respect robots.txt, rate-limit all requests, cache aggressively, store pricing data only (no images/descriptions beyond what's needed for matching)

### 4.2 Lowe's Integration

Mirrors the Home Depot integration with equivalent category coverage.

- Same data fields and refresh cadence as Home Depot
- **Cross-reference engine:** Auto-maps equivalent products between HD and Lowe's for comparison
- **Best-price recommendation:** When generating estimates, suggests the lowest-cost source per line item

### 4.3 Invoice OCR Pipeline

The most accurate pricing comes from the company's own purchase history.

#### Processing Workflow

```
1. UPLOAD
   Team member uploads invoice (PDF, photo, scan)
   via Electron app or web dashboard
        │
2. OCR EXTRACTION
   Tesseract.js for standard invoices
   Google Document AI for complex/multi-column layouts
        │
3. AI PARSING
   Claude API receives raw OCR text → extracts structured data:
   - Supplier name and contact
   - Invoice date and number
   - Line items: product, quantity, unit price, total
   - Tax, shipping, discounts
        │
4. NORMALIZATION
   Products fuzzy-matched to master product catalog
   AI classification for new/unmatched items
        │
5. STORAGE
   Normalized data → pricing_history table
   Original file → Supabase Storage
        │
6. HUMAN REVIEW
   Low-confidence items flagged in dashboard review queue
   Team member confirms/corrects → system learns
```

### 4.4 Price Normalization Engine

All pricing data from all three sources flows through a normalization layer:

| Input | Processing | Output |
|-------|-----------|--------|
| Home Depot retail price | Apply estimated contractor discount (5–10%) | Adjusted retail benchmark |
| Lowe's retail price | Apply estimated contractor discount (5–10%) | Adjusted retail benchmark |
| Invoice actual cost | Weighted average of last 3 purchases | Actual cost basis |
| **All sources combined** | **Weighted blend: 60% actual cost, 20% HD, 20% Lowe's** (if no actuals: 50/50 HD/Lowe's) | **Unified product cost** |

### 4.5 Price Staleness Rules

| Age of Price Data | Action |
|-------------------|--------|
| 0–30 days | Green — use confidently |
| 31–60 days | Yellow — use with note: "verify current pricing" |
| 61–90 days | Orange — trigger re-scrape; warn estimator |
| 90+ days | Red — do not auto-populate; require manual price entry or fresh lookup |

---

## 5. Estimation Engine (Core)

The estimation engine is the heart of the platform. It takes project parameters (type, scope, measurements, material selections, site conditions) and produces a complete, line-itemized estimate with materials, labor, markup, contingency, and a professional document package.

### 5.1 Estimate Generation Workflow

```
1.  INPUT COLLECTION
    Source: Voice call (Alex), Electron app form, or web dashboard form
          │
2.  PROJECT CLASSIFICATION
    AI identifies project type → loads appropriate estimation template
          │
3.  SCOPE DEFINITION
    AI walks through scope checklist for project type
    Ensures: demo, install, modifications, exclusions all captured
          │
4.  MATERIAL TAKEOFF
    Quantities auto-calculated from measurements
    Waste factors applied automatically per material type
          │
5.  MATERIAL PRICING
    Each line item priced from unified pricing database (Section 4)
    Source and freshness noted per item
          │
6.  LABOR CALCULATION
    Crew size, duration, rates from productivity benchmarks
    Adjusted for complexity, access, season, crew history
          │
7.  MARKUP & MARGIN
    Company standard markups applied per category
    Margin validated against targets (30–45% gross)
          │
8.  CONTINGENCY
    Auto-added based on project type + risk profile
    Remodel: 10–25%  |  New construction: 5–10%
          │
9.  VALIDATION
    Automated 15-point error detection checklist
    Each check returns: PASS / WARN / FAIL
          │
10. DOCUMENT GENERATION
    Full estimate package rendered as PDF (optionally DOCX)
          │
11. REVIEW QUEUE
    Estimate enters dashboard for human approval
          │
12. DELIVERY
    Approved → email/text to client, or print for in-person
```

### 5.2 Project Type Templates

Each project type loads a pre-configured template with the relevant scope checklist, material categories, labor benchmarks, and waste factors:

| Project Type | Key Scope Items | Default Waste Factor | Default Contingency |
|-------------|----------------|---------------------|-------------------|
| Kitchen Remodel | Cabinets (LF), countertops (SF), backsplash, flooring, plumbing points, electrical circuits, demo, island Y/N | 10–15% | 15–20% |
| Bathroom Renovation | Shower/tub type, tile SF (floor + walls), vanity, plumbing fixtures, waterproofing, heated floor Y/N | 15% (tile) | 15–20% |
| Flooring | Total SF, material type, rooms, transitions, stairs, subfloor condition, demo | 10% (plank), 15% (tile/diagonal) | 10% |
| Painting | Rooms, ceiling height, trim LF, doors, windows, cabinet painting, exterior SF, prep level | 10% | 10% |
| Roofing | Squares, pitch, tear-off layers, valleys, dormers, flashing, ventilation | 5% (shingles) | 10–15% |
| Windows & Doors | Count, sizes, types, material, energy rating, trim, structural mods | N/A | 10% |
| Deck / Patio | SF, material, height, railing LF, stairs, footings, permits | 10% | 10–15% |
| Siding | Exterior wall SF, stories, material, trim/soffit/fascia, insulation | 10% | 10% |
| Basement Finishing | SF, ceiling height, moisture, egress, bathroom add, HVAC, electrical | 10% | 15–25% |

### 5.3 Automated Validation — 15-Point Checklist

Before any estimate is marked ready for review, the system runs an automated validation pass:

| # | Validation Check | Severity |
|---|-----------------|----------|
| 1 | Demo and haul-away costs included | **FAIL** if missing |
| 2 | Waste factor applied to all material quantities (10–15%) | WARN if missing |
| 3 | Labor contingency applied (10–25% based on project type) | WARN if < 10% |
| 4 | Permit costs included (when scope requires permits) | **FAIL** if applicable and missing |
| 5 | Material lead times noted in timeline | WARN if custom items without lead times |
| 6 | Final cleanup line item present | WARN if missing |
| 7 | Contingency line item present for remodels | **FAIL** if remodel without contingency |
| 8 | Material pricing less than 90 days old | WARN if older |
| 9 | Mobilization and travel costs accounted for | WARN if missing |
| 10 | Dumpster/disposal costs included (demo projects) | **FAIL** if demo without disposal |
| 11 | Paint prep labor adequate (min 60% of paint labor total) | WARN if below threshold |
| 12 | Transitions and trim counted for flooring projects | WARN if zero |
| 13 | Access difficulty factor applied (multi-story, tight access) | WARN if not assessed |
| 14 | Small fixtures/accessories itemized (bathroom projects) | WARN if missing |
| 15 | Exclusions section populated | **FAIL** if empty |

### 5.4 Margin Guardrails

The engine enforces margin guardrails to prevent underpriced estimates:

| Metric | Minimum | Target | Alert Trigger |
|--------|---------|--------|--------------|
| Gross Margin | 25% | 35–42% | Below 28% = hard warning |
| Material Markup | 10% | 15–20% | Below 10% = flag |
| Labor Markup | 15% | 20–30% | Below 15% = flag |
| Subcontractor Markup | 10% | 10–15% | Below 10% = flag |
| Small Job Premium (< $2K) | 25% markup | 30–35% | Below 25% = flag |
| Rush Job Premium | 15% adder | 20–25% | Not applied = flag |

---

## 6. Estimate Document Package

Every generated estimate produces a complete, professional, branded document package.

### 6.1 Cover Sheet

- Company logo, name, address, phone, email, website, license number
- Client name, address, phone, email
- Project name and address (if different from client)
- Estimate number: `EST-YYYY-XXXX` (auto-generated, sequential)
- Date prepared + valid-through date (default: 30 days)
- Prepared by (estimator name and title)
- **Prominent summary total** (styled, large font)
- Project type badge/label

### 6.2 Table of Contents

Auto-generated with page numbers linking to each section. Updates dynamically when sections are added/removed.

### 6.3 Scope of Service

- **Project Overview:** Narrative description of all work, organized by trade/phase
- **Inclusions:** Explicit, itemized list of everything covered
- **Exclusions:** Explicit list of everything NOT included — this is critical for scope creep protection. Examples:
  - "This estimate does not include: appliance purchase, window treatments, furniture moving, landscaping restoration, asbestos/lead abatement (if discovered), or work behind finished walls beyond the defined scope."
- **Site Conditions & Assumptions:** e.g., "Estimate assumes standard subfloor in good condition. Additional costs may apply if subfloor repair is required."
- **Permit Requirements:** Which permits are needed, who pulls them, cost included Y/N
- **Projected Timeline:** Start date, milestone dates, completion target, material lead time callouts

### 6.4 Detailed Estimate (Line Items)

Full line-item table:

| Column | Description | Example |
|--------|------------|---------|
| Line # | Sequential number | 1, 2, 3... |
| Category | Trade or work category | Demo, Flooring, Plumbing |
| Description | Detailed item/work description | LVP Flooring — Shaw Endura Plus, Color: Oyster |
| Quantity | Measured quantity | 1,200 |
| Unit | Unit of measure | sq ft, ea, lf, hr |
| Unit Price | Price per unit | $5.75 |
| Extended Price | Qty × Unit Price | $6,900.00 |
| Notes | Specs, waste factor, source | Includes 10% waste factor |

Grouped by category with subtotals per group.

### 6.5 Pricing Schedule / Summary

- Materials subtotal
- Labor subtotal
- Subcontractor costs (if applicable)
- Permits and fees
- Overhead and profit (shown as line item for transparency)
- Contingency allowance (line item with percentage noted)
- Sales tax (where applicable)
- **Grand Total**
- **Good / Better / Best options** (when configured — three columns showing scope and price at each tier)

### 6.6 Payment Schedule

| Milestone | Percentage | Trigger |
|-----------|-----------|---------|
| Deposit | 25–33% | Upon signed acceptance |
| Progress Payment 1 | 25–33% | Completion of demo + rough-in |
| Progress Payment 2 | 25% | Completion of installation |
| Final Payment | Balance | Final walkthrough + punch list completion |

### 6.7 Terms & Conditions

- Change order process and pricing (any scope change requires written change order with cost impact, signed before work begins)
- Warranty: Workmanship warranty period, material manufacturer warranties passed through
- Cancellation and refund policy
- Insurance and licensing information
- Dispute resolution
- Signature blocks (client + company representative)
- Estimate validity period (30 days default)

### 6.8 Document Generation Technical Details

| Format | Engine | Use Case |
|--------|--------|----------|
| PDF (primary) | Puppeteer rendering an HTML/React template → PDF | Client delivery, printing, email |
| DOCX (optional) | docx-js (Node.js) | When client or team needs editable version |
| HTML (preview) | React component rendered in-app | In-dashboard preview before PDF export |

Templates are stored as React components in the codebase with Tailwind CSS styling. Company branding (colors, logo, fonts) is configurable in Supabase `company_settings` table.

---

## 7. Continuous Learning System

ProEstimate AI is not a static tool. It learns from every estimate, every completed job, every price fluctuation, and every piece of team feedback.

### 7.1 Pricing Accuracy Feedback Loop

When a job is completed, the system compares estimated vs. actual costs:

- **Estimate vs. Actual comparison:** Material costs, labor hours, sub costs, total project cost
- **Variance tracking:** % over/under for each line item category
- **Auto-adjustment trigger:** If actuals consistently deviate >10% in a category over 5+ jobs, flag for recalibration
- **Trend analysis:** Track pricing trends quarterly/annually to anticipate cost shifts

### 7.2 Labor Productivity Learning

- Track actual crew-hours per unit of work vs. estimated hours
- Build **crew-specific productivity profiles** (e.g., "Crew A installs flooring 15% faster than average")
- **Seasonal adjustment:** Learn that exterior work takes ~20% longer in winter
- **Complexity scoring:** Refine difficulty multipliers from actual project data

### 7.3 Estimate Win/Loss Analysis

- Track which estimates convert to signed jobs and which don't
- Analyze: Was price the deciding factor? Was scope mismatched? Was follow-up delayed?
- **Competitive pricing intelligence:** If estimates in a price range consistently lose, adjust strategy recommendations
- Feed conversion data back into Alex's coaching prompts

### 7.4 AI Model Fine-Tuning

- Collect structured estimation data: inputs → outputs → actual outcomes
- Use this data to fine-tune prompt templates quarterly
- Build a **vector database** (pgvector in Supabase) of past estimates for semantic similarity search
- When building a new estimate, retrieve the 3–5 most similar past projects as reference points
- Track Alex's accuracy on ballpark estimates vs. final detailed estimates

### 7.5 Learning Dashboard Metrics

| Metric | Description | Update Frequency |
|--------|------------|-----------------|
| Pricing Accuracy Score | Avg % deviation of estimated vs. actual material costs | Per completed job |
| Labor Accuracy Score | Avg % deviation of estimated vs. actual labor hours | Per completed job |
| Estimate Win Rate | % of sent estimates that convert to signed contracts | Weekly |
| Margin Consistency | Std deviation of actual gross margin across jobs | Monthly |
| Validation Pass Rate | % of estimates passing all 15 checks on first run | Per estimate |
| Price Freshness | % of catalog with pricing < 30 days old | Daily |
| Alex Ballpark Accuracy | % of voice ballparks within 15% of final estimate | Per estimate |

---

## 8. Electron Desktop Application

### 8.1 Overview

The Electron app is the primary tool for estimators and field staff. It runs on macOS and Windows, works offline for core functions, and syncs with Supabase when connected.

### 8.2 Core Screens & Features

#### 8.2.1 Home / Dashboard

- Active estimates in progress (with status badges: Draft, In Review, Sent, Accepted, Declined)
- Today's scheduled site visits
- Quick-action cards: New Estimate, Quick Ballpark, Upload Invoice, Call Alex
- Notifications: Estimate approvals, price alerts, change order requests

#### 8.2.2 Call Alex (Voice Interface)

- **Floating action button** (always visible, bottom-right) — one tap to start a voice session
- WebRTC direct connection to ElevenLabs (no Twilio needed in-app)
- Split-screen: Left = waveform + controls, Right = live transcript
- During call, Alex's function calls are visualized: "Looking up LVP pricing..." → result shown
- Post-call summary card with extracted data and "Create Estimate from Call" button
- Call history with searchable transcripts

#### 8.2.3 Estimate Builder

- Step-by-step wizard matching the estimation engine workflow:
  1. Project Type selection (visual cards)
  2. Client Information (name, address, contact — auto-complete from Supabase)
  3. Scope Definition (checklist UI, pre-populated per project type)
  4. Measurements Input (room-by-room, with SF/LF calculators)
  5. Material Selection (searchable catalog with real-time pricing, tier badges: Budget/Mid/Premium)
  6. Labor Configuration (crew size, days, rate — with AI-suggested defaults)
  7. Markup & Margin (sliders with real-time total recalculation)
  8. Review & Validate (15-point checklist with pass/warn/fail indicators)
  9. Generate & Send (PDF preview, email/text delivery, print)
- **Good / Better / Best toggle:** One-click to generate three-tier pricing options
- **AI Assist button** on every step: Ask Alex for help without leaving the form

#### 8.2.4 Material Pricing Lookup

- Searchable product catalog with unified pricing
- Filter by: category, supplier, price range, freshness
- Price comparison view: Home Depot vs. Lowe's vs. Invoice cost (side-by-side)
- Price history chart per product (last 12 months)
- "Add to Estimate" button to push a product into an active estimate

#### 8.2.5 Invoice Upload

- Drag-and-drop or camera capture (mobile companion app, Phase 3)
- OCR processing with progress indicator
- Extracted data review/edit screen
- "Confirm & Save" to push to pricing database
- Upload history with status (Processed, Pending Review, Error)

#### 8.2.6 Estimate Library

- All estimates, searchable and filterable
- Status filters: Draft, In Review, Sent, Accepted, Declined, Expired
- Sort by: date, client, amount, margin, project type
- Duplicate estimate (for similar projects)
- Version history (every save creates a version)

#### 8.2.7 Settings

- User profile and notification preferences
- Company branding (logo, colors, default terms)
- Default markup and margin targets
- Twilio phone number display
- Offline mode configuration

### 8.3 Offline Capabilities

| Feature | Offline Support | Sync Behavior |
|---------|----------------|---------------|
| Estimate Builder | Yes (cached pricing, last-synced catalog) | Syncs on reconnect |
| Material Lookup | Partial (cached catalog, no live pricing) | Refreshes on reconnect |
| Voice Call (Alex) | No (requires internet) | N/A |
| Invoice Upload | Queue locally, process on reconnect | Auto-processes queued items |
| Estimate Library | Read-only (cached) | Full sync on reconnect |

### 8.4 Electron Technical Requirements

- **Framework:** Electron 28+ with Electron Forge for build tooling
- **Renderer:** React 18 + Tailwind CSS (shared component library with web dashboard)
- **IPC:** Secure main↔renderer process communication for file system access, native notifications
- **Auto-update:** electron-updater with Vercel-hosted release artifacts
- **Local DB:** SQLite (via better-sqlite3) for offline cache, syncs with Supabase
- **Installers:** DMG (macOS), NSIS (Windows), AppImage (Linux optional)
- **Code signing:** Required for macOS notarization and Windows SmartScreen

---

## 9. Web Dashboard

### 9.1 Overview

The web dashboard is the management and review interface, hosted on Vercel as a Next.js application. It provides oversight, analytics, and administrative functions that don't need to be in the desktop app.

### 9.2 Core Screens & Features

#### 9.2.1 Dashboard Home

- KPI cards: Revenue this month, estimates sent, win rate, avg margin, avg estimate time
- Estimate pipeline visualization (funnel: Draft → Review → Sent → Accepted)
- Recent activity feed (new estimates, approvals, price alerts)
- Team leaderboard (estimates completed, revenue generated, win rate)

#### 9.2.2 Estimate Review Queue

- List of estimates awaiting review with priority indicators
- Validation checklist results inline (expand to see all 15 checks)
- One-click approve, request revision (with comments), or reject
- Side-by-side comparison with similar past estimates
- Margin analysis overlay
- "Send to Client" workflow: choose delivery method (email, text, print), customize message

#### 9.2.3 Pricing Analytics

- Material price trends over time (interactive charts)
- Price comparison: HD vs. Lowe's vs. Invoice cost by category
- Stale pricing alerts (items > 60 days without update)
- Most-used materials leaderboard
- Cost variance reports: estimated vs. actual, by category and project type

#### 9.2.4 Learning & Performance

- Estimate accuracy dashboard (estimated vs. actual, trending over time)
- Labor productivity reports by crew and project type
- Win/loss analysis with drill-down
- Alex usage metrics: calls per day, avg call length, estimates generated from calls
- Model confidence scores and recalibration recommendations

#### 9.2.5 Team Management

- Team roster with roles and permissions
- Call log (Twilio): who called, when, duration, transcript links
- Estimate assignment and workload distribution
- Performance metrics per estimator

#### 9.2.6 Client Management

- Client directory (synced from estimates)
- Estimate history per client
- Follow-up reminders and status tracking
- Client communication log

#### 9.2.7 Settings & Configuration

- Company profile and branding
- Default markup/margin targets by project type
- Estimate template customization
- Terms & conditions editor
- Twilio phone number management
- User roles and permissions
- Invoice OCR confidence thresholds
- Price freshness thresholds

### 9.3 Web Dashboard Technical Requirements

- **Framework:** Next.js 14+ (App Router)
- **UI:** React 18, Tailwind CSS, shadcn/ui component library
- **Charts:** Recharts or Chart.js for analytics
- **Real-time:** Supabase Realtime subscriptions for live estimate status updates
- **Auth:** Supabase Auth with RLS policies
- **Deployment:** Vercel (automatic from `main` branch)

---

## 10. Database Schema (Supabase)

### 10.1 Core Tables

```sql
-- ═══════════════════════════════════════
-- TEAM & AUTH
-- ═══════════════════════════════════════

CREATE TABLE team_members (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_id         UUID REFERENCES auth.users(id),
    full_name       TEXT NOT NULL,
    email           TEXT UNIQUE NOT NULL,
    phone           TEXT,
    role            TEXT CHECK (role IN ('estimator','pm','field_tech','sales','admin','owner')),
    is_active       BOOLEAN DEFAULT true,
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);

-- ═══════════════════════════════════════
-- CLIENTS
-- ═══════════════════════════════════════

CREATE TABLE clients (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name       TEXT NOT NULL,
    email           TEXT,
    phone           TEXT,
    address_line1   TEXT,
    address_line2   TEXT,
    city            TEXT,
    state           TEXT,
    zip             TEXT,
    notes           TEXT,
    source          TEXT,  -- 'referral', 'website', 'phone', etc.
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);

-- ═══════════════════════════════════════
-- ESTIMATES
-- ═══════════════════════════════════════

CREATE TABLE estimates (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    estimate_number TEXT UNIQUE NOT NULL,  -- EST-2026-0001
    client_id       UUID REFERENCES clients(id),
    estimator_id    UUID REFERENCES team_members(id),
    reviewer_id     UUID REFERENCES team_members(id),
    project_type    TEXT NOT NULL,
    project_address TEXT,
    status          TEXT DEFAULT 'draft'
                    CHECK (status IN ('draft','in_review','revision_requested',
                                      'approved','sent','accepted','declined','expired')),
    -- Scope
    scope_inclusions    JSONB DEFAULT '[]',
    scope_exclusions    JSONB DEFAULT '[]',
    site_conditions     TEXT,
    -- Totals
    materials_subtotal  NUMERIC(12,2) DEFAULT 0,
    labor_subtotal      NUMERIC(12,2) DEFAULT 0,
    subcontractor_total NUMERIC(12,2) DEFAULT 0,
    permits_fees        NUMERIC(12,2) DEFAULT 0,
    overhead_profit     NUMERIC(12,2) DEFAULT 0,
    contingency         NUMERIC(12,2) DEFAULT 0,
    tax                 NUMERIC(12,2) DEFAULT 0,
    grand_total         NUMERIC(12,2) DEFAULT 0,
    gross_margin_pct    NUMERIC(5,2),
    -- Timeline
    estimated_start     DATE,
    estimated_end       DATE,
    valid_through       DATE,
    -- Metadata
    tier                TEXT DEFAULT 'better'
                        CHECK (tier IN ('good','better','best')),
    source              TEXT DEFAULT 'manual'
                        CHECK (source IN ('manual','voice','template')),
    call_id             UUID,  -- if created from a voice call
    -- Validation
    validation_results  JSONB,  -- 15-point checklist results
    validation_passed   BOOLEAN DEFAULT false,
    -- Files
    pdf_path            TEXT,
    docx_path           TEXT,
    -- Versioning
    version             INT DEFAULT 1,
    parent_estimate_id  UUID REFERENCES estimates(id),
    -- Timestamps
    created_at          TIMESTAMPTZ DEFAULT now(),
    updated_at          TIMESTAMPTZ DEFAULT now(),
    sent_at             TIMESTAMPTZ,
    accepted_at         TIMESTAMPTZ,
    declined_at         TIMESTAMPTZ
);

CREATE TABLE estimate_line_items (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    estimate_id     UUID REFERENCES estimates(id) ON DELETE CASCADE,
    line_number     INT NOT NULL,
    category        TEXT NOT NULL,  -- 'demo', 'materials', 'labor', 'subcontractor', etc.
    description     TEXT NOT NULL,
    quantity        NUMERIC(10,2),
    unit            TEXT,  -- 'sq ft', 'lf', 'ea', 'hr', 'day'
    unit_price      NUMERIC(10,2),
    extended_price  NUMERIC(12,2),
    notes           TEXT,
    product_id      UUID REFERENCES products(id),
    price_source    TEXT,  -- 'home_depot', 'lowes', 'invoice', 'manual'
    price_date      DATE,
    created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE estimate_change_orders (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    estimate_id     UUID REFERENCES estimates(id),
    change_number   INT NOT NULL,
    description     TEXT NOT NULL,
    cost_impact     NUMERIC(12,2) NOT NULL,
    timeline_impact TEXT,
    status          TEXT DEFAULT 'pending'
                    CHECK (status IN ('pending','approved','rejected')),
    client_signed   BOOLEAN DEFAULT false,
    signed_at       TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT now()
);

-- ═══════════════════════════════════════
-- PRICING & PRODUCTS
-- ═══════════════════════════════════════

CREATE TABLE products (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            TEXT NOT NULL,
    category        TEXT NOT NULL,
    subcategory     TEXT,
    brand           TEXT,
    sku_hd          TEXT,  -- Home Depot SKU
    sku_lowes       TEXT,  -- Lowe's SKU
    sku_internal    TEXT,  -- Internal/supplier SKU
    unit            TEXT NOT NULL,  -- 'sq ft', 'ea', 'bundle', 'gallon'
    specifications  JSONB DEFAULT '{}',
    tier            TEXT CHECK (tier IN ('budget','mid','premium')),
    is_active       BOOLEAN DEFAULT true,
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);

-- Stores every price observation from every source
CREATE TABLE pricing_history (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id      UUID REFERENCES products(id),
    source          TEXT NOT NULL CHECK (source IN ('home_depot','lowes','invoice','manual')),
    price           NUMERIC(10,2) NOT NULL,
    unit            TEXT,
    store_location  TEXT,
    supplier_name   TEXT,
    invoice_id      UUID REFERENCES invoices(id),
    observed_at     TIMESTAMPTZ DEFAULT now()
);

-- Computed unified price (updated by Edge Function after new pricing_history rows)
CREATE TABLE unified_pricing (
    product_id      UUID PRIMARY KEY REFERENCES products(id),
    unified_price   NUMERIC(10,2) NOT NULL,
    hd_price        NUMERIC(10,2),
    lowes_price     NUMERIC(10,2),
    invoice_price   NUMERIC(10,2),
    freshness       TEXT CHECK (freshness IN ('green','yellow','orange','red')),
    last_updated    TIMESTAMPTZ DEFAULT now()
);

-- ═══════════════════════════════════════
-- INVOICES
-- ═══════════════════════════════════════

CREATE TABLE invoices (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_name   TEXT,
    invoice_number  TEXT,
    invoice_date    DATE,
    file_path       TEXT NOT NULL,  -- Supabase Storage path
    ocr_raw_text    TEXT,
    parsed_data     JSONB,  -- Structured extraction
    status          TEXT DEFAULT 'pending'
                    CHECK (status IN ('pending','processing','review','confirmed','error')),
    uploaded_by     UUID REFERENCES team_members(id),
    reviewed_by     UUID REFERENCES team_members(id),
    created_at      TIMESTAMPTZ DEFAULT now()
);

-- ═══════════════════════════════════════
-- VOICE CALLS
-- ═══════════════════════════════════════

CREATE TABLE voice_calls (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    caller_id       UUID REFERENCES team_members(id),
    twilio_call_sid TEXT,
    source          TEXT CHECK (source IN ('twilio','in_app')),
    duration_sec    INT,
    transcript      TEXT,
    extracted_data  JSONB,  -- Structured data Alex extracted
    recording_path  TEXT,   -- Supabase Storage path
    estimates_created UUID[],  -- Array of estimate IDs created from this call
    started_at      TIMESTAMPTZ DEFAULT now(),
    ended_at        TIMESTAMPTZ
);

-- ═══════════════════════════════════════
-- LEARNING SYSTEM
-- ═══════════════════════════════════════

CREATE TABLE job_actuals (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    estimate_id     UUID REFERENCES estimates(id),
    actual_materials    NUMERIC(12,2),
    actual_labor        NUMERIC(12,2),
    actual_subs         NUMERIC(12,2),
    actual_total        NUMERIC(12,2),
    actual_duration_days INT,
    actual_margin_pct   NUMERIC(5,2),
    variance_materials  NUMERIC(5,2),  -- % over/under
    variance_labor      NUMERIC(5,2),
    variance_total      NUMERIC(5,2),
    notes               TEXT,
    completed_at        TIMESTAMPTZ,
    created_at          TIMESTAMPTZ DEFAULT now()
);

-- Vector embeddings for semantic search of past estimates
CREATE TABLE estimate_embeddings (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    estimate_id     UUID REFERENCES estimates(id),
    embedding       vector(1536),  -- pgvector
    metadata        JSONB,
    created_at      TIMESTAMPTZ DEFAULT now()
);

-- ═══════════════════════════════════════
-- COMPANY SETTINGS
-- ═══════════════════════════════════════

CREATE TABLE company_settings (
    key             TEXT PRIMARY KEY,
    value           JSONB NOT NULL,
    updated_at      TIMESTAMPTZ DEFAULT now()
);
-- Keys: 'branding', 'default_markups', 'default_margins', 'terms_conditions',
--        'twilio_config', 'estimate_numbering', 'price_freshness_thresholds'
```

### 10.2 Row-Level Security (RLS)

All tables have RLS enabled. Policies ensure:

- Team members can only read/write data matching their role
- Estimators: full CRUD on their own estimates, read-only on others
- PMs / Admins / Owners: full CRUD on all estimates
- Field Techs: read-only on assigned project estimates
- Sales: read on all estimates, create drafts only
- All: read on products and pricing

### 10.3 Supabase Storage Buckets

| Bucket | Purpose | Access |
|--------|---------|--------|
| `estimate-documents` | Generated PDF/DOCX estimate packages | Authenticated team, RLS by estimate ownership |
| `invoices` | Uploaded supplier invoices (PDF, images) | Authenticated team |
| `call-recordings` | Twilio/in-app voice call recordings | Admin/Owner only |
| `company-assets` | Logo, branding images | Public read, admin write |

---

## 11. Authentication & Authorization

### 11.1 Auth Provider

- **Supabase Auth** with email + magic link (no passwords to manage)
- Optional: Google OAuth for team members with company Google accounts
- All users must be in the `team_members` table — no self-registration

### 11.2 Role-Based Access Control

| Role | Estimates | Pricing | Invoices | Voice | Analytics | Settings |
|------|----------|---------|----------|-------|-----------|----------|
| Estimator | Create, Edit Own, Read All | Read | Upload, Read | Call Alex | Own metrics | Profile only |
| PM | All CRUD, Review/Approve | Read | Read, Review | Call Alex | Team metrics | Limited |
| Field Tech | Read (assigned only) | Read | No | No | No | Profile only |
| Sales | Create Draft, Read All | Read | No | Call Alex | Own metrics | Profile only |
| Admin | All CRUD | All CRUD | All CRUD | All | All | All |
| Owner | All CRUD | All CRUD | All CRUD | All | All | All |

---

## 12. API Design

### 12.1 API Architecture

All APIs are deployed as Vercel Serverless Functions under `/api/` routes in the Next.js application. The Electron app consumes the same API endpoints as the web dashboard.

### 12.2 Core API Routes

```
# Estimates
POST   /api/estimates                    Create new estimate
GET    /api/estimates                    List estimates (with filters)
GET    /api/estimates/:id                Get single estimate with line items
PUT    /api/estimates/:id                Update estimate
POST   /api/estimates/:id/validate       Run 15-point validation
POST   /api/estimates/:id/generate-pdf   Generate PDF document package
POST   /api/estimates/:id/send           Send to client (email/text)
POST   /api/estimates/:id/duplicate      Clone an estimate
POST   /api/estimates/:id/change-order   Create change order

# Line Items
POST   /api/estimates/:id/line-items     Add line item
PUT    /api/line-items/:id               Update line item
DELETE /api/line-items/:id               Remove line item

# Pricing
GET    /api/pricing/search               Search product catalog
GET    /api/pricing/:product_id          Get unified price + history
POST   /api/pricing/refresh              Trigger price re-scrape for a product
GET    /api/pricing/stale                Get stale pricing alerts

# Invoices
POST   /api/invoices/upload              Upload + begin OCR processing
GET    /api/invoices                     List invoices
GET    /api/invoices/:id                 Get parsed invoice data
PUT    /api/invoices/:id/confirm         Confirm OCR extraction

# Voice / Telephony
POST   /api/voice/twilio-webhook         Twilio inbound call webhook
POST   /api/voice/media-stream           Twilio Media Stream WebSocket handler
GET    /api/voice/calls                  List call history
GET    /api/voice/calls/:id/transcript   Get call transcript

# AI / Estimation Engine
POST   /api/ai/ballpark                  Quick ballpark estimate
POST   /api/ai/material-takeoff          Calculate material quantities
POST   /api/ai/labor-calc                Calculate labor estimate
POST   /api/ai/scope-check               Validate scope completeness

# Learning
POST   /api/learning/job-actual           Record actual job costs
GET    /api/learning/accuracy             Get accuracy metrics
GET    /api/learning/trends               Get pricing/labor trends

# Team
GET    /api/team                          List team members
GET    /api/team/me                       Current user profile

# Clients
GET    /api/clients                       List clients
POST   /api/clients                       Create client
GET    /api/clients/:id                   Get client with estimate history
```

### 12.3 Authentication

All API routes validate a Supabase JWT in the `Authorization: Bearer <token>` header. RLS policies provide an additional security layer at the database level.

---

## 13. Hosting & Deployment (Vercel)

### 13.1 Vercel Project Structure

```
proestimate-ai/
├── apps/
│   ├── web/                 # Next.js web dashboard (deployed to Vercel)
│   │   ├── app/             # App Router pages
│   │   ├── components/      # Shared React components
│   │   ├── lib/             # Utilities, Supabase client, API helpers
│   │   └── public/          # Static assets
│   └── desktop/             # Electron app (built locally, distributed)
│       ├── main/            # Electron main process
│       ├── renderer/        # React renderer (shares components with web)
│       └── electron-builder.yml
├── packages/
│   ├── shared/              # Shared types, constants, validation logic
│   ├── ui/                  # Shared component library (React + Tailwind)
│   └── estimation-engine/   # Core estimation logic (used by API + Electron)
├── supabase/
│   ├── migrations/          # SQL migration files
│   ├── functions/           # Edge Functions (Deno)
│   └── seed.sql             # Seed data (products, default settings)
└── turbo.json               # Turborepo config
```

### 13.2 Vercel Configuration

| Setting | Value |
|---------|-------|
| Framework | Next.js |
| Build Command | `turbo build --filter=web` |
| Output Directory | `apps/web/.next` |
| Node.js Version | 20.x |
| Environment Variables | `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_KEY`, `ELEVENLABS_API_KEY`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `ANTHROPIC_API_KEY`, `OPENAI_API_KEY` |
| Domains | `app.proestimate.ai` (production), `staging.proestimate.ai` (preview) |
| Edge Functions | Twilio WebSocket bridge (requires long-running connection) |
| Cron Jobs | Price scraping (daily/weekly), stale pricing alerts (daily) |

### 13.3 CI/CD Pipeline

```
Push to GitHub
    │
    ├── main branch → Vercel Production deployment
    ├── develop branch → Vercel Preview deployment
    └── feature/* branches → Vercel Preview (ephemeral)
    
Pre-deploy checks (GitHub Actions):
    1. TypeScript type checking
    2. ESLint + Prettier
    3. Unit tests (Vitest)
    4. Integration tests (Playwright for web, Spectron for Electron)
    5. Supabase migration validation
    
Electron releases:
    1. Tag a release (v1.x.x)
    2. GitHub Actions builds DMG + NSIS + AppImage
    3. Uploads to GitHub Releases
    4. Electron auto-updater checks for new releases
```

---

## 14. Integration Map

| System | Integration Type | Direction | Data Flow |
|--------|-----------------|-----------|-----------|
| **ElevenLabs** | WebSocket API | Bidirectional | Audio streams + function calls |
| **Twilio** | REST API + Media Streams | Bidirectional | Phone calls, SMS delivery, call recording |
| **Home Depot** | Web scraping (Puppeteer) | Inbound | Product pricing, availability |
| **Lowe's** | Web scraping (Puppeteer) | Inbound | Product pricing, availability |
| **Anthropic (Claude)** | REST API | Outbound→Inbound | Estimation reasoning, document content, OCR parsing |
| **OpenAI** | REST API (fallback) | Outbound→Inbound | Backup LLM for estimation |
| **Google Document AI** | REST API | Outbound→Inbound | Complex invoice OCR |
| **Supabase** | Client SDK + REST | Bidirectional | All application data |
| **Vercel** | Git deployment + Serverless | Hosting | Web app, API, cron jobs |
| **Email (SendGrid/Resend)** | REST API | Outbound | Estimate delivery to clients |
| **SMS (Twilio)** | REST API | Outbound | Estimate delivery, notifications |

---

## 15. Development Phases & Roadmap

### Phase 1 — Foundation (Weeks 1–6)

**Goal:** Core infrastructure, database, auth, and basic estimate CRUD.

- [ ] Supabase project setup: schema, migrations, RLS policies, storage buckets
- [ ] Next.js web app scaffolding on Vercel (auth, layout, routing)
- [ ] Electron app scaffolding (shell, auth, IPC, auto-updater)
- [ ] Shared component library (UI kit, Tailwind config)
- [ ] Estimates CRUD: create, edit, list, status management
- [ ] Line items management with manual pricing
- [ ] Client management (basic CRUD)
- [ ] Team management and RBAC
- [ ] Basic estimate PDF generation (template v1)

### Phase 2 — Pricing Intelligence (Weeks 7–10)

**Goal:** Automated pricing from HD, Lowe's, and invoices.

- [ ] Product catalog seeded with top 500 materials
- [ ] Home Depot scraper (Puppeteer, scheduled via Vercel Cron)
- [ ] Lowe's scraper (Puppeteer, scheduled via Vercel Cron)
- [ ] Price normalization engine (Supabase Edge Function)
- [ ] Unified pricing API with freshness indicators
- [ ] Invoice upload and OCR pipeline (Tesseract.js + Claude parsing)
- [ ] Invoice review queue in web dashboard
- [ ] Material search and price comparison UI in Electron app

### Phase 3 — Voice AI & Telephony (Weeks 11–14)

**Goal:** Connect ElevenLabs agent to Twilio and the estimation backend.

- [ ] Twilio phone number provisioning and configuration
- [ ] Twilio → ElevenLabs WebSocket bridge (Vercel Edge Function)
- [ ] Function calling integration: Alex → Pricing API, Estimate API
- [ ] Call transcript logging to Supabase
- [ ] "Call Alex" button in Electron app (WebRTC to ElevenLabs)
- [ ] Post-call summary and "Create Estimate from Call" workflow
- [ ] Call history and transcript search
- [ ] Call recording storage (optional)

### Phase 4 — Estimation Engine & Document Generation (Weeks 15–18)

**Goal:** Full AI-powered estimation with professional document output.

- [ ] Estimation engine: template-based scope checklists per project type
- [ ] AI-assisted material takeoff calculations with waste factors
- [ ] AI-assisted labor calculation with productivity benchmarks
- [ ] Markup and margin engine with guardrails
- [ ] Contingency auto-calculation
- [ ] 15-point automated validation
- [ ] Full document package generation: Cover Sheet, TOC, Scope, Line Items, Pricing Schedule, Terms
- [ ] Good / Better / Best multi-tier estimates
- [ ] Estimate review and approval workflow
- [ ] Email/SMS delivery to clients

### Phase 5 — Continuous Learning (Weeks 19–22)

**Goal:** Feedback loops that make the system smarter over time.

- [ ] Job actuals recording (estimated vs. actual comparison)
- [ ] Pricing accuracy tracking and auto-recalibration triggers
- [ ] Labor productivity profiling by crew and project type
- [ ] Win/loss tracking and conversion analytics
- [ ] pgvector setup for semantic estimate search
- [ ] "Similar past estimates" reference in estimate builder
- [ ] Learning dashboard with accuracy metrics and trend charts

### Phase 6 — Polish & Scale (Weeks 23–26)

**Goal:** Production hardening, performance, and UX refinement.

- [ ] Performance optimization (API response times, PDF generation speed)
- [ ] Offline mode for Electron (SQLite sync)
- [ ] Advanced analytics dashboards
- [ ] Change order management workflow
- [ ] Estimate versioning and diff view
- [ ] User onboarding flow
- [ ] Documentation and training materials
- [ ] Security audit and penetration testing
- [ ] Load testing (concurrent estimates, concurrent calls)
- [ ] Public launch to full MS Home Pros team

---

## 16. Non-Functional Requirements

### 16.1 Performance

| Metric | Target |
|--------|--------|
| API response time (p95) | < 500ms for CRUD, < 3s for AI-assisted operations |
| PDF generation | < 10 seconds for a full estimate package |
| Voice latency (in-app) | < 500ms end-to-end (WebRTC) |
| Voice latency (phone) | < 1.5s end-to-end (Twilio → ElevenLabs) |
| Pricing lookup | < 200ms from unified cache |
| Dashboard page load | < 2 seconds (LCP) |
| Electron app cold start | < 3 seconds |

### 16.2 Scalability

- Support 20+ concurrent users across Electron + Web
- Handle 50+ estimates per day
- Support 10+ simultaneous voice calls (verify ElevenLabs limits)
- Product catalog: 10,000+ items
- Pricing history: 1M+ observations

### 16.3 Security

- All data encrypted at rest (Supabase default) and in transit (TLS)
- Row-Level Security on all Supabase tables
- API authentication via Supabase JWT
- No client data exposed to unauthorized roles
- Call recordings encrypted and access-logged
- Invoice files scanned for malware on upload
- Regular dependency audits (npm audit, Dependabot)

### 16.4 Reliability

- 99.5% uptime target for web dashboard and API
- Voice system: graceful degradation if ElevenLabs is down (Twilio voicemail fallback)
- Electron app: full offline capability for core estimate building
- Database: Supabase managed backups (daily, 7-day retention minimum)
- Error tracking: Sentry integration with alerting

### 16.5 Compliance

- Twilio call recordings: comply with applicable state recording consent laws
- Client data: no PII shared with third-party AI providers beyond what's necessary for estimation
- Invoice data: supplier financial data treated as confidential
- Data retention: configurable per data type (estimates: indefinite, call recordings: 90 days default)

---

## 17. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Home Depot / Lowe's block scraping | Medium | High | Implement rotating proxies, respect rate limits, cache aggressively. Fallback: manual price entry + invoice pipeline as primary source. |
| ElevenLabs API downtime | Low | Medium | Graceful fallback to text-based Alex in Electron app. Twilio voicemail for phone calls. |
| LLM cost overruns (Claude API) | Medium | Medium | Implement token budgets per estimate, cache common calculations, use cheaper models for simple lookups. |
| OCR accuracy on invoices | Medium | Low | Human review queue catches errors. Confidence thresholds prevent bad data from entering pricing DB. |
| Twilio per-minute costs | Low | Low | In-app WebRTC calls bypass Twilio. Monitor usage dashboards. Set monthly spend caps. |
| Estimate accuracy in early phases | High | Medium | Conservative margin guardrails. Human review required for all estimates in Phase 1–3. Learning system improves over time. |
| Team adoption resistance | Medium | High | Involve team in design feedback. Start with "Alex as assistant" not "Alex as replacement." Celebrate wins. |
| Data migration from existing tools | Medium | Medium | Build import scripts for existing estimate data. Run parallel systems during transition. |
| Material price volatility | Medium | Medium | Real-time pricing + staleness alerts. Contingency recommendations built into every estimate. |
| Scope creep on the platform itself | High | Medium | Strict phase gating. Ship Phase 1 before expanding. Prioritize estimation engine over nice-to-haves. |

---

## 18. Appendix — Alex Agent Prompt Reference

The complete Alex agent system prompt is maintained as a living document and loaded into the ElevenLabs Conversational AI configuration. The prompt defines:

- **Identity:** Alex, the estimation brain of MS Home Pros
- **Personality:** Sharp, warm, efficient, witty with dry humor
- **Nickname System:** Rotates between "Twin" (50%), "Big Dawg" (30%), "Chief" (20%) — never repeating back-to-back
- **Core Knowledge:** Full residential estimation pricing ranges, labor rates, material specifications, markup/margin calculations, waste factors, contingency guidelines
- **Conversation Flow:** Greeting → Scope Understanding → Estimate Building (8-step process) → Review Checklist → Presentation Coaching → Close
- **Estimate Types Handled:** New builds, quick ballparks, revisions/change orders, reviews, material takeoffs, labor calcs, margin analysis, competitive pricing, scope definition, presentation prep
- **Advanced Scenarios:** On-site emergencies, client pushback, underbid recovery, multi-phase structuring, rush estimates, first-time estimator coaching
- **Automated Error Detection:** 15 common estimation mistakes actively monitored and called out
- **Escalation Protocol:** Safety issues, legal concerns, emotional distress, unknown project types, and disputes route to human team members

The full prompt text is stored in Supabase (`company_settings` table, key: `alex_system_prompt`) and can be updated without redeployment. Changes are version-controlled and require admin approval.

---

*This document is confidential and intended for internal use by MS Home Pros and its development partners only. Version 1.0.0 — March 6, 2026.*
