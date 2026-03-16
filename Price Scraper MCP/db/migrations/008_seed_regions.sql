INSERT INTO regions (name, display_name, zip_codes) VALUES
  ('northeast', 'Northeast', ARRAY['10001', '02101', '19103', '06103', '07102']),
  ('southeast', 'Southeast', ARRAY['30301', '33101', '27601', '28201', '32801']),
  ('midwest', 'Midwest', ARRAY['60601', '48201', '43215', '55401', '63101']),
  ('south', 'South', ARRAY['75201', '77001', '37201', '70112', '73101']),
  ('west', 'West', ARRAY['80201', '85001', '84101', '87101', '89101']),
  ('pacific', 'Pacific', ARRAY['90001', '94102', '97201', '98101', '96801'])
ON CONFLICT (name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  zip_codes = EXCLUDED.zip_codes;
