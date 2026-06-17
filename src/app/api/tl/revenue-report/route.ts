import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fetchUserRoleNames } from "@/lib/auth/server-roles";
import { buildPaginationMeta, parseListPagination } from "@/lib/api-pagination";
import {
  aggregateRevenueReportSummary,
  buildMonthlyRevenueTrend,
  buildRevenueByCampaignChart,
  buildRevenueByTeamLeaderChart,
  buildRevenueByLeadTypeChart,
} from "@/lib/campaign-revenue-metrics";
import {
  canAccessRevenueReport,
  fetchRevenueReportFilterOptions,
  fetchRevenueReportRows,
  groupRevenueReportByClient,
  parseRevenueReportFilters,
  resolveRevenueReportCampaignIds,
  sortRevenueReportRows,
} from "@/lib/revenue-report/query";

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

    const roleNames = await fetchUserRoleNames(supabase, user.id);
    if (!canAccessRevenueReport(roleNames)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data: profile } = await supabase
      .from("users")
      .select("organization_id, client_id")
      .eq("id", user.id)
      .single();

    const orgId = (profile as { organization_id: string | null; client_id: string | null } | null)
      ?.organization_id;
    const clientId = (profile as { client_id: string | null } | null)?.client_id ?? null;

    if (!orgId) {
      return NextResponse.json({ error: "No organization" }, { status: 400 });
    }

    const filters = parseRevenueReportFilters(request.nextUrl.searchParams);
    const { page, limit, offset } = parseListPagination(request.nextUrl.searchParams);

    const campaignIds = await resolveRevenueReportCampaignIds(
      supabase,
      orgId,
      user.id,
      roleNames,
      clientId,
      filters
    );

    const allRows = sortRevenueReportRows(
      await fetchRevenueReportRows(supabase, orgId, campaignIds),
      filters.sort_by,
      filters.sort_dir ?? "desc"
    );

    const clientGroups = groupRevenueReportByClient(allRows);
    const total = clientGroups.length;
    const pageClients = clientGroups.slice(offset, offset + limit);
    const pageRows = pageClients.flatMap((g) => g.campaigns);

    const summary = aggregateRevenueReportSummary(allRows.map((r) => r.metrics));

    const charts = {
      revenueByCampaign: buildRevenueByCampaignChart(
        allRows.map((r) => ({ name: r.name, revenue: r.metrics.revenue }))
      ),
      revenueByTeamLeader: buildRevenueByTeamLeaderChart(
        allRows.map((r) => ({
          team_leader_name: r.assigned_team_leader_name,
          revenue: r.metrics.revenue,
        }))
      ),
      revenueByLeadType: buildRevenueByLeadTypeChart(
        allRows.map((r) => ({ lead_type: r.lead_type, revenue: r.metrics.revenue }))
      ),
      monthlyRevenueTrend: buildMonthlyRevenueTrend(
        allRows.map((r) => ({ start_date: r.start_date, revenue: r.metrics.revenue }))
      ),
    };

    const includeFilters = request.nextUrl.searchParams.get("include_filters") === "1";
    const filterOptions = includeFilters
      ? await fetchRevenueReportFilterOptions(supabase, orgId, campaignIds)
      : undefined;

    return NextResponse.json({
      clients: pageClients,
      campaigns: pageRows,
      summary,
      charts,
      filterOptions,
      pagination: buildPaginationMeta(page, limit, total),
    });
  } catch (err) {
    console.error("Revenue report error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
