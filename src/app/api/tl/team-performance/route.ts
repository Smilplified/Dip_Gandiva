import { NextResponse } from "next/server";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { createClient } from "@/lib/supabase/server";
import { getAdminClientSafe, ADMIN_NOT_CONFIGURED_MESSAGE } from "@/lib/supabase/admin";
import {
  hasOperationsManagerAccess,
  hasTLAccess,
  isCampaignTeamLeaderRole,
} from "@/lib/auth/tl-access";
import {
  buildTeamHierarchy,
  getPrimaryTlIdForAgent,
  isAgentRole,
} from "@/lib/tl/team-hierarchy";
import { fetchUserRoleNames } from "@/lib/auth/server-roles";

export const dynamic = "force-dynamic";

dayjs.extend(utc);
dayjs.extend(timezone);

// ─── Types ────────────────────────────────────────────────────────────────────

export type AgentPerformance = {
  agent_id: string;
  agent_name: string;
  agent_code: string | null;
  tl_id: string | null;
  tl_name: string | null;
  total_leads: number;
  qualified_leads: number;
  today_leads: number;
  week_leads: number;
  month_leads: number;
  avg_per_day: number;
  campaigns_worked: number;
  last_upload_date: string | null;
};

export type CampaignPerformance = {
  campaign_id: string;
  campaign_name: string;
  campaign_code: string | null;
  total_allocation: number;
  total_uploaded: number;
  progress_pct: number;
  agents_count: number;
  status: string;
  start_date: string | null;
  end_date: string | null;
};

export type DailyTrend = {
  date: string; // "YYYY-MM-DD"
  leads: number;
};

export type TLSummary = {
  tl_id: string;
  tl_name: string;
  agent_count: number;
  campaign_count: number;
  total_leads: number;
  today_leads: number;
  week_leads: number;
  month_leads: number;
};

