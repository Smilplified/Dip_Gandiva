import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAdminClientSafe, ADMIN_NOT_CONFIGURED_MESSAGE } from "@/lib/supabase/admin";
import { aggregateScoredLeadCountsByCampaign } from "@/lib/tl/dashboard-leads";
import { buildPaginationMeta, parseListPagination } from "@/lib/api-pagination";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

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

    const { data: roleRows } = await supabase
      .from("user_roles")
      .select("roles(name)")
      .eq("user_id", user.id);
    const roleNames = ((roleRows ?? []) as { roles: { name: string } | null }[]).map((r) =>
      r.roles?.name?.toLowerCase().trim().replace(/\s+/g, "_")
    );
    const canView = roleNames.includes("mis") || roleNames.includes("admin");
    if (!canView) {
      return NextResponse.json({ error: "Forbidden: MIS or Admin role required" }, { status: 403 });
    }

    const admin = getAdminClientSafe();
    if (!admin) {
      return NextResponse.json({ error: ADMIN_NOT_CONFIGURED_MESSAGE }, { status: 503 });
    }

    const { page, limit, offset } = parseListPagination(request.nextUrl.searchParams);
    const statusFilter = request.nextUrl.searchParams.get("status")?.trim() || null;
    const searchRaw = request.nextUrl.searchParams.get("q")?.trim() || "";

    let campaignsQuery = admin
      .from("campaigns")
      .select(
        `
        id, campaign_id, campaign_code, name, client_name, description, industry, geography, target_designation, lead_type, status,
        start_date, end_date, created_at, cpl, revenue, booked, total_allocation, post_qa, achieved, pending_allocation,
        weekly_call, weekly_report, additional_comments, assigned_team_leader_id,
        employee_size, abm, seniority, job_function, creatives_url
      `,
        { count: "exact" }
      )
      .eq("organization_id", orgId);

    if (statusFilter) campaignsQuery = campaignsQuery.eq("status", statusFilter);
    if (searchRaw.length > 0) {
      const safe = searchRaw.replace(/%/g, "").replace(/_/g, "");
      if (safe.length > 0) {
        campaignsQuery = campaignsQuery.or(
          `name.ilike.%${safe}%,campaign_code.ilike.%${safe}%,lead_type.ilike.%${safe}%,industry.ilike.%${safe}%,geography.ilike.%${safe}%`
        );
      }
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
      name: string;
      client_name: string | null;
      description: string | null;
      industry: string | null;
      geography: string | null;
      target_designation: string | null;
      lead_type: string | null;
      status: string;
      start_date: string | null;
      end_date: string | null;
      created_at: string;
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
      employee_size: string[] | null;
      abm: boolean | null;
      seniority: string | null;
      job_function: string | null;
      creatives_url: string[] | null;
    };

    const campaignsList = (campaigns ?? []) as CampaignRow[];
    const total = count ?? campaignsList.length;
    const pageIds = campaignsList.map((c) => c.id);

    const tlIds = [
      ...new Set(campaignsList.map((c) => c.assigned_team_leader_id).filter(Boolean)),
    ] as string[];
    const tlNames: Record<string, string> = {};
    if (tlIds.length > 0) {
      const { data: tlUsers } = await admin.from("users").select("id, full_name, email").in("id", tlIds);
      ((tlUsers ?? []) as { id: string; full_name: string | null; email: string | null }[]).forEach((u) => {
        tlNames[u.id] = u.full_name || u.email || "Unknown";
      });
    }

    const scoredCounts =
      pageIds.length > 0
        ? await aggregateScoredLeadCountsByCampaign(admin, orgId, pageIds)
        : {};

    const campaignsWithCounts = campaignsList.map((c) => ({
      ...c,
      assigned_team_leader_name: c.assigned_team_leader_id
        ? tlNames[c.assigned_team_leader_id] ?? null
        : null,
      scored_leads_count: scoredCounts[c.id]?.total ?? 0,
      delivered_leads_count: scoredCounts[c.id]?.delivered ?? 0,
    }));

    return NextResponse.json({
      campaigns: campaignsWithCounts,
      pagination: buildPaginationMeta(page, limit, total),
    });
  } catch (err) {
    console.error("MIS campaigns list error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
