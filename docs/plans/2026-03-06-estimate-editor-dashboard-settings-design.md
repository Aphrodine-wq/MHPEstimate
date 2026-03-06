# ProEstimate AI — Estimate Editor, Dashboard & Settings Overhaul

**Date:** 2026-03-06
**Status:** Approved

## 1. Full Line-Item Estimate Editor Modal

Wide modal (900px+) with sectioned layout for creating and editing estimates.

### Header
- Estimate number (auto-generated), status badge, project type dropdown, project address, client selector, pricing tier (good/better/best)

### Line Items (tabbed sections)
- **Materials** — Item Name, Qty, Unit, Unit Price, Total (auto-calc). Add/remove rows.
- **Labor** — Description, Hours, Rate, Total (auto-calc). Add/remove rows.
- **Subcontractors** — Company/Trade, Description, Amount. Add/remove rows.

### Summary Footer (auto-calculated)
- Materials Subtotal, Labor Subtotal, Subcontractor Total
- Permits & Fees (editable), Overhead & Profit %, Contingency %, Tax %
- **Grand Total** (bold, auto-calculated)

### Additional Fields
- Scope inclusions, scope exclusions, site conditions, valid through date

### Actions
- Save Draft, Save & Send, Cancel

### Data
Line items stored in `estimate_line_items` table linked by `estimate_id`. All totals recalculate live.

## 2. Dashboard Improvements

### Activity Feed (right column)
- Real-time feed: estimate created/updated/sent/accepted/declined, client added, invoice uploaded, voice calls
- Each entry: icon, description, relative timestamp
- Powered by `activity_log` Supabase table with realtime subscription

### Quote of the Day
- Card at top of right column with rotating motivational/construction quote
- ~50 quotes, selected by day index

### Enhanced KPIs
- Keep existing 4 KPI cards, improve layout density
- Add trend indicators

## 3. Expanded System Settings

### Company Info tab
- Company name, logo, license number, address, phone, email
- Default tax rate %, default markup/overhead %, default contingency %

### Estimate Defaults tab
- Default pricing tier, valid-for days, payment terms, warranty text
- Default scope inclusions/exclusions templates

### Notifications tab
- Email alert toggles (estimate accepted, expiring, invoice processed)
- In-app notification preferences

### Integrations tab
- Supabase connection status + URL
- ElevenLabs agent config
- Future integration placeholders

## Data Model Changes

### estimate_line_items
- id, estimate_id, category (material|labor|subcontractor), description, quantity, unit, unit_price, total, sort_order, created_at

### activity_log
- id, action, entity_type, entity_id, description, created_at, user_id

### company_settings (single row)
- id, company_name, logo_url, license_number, address, phone, email
- default_tax_rate, default_markup, default_contingency
- default_tier, valid_for_days, payment_terms, warranty_text
- scope_inclusions_template, scope_exclusions_template
- notification_prefs (jsonb)
