import type { SupabaseClient } from "@supabase/supabase-js";

type CampaignAllocationFields = {
  total_allocation?: number | null;
  achieved?: number | null;
  pending_allocation?: number | null;
};

/** Prefer stored achieved; otherwise use uploaded lead count (command list behavior). */
export function resolveCampaignAchieved(
  campaign: CampaignAllocationFields,
  leadCount?: number | null
): number {
  if (campaign.achieved != null && !Number.isNaN(Number(campaign.achieved))) {
    return Number(campaign.achieved);
  }
  return Math.max(0, leadCount ?? 0);
}

export function resolveCampaignPendingAllocation(
  campaign: CampaignAllocationFields,
  leadCount?: number | null
): number {
  const totalAllocation = Number(campaign.total_allocation ?? 0) || 0;
  const achieved = resolveCampaignAchieved(campaign, leadCount);
  return Math.max(0, totalAllocation - achieved);
}

export function enrichCampaignAllocationFields<T extends object>(
  campaign: T,
  leadCount?: number | null
): T & { achieved: number; pending_allocation: number } {
  const fields = campaign as CampaignAllocationFields;
  const achieved = resolveCampaignAchieved(fields, leadCount);
  const pending_allocation = resolveCampaignPendingAllocation(fields, leadCount);
  return { ...campaign, achieved, pending_allocation };
}

export async function countCampaignLeads(
  supabase: SupabaseClient,
  campaignId: string,
  orgId?: string
): Promise<number> {
  let query = supabase
    .from("leads")
    .select("id", { count: "exact", head: true })
    .eq("campaign_id", campaignId);
  if (orgId) {
    query = query.eq("organization_id", orgId);
  }
  const { count, error } = await query;
  if (error) throw new Error(error.message);
  return count ?? 0;
}
