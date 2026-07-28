import type { createClient } from "@/lib/supabase/server";
import { getAllowedCampaignIdsForClientViewer } from "@/lib/command/db";

type SupabaseServer = Awaited<ReturnType<typeof createClient>>;

/** Per-email campaign allowlists for client_viewer (default scope is bound client_id). */
const CLIENT_VIEWER_EMAIL_CAMPAIGN_OVERRIDES: Record<string, readonly string[]> = {
  "kstagnito2@rh-hub.com": [
    "4562aeae-e14b-4c24-b6c5-c63c9d9e8bbb", // Fierce Biotech – BIO Preview 2026
    "92e6bc07-b9f8-49e0-829b-fe39c6ac5f72", // PMMI Media Group - Columbia Machine, Inc.; ...
    "06038f73-3764-4300-a6c8-81a157674a65", // Broadsign Pilot - MQL Content Syndication
  ],
};

const NO_ACCESS_CAMPAIGN_ID = "00000000-0000-0000-0000-000000000000";

export type ClientViewerCampaignScope =
  | { mode: "none" }
  | { mode: "client"; clientId: string }
  | { mode: "campaign_ids"; campaignIds: string[] };

function normalizeEmail(email: string | null | undefined): string {
  return (email ?? "").trim().toLowerCase();
}

export function getClientViewerEmailCampaignOverride(
  email: string | null | undefined
): string[] | null {
  const ids = CLIENT_VIEWER_EMAIL_CAMPAIGN_OVERRIDES[normalizeEmail(email)];
  return ids ? [...ids] : null;
}

export function buildClientViewerCampaignScope(
  email: string | null | undefined,
  clientId: string | null | undefined
): ClientViewerCampaignScope {
  const override = getClientViewerEmailCampaignOverride(email);
  if (override) return { mode: "campaign_ids", campaignIds: override };
  if (clientId) return { mode: "client", clientId };
  return { mode: "none" };
}

export function clientViewerScopeHasAccess(scope: ClientViewerCampaignScope): boolean {
  return scope.mode !== "none";
}

export function clientViewerCanAccessCampaign(
  scope: ClientViewerCampaignScope,
  campaignId: string,
  campaignClientId?: string | null
): boolean {
  if (scope.mode === "none") return false;
  if (scope.mode === "campaign_ids") return scope.campaignIds.includes(campaignId);
  return campaignClientId === scope.clientId;
}

type ScopedQuery = {
  eq: (column: string, value: string) => ScopedQuery;
  in: (column: string, values: string[]) => ScopedQuery;
};

/** Restrict a campaigns list query for client_viewer. */
export function applyClientViewerCampaignListScope<T extends ScopedQuery>(
  query: T,
  scope: ClientViewerCampaignScope
): T {
  if (scope.mode === "client") {
    return query.eq("client_id", scope.clientId) as T;
  }
  if (scope.mode === "campaign_ids") {
    return query.in("id", scope.campaignIds) as T;
  }
  return query.in("id", [NO_ACCESS_CAMPAIGN_ID]) as T;
}

/** Restrict a leads query for client_viewer (by campaign_id or joined campaigns.client_id). */
export function applyClientViewerLeadScope<T extends ScopedQuery>(
  query: T,
  scope: ClientViewerCampaignScope,
  opts?: { joinOnCampaigns?: boolean }
): T {
  if (scope.mode === "campaign_ids") {
    return query.in("campaign_id", scope.campaignIds) as T;
  }
  if (scope.mode === "client") {
    if (opts?.joinOnCampaigns) {
      return query.eq("campaigns.client_id", scope.clientId) as T;
    }
    return query.in("campaign_id", [NO_ACCESS_CAMPAIGN_ID]) as T;
  }
  if (opts?.joinOnCampaigns) {
    return query.eq("campaigns.client_id", "__no_client__") as T;
  }
  return query.in("campaign_id", [NO_ACCESS_CAMPAIGN_ID]) as T;
}

export async function guardClientViewerCampaign(
  supabase: SupabaseServer,
  scope: ClientViewerCampaignScope,
  campaignId: string
): Promise<boolean> {
  if (scope.mode === "none") return false;
  if (scope.mode === "campaign_ids") {
    return scope.campaignIds.includes(campaignId);
  }
  const { data } = await supabase
    .from("campaigns")
    .select("id")
    .eq("id", campaignId)
    .eq("client_id", scope.clientId)
    .maybeSingle();
  return !!data;
}

export async function guardClientViewerLead(
  supabase: SupabaseServer,
  scope: ClientViewerCampaignScope,
  leadId: string
): Promise<boolean> {
  if (scope.mode === "none") return false;
  if (scope.mode === "campaign_ids") {
    const { data } = await supabase
      .from("leads")
      .select("id")
      .eq("id", leadId)
      .in("campaign_id", scope.campaignIds)
      .maybeSingle();
    return !!data;
  }
  const { data } = await supabase
    .from("leads")
    .select("id, campaigns!inner(client_id)")
    .eq("id", leadId)
    .eq("campaigns.client_id", scope.clientId)
    .maybeSingle();
  return !!data;
}

/** Campaign ids visible to client_viewer (bound client or per-email override). */
export async function getClientViewerCampaignIds(
  supabase: SupabaseServer,
  organizationId: string,
  clientId: string | null,
  email?: string | null
): Promise<string[]> {
  const override = getClientViewerEmailCampaignOverride(email);
  if (override) return override;
  if (!clientId) return [];
  return getAllowedCampaignIdsForClientViewer(supabase, organizationId, clientId);
}
