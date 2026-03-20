-- MHP Estimate — Seed Data
-- Company settings, estimate templates, schedule templates, labor rates
-- This gives MHP a working app from first login

-- ═══════════════════════════════════════
-- COMPANY SETTINGS
-- ═══════════════════════════════════════

INSERT INTO company_settings (key, value) VALUES
  ('company_info', '{
    "name": "Mississippi Home Professionals, LLC",
    "dba": "North Mississippi Home Professionals",
    "address": "404 Galleria Drive, Suite #6",
    "city_state_zip": "Oxford, MS 38655",
    "email": "info@mhpestimate.cloud",
    "phone": "662-871-8071",
    "website": "https://mhpestimate.cloud",
    "license": "R21909",
    "contractor_name": "Josh Harris"
  }'::jsonb),
  ('estimate_numbering', '{
    "prefix": "MHP",
    "year_format": "YYYY",
    "next_sequence": 1
  }'::jsonb),
  ('default_margins', '{
    "overhead_percent": 15,
    "profit_percent": 10,
    "contingency_percent": 12.5,
    "waste_factor_percent": 10,
    "tax_rate_percent": 7
  }'::jsonb),
  ('payment_schedule', '{
    "deposit_percent": 25,
    "progress_milestones": true,
    "final_percent": 10,
    "terms_days": 10,
    "late_fee_percent": 1.5
  }'::jsonb),
  ('branding', '{
    "accent_color": "#00bcd4",
    "logo_path": "/mhp-logo.png",
    "pdf_style": "mhp-bandominium"
  }'::jsonb)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();

-- ═══════════════════════════════════════
-- ESTIMATE TEMPLATES (top 8 project types by frequency)
-- ═══════════════════════════════════════