export type TeamPerformanceResponse = {
  scope: "organization" | "team";
  date_range: { start: string; end: string };
  summary: {
    total_leads: number;
    today_leads: number;
    week_leads: number;
    month_leads: number;
    active_campaigns: number;
    total_campaigns: number;
    avg_per_day: number;
    top_performer: { name: string; total: number } | null;
    pending_allocation: number;
    active_tl_count: number;
    active_agent_count: number;
    completion_pct: number;
  };
  agents: AgentPerformance[];
  campaigns: CampaignPerformance[];
  tl_summaries: TLSummary[];
  daily_trend: DailyTrend[];
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isValidTimeZone(tz: string | null): tz is string {
  if (!tz) return false;
  try {
    Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

function todayInTz(tz: string): string {
  return dayjs().tz(tz).format("YYYY-MM-DD");
}

function weeksAgoInTz(tz: string, n: number): string {
  return dayjs().tz(tz).subtract(n * 7, "day").format("YYYY-MM-DD");
}

function monthsAgoInTz(tz: string, n: number): string {
  return dayjs().tz(tz).subtract(n, "month").format("YYYY-MM-DD");
}

function utcStartOfDayInTz(dateStr: string, tz: string): string {
  return dayjs.tz(`${dateStr} 00:00:00.000`, "YYYY-MM-DD HH:mm:ss.SSS", tz).utc().toISOString();
}

function utcEndOfDayInTz(dateStr: string, tz: string): string {
  return dayjs.tz(`${dateStr} 23:59:59.999`, "YYYY-MM-DD HH:mm:ss.SSS", tz).utc().toISOString();
}

function daysBetween(a: string, b: string): number {
  const ms = new Date(b).getTime() - new Date(a).getTime();
  return Math.max(1, Math.round(ms / 86_400_000));
}

// ─── GET /api/tl/team-performance ─────────────────────────────────────────────

export async function GET(request: Request) {
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
    if (!hasTLAccess(roleNames) && !roleNames.includes("admin")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const isOM = hasOperationsManagerAccess(roleNames) || roleNames.includes("admin");
    const isTL = !isOM && roleNames.some((n) => isCampaignTeamLeaderRole(n));

    const { data: profile } = await supabase
      .from("users")
      .select("organization_id")
      .eq("id", user.id)
      .single();

    const orgId = (profile as { organization_id: string | null } | null)?.organization_id;
    if (!orgId) {
      return NextResponse.json({ error: "No organization" }, { status: 400 });
    }

    const admin = getAdminClientSafe();
    if (!admin) {
      return NextResponse.json({ error: ADMIN_NOT_CONFIGURED_MESSAGE }, { status: 503 });
    }

    // Parse query params
    const url = new URL(request.url);
    const tzParam = url.searchParams.get("tz");
    const appTz = isValidTimeZone(tzParam) ? tzParam : "UTC";
    const today = todayInTz(appTz);
    const defaultStart = monthsAgoInTz(appTz, 3);
    const startDate = url.searchParams.get("start_date") || defaultStart;
    const endDate = url.searchParams.get("end_date") || today;
    const campaignIdFilter = url.searchParams.get("campaign_id") || null;
    const userIdFilter = url.searchParams.get("user_id") || null;
    const startUtc = utcStartOfDayInTz(startDate, appTz);
    const endUtc = utcEndOfDayInTz(endDate, appTz);

    // ── Fetch all org users with roles ──────────────────────────────────────
    const { data: allUsers, error: usersErr } = await admin
      .from("users")
      .select("id, full_name, email, agent_code, status, reporting_manager_id, user_roles(roles(name))")
      .eq("organization_id", orgId)
      .eq("status", "active");

    if (usersErr) return NextResponse.json({ error: usersErr.message }, { status: 500 });

    type OrgUser = {
      id: string;
      full_name: string | null;
      email: string | null;
      agent_code: string | null;
      status: string;
      reporting_manager_id: string | null;
      user_roles: { roles: { name: string } | null }[] | null;
    };

    const orgUsers = (allUsers ?? []) as OrgUser[];

    const userLabel = (u: OrgUser) =>
      u.full_name?.trim() || u.email?.trim() || "Unknown";
    const userIsAgent = (u: OrgUser) =>
      (u.user_roles ?? []).some((r) => isAgentRole(r.roles?.name));
    const userIsTL = (u: OrgUser) =>
      (u.user_roles ?? []).some((r) => isCampaignTeamLeaderRole(r.roles?.name));

    // Identify all TLs in the org
    const allTLs = orgUsers.filter(userIsTL);
    const tlById = new Map(allTLs.map((tl) => [tl.id, tl]));

    // Determine which agent IDs to include based on role scope
    // (may be widened later once effectiveTlByAgent is computed)
    let scopedAgentIds: Set<string>;
    if (isOM) {
      scopedAgentIds = new Set(orgUsers.filter(userIsAgent).map((u) => u.id));
    } else if (isTL) {
      // Seed with direct reporting line; campaign-linked agents added below
      scopedAgentIds = new Set(
        orgUsers
          .filter((u) => userIsAgent(u) && u.reporting_manager_id === user.id)
          .map((u) => u.id)
      );
    } else {
      scopedAgentIds = new Set();
    }

    // ── Fetch campaigns ──────────────────────────────────────────────────────
    let campaignsQuery = admin
      .from("campaigns")
      .select("id, name, campaign_code, total_allocation, pending_allocation, status, assigned_team_leader_id, start_date, end_date")
      .eq("organization_id", orgId);

    if (campaignIdFilter) {
      campaignsQuery = campaignsQuery.eq("id", campaignIdFilter);
    }

    const { data: campaigns, error: campErr } = await campaignsQuery;
    if (campErr) return NextResponse.json({ error: campErr.message }, { status: 500 });

    type CampaignRow = {
      id: string;
      name: string;
      campaign_code: string | null;
      total_allocation: number | null;
      pending_allocation: number | null;
      status: string;
      assigned_team_leader_id: string | null;
      start_date: string | null;
      end_date: string | null;
    };

    let scopedCampaigns = (campaigns ?? []) as CampaignRow[];

    // Scope campaigns for TL: only campaigns assigned to this TL
    if (isTL) {
      scopedCampaigns = scopedCampaigns.filter(
        (c) => c.assigned_team_leader_id === user.id
      );
    }

    const campById = new Map(scopedCampaigns.map((c) => [c.id, c]));
    const scopedCampaignIds = scopedCampaigns.map((c) => c.id);

    // ── Fetch ALL org campaign assignments to derive TL via campaign ──────────
    // We need the full org picture (not just scoped) to correctly attribute agents
    // to their effective TL when reporting_manager_id is not set.
    const allCampIds = (campaigns ?? []).map((c) => (c as { id: string }).id);
    let allCampAssignments: { campaign_id: string; agent_id: string }[] = [];
    if (allCampIds.length > 0) {
      const { data: caRows } = await admin
        .from("campaign_assignments")
        .select("campaign_id, agent_id")
        .in("campaign_id", allCampIds)
        .eq("is_active", true);
      allCampAssignments = (caRows ?? []) as { campaign_id: string; agent_id: string }[];
    }

    const actualTlIdSet = new Set(allTLs.map((tl) => tl.id));

    // Campaigns owned by each TL (assigned_team_leader_id must be a real TL role).
    const campaignIdsByTl = new Map<string, Set<string>>();
    for (const c of (campaigns ?? []) as CampaignRow[]) {
      const tlId = c.assigned_team_leader_id;
      if (!tlId || !actualTlIdSet.has(tlId)) continue;
      if (!campaignIdsByTl.has(tlId)) campaignIdsByTl.set(tlId, new Set());
      campaignIdsByTl.get(tlId)!.add(c.id);
    }

    // Same roster as /tl/team (reporting_manager + campaign assignments, real TLs only)
    const teamHierarchy = buildTeamHierarchy(
      orgUsers as Parameters<typeof buildTeamHierarchy>[0],
      (campaigns ?? []) as { id: string; assigned_team_leader_id: string | null }[],
      allCampAssignments
    );
    const hierarchyByTlId = new Map(
      teamHierarchy.team_leaders.map((tl) => [tl.id, tl])
    );

    // TL scope: agents on this TL's team card (matches /tl/team)
    if (isTL) {
      const myNode = hierarchyByTlId.get(user.id);
      for (const ag of myNode?.agents ?? []) {
        scopedAgentIds.add(ag.id);
      }
    }

    if (userIdFilter) {
      if (scopedAgentIds.has(userIdFilter)) {
        scopedAgentIds = new Set([userIdFilter]);
      } else {
        scopedAgentIds = new Set();
      }
    }

    // Rebuild array after potential widening
    const scopedAgentIdArr = [...scopedAgentIds];

    // ── Fetch leads ──────────────────────────────────────────────────────────
    // Get all leads in scoped campaigns between start & end.
    // Agent-level stats are still derived from assigned_agent_id where available.
    let leadsInRange: {
      id: string;
      campaign_id: string;
      assigned_agent_id: string | null;
      qa_status: string | null;
      created_at: string;
    }[] = [];

    if (scopedCampaignIds.length > 0) {
      const { data: leadsData, error: leadsErr } = await admin
        .from("leads")
        .select("id, campaign_id, assigned_agent_id, qa_status, created_at")
        .eq("organization_id", orgId)
        .in("campaign_id", scopedCampaignIds)
        .gte("created_at", startUtc)
        .lte("created_at", endUtc)
        .order("created_at", { ascending: true });

      if (leadsErr) return NextResponse.json({ error: leadsErr.message }, { status: 500 });
      leadsInRange = (leadsData ?? []) as typeof leadsInRange;

      if (campaignIdFilter) {
        leadsInRange = leadsInRange.filter((l) => l.campaign_id === campaignIdFilter);
      }
      if (userIdFilter) {
        leadsInRange = leadsInRange.filter((l) => l.assigned_agent_id === userIdFilter);
      }
    }

    // Key date boundaries
    const weekStart = weeksAgoInTz(appTz, 1);
    const monthStart = monthsAgoInTz(appTz, 1);

    // ── Aggregate per-agent ──────────────────────────────────────────────────
    const agentLeadMap = new Map<
      string,
      {
        total: number;
        qualified: number;
        today: number;
        week: number;
        month: number;
        campaignSet: Set<string>;
        lastDate: string | null;
      }
    >();

    const isQualifiedQa = (qa: string | null | undefined) => {
      const q = String(qa ?? "").trim().toLowerCase();
      return q === "qualified" || q === "approved" || q === "pass";
    };

    const initAgent = () => ({
      total: 0,
      qualified: 0,
      today: 0,
      week: 0,
      month: 0,
      campaignSet: new Set<string>(),
      lastDate: null as string | null,
    });

    for (const l of leadsInRange) {
      const agId = l.assigned_agent_id;
      if (!agId) continue;
      if (!scopedAgentIds.has(agId)) continue;
      if (!agentLeadMap.has(agId)) agentLeadMap.set(agId, initAgent());
      const agg = agentLeadMap.get(agId)!;
      agg.total++;
      if (isQualifiedQa(l.qa_status)) agg.qualified++;
      const d = dayjs(l.created_at).tz(appTz).format("YYYY-MM-DD");
      if (d === today) agg.today++;
      if (d >= weekStart) agg.week++;
      if (d >= monthStart) agg.month++;
      agg.campaignSet.add(l.campaign_id);
      if (!agg.lastDate || d > agg.lastDate) agg.lastDate = d;
    }

    const totalDays = daysBetween(startDate, endDate);

    const agentRows: AgentPerformance[] = scopedAgentIdArr.map((agId) => {
      const u = orgUsers.find((x) => x.id === agId)!;
      const agg = agentLeadMap.get(agId) ?? initAgent();
      const effTlId = getPrimaryTlIdForAgent(
        agId,
        u.reporting_manager_id,
        teamHierarchy,
        actualTlIdSet
      );
      const tlRow = effTlId ? tlById.get(effTlId) : undefined;
      return {
        agent_id: agId,
        agent_name: userLabel(u),
        agent_code: u.agent_code,
        tl_id: effTlId,
        tl_name: tlRow ? userLabel(tlRow) : null,
        total_leads: agg.total,
        qualified_leads: agg.qualified,
        today_leads: agg.today,
        week_leads: agg.week,
        month_leads: agg.month,
        avg_per_day: Number((agg.total / totalDays).toFixed(2)),
        campaigns_worked: agg.campaignSet.size,
        last_upload_date: agg.lastDate,
      };
    });

    agentRows.sort((a, b) => b.total_leads - a.total_leads);

    // ── TL summaries (agent + campaign counts match /tl/team hierarchy) ───────
    // Lead totals: only this TL's campaigns + this TL's team agents (not all org
    // campaigns those agents worked on elsewhere).
    const tlSummaries: TLSummary[] = [];
    if (isOM) {
      for (const tl of allTLs) {
        const node = hierarchyByTlId.get(tl.id);
        const tlAgentIdSet = new Set((node?.agents ?? []).map((a) => a.id));
        const tlCampIds = campaignIdsByTl.get(tl.id) ?? new Set<string>();

        let totalLeads = 0;
        let todayLeads = 0;
        let weekLeads = 0;
        let monthLeads = 0;

        for (const l of leadsInRange) {
          if (!tlCampIds.has(l.campaign_id)) continue;
          const agId = l.assigned_agent_id;
          if (!agId || !tlAgentIdSet.has(agId)) continue;
          totalLeads++;
          const d = dayjs(l.created_at).tz(appTz).format("YYYY-MM-DD");
          if (d === today) todayLeads++;
          if (d >= weekStart) weekLeads++;
          if (d >= monthStart) monthLeads++;
        }

        tlSummaries.push({
          tl_id: tl.id,
          tl_name: userLabel(tl),
          agent_count: node?.agent_count ?? 0,
          campaign_count: node?.campaign_count ?? 0,
          total_leads: totalLeads,
          today_leads: todayLeads,
          week_leads: weekLeads,
          month_leads: monthLeads,
        });
      }
      tlSummaries.sort((a, b) => b.total_leads - a.total_leads);
    }

    // ── Campaign performance ─────────────────────────────────────────────────
    const campAgentMap = new Map<string, Set<string>>();
    const campLeadMap = new Map<string, number>();
    for (const l of leadsInRange) {
      if (!campById.has(l.campaign_id)) continue;
      campLeadMap.set(l.campaign_id, (campLeadMap.get(l.campaign_id) ?? 0) + 1);
      if (!campAgentMap.has(l.campaign_id)) campAgentMap.set(l.campaign_id, new Set());
      if (l.assigned_agent_id) campAgentMap.get(l.campaign_id)!.add(l.assigned_agent_id);
    }

    const campaignPerf: CampaignPerformance[] = scopedCampaigns.map((c) => {
      const uploaded = campLeadMap.get(c.id) ?? 0;
      const alloc = c.total_allocation ?? 0;
      return {
        campaign_id: c.id,
        campaign_name: c.name,
        campaign_code: c.campaign_code,
        total_allocation: alloc,
        total_uploaded: uploaded,
        progress_pct: alloc > 0 ? Math.min(100, Math.round((uploaded / alloc) * 100)) : 0,
        agents_count: campAgentMap.get(c.id)?.size ?? 0,
        status: c.status,
        start_date: c.start_date ?? null,
        end_date: c.end_date ?? null,
      };
    });

    campaignPerf.sort((a, b) => b.total_uploaded - a.total_uploaded);

    // ── Daily trend (last 30 days within range) ──────────────────────────────
    const oneMonthAgo = monthsAgoInTz(appTz, 1);
    const trendStart = startDate < oneMonthAgo ? oneMonthAgo : startDate;

    const dailyMap = new Map<string, number>();
    for (const l of leadsInRange) {
      const d = dayjs(l.created_at).tz(appTz).format("YYYY-MM-DD");
      if (d >= trendStart) {
        dailyMap.set(d, (dailyMap.get(d) ?? 0) + 1);
      }
    }

    // Fill gaps with 0
    const dailyTrend: DailyTrend[] = [];
    let cursor = dayjs(trendStart);
    const endCursor = dayjs(endDate);
    while (cursor.isBefore(endCursor) || cursor.isSame(endCursor, "day")) {
      const ds = cursor.format("YYYY-MM-DD");
      dailyTrend.push({ date: ds, leads: dailyMap.get(ds) ?? 0 });
      cursor = cursor.add(1, "day");
    }

    // ── Summary ──────────────────────────────────────────────────────────────
    const totalLeads = leadsInRange.length;
    const todayLeads = leadsInRange.filter(
      (l) => dayjs(l.created_at).tz(appTz).format("YYYY-MM-DD") === today
    ).length;
    const weekLeads = leadsInRange.filter(
      (l) => dayjs(l.created_at).tz(appTz).format("YYYY-MM-DD") >= weekStart
    ).length;
    const monthLeads = leadsInRange.filter(
      (l) => dayjs(l.created_at).tz(appTz).format("YYYY-MM-DD") >= monthStart
    ).length;
    const activeCampaigns = scopedCampaigns.filter((c) => c.status === "active").length;
    const pendingAlloc = scopedCampaigns.reduce(
      (s, c) => s + (c.pending_allocation ?? c.total_allocation ?? 0),
      0
    );
    const totalAlloc = scopedCampaigns.reduce((s, c) => s + (c.total_allocation ?? 0), 0);
    const totalUploaded = campaignPerf.reduce((s, c) => s + c.total_uploaded, 0);
    const completionPct =
      totalAlloc > 0 ? Math.min(100, Math.round((totalUploaded / totalAlloc) * 100)) : 0;

    const topPerformer =
      agentRows.length > 0 && agentRows[0].total_leads > 0
        ? { name: agentRows[0].agent_name, total: agentRows[0].total_leads }
        : null;

    // Active TLs = TLs with at least 1 agent (OM scope)
    const activeTlCount = isOM
      ? tlSummaries.filter((t) => t.agent_count > 0).length
      : 0;

    const response: TeamPerformanceResponse = {
      scope: isOM ? "organization" : "team",
      date_range: { start: startDate, end: endDate },
      summary: {
        total_leads: totalLeads,
        today_leads: todayLeads,
        week_leads: weekLeads,
        month_leads: monthLeads,
        active_campaigns: activeCampaigns,
        total_campaigns: scopedCampaigns.length,
        avg_per_day: Number((totalLeads / totalDays).toFixed(2)),
        top_performer: topPerformer,
        pending_allocation: pendingAlloc,
        active_tl_count: activeTlCount,
        active_agent_count: scopedAgentIdArr.length,
        completion_pct: completionPct,
      },
      agents: agentRows,
      campaigns: campaignPerf,
      tl_summaries: tlSummaries,
      daily_trend: dailyTrend,
    };

    return NextResponse.json(response);
  } catch (err) {
    console.error("Team performance error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
