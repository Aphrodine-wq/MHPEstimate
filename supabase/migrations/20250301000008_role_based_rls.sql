-- ═══════════════════════════════════════
-- ROLE-BASED RLS — Enforce team member roles
-- ═══════════════════════════════════════
--
-- This migration replaces the broad "any authenticated user" policies
-- with role-based access control using the team_members.role column.
--
-- Role hierarchy:
--   owner  > admin > pm > estimator/sales/field_tech
--
-- Helper function to get the current user's role from team_members.

-- ── Helper function ──

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT role FROM public.team_members WHERE auth_id = auth.uid() LIMIT 1;
$$;

-- ── Helper function: check if user has admin-level access ──

CREATE OR REPLACE FUNCTION public.is_admin_or_owner()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.team_members
    WHERE auth_id = auth.uid()
    AND role IN ('admin', 'owner')
  );
$$;

-- ── Helper function: check if user has management-level access ──

CREATE OR REPLACE FUNCTION public.is_manager_or_above()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.team_members
    WHERE auth_id = auth.uid()
    AND role IN ('admin', 'owner', 'pm')
  );
$$;

-- ═══════════════════════════════════════
-- Replace broad policies with role-based ones
-- ═══════════════════════════════════════

-- ── Team Members: only admins/owners can insert/delete ──

DROP POLICY IF EXISTS "Authenticated users can insert team members" ON team_members;

CREATE POLICY "Admins can insert team members"
    ON team_members FOR INSERT
    TO authenticated
    WITH CHECK (public.is_admin_or_owner());

CREATE POLICY "Admins can delete team members"
    ON team_members FOR DELETE
    TO authenticated
    USING (public.is_admin_or_owner());

-- ── Estimates: estimators can only update their own, PMs+ can update any ──

DROP POLICY IF EXISTS "Authenticated users can delete estimates" ON estimates;

CREATE POLICY "Managers can delete estimates"
    ON estimates FOR DELETE
    TO authenticated
    USING (public.is_manager_or_above());

-- ── Products: only PMs+ can modify products ──

DROP POLICY IF EXISTS "Authenticated users can insert products" ON products;
DROP POLICY IF EXISTS "Authenticated users can update products" ON products;

CREATE POLICY "Managers can insert products"
    ON products FOR INSERT
    TO authenticated
    WITH CHECK (public.is_manager_or_above());

CREATE POLICY "Managers can update products"
    ON products FOR UPDATE
    TO authenticated
    USING (public.is_manager_or_above());

-- ── Company Settings: only admins/owners can modify ──

DROP POLICY IF EXISTS "Authenticated users can insert company settings" ON company_settings;
DROP POLICY IF EXISTS "Authenticated users can update company settings" ON company_settings;

CREATE POLICY "Admins can insert company settings"
    ON company_settings FOR INSERT
    TO authenticated
    WITH CHECK (public.is_admin_or_owner());

CREATE POLICY "Admins can update company settings"
    ON company_settings FOR UPDATE
    TO authenticated
    USING (public.is_admin_or_owner());

-- ── Pricing: only PMs+ can modify unified pricing ──

DROP POLICY IF EXISTS "Authenticated users can upsert unified pricing" ON unified_pricing;
DROP POLICY IF EXISTS "Authenticated users can update unified pricing" ON unified_pricing;

CREATE POLICY "Managers can upsert unified pricing"
    ON unified_pricing FOR INSERT
    TO authenticated
    WITH CHECK (public.is_manager_or_above());

CREATE POLICY "Managers can update unified pricing"
    ON unified_pricing FOR UPDATE
    TO authenticated
    USING (public.is_manager_or_above());

-- ── Audit log table for sensitive operations ──

CREATE TABLE IF NOT EXISTS public.audit_log (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id),
    team_member_id uuid REFERENCES public.team_members(id),
    action text NOT NULL,
    table_name text NOT NULL,
    record_id uuid,
    old_data jsonb,
    new_data jsonb,
    ip_address inet,
    created_at timestamptz DEFAULT now()
);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read audit log"
    ON audit_log FOR SELECT
    TO authenticated
    USING (public.is_admin_or_owner());

CREATE POLICY "System can insert audit log"
    ON audit_log FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE INDEX idx_audit_log_created_at ON audit_log(created_at DESC);
CREATE INDEX idx_audit_log_action ON audit_log(action);
CREATE INDEX idx_audit_log_table ON audit_log(table_name);

-- ── Audit trigger function ──

CREATE OR REPLACE FUNCTION public.audit_trigger_func()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.audit_log (user_id, action, table_name, record_id, old_data, new_data)
    VALUES (
        auth.uid(),
        TG_OP,
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END,
        CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END
    );
    RETURN COALESCE(NEW, OLD);
END;
$$;

-- ── Attach audit triggers to sensitive tables ──

CREATE TRIGGER audit_estimates
    AFTER INSERT OR UPDATE OR DELETE ON estimates
    FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

CREATE TRIGGER audit_company_settings
    AFTER INSERT OR UPDATE OR DELETE ON company_settings
    FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

CREATE TRIGGER audit_team_members
    AFTER INSERT OR UPDATE OR DELETE ON team_members
    FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();