INSERT INTO estimate_templates (name, project_type, description, line_items, is_default, is_active) VALUES
  (
    'Porch / Screened Porch',
    'porch',
    'Standard porch or screened porch build — foundation, framing, roofing, screening, electrical, trim',
    '[
      {"description": "General Conditions", "category": "general_conditions", "unit": "ls", "quantity": 1},
      {"description": "Project Coordination (Supervision)", "category": "general_conditions", "unit": "ls", "quantity": 1},
      {"description": "Building Permits", "category": "general_conditions", "unit": "ls", "quantity": 1},
      {"description": "Mobilization", "category": "general_conditions", "unit": "ls", "quantity": 1},
      {"description": "Waste Management", "category": "general_conditions", "unit": "ls", "quantity": 1},
      {"description": "Structure Demolition", "category": "demolition", "unit": "ls", "quantity": 1},
      {"description": "Site Prep/Grading", "category": "sitework", "unit": "ls", "quantity": 1},
      {"description": "Slab Material", "category": "concrete", "unit": "ls", "quantity": 1},
      {"description": "Slab Labor", "category": "concrete", "unit": "ls", "quantity": 1},
      {"description": "Concrete Forming Material (Includes Reinforcement)", "category": "concrete", "unit": "ls", "quantity": 1},
      {"description": "Framing Material", "category": "framing", "unit": "ls", "quantity": 1},
      {"description": "Framing Labor", "category": "framing", "unit": "ls", "quantity": 1},
      {"description": "Shingle Roofing Material", "category": "roofing", "unit": "ls", "quantity": 1},
      {"description": "Shingle Roofing Labor", "category": "roofing", "unit": "ls", "quantity": 1},
      {"description": "Exterior Trim Material", "category": "exterior", "unit": "ls", "quantity": 1},
      {"description": "Exterior Trim Labor", "category": "exterior", "unit": "ls", "quantity": 1},
      {"description": "Exterior Doors", "category": "exterior", "unit": "ea", "quantity": 1},
      {"description": "Gutter Material", "category": "exterior", "unit": "ls", "quantity": 1},
      {"description": "Gutter Labor", "category": "exterior", "unit": "ls", "quantity": 1},
      {"description": "Electrical Material", "category": "electrical", "unit": "ls", "quantity": 1},
      {"description": "Electrical Labor", "category": "electrical", "unit": "ls", "quantity": 1},
      {"description": "Lighting Fixtures", "category": "electrical", "unit": "ls", "quantity": 1},
      {"description": "Interior Trim Material", "category": "interior", "unit": "ls", "quantity": 1},
      {"description": "Interior Trim Labor", "category": "interior", "unit": "ls", "quantity": 1},
      {"description": "Painting", "category": "painting", "unit": "ls", "quantity": 1},
      {"description": "Final Cleaning", "category": "general_conditions", "unit": "ls", "quantity": 1}
    ]'::jsonb,
    false, true
  ),
  (
    'Kitchen Renovation',
    'kitchen_renovation',
    'Full kitchen remodel — demo, cabinets, countertops, backsplash, flooring, plumbing, electrical',
    '[
      {"description": "General Conditions", "category": "general_conditions", "unit": "ls", "quantity": 1},
      {"description": "Project Coordination (Supervision)", "category": "general_conditions", "unit": "ls", "quantity": 1},
      {"description": "Building Permits", "category": "general_conditions", "unit": "ls", "quantity": 1},
      {"description": "Mobilization", "category": "general_conditions", "unit": "ls", "quantity": 1},
      {"description": "Waste Management", "category": "general_conditions", "unit": "ls", "quantity": 1},
      {"description": "Kitchen Demolition", "category": "demolition", "unit": "ls", "quantity": 1},
      {"description": "Cabinet Material (ALLOWANCE)", "category": "cabinetry_countertops", "unit": "ls", "quantity": 1},
      {"description": "Cabinet Installation Labor", "category": "cabinetry_countertops", "unit": "ls", "quantity": 1},
      {"description": "Countertop Material (ALLOWANCE)", "category": "cabinetry_countertops", "unit": "sf", "quantity": 40},
      {"description": "Countertop Labor", "category": "cabinetry_countertops", "unit": "ls", "quantity": 1},
      {"description": "Backsplash Tile Material", "category": "tile", "unit": "sf", "quantity": 30},
      {"description": "Backsplash Tile Labor", "category": "tile", "unit": "ls", "quantity": 1},
      {"description": "Flooring Material (ALLOWANCE)", "category": "flooring", "unit": "sf", "quantity": 150},
      {"description": "Flooring Labor", "category": "flooring", "unit": "ls", "quantity": 1},
      {"description": "Plumbing Material", "category": "plumbing", "unit": "ls", "quantity": 1},
      {"description": "Plumbing Labor", "category": "plumbing", "unit": "ls", "quantity": 1},
      {"description": "Electrical Material", "category": "electrical", "unit": "ls", "quantity": 1},
      {"description": "Electrical Labor", "category": "electrical", "unit": "ls", "quantity": 1},
      {"description": "Lighting Fixtures", "category": "electrical", "unit": "ls", "quantity": 1},
      {"description": "Drywall Patching/Repair", "category": "interior", "unit": "ls", "quantity": 1},
      {"description": "Painting", "category": "painting", "unit": "ls", "quantity": 1},
      {"description": "Trim and Molding", "category": "interior", "unit": "ls", "quantity": 1},
      {"description": "Cabinet Hardware", "category": "cabinetry_countertops", "unit": "ls", "quantity": 1},
      {"description": "Sink and Faucet", "category": "plumbing", "unit": "ea", "quantity": 1},
      {"description": "Appliance Installation", "category": "appliances", "unit": "ls", "quantity": 1},
      {"description": "Final Cleaning", "category": "general_conditions", "unit": "ls", "quantity": 1}
    ]'::jsonb,
    false, true
  ),
  (
    'Bathroom Renovation',
    'bathroom_renovation',
    'Full bathroom remodel — demo, tile, vanity, shower/tub, plumbing, electrical, waterproofing',
    '[
      {"description": "General Conditions", "category": "general_conditions", "unit": "ls", "quantity": 1},
      {"description": "Project Coordination (Supervision)", "category": "general_conditions", "unit": "ls", "quantity": 1},
      {"description": "Building Permits", "category": "general_conditions", "unit": "ls", "quantity": 1},
      {"description": "Waste Management", "category": "general_conditions", "unit": "ls", "quantity": 1},
      {"description": "Bathroom Demolition", "category": "demolition", "unit": "ls", "quantity": 1},
      {"description": "Plumbing Rough-In", "category": "plumbing", "unit": "ls", "quantity": 1},
      {"description": "Plumbing Finish", "category": "plumbing", "unit": "ls", "quantity": 1},
      {"description": "Electrical Rough-In", "category": "electrical", "unit": "ls", "quantity": 1},
      {"description": "Electrical Finish", "category": "electrical", "unit": "ls", "quantity": 1},
      {"description": "Waterproofing Membrane", "category": "tile", "unit": "ls", "quantity": 1},
      {"description": "Shower Tile Material (ALLOWANCE)", "category": "tile", "unit": "sf", "quantity": 80},
      {"description": "Shower Tile Labor", "category": "tile", "unit": "ls", "quantity": 1},
      {"description": "Floor Tile Material (ALLOWANCE)", "category": "tile", "unit": "sf", "quantity": 50},
      {"description": "Floor Tile Labor", "category": "tile", "unit": "ls", "quantity": 1},
      {"description": "Vanity and Countertop (ALLOWANCE)", "category": "cabinetry_countertops", "unit": "ea", "quantity": 1},
      {"description": "Mirror/Medicine Cabinet", "category": "interior", "unit": "ea", "quantity": 1},
      {"description": "Toilet", "category": "plumbing", "unit": "ea", "quantity": 1},
      {"description": "Glass Shower Door (ALLOWANCE)", "category": "interior", "unit": "ea", "quantity": 1},
      {"description": "Exhaust Fan", "category": "electrical", "unit": "ea", "quantity": 1},
      {"description": "Drywall/Cement Board", "category": "interior", "unit": "ls", "quantity": 1},
      {"description": "Painting", "category": "painting", "unit": "ls", "quantity": 1},
      {"description": "Trim and Molding", "category": "interior", "unit": "ls", "quantity": 1},
      {"description": "Accessories (towel bars, TP holder)", "category": "interior", "unit": "ls", "quantity": 1},
      {"description": "Final Cleaning", "category": "general_conditions", "unit": "ls", "quantity": 1}
    ]'::jsonb,
    false, true
  ),
  (
    'New Home Build (2250 SF)',
    'new_build',
    'Complete new home construction — 17 divisions, foundation through final finish. MHP standard 2250 SF package.',
    '[
      {"description": "General Conditions", "category": "general_conditions", "unit": "ls", "quantity": 1},
      {"description": "Project Coordination (Supervision)", "category": "general_conditions", "unit": "ls", "quantity": 1},
      {"description": "Building Permits", "category": "general_conditions", "unit": "ls", "quantity": 1},
      {"description": "Architectural Plans", "category": "general_conditions", "unit": "ls", "quantity": 1},
      {"description": "Site Prep/Grading", "category": "sitework", "unit": "ls", "quantity": 1},
      {"description": "Foundation Slab", "category": "concrete", "unit": "sf", "quantity": 2250},
      {"description": "Metal Building Structure", "category": "structure", "unit": "ls", "quantity": 1},
      {"description": "Roofing Material", "category": "roofing", "unit": "sq", "quantity": 25},
      {"description": "Roofing Labor", "category": "roofing", "unit": "ls", "quantity": 1},
      {"description": "Gutters", "category": "roofing", "unit": "lf", "quantity": 200},
      {"description": "Exterior Finish - Siding", "category": "exterior", "unit": "sf", "quantity": 3000},
      {"description": "Windows", "category": "exterior", "unit": "ea", "quantity": 15},
      {"description": "Exterior Doors", "category": "exterior", "unit": "ea", "quantity": 3},
      {"description": "Insulation - Spray Foam", "category": "insulation", "unit": "sf", "quantity": 2250},
      {"description": "Drywall Material", "category": "interior", "unit": "sf", "quantity": 8000},
      {"description": "Drywall Labor", "category": "interior", "unit": "ls", "quantity": 1},
      {"description": "Interior Trim", "category": "interior", "unit": "ls", "quantity": 1},
      {"description": "Interior Doors", "category": "interior", "unit": "ea", "quantity": 12},
      {"description": "Cabinet Material (ALLOWANCE)", "category": "cabinetry_countertops", "unit": "ls", "quantity": 1},
      {"description": "Cabinet Labor", "category": "cabinetry_countertops", "unit": "ls", "quantity": 1},
      {"description": "Countertops (ALLOWANCE)", "category": "cabinetry_countertops", "unit": "sf", "quantity": 60},
      {"description": "Tile - Bathrooms", "category": "tile", "unit": "sf", "quantity": 200},
      {"description": "Tile Labor", "category": "tile", "unit": "ls", "quantity": 1},
      {"description": "Flooring Material (ALLOWANCE)", "category": "flooring", "unit": "sf", "quantity": 2000},
      {"description": "Flooring Labor", "category": "flooring", "unit": "ls", "quantity": 1},
      {"description": "Interior Painting", "category": "painting", "unit": "sf", "quantity": 8000},
      {"description": "Exterior Painting", "category": "painting", "unit": "ls", "quantity": 1},
      {"description": "Plumbing Rough-In", "category": "plumbing", "unit": "ls", "quantity": 1},
      {"description": "Plumbing Finish", "category": "plumbing", "unit": "ls", "quantity": 1},
      {"description": "Plumbing Fixtures (ALLOWANCE)", "category": "plumbing", "unit": "ls", "quantity": 1},
      {"description": "Electrical Rough-In", "category": "electrical", "unit": "ls", "quantity": 1},
      {"description": "Electrical Finish", "category": "electrical", "unit": "ls", "quantity": 1},
      {"description": "Lighting Fixtures (ALLOWANCE)", "category": "electrical", "unit": "ls", "quantity": 1},
      {"description": "HVAC System", "category": "hvac", "unit": "ls", "quantity": 1},
      {"description": "Appliances (ALLOWANCE)", "category": "appliances", "unit": "ls", "quantity": 1},
      {"description": "Driveway/Walkway", "category": "site_improvements", "unit": "sf", "quantity": 600},
      {"description": "Landscaping (ALLOWANCE)", "category": "site_improvements", "unit": "ls", "quantity": 1},
      {"description": "Waste Management", "category": "general_conditions", "unit": "ls", "quantity": 1},
      {"description": "Final Cleaning", "category": "general_conditions", "unit": "ls", "quantity": 1}
    ]'::jsonb,
    true, true
  ),
  (
    'Roofing (Full Tear-Off)',
    'roofing',
    'Complete roof tear-off and replacement — underlayment, architectural shingles, flashing, ridge vent',
    '[
      {"description": "General Conditions", "category": "general_conditions", "unit": "ls", "quantity": 1},
      {"description": "Project Coordination (Supervision)", "category": "general_conditions", "unit": "ls", "quantity": 1},
      {"description": "Building Permits", "category": "general_conditions", "unit": "ls", "quantity": 1},
      {"description": "Tear-Off Existing Roof", "category": "demolition", "unit": "sq", "quantity": 25},
      {"description": "Decking Repair/Replacement (ALLOWANCE)", "category": "roofing", "unit": "ea", "quantity": 5},
      {"description": "Synthetic Underlayment", "category": "roofing", "unit": "sq", "quantity": 25},
      {"description": "Ice & Water Shield", "category": "roofing", "unit": "lf", "quantity": 100},
      {"description": "Drip Edge", "category": "roofing", "unit": "lf", "quantity": 200},
      {"description": "Architectural Shingles (30-year)", "category": "roofing", "unit": "sq", "quantity": 25},
      {"description": "Ridge Cap Shingles", "category": "roofing", "unit": "lf", "quantity": 50},
      {"description": "Ridge Vent", "category": "roofing", "unit": "lf", "quantity": 50},
      {"description": "Pipe Boots/Flashing", "category": "roofing", "unit": "ea", "quantity": 5},
      {"description": "Step Flashing", "category": "roofing", "unit": "lf", "quantity": 30},
      {"description": "Valley Flashing", "category": "roofing", "unit": "lf", "quantity": 40},
      {"description": "Roofing Labor", "category": "roofing", "unit": "sq", "quantity": 25},
      {"description": "Waste Management", "category": "general_conditions", "unit": "ls", "quantity": 1},
      {"description": "Magnetic Nail Sweep", "category": "general_conditions", "unit": "ls", "quantity": 1},
      {"description": "Final Cleaning", "category": "general_conditions", "unit": "ls", "quantity": 1}
    ]'::jsonb,
    false, true
  ),
  (
    'Deck Build (Composite)',
    'deck',
    'New deck construction — footers, framing, composite decking, railing, stairs',
    '[
      {"description": "General Conditions", "category": "general_conditions", "unit": "ls", "quantity": 1},
      {"description": "Project Coordination (Supervision)", "category": "general_conditions", "unit": "ls", "quantity": 1},
      {"description": "Building Permits", "category": "general_conditions", "unit": "ls", "quantity": 1},
      {"description": "Demolition (existing deck)", "category": "demolition", "unit": "ls", "quantity": 1},
      {"description": "Site Prep/Grading", "category": "sitework", "unit": "ls", "quantity": 1},
      {"description": "Concrete Piers/Footings", "category": "concrete", "unit": "ea", "quantity": 12},
      {"description": "Structural Framing (posts, beams, joists)", "category": "framing", "unit": "ls", "quantity": 1},
      {"description": "Ledger Board + Flashing", "category": "framing", "unit": "lf", "quantity": 20},
      {"description": "Composite Decking Material", "category": "decking", "unit": "sf", "quantity": 300},
      {"description": "Decking Labor", "category": "decking", "unit": "ls", "quantity": 1},
      {"description": "Railing System", "category": "decking", "unit": "lf", "quantity": 60},
      {"description": "Stairs (stringers, treads, handrail)", "category": "decking", "unit": "ls", "quantity": 1},
      {"description": "Fascia Board", "category": "decking", "unit": "lf", "quantity": 60},
      {"description": "Waste Management", "category": "general_conditions", "unit": "ls", "quantity": 1},
      {"description": "Final Cleaning", "category": "general_conditions", "unit": "ls", "quantity": 1}
    ]'::jsonb,
    false, true
  ),
  (
    'Home Addition',
    'addition_remodel',
    'Room addition — foundation, framing, roof tie-in, MEP, finish. Ties into existing structure.',
    '[
      {"description": "General Conditions", "category": "general_conditions", "unit": "ls", "quantity": 1},
      {"description": "Project Coordination (Supervision)", "category": "general_conditions", "unit": "ls", "quantity": 1},
      {"description": "Building Permits", "category": "general_conditions", "unit": "ls", "quantity": 1},
      {"description": "Architectural Plans", "category": "general_conditions", "unit": "ls", "quantity": 1},
      {"description": "Site Prep/Grading/Excavation", "category": "sitework", "unit": "ls", "quantity": 1},
      {"description": "Foundation (footings + slab/crawlspace)", "category": "concrete", "unit": "ls", "quantity": 1},
      {"description": "Framing (walls, headers, ceiling joists, rafters)", "category": "framing", "unit": "ls", "quantity": 1},
      {"description": "Roof Framing + Tie-In", "category": "framing", "unit": "ls", "quantity": 1},
      {"description": "Roofing (to match existing)", "category": "roofing", "unit": "ls", "quantity": 1},
      {"description": "Exterior Sheathing + Housewrap", "category": "exterior", "unit": "ls", "quantity": 1},
      {"description": "Siding (to match existing)", "category": "exterior", "unit": "ls", "quantity": 1},
      {"description": "Windows", "category": "exterior", "unit": "ea", "quantity": 3},
      {"description": "Exterior Door", "category": "exterior", "unit": "ea", "quantity": 1},
      {"description": "Electrical Rough-In", "category": "electrical", "unit": "ls", "quantity": 1},
      {"description": "Electrical Finish", "category": "electrical", "unit": "ls", "quantity": 1},
      {"description": "Plumbing Rough-In", "category": "plumbing", "unit": "ls", "quantity": 1},
      {"description": "Plumbing Finish", "category": "plumbing", "unit": "ls", "quantity": 1},
      {"description": "HVAC Extension/Mini-Split", "category": "hvac", "unit": "ls", "quantity": 1},
      {"description": "Insulation", "category": "insulation", "unit": "ls", "quantity": 1},
      {"description": "Drywall", "category": "interior", "unit": "ls", "quantity": 1},
      {"description": "Interior Trim", "category": "interior", "unit": "ls", "quantity": 1},
      {"description": "Interior Doors", "category": "interior", "unit": "ea", "quantity": 2},
      {"description": "Flooring (ALLOWANCE)", "category": "flooring", "unit": "ls", "quantity": 1},
      {"description": "Painting (interior + exterior)", "category": "painting", "unit": "ls", "quantity": 1},
      {"description": "Concrete Flatwork (steps, walkway)", "category": "concrete", "unit": "ls", "quantity": 1},
      {"description": "Waste Management", "category": "general_conditions", "unit": "ls", "quantity": 1},
      {"description": "Final Cleaning", "category": "general_conditions", "unit": "ls", "quantity": 1}
    ]'::jsonb,
    false, true
  ),
  (
    'Interior/Exterior Painting',
    'painting',
    'Full painting scope — prep, prime, 2 coats finish. Interior walls/ceilings/trim or exterior.',
    '[
      {"description": "General Conditions", "category": "general_conditions", "unit": "ls", "quantity": 1},
      {"description": "Project Coordination (Supervision)", "category": "general_conditions", "unit": "ls", "quantity": 1},
      {"description": "Surface Prep (wash, sand, scrape, caulk)", "category": "painting", "unit": "ls", "quantity": 1},
      {"description": "Primer (bare wood, repaired areas, stain-block)", "category": "painting", "unit": "ls", "quantity": 1},
      {"description": "Wall Paint (2 coats)", "category": "painting", "unit": "sf", "quantity": 3000},
      {"description": "Ceiling Paint (2 coats, flat white)", "category": "painting", "unit": "sf", "quantity": 1500},
      {"description": "Trim/Door/Casing Paint (2 coats, semi-gloss)", "category": "painting", "unit": "ls", "quantity": 1},
      {"description": "Minor Drywall Repairs", "category": "painting", "unit": "ls", "quantity": 1},
      {"description": "Paint Material (ALLOWANCE)", "category": "painting", "unit": "gal", "quantity": 15},
      {"description": "Masking and Protection", "category": "painting", "unit": "ls", "quantity": 1},
      {"description": "Final Cleaning", "category": "general_conditions", "unit": "ls", "quantity": 1}
    ]'::jsonb,
    false, true
  )
ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════
-- SCHEDULE TEMPLATES (typical phase durations per project type)
-- ═══════════════════════════════════════

