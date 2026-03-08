-- Enable realtime for company_settings so settings sync across clients
ALTER PUBLICATION supabase_realtime ADD TABLE company_settings;
ALTER TABLE company_settings REPLICA IDENTITY FULL;
