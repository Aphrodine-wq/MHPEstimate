"use client";

import { createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode } from "react";
import { supabase } from "./supabase";
import type { FeatureFlags } from "@proestimate/shared/feature-flags";
import { resolveFlags, isFeatureEnabled as checkFeature, DEFAULT_FLAGS } from "@proestimate/shared/feature-flags";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Organization {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  phone: string | null;
  email: string | null;
  address_line1: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  website: string | null;
}

interface OrgContextValue {
  /** The current organization (null while loading or when unauthenticated) */
  organization: Organization | null;
  /** Resolved feature flags for the org */
  flags: FeatureFlags;
  /** Whether the org/flags data is still loading */
  loading: boolean;
  /** Check if a specific feature is enabled for the current org */
  isFeatureEnabled: (feature: keyof FeatureFlags) => boolean;
  /** Re-fetch org data from the server */
  refresh: () => Promise<void>;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const OrgContext = createContext<OrgContextValue>({
  organization: null,
  flags: DEFAULT_FLAGS,
  loading: true,
  isFeatureEnabled: () => true,
  refresh: async () => {},
});

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function OrgProvider({ children }: { children: ReactNode }) {
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [flags, setFlags] = useState<FeatureFlags>(DEFAULT_FLAGS);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    try {
      // Get authenticated user
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) {
        setLoading(false);
        return;
      }

      // Try to load org from org_members -> organizations
      const { data: membership } = await supabase
        .from("org_members")
        .select("organization_id")
        .eq("user_id", authData.user.id)
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();

      if (membership?.organization_id) {
        const { data: org } = await supabase
          .from("organizations")
          .select("*")
          .eq("id", membership.organization_id)
          .single();

        if (org) {
          setOrganization(org as Organization);
        }

        // Load subscription to get plan features
        const { data: sub } = await supabase
          .from("subscriptions")
          .select("plan_id")
          .eq("organization_id", membership.organization_id)
          .eq("status", "active")
          .maybeSingle();

        // Load org-level feature overrides from company_settings
        const { data: settingsRow } = await supabase
          .from("company_settings")
          .select("value")
          .eq("key", "feature_flags")
          .maybeSingle();

        const planFeatures = sub?.plan_id
          ? (await import("@proestimate/shared/feature-flags")).PLAN_FEATURES[sub.plan_id as string]
          : undefined;

        const remote = settingsRow?.value as Partial<FeatureFlags> | undefined;

        setFlags(resolveFlags(remote, planFeatures));
      } else {
        // No org — use defaults
        setFlags(DEFAULT_FLAGS);
      }
    } catch (err) {
      console.error("[OrgProvider] Failed to load org data:", err);
      setFlags(DEFAULT_FLAGS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const isFeatureEnabledFn = useCallback(
    (feature: keyof FeatureFlags) => checkFeature(flags, feature),
    [flags],
  );

  const value = useMemo<OrgContextValue>(
    () => ({
      organization,
      flags,
      loading,
      isFeatureEnabled: isFeatureEnabledFn,
      refresh,
    }),
    [organization, flags, loading, isFeatureEnabledFn, refresh],
  );

  return <OrgContext.Provider value={value}>{children}</OrgContext.Provider>;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useOrg() {
  return useContext(OrgContext);
}
