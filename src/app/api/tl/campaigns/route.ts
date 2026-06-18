import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { hasOrgWideCampaignAccess } from "@/lib/auth/tl-access";
import { enrichCampaignAllocationFields, MIS_DELIVERED_ACHIEVED_OPTIONS } from "@/lib/campaign-allocation";
import { fetchUserRoleNames } from "@/lib/auth/server-roles";
import {
  fetchBulkCampaignTeamLeaderAssignments,
  fetchCampaignIdsForTeamLeader,
  formatTeamLeaderAssignmentLabel,
} from "@/lib/campaign/team-leader-assignments";
import { aggregateTlLeadCountsByCampaign } from "@/lib/tl/dashboard-leads";
import { postgrestOrIlikeFilters } from "@/lib/postgrest-filter";
import { buildPaginationMeta, parseListPagination } from "@/lib/api-pagination";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
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

    const { page, limit, offset } = parseListPagination(request.nextUrl.searchParams);
    const statusFilter = request.nextUrl.searchParams.get("status")?.trim() || null;
    const searchRaw = request.nextUrl.searchParams.get("q")?.trim() || "";

    const roleNames = await fetchUserRoleNames(supabase, user.id);
    const seeAllOrgCampaigns = hasOrgWideCampaignAccess(roleNames);

    let campaignsQuery = supabase
      .from("campaigns")
      .select(
        `
        id, campaign_id, campaign_code, name, client_name, client_id, description, industry, geography, lead_type, status,
        start_date, end_date, cpl, revenue, booked, total_allocation, post_qa, achieved,
        pending_allocation, weekly_call, weekly_report, additional_comments,
        assigned_team_leader_id, created_by, created_at
      `,
        { count: "exact" }
      )
      .eq("organization_id", orgId);

    if (!seeAllOrgCampaigns) {
      const junctionCampaignIds = await fetchCampaignIdsForTeamLeader(supabase, user.id, orgId);
      if (junctionCampaignIds.length > 0) {
        const idList = junctionCampaignIds.map((id) => `"${id}"`).join(",");
        campaignsQuery = campaignsQuery.or(
          `assigned_team_leader_id.eq.${user.id},id.in.(${idList})`
        );
      } else {
        campaignsQuery = campaignsQuery.eq("assigned_team_leader_id", user.id);
      }
    }

    if (statusFilter) {
      campaignsQuery = campaignsQuery.eq("status", statusFilter);
    }

    if (searchRaw.length > 0) {
      const orFilter = postgrestOrIlikeFilters(
        ["name", "campaign_code", "industry", "geography", "client_name"],
        searchRaw
      );
      if (orFilter) campaignsQuery = campaignsQuery.or(orFilter);
    }

    const { data: campaigns, error: campaignsError, count } = await campaignsQuery
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (campaignsError) {
      return NextResponse.json({ error: campaignsError.message }, { status: 500 });
    }

    type CampaignRow = {
      id: string;
      campaign_id: string;
      campaign_code: string | null;
      client_id: string | null;
      name: string;
      client_name: string | null;
      description: string | null;
      industry: string | null;
      geography: string | null;
      lead_type: string | null;
      status: string;
      start_date: string | null;
      end_date: string | null;
      cpl: number | null;
      revenue: number | null;
      booked: number | null;
      total_allocation: number | null;
      post_qa: number | null;
      achieved: number | null;
      pending_allocation: number | null;
      weekly_call: string | null;
      weekly_report: string | null;
      additional_comments: string | null;
      assigned_team_leader_id: string | null;
      created_by: string | null;
      created_at: string;
    };
    const campaignsList = (campaigns ?? []) as CampaignRow[];
    const total = count ?? campaignsList.length;
    const campaignIds = campaignsList.map((c) => c.id);

    const [tlAssignmentsByCampaign, leadsByCampaign, assignmentsRes] = await Promise.all([
      fetchBulkCampaignTeamLeaderAssignments(supabase, campaignsList),
      aggregateTlLeadCountsByCampaign(supabase, orgId, campaignIds),
      campaignIds.length > 0
        ? supabase
            .from("campaign_assignments")
            .select("campaign_id")
            .in("campaign_id", campaignIds)
            .eq("is_active", true)
        : Promise.resolve({ data: [] as { campaign_id: string }[] }),
    ]);

    const agentsByCampaign: Record<string, number> = {};
    (assignmentsRes.data ?? []).forEach((a) => {
      agentsByCampaign[a.campaign_id] = (agentsByCampaign[a.campaign_id] ?? 0) + 1;
    });

    const campaignsWithCounts = campaignsList.map((c) => {
      const tlAssignments = tlAssignmentsByCampaign[c.id] ?? [];
      const leadCounts = leadsByCampaign[c.id];
      const totalLeads = leadCounts?.total ?? 0;
      return enrichCampaignAllocationFields(
        {
          ...c,
          assigned_team_leader_name: formatTeamLeaderAssignmentLabel(tlAssignments),
          team_leader_count: tlAssignments.length,
          total_leads: totalLeads,
          total_agents: agentsByCampaign[c.id] ?? 0,
          qualified_leads: leadCounts?.qualified ?? 0,
          delivered_leads: leadCounts?.delivered ?? 0,
        },
        {
          total: totalLeads,
          qualified: leadCounts?.qualified ?? 0,
          delivered: leadCounts?.delivered ?? 0,
        },
        MIS_DELIVERED_ACHIEVED_OPTIONS
      );
    });

    return NextResponse.json({
      campaigns: campaignsWithCounts,
      pagination: buildPaginationMeta(page, limit, total),
    });
  } catch (err) {
    console.error("Fetch campaigns error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
