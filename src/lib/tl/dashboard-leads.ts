import type { SupabaseClient } from "@supabase/supabase-js";

const LEADS_PAGE_SIZE = 1000;

const TL_DASHBOARD_LEAD_SELECT =
  "id, status, qa_status, delivery_status, campaign_id, created_at";

export type TlDashboardLeadRow = {
  id: string;
  status: string;
  qa_status: string | null;
  delivery_status: string | null;
  campaign_id: string | null;
  created_at: string;
};

/** Paginated fetch — Supabase returns at most 1000 rows per request. */
export async function fetchTlDashboardLeads(
  supabase: SupabaseClient,
  orgId: string,
  campaignIds: string[]
): Promise<TlDashboardLeadRow[]> {
  if (campaignIds.length === 0) return [];

  const all: TlDashboardLeadRow[] = [];
  let offset = 0;

  for (;;) {
    const { data, error } = await supabase
      .from("leads")
      .select(TL_DASHBOARD_LEAD_SELECT)
      .eq("organization_id", orgId)
      .in("campaign_id", campaignIds)
      .order("created_at", { ascending: true })
      .range(offset, offset + LEADS_PAGE_SIZE - 1);

    if (error) throw new Error(error.message);

    const chunk = (data ?? []) as TlDashboardLeadRow[];
    all.push(...chunk);
    if (chunk.length < LEADS_PAGE_SIZE) break;
    offset += LEADS_PAGE_SIZE;
  }

  return all;
}

export function tallyTlDashboardLeadCounts(
  leads: TlDashboardLeadRow[]
): Record<string, { total: number; qualified: number; delivered: number }> {
  const byCampaign: Record<string, { total: number; qualified: number; delivered: number }> = {};

  for (const l of leads) {
    const campaignId = l.campaign_id;
    if (!campaignId) continue;

    if (!byCampaign[campaignId]) {
      byCampaign[campaignId] = { total: 0, qualified: 0, delivered: 0 };
    }
    const bucket = byCampaign[campaignId];
    bucket.total += 1;

    const qa = String(l.qa_status ?? "").trim().toLowerCase();
    if (qa === "qualified" || qa === "approved" || qa === "pass") {
      bucket.qualified += 1;
    }
    if (String(l.delivery_status ?? "").trim().toLowerCase() === "delivered") {
      bucket.delivered += 1;
    }
  }

  return byCampaign;
}
