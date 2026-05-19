import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { hasOrgWideCampaignAccess } from "@/lib/auth/tl-access";
import { fetchUserRoleNames } from "@/lib/auth/server-roles";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("users")
      .select("organization_id")
      .eq("id", user.id)
      .single();

    const orgId = (profile as { organization_id: string | null } | null)?.organization_id;
    if (!orgId) {
      return NextResponse.json({ error: "No organization" }, { status: 400 });
    }

    const roleNames = await fetchUserRoleNames(supabase, user.id);
    const seeAllOrgCampaigns = hasOrgWideCampaignAccess(roleNames);

    let campaignsQuery = supabase
      .from("campaigns")
      .select("id, status")
      .eq("organization_id", orgId);
    if (!seeAllOrgCampaigns) {
      campaignsQuery = campaignsQuery.eq("assigned_team_leader_id", user.id);
    }

    const [campaignsRes, leadsRes] = await Promise.all([
      campaignsQuery,
      supabase
        .from("leads")
        .select("id, status, campaign_id, created_at")
        .eq("organization_id", orgId),
    ]);

    type CampaignRow = { id: string; status: string };
    type LeadRow = {
      id: string;
      status: string;
      campaign_id: string | null;
      created_at: string;
    };

    const campaigns = (campaignsRes.data ?? []) as CampaignRow[];
    const assignedCampaignIds = new Set(campaigns.map((c) => c.id));
    const leads = ((leadsRes.data ?? []) as LeadRow[]).filter((l) =>
      l.campaign_id ? assignedCampaignIds.has(l.campaign_id) : false
    );

    const totalCampaigns = campaigns.length;
    const activeCampaigns = campaigns.filter((c) => c.status === "active").length;
    const totalLeads = leads.length;
    const totalInterested = leads.filter((l) =>
      ["interested", "followup", "closed_won"].includes(l.status)
    ).length;
    const closedWon = leads.filter((l) => l.status === "closed_won").length;
    const conversionPct = totalLeads > 0 ? Math.round((closedWon / totalLeads) * 100) : 0;

    // Build last 7 days lead trend for active campaigns (day-wise)
    const today = new Date();
    const dayBuckets: { key: string; label: string }[] = [];
    for (let i = 6; i >= 0; i -= 1) {
      const d = new Date(today);
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10); // YYYY-MM-DD
      const label = d.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
      });
      dayBuckets.push({ key, label });
    }

    const campaignById: Record<string, CampaignRow> = {};
    campaigns.forEach((c) => {
      campaignById[c.id] = c;
    });

    const trendMap: Record<
      string,
      { date: string; leads: number; campaignIds: Set<string> }
    > = {};
    dayBuckets.forEach(({ key, label }) => {
      trendMap[key] = { date: label, leads: 0, campaignIds: new Set<string>() };
    });

    leads.forEach((l) => {
      const createdKey = l.created_at?.slice(0, 10);
      if (!createdKey || !(createdKey in trendMap)) return;

      const campaignId = l.campaign_id ?? "";
      if (!campaignId) return;
      const campaign = campaignById[campaignId];
      if (!campaign || campaign.status !== "active") return;

      const bucket = trendMap[createdKey];
      bucket.leads += 1;
      bucket.campaignIds.add(campaignId);
    });

    const leadTrend = dayBuckets.map(({ key }) => {
      const bucket = trendMap[key];
      return {
        date: bucket.date,
        leads: bucket.leads,
        campaigns: bucket.campaignIds.size,
      };
    });

    return NextResponse.json({
      totalCampaigns,
      activeCampaigns,
      totalLeads,
      totalInterested,
      conversionPct,
      leadTrend,
    });
  } catch (err) {
    console.error("Fetch campaign stats error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
