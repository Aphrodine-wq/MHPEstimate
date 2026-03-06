-- ProEstimate AI — Seed Data

-- Default company settings
INSERT INTO company_settings (key, value) VALUES
  ('branding', '{"company_name": "MS Home Pros", "primary_color": "#2563eb", "logo_path": null}'),
  ('default_markups', '{"material": 0.175, "labor": 0.25, "subcontractor": 0.125}'),
  ('default_margins', '{"target_gross": 0.385, "minimum_gross": 0.25}'),
  ('estimate_numbering', '{"prefix": "EST", "year_format": "YYYY", "next_sequence": 1}'),
  ('price_freshness_thresholds', '{"green_days": 30, "yellow_days": 60, "orange_days": 90}'),
  ('terms_conditions', '{"validity_days": 30, "deposit_pct": 0.33, "warranty_years": 1}');
