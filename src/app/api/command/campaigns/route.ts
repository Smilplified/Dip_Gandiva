import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { hasCommandRole } from "@/lib/command/rules-engine";
import {
  getProfile,
  getRoleNames,
  upsertCampaignMetrics,
  appendCampaignMetricsHistory,
  clampLimit,
  encodeCursor,
  decodeCursor,
  aggregateCommandLeadStatsByCampaign,
  aggregateUnresolvedAlertsByCampaign,
  aggregateDqOverrideAlertCountsByCampaign,
  type CommandListLeadAgg,
  type CommandListAlertAgg,
} from "@/lib/command/db";
import { getAdminClientSafe } from "@/lib/supabase/admin";
import { parsedRowsToLeadInserts } from "@/lib/command/campaignFormLeadPayloads";

const COMMAND_CAMPAIGN_LEAD_IMPORT_MAX = 500;

export const dynamic = "force-dynamic";

const LIST_MAX = 500;

function listCompliance(L: CommandListLeadAgg, A: CommandListAlertAgg): "green" | "yellow" | "red" {
  if (A.hasRed || L.disputedConsent > 0) return "red";
  if (A.hasYellow || L.missingConsent > 0 || L.pendingConsent > 0) return "yellow";
  return "green";
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userRoles = await getRoleNames(supabase, user.id);
  const isAllowed = hasCommandRole(userRoles) || userRoles.includes("client_viewer");
  if (!isAllowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const profile = await getProfile(supabase, user.id);

  const sp = request.nextUrl.searchParams;

  if (sp.get("enrich") === "1") {
    const orgId = profile?.organization_id ?? "";
    const qRaw = sp.get("q")?.trim() ?? "";
    const statusGroup = (sp.get("status") ?? "all").toLowerCase();
    const dateFrom = sp.get("date_from")?.trim() ?? "";
    const dateTo = sp.get("date_to")?.trim() ?? "";

    const clientViewerId = profile?.client_id ?? null;
    if (userRoles.includes("client_viewer")) {
      if (!clientViewerId) {
        return NextResponse.json({
          campaigns: [],
          total: 0,
          truncated: false,
          limit: LIST_MAX,
        });
      }
    }

    let listQuery = supabase
      .from("campaigns")
      .select(
        `id, campaign_id, name, description, status, start_date, end_date,
         client_id, client_name, lead_type, cpl, revenue, total_allocation, achieved,
         pending_allocation, industry, geography, created_at,
         campaign_metrics(
           sponsor_name,
           total_leads_allocated,
           total_campaign_spend,
           total_leads_delivered,
           daily_reporting,
           channel_split,
           deficit_leads,
           lead_increment,
           lead_replace
         )`,
        { count: "exact" }
      )
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(LIST_MAX);

    if (userRoles.includes("client_viewer") && clientViewerId) {
      listQuery = listQuery.eq("client_id", clientViewerId);
    }

    if (qRaw.length > 0) {
      const safe = qRaw.replace(/%/g, "").replace(/_/g, "");
      if (safe.length > 0) listQuery = listQuery.ilike("name", `%${safe}%`);
    }

    if (statusGroup === "active") listQuery = listQuery.eq("status", "active");
    if (statusGroup === "completed") listQuery = listQuery.eq("status", "completed");

    if (dateFrom && dateTo) {
      listQuery = listQuery
        .or(`start_date.is.null,start_date.lte.${dateTo}`)
        .or(`end_date.is.null,end_date.gte.${dateFrom}`);
    } else if (dateFrom) {
      listQuery = listQuery.or(`end_date.is.null,end_date.gte.${dateFrom}`);
    } else if (dateTo) {
      listQuery = listQuery.or(`start_date.is.null,start_date.lte.${dateTo}`);
    }

    const { data: listRows, count, error: listErr } = await listQuery;
    if (listErr) return NextResponse.json({ error: listErr.message }, { status: 500 });

    const rows = (listRows ?? []) as Record<string, unknown>[];
    const ids = rows.map((r) => r.id as string);

    let leadAgg: Record<string, CommandListLeadAgg> = {};
    let alertAgg: Record<string, CommandListAlertAgg> = {};
    let dqOverrideAgg: Record<string, number> = {};
    if (ids.length > 0) {
      try {
        [leadAgg, alertAgg, dqOverrideAgg] = await Promise.all([
          aggregateCommandLeadStatsByCampaign(supabase, orgId, ids),
          aggregateUnresolvedAlertsByCampaign(supabase, orgId, ids),
          aggregateDqOverrideAlertCountsByCampaign(supabase, orgId, ids),
        ]);
      } catch (e) {
        return NextResponse.json(
          { error: e instanceof Error ? e.message : "Aggregation failed" },
          { status: 500 }
        );
      }
    }

    const emptyLead = (): CommandListLeadAgg => ({
      total: 0,
      qualified: 0,
      qa_verified: 0,
      dq: 0,
      missingConsent: 0,
      disputedConsent: 0,
      pendingConsent: 0,
      verified: 0,
    });
    const emptyAlert = (): CommandListAlertAgg => ({
      count: 0,
      hasRed: false,
      hasYellow: false,
    });

    const enriched = rows.map((c) => {
      const id = c.id as string;
      const L = leadAgg[id] ?? emptyLead();
      const A = alertAgg[id] ?? emptyAlert();
      const qualifiedPct = L.total > 0 ? Math.round((L.qualified / L.total) * 1000) / 10 : 0;
      const qaVerifiedPct = L.total > 0 ? Math.round((L.qa_verified / L.total) * 100) : 0;
      const consentIssues = L.missingConsent + L.disputedConsent;
      const overrideCount = dqOverrideAgg[id] ?? 0;
      return {
        ...c,
        list_stats: {
          total_leads: L.total,
          qualified_count: L.qualified,
          qualified_pct: qualifiedPct,
          qa_verified_pct: qaVerifiedPct,
          override_count: overrideCount,
          consent_issues_count: consentIssues,
          dq_count: L.dq,
          unresolved_alerts: A.count,
          compliance: listCompliance(L, A),
        },
      };
    });

    return NextResponse.json({
      campaigns: enriched,
      total: count ?? 0,
      truncated: (count ?? 0) > LIST_MAX,
      limit: LIST_MAX,
    });
  }

  const cursor = sp.get("cursor");
  const limit = clampLimit(sp.get("limit") ?? "25");

  let query = supabase
    .from("campaigns")
    .select(
      `id, campaign_id, name, description, status, start_date, end_date,
       client_id, client_name, lead_type, cpl, revenue, total_allocation, achieved,
       pending_allocation, industry, geography, created_at,
       campaign_metrics(
         sponsor_name,
         total_leads_allocated,
         total_campaign_spend,
         total_leads_delivered,
         daily_reporting,
         channel_split,
         deficit_leads,
         lead_increment,
         lead_replace
       )`,
      { count: "exact" }
    )
    .eq("organization_id", profile?.organization_id ?? "")
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit + 1);

  // client_viewer: restrict to their own client's campaigns
  if (userRoles.includes("client_viewer")) {
    if (!profile?.client_id) {
      return NextResponse.json({ campaigns: [], total: 0, limit, nextCursor: null, hasMore: false });
    }
    query = query.eq("client_id", profile.client_id);
  }

  // Cursor-based pagination
  if (cursor) {
    const decoded = decodeCursor(cursor);
    if (decoded) {
      query = query.or(
        `created_at.lt.${decoded.created_at},and(created_at.eq.${decoded.created_at},id.lt.${decoded.id})`
      );
    }
  }

  const { data: campaigns, count, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = (campaigns ?? []) as Record<string, unknown>[];
  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  const last = items[items.length - 1];
  const nextCursor =
    hasMore && last
      ? encodeCursor(last.id as string, last.created_at as string)
      : null;

  return NextResponse.json({ campaigns: items, total: count ?? 0, limit, nextCursor, hasMore });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userRoles = await getRoleNames(supabase, user.id);
  if (!hasCommandRole(userRoles)) {
    return NextResponse.json(
      { error: "Forbidden — requires internal_operator or higher" },
      { status: 403 }
    );
  }

  const profile = await getProfile(supabase, user.id);
  const body = (await request.json()) as Record<string, unknown>;
  let resolvedClientName = (body.client_name as string | null) ?? null;
  if ((body.client_id as string | null) && !resolvedClientName) {
    const admin = getAdminClientSafe();
    if (admin) {
      const { data: clientRow } = await admin
        .from("clients")
        .select("company_name")
        .eq("id", body.client_id as string)
        .single();
      resolvedClientName = (clientRow as { company_name?: string | null } | null)?.company_name ?? null;
    }
  }

  const { data: campaign, error } = (await supabase
    .from("campaigns")
    .insert({
      organization_id: (profile?.organization_id ?? "") as string,
      campaign_id: body.campaign_id as string,
      name: body.name as string,
      description: (body.description as string | null) ?? null,
      industry: (body.industry as string | null) ?? null,
      geography: (body.geography as string | null) ?? null,
      start_date: (body.start_date as string | null) ?? null,
      end_date: (body.end_date as string | null) ?? null,
      status: (body.status as string) ?? "active",
      client_id: (body.client_id as string | null) ?? null,
      client_name: resolvedClientName,
      lead_type: (body.lead_type as string | null) ?? null,
      cpl: (body.cpl as number | null) ?? null,
      revenue: (body.revenue as number | null) ?? null,
      total_allocation: (body.total_allocation as number | null) ?? null,
      lead_aggregated: (body.lead_aggregated as string | null)?.trim() || null,
      created_by: user.id,
    } as never)
    .select()
    .single()) as unknown as {
    data: { id: string } | null;
    error: { message: string } | null;
  };

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const hasMetricsPayload =
    "sponsor_name" in body ||
    "total_leads_allocated" in body ||
    "total_campaign_spend" in body ||
    "total_leads_delivered" in body ||
    "daily_reporting" in body ||
    "channel_split" in body ||
    "deficit_leads" in body ||
    "lead_increment" in body ||
    "lead_replace" in body;

  if (hasMetricsPayload) {
    const historyPayload = {
      date: (body.metric_date as string | null) ?? undefined,
      total_leads_delivered: (body.total_leads_delivered as number) ?? 0,
      channel_split: (body.channel_split as Record<string, unknown> | null) ?? {},
      deficit_leads: (body.deficit_leads as number) ?? 0,
      lead_increment: (body.lead_increment as number) ?? 0,
      lead_replace: (body.lead_replace as number) ?? 0,
      total_campaign_spend: (body.total_campaign_spend as number) ?? 0,
      updated_by: user.id,
    };
    await upsertCampaignMetrics(
      supabase,
      (campaign as unknown as { id: string }).id,
      {
        sponsor_name: (body.sponsor_name as string | null) ?? null,
        total_leads_allocated: (body.total_leads_allocated as number) ?? 0,
        total_campaign_spend: (body.total_campaign_spend as number) ?? 0,
        total_leads_delivered: (body.total_leads_delivered as number) ?? 0,
        daily_reporting: (body.daily_reporting as Record<string, unknown> | null) ?? {},
        channel_split: (body.channel_split as Record<string, unknown> | null) ?? {},
        deficit_leads: (body.deficit_leads as number) ?? 0,
        lead_increment: (body.lead_increment as number) ?? 0,
        lead_replace: (body.lead_replace as number) ?? 0,
      }
    );
    await appendCampaignMetricsHistory(
      supabase,
      (campaign as unknown as { id: string }).id,
      historyPayload
    );
  }

  // Optional bulk lead import from campaign create form
  const rawLeads = Array.isArray(body.leads)
    ? (body.leads as Record<string, unknown>[])
    : [];
  if (rawLeads.length > COMMAND_CAMPAIGN_LEAD_IMPORT_MAX) {
    return NextResponse.json(
      { error: `Maximum ${COMMAND_CAMPAIGN_LEAD_IMPORT_MAX} leads per import` },
      { status: 400 }
    );
  }
  if (rawLeads.length > 0) {
    const leadPayloads = parsedRowsToLeadInserts(rawLeads, {
      organizationId: (profile?.organization_id ?? "") as string,
      campaignId: (campaign as { id: string }).id,
      createdBy: user.id,
    });

    if (leadPayloads.length > 0) {
      const { error: insertLeadsError } = await supabase
        .from("leads")
        .insert(leadPayloads as never);
      if (insertLeadsError) {
        return NextResponse.json({ error: insertLeadsError.message }, { status: 500 });
      }
    }
  }

  return NextResponse.json({ campaign }, { status: 201 });
}
