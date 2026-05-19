import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { hasOrgWideCampaignAccess } from "@/lib/auth/tl-access";
import { fetchUserRoleNames } from "@/lib/auth/server-roles";
import { resolveUserDisplayNames } from "@/lib/campaign/team-leader-display";

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
      .select(`
        id, campaign_id, campaign_code, name, client_name, client_id, description, industry, geography, lead_type, status,
        start_date, end_date, cpl, revenue, booked, total_allocation, post_qa, achieved,
        pending_allocation, region, weekly_call, weekly_report, additional_comments,
        assigned_team_leader_id, created_by, created_at
      `)
      .eq("organization_id", orgId);

    if (!seeAllOrgCampaigns) {
      campaignsQuery = campaignsQuery.eq("assigned_team_leader_id", user.id);
    }

    const { data: campaigns, error: campaignsError } = await campaignsQuery.order(
      "created_at",
      { ascending: false }
    );

    if (campaignsError) {
      return NextResponse.json({ error: campaignsError.message }, { status: 500 });
    }

    type CampaignRow = { id: string; campaign_id: string; campaign_code: string | null; client_id: string | null; name: string; client_name: string | null; description: string | null; industry: string | null; geography: string | null; lead_type: string | null; status: string; start_date: string | null; end_date: string | null; cpl: number | null; revenue: number | null; booked: number | null; total_allocation: number | null; post_qa: number | null; achieved: number | null; pending_allocation: number | null; region: string | null; weekly_call: string | null; weekly_report: string | null; additional_comments: string | null; assigned_team_leader_id: string | null; created_by: string | null; created_at: string };
    const campaignsList = (campaigns ?? []) as CampaignRow[];

    // Resolve assigned team leader names only (no creator/client fallback)
    const tlIds = [
      ...new Set(campaignsList.map((c) => c.assigned_team_leader_id).filter(Boolean)),
    ] as string[];
    const tlNames = tlIds.length > 0 ? await resolveUserDisplayNames(supabase, tlIds) : {};

    const campaignIds = campaignsList.map((c) => c.id);
    const [leadsRes, assignmentsRes] = await Promise.all([
      campaignIds.length > 0
        ? supabase
            .from("leads")
            .select("campaign_id, qa_status")
            .in("campaign_id", campaignIds)
        : { data: [] as { campaign_id: string; qa_status: string | null }[] },
      campaignIds.length > 0
        ? supabase
            .from("campaign_assignments")
            .select("campaign_id")
            .in("campaign_id", campaignIds)
            .eq("is_active", true)
        : { data: [] as { campaign_id: string }[] },
    ]);

    const leadsByCampaign: Record<string, { total: number; qualified: number }> = {};
    (leadsRes.data ?? []).forEach((l) => {
      if (!leadsByCampaign[l.campaign_id]) {
        leadsByCampaign[l.campaign_id] = { total: 0, qualified: 0 };
      }
      leadsByCampaign[l.campaign_id].total += 1;

      const qa = String(l.qa_status ?? "").trim().toLowerCase();
      if (qa === "qualified") {
        leadsByCampaign[l.campaign_id].qualified += 1;
      }
    });

    const agentsByCampaign: Record<string, number> = {};
    (assignmentsRes.data ?? []).forEach((a) => {
      agentsByCampaign[a.campaign_id] = (agentsByCampaign[a.campaign_id] ?? 0) + 1;
    });

    const campaignsWithCounts = campaignsList.map((c) => {
      const tlName = c.assigned_team_leader_id
        ? tlNames[c.assigned_team_leader_id] ?? null
        : null;
      const leadCounts = leadsByCampaign[c.id];
      return {
        ...c,
        assigned_team_leader_name: tlName,
        total_leads: leadCounts?.total ?? 0,
        total_agents: agentsByCampaign[c.id] ?? 0,
        qualified_leads: leadCounts?.qualified ?? 0,
      };
    });

    return NextResponse.json({ campaigns: campaignsWithCounts });
  } catch (err) {
    console.error("Fetch campaigns error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