INSERT INTO schedule_templates (project_type, phases, description, is_active) VALUES
  ('new_build', '[
    {"name": "Permits & Plans", "duration_days": 14, "offset_days": 0, "dependencies": []},
    {"name": "Site Prep & Grading", "duration_days": 5, "offset_days": 14, "dependencies": ["Permits & Plans"]},
    {"name": "Foundation", "duration_days": 10, "offset_days": 19, "dependencies": ["Site Prep & Grading"]},
    {"name": "Metal Structure Erection", "duration_days": 7, "offset_days": 29, "dependencies": ["Foundation"]},
    {"name": "Roofing", "duration_days": 5, "offset_days": 36, "dependencies": ["Metal Structure Erection"]},
    {"name": "Exterior Finish (Siding/Windows/Doors)", "duration_days": 10, "offset_days": 41, "dependencies": ["Roofing"]},
    {"name": "Rough Electrical", "duration_days": 5, "offset_days": 41, "dependencies": ["Roofing"]},
    {"name": "Rough Plumbing", "duration_days": 5, "offset_days": 41, "dependencies": ["Roofing"]},
    {"name": "HVAC Rough-In", "duration_days": 5, "offset_days": 46, "dependencies": ["Rough Electrical"]},
    {"name": "Insulation", "duration_days": 3, "offset_days": 51, "dependencies": ["HVAC Rough-In"]},
    {"name": "Drywall", "duration_days": 10, "offset_days": 54, "dependencies": ["Insulation"]},
    {"name": "Interior Trim & Doors", "duration_days": 7, "offset_days": 64, "dependencies": ["Drywall"]},
    {"name": "Cabinetry & Countertops", "duration_days": 5, "offset_days": 71, "dependencies": ["Interior Trim & Doors"]},
    {"name": "Tile Work", "duration_days": 7, "offset_days": 71, "dependencies": ["Interior Trim & Doors"]},
    {"name": "Flooring", "duration_days": 5, "offset_days": 78, "dependencies": ["Tile Work"]},
    {"name": "Painting", "duration_days": 7, "offset_days": 83, "dependencies": ["Flooring"]},
    {"name": "Finish Electrical & Plumbing", "duration_days": 3, "offset_days": 90, "dependencies": ["Painting"]},
    {"name": "Appliance Install", "duration_days": 2, "offset_days": 93, "dependencies": ["Finish Electrical & Plumbing"]},
    {"name": "Site Improvements (Driveway/Landscape)", "duration_days": 5, "offset_days": 90, "dependencies": ["Painting"]},
    {"name": "Final Cleaning & Punch List", "duration_days": 3, "offset_days": 95, "dependencies": ["Appliance Install"]}
  ]'::jsonb, 'Standard new home build — 2250 SF bandominium. ~14 weeks foundation to punch list.', true),

  ('kitchen_renovation', '[
    {"name": "Demolition", "duration_days": 2, "offset_days": 0, "dependencies": []},
    {"name": "Rough Plumbing", "duration_days": 2, "offset_days": 2, "dependencies": ["Demolition"]},
    {"name": "Rough Electrical", "duration_days": 2, "offset_days": 2, "dependencies": ["Demolition"]},
    {"name": "Drywall Patching", "duration_days": 2, "offset_days": 4, "dependencies": ["Rough Plumbing", "Rough Electrical"]},
    {"name": "Cabinet Installation", "duration_days": 3, "offset_days": 6, "dependencies": ["Drywall Patching"]},
    {"name": "Countertop Fabrication & Install", "duration_days": 5, "offset_days": 9, "dependencies": ["Cabinet Installation"]},
    {"name": "Backsplash Tile", "duration_days": 3, "offset_days": 14, "dependencies": ["Countertop Fabrication & Install"]},
    {"name": "Flooring", "duration_days": 2, "offset_days": 17, "dependencies": ["Backsplash Tile"]},
    {"name": "Painting", "duration_days": 2, "offset_days": 19, "dependencies": ["Flooring"]},
    {"name": "Finish Plumbing & Electrical", "duration_days": 2, "offset_days": 21, "dependencies": ["Painting"]},
    {"name": "Appliance Install", "duration_days": 1, "offset_days": 23, "dependencies": ["Finish Plumbing & Electrical"]},
    {"name": "Final Cleaning & Punch List", "duration_days": 1, "offset_days": 24, "dependencies": ["Appliance Install"]}
  ]'::jsonb, 'Standard kitchen renovation — 4-5 weeks demo to punch list.', true),

  ('bathroom_renovation', '[
    {"name": "Demolition", "duration_days": 2, "offset_days": 0, "dependencies": []},
    {"name": "Rough Plumbing", "duration_days": 2, "offset_days": 2, "dependencies": ["Demolition"]},
    {"name": "Rough Electrical", "duration_days": 1, "offset_days": 2, "dependencies": ["Demolition"]},
    {"name": "Waterproofing & Cement Board", "duration_days": 2, "offset_days": 4, "dependencies": ["Rough Plumbing"]},
    {"name": "Shower Tile", "duration_days": 4, "offset_days": 6, "dependencies": ["Waterproofing & Cement Board"]},
    {"name": "Floor Tile", "duration_days": 2, "offset_days": 10, "dependencies": ["Shower Tile"]},
    {"name": "Vanity & Mirror", "duration_days": 1, "offset_days": 12, "dependencies": ["Floor Tile"]},
    {"name": "Painting", "duration_days": 1, "offset_days": 13, "dependencies": ["Vanity & Mirror"]},
    {"name": "Finish Plumbing & Electrical", "duration_days": 1, "offset_days": 14, "dependencies": ["Painting"]},
    {"name": "Glass Shower Door", "duration_days": 1, "offset_days": 15, "dependencies": ["Finish Plumbing & Electrical"]},
    {"name": "Accessories & Punch List", "duration_days": 1, "offset_days": 16, "dependencies": ["Glass Shower Door"]}
  ]'::jsonb, 'Standard bathroom renovation — 2.5-3 weeks demo to punch list.', true),

  ('roofing', '[
    {"name": "Material Delivery", "duration_days": 1, "offset_days": 0, "dependencies": []},
    {"name": "Tear-Off", "duration_days": 1, "offset_days": 1, "dependencies": ["Material Delivery"]},
    {"name": "Decking Inspection & Repair", "duration_days": 1, "offset_days": 2, "dependencies": ["Tear-Off"]},
    {"name": "Underlayment & Ice Shield", "duration_days": 1, "offset_days": 3, "dependencies": ["Decking Inspection & Repair"]},
    {"name": "Shingle Installation", "duration_days": 2, "offset_days": 4, "dependencies": ["Underlayment & Ice Shield"]},
    {"name": "Ridge Cap & Flashing", "duration_days": 1, "offset_days": 6, "dependencies": ["Shingle Installation"]},
    {"name": "Cleanup & Nail Sweep", "duration_days": 1, "offset_days": 7, "dependencies": ["Ridge Cap & Flashing"]}
  ]'::jsonb, 'Standard roof replacement — 1 week tear-off to cleanup.', true),

  ('porch', '[
    {"name": "Demolition (if applicable)", "duration_days": 2, "offset_days": 0, "dependencies": []},
    {"name": "Foundation/Footings", "duration_days": 3, "offset_days": 2, "dependencies": ["Demolition (if applicable)"]},
    {"name": "Framing", "duration_days": 5, "offset_days": 5, "dependencies": ["Foundation/Footings"]},
    {"name": "Roofing Tie-In", "duration_days": 3, "offset_days": 10, "dependencies": ["Framing"]},
    {"name": "Electrical", "duration_days": 2, "offset_days": 13, "dependencies": ["Roofing Tie-In"]},
    {"name": "Screening/Exterior Finish", "duration_days": 3, "offset_days": 13, "dependencies": ["Roofing Tie-In"]},
    {"name": "Ceiling & Trim", "duration_days": 3, "offset_days": 16, "dependencies": ["Screening/Exterior Finish"]},
    {"name": "Painting & Cleanup", "duration_days": 2, "offset_days": 19, "dependencies": ["Ceiling & Trim"]}
  ]'::jsonb, 'Standard porch build — 3 weeks foundation to finish.', true)
ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════
-- LABOR RATE PRESETS (SE US market rates 2025-2026)
-- ═══════════════════════════════════════

