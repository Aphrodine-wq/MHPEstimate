-- Enable Supabase Realtime on tables that need live sync across web + desktop
-- This adds tables to the supabase_realtime publication so Postgres changes
-- are broadcast to connected clients.

ALTER PUBLICATION supabase_realtime ADD TABLE estimates;
ALTER PUBLICATION supabase_realtime ADD TABLE estimate_line_items;
ALTER PUBLICATION supabase_realtime ADD TABLE estimate_change_orders;
ALTER PUBLICATION supabase_realtime ADD TABLE clients;
ALTER PUBLICATION supabase_realtime ADD TABLE products;
ALTER PUBLICATION supabase_realtime ADD TABLE unified_pricing;
ALTER PUBLICATION supabase_realtime ADD TABLE invoices;

-- Enable REPLICA IDENTITY FULL on tables where we need the old row data on DELETE
-- Without this, DELETE payloads only contain the primary key
ALTER TABLE estimates REPLICA IDENTITY FULL;
ALTER TABLE estimate_line_items REPLICA IDENTITY FULL;
ALTER TABLE estimate_change_orders REPLICA IDENTITY FULL;
ALTER TABLE clients REPLICA IDENTITY FULL;
ALTER TABLE invoices REPLICA IDENTITY FULL;