INSERT INTO labor_rate_presets (trade, role, hourly_rate, overtime_rate, is_default) VALUES
  ('general', 'helper', 18.00, 27.00, false),
  ('general', 'journeyman', 28.00, 42.00, true),
  ('general', 'foreman', 35.00, 52.50, false),
  ('framing', 'journeyman', 32.00, 48.00, true),
  ('framing', 'foreman', 40.00, 60.00, false),
  ('electrical', 'journeyman', 35.00, 52.50, true),
  ('electrical', 'master', 50.00, 75.00, false),
  ('plumbing', 'journeyman', 35.00, 52.50, true),
  ('plumbing', 'master', 50.00, 75.00, false),
  ('hvac', 'journeyman', 32.00, 48.00, true),
  ('hvac', 'master', 48.00, 72.00, false),
  ('drywall', 'journeyman', 25.00, 37.50, true),
  ('painting', 'journeyman', 22.00, 33.00, true),
  ('flooring', 'journeyman', 28.00, 42.00, true),
  ('roofing', 'journeyman', 30.00, 45.00, true),
  ('concrete', 'journeyman', 30.00, 45.00, true),
  ('tile', 'journeyman', 32.00, 48.00, true),
  ('finish_carpentry', 'journeyman', 35.00, 52.50, true),
  ('insulation', 'journeyman', 22.00, 33.00, true),
  ('landscaping', 'journeyman', 20.00, 30.00, true),
  ('demolition', 'journeyman', 22.00, 33.00, true),
  ('siding', 'journeyman', 28.00, 42.00, true),
  ('gutters', 'journeyman', 25.00, 37.50, true)
ON CONFLICT DO NOTHING;
