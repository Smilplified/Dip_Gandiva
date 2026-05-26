import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAdminClientSafe, ADMIN_NOT_CONFIGURED_MESSAGE } from "@/lib/supabase/admin";
import {
  hasOperationsManagerAccess,
  hasTLAccess,
  isCampaignTeamLeaderRole,
} from "@/lib/auth/tl-access";
import { isAgentRole } from "@/lib/tl/team-hierarchy";
import { fetchUserRoleNames } from "@/lib/auth/server-roles";

export const dynamic = "force-dynamic";

// ─── Types ────────────────────────────────────────────────────────────────────

export type AgentPerformance = {
  agent_id: string;
  agent_name: string;
  agent_code: string | null;
  tl_id: string | null;
  tl_name: string | null;
  total_leads: number;
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
};

export type DailyTrend = {
  date: string; // "YYYY-MM-DD"
  leads: number;
};

export type TLSummary = {
  tl_id: string;
  tl_name: string;
  agent_count: number;
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
    avg_per_day: number;
    top_performer: { name: string; total: number } | null;
    pending_allocation: number;
  };
  agents: AgentPerformance[];
  campaigns: CampaignPerformance[];
  tl_summaries: TLSummary[];
  daily_trend: DailyTrend[];
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function todayUTC(): string {
  return toDateStr(new Date());
}

function weeksAgoUTC(n: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n * 7);
  return toDateStr(d);
}

function monthsAgoUTC(n: number): string {
  const d = new Date();
  d.setUTCMonth(d.getUTCMonth() - n);
  return toDateStr(d);
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
    const today = todayUTC();
    const defaultStart = monthsAgoUTC(3);
    const startDate = url.searchParams.get("start_date") || defaultStart;
    const endDate = url.searchParams.get("end_date") || today;
    const campaignIdFilter = url.searchParams.get("campaign_id") || null;
    const userIdFilter = url.searchParams.get("user_id") || null;

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
      .select("id, name, campaign_code, total_allocation, pending_allocation, status, assigned_team_leader_id")
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

    // Build a set of ACTUAL TL IDs (only users with the TL role).
    // OMs and other roles are sometimes stored as assigned_team_leader_id in campaigns
    // (e.g. Shubham Gaikwad the OM). We must never treat them as TLs here, otherwise
    // an agent appearing in both a real-TL campaign and an OM campaign will get a
    // non-deterministic TL assignment depending on DB row order → inconsistent counts.
    const actualTlIdSet = new Set(allTLs.map((tl) => tl.id));

    // Campaign → real TL id (only when assigned_team_leader_id is an actual TL)
    const tlByCampaignId = new Map<string, string>();
    for (const c of (campaigns ?? []) as { id: string; assigned_team_leader_id: string | null }[]) {
      const tlId = c.assigned_team_leader_id;
      if (tlId && actualTlIdSet.has(tlId)) tlByCampaignId.set(c.id, tlId);
    }

    // Agents linked to a TL via campaign (excluding those with reporting_manager_id).
    // Mirrors buildTeamHierarchy: each agent maps to AT MOST one TL via campaigns.
    // Since we now only have real TL campaigns, an agent can only appear in one TL's
    // campaign set (the data shows no agent is in two different real-TL campaigns),
    // making this deterministic.
    const campaignTlByAgent = new Map<string, string>(); // agentId → tlId
    for (const row of allCampAssignments) {
      if (campaignTlByAgent.has(row.agent_id)) continue;
      const tlId = tlByCampaignId.get(row.campaign_id);
      if (tlId) campaignTlByAgent.set(row.agent_id, tlId);
    }

    // Effective TL for any agent:
    //   reporting_manager_id wins → else campaign-derived TL → else null
    const allAgents = orgUsers.filter(userIsAgent);
    const effectiveTlByAgent = new Map<string, string | null>();
    for (const ag of allAgents) {
      if (ag.reporting_manager_id) {
        effectiveTlByAgent.set(ag.id, ag.reporting_manager_id);
      } else {
        effectiveTlByAgent.set(ag.id, campaignTlByAgent.get(ag.id) ?? null);
      }
    }

    // Widen scopedAgentIds for TL: include campaign-linked agents too
    if (isTL) {
      for (const [agId, tlId] of effectiveTlByAgent) {
        if (tlId === user.id) scopedAgentIds.add(agId);
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
    // Get all leads in the org created between start & end by scoped agents
    let leadsInRange: {
      id: string;
      campaign_id: string;
      assigned_agent_id: string | null;
      created_at: string;
    }[] = [];

    if (scopedAgentIdArr.length > 0) {
      const { data: leadsData, error: leadsErr } = await admin
        .from("leads")
        .select("id, campaign_id, assigned_agent_id, created_at")
        .eq("organization_id", orgId)
        .in("assigned_agent_id", scopedAgentIdArr)
        .gte("created_at", `${startDate}T00:00:00.000Z`)
        .lte("created_at", `${endDate}T23:59:59.999Z`)
        .order("created_at", { ascending: true });

      if (leadsErr) return NextResponse.json({ error: leadsErr.message }, { status: 500 });
      leadsInRange = (leadsData ?? []) as typeof leadsInRange;

      if (campaignIdFilter) {
        leadsInRange = leadsInRange.filter((l) => l.campaign_id === campaignIdFilter);
      }
    }

    // Key date boundaries
    const weekStart = weeksAgoUTC(1);

    // ── Aggregate per-agent ──────────────────────────────────────────────────
    const agentLeadMap = new Map<
      string,
      {
        total: number;
        today: number;
        week: number;
        month: number;
        campaignSet: Set<string>;
        lastDate: string | null;
      }
    >();

    const initAgent = () => ({
      total: 0,
      today: 0,
      week: 0,
      month: 0,
      campaignSet: new Set<string>(),
      lastDate: null as string | null,
    });

    for (const l of leadsInRange) {
      const agId = l.assigned_agent_id;
      if (!agId) continue;
      if (!agentLeadMap.has(agId)) agentLeadMap.set(agId, initAgent());
      const agg = agentLeadMap.get(agId)!;
      agg.total++;
      const d = l.created_at.slice(0, 10);
      if (d === today) agg.today++;
      if (d >= weekStart) agg.week++;
      if (d >= monthsAgoUTC(1)) agg.month++;
      agg.campaignSet.add(l.campaign_id);
      if (!agg.lastDate || d > agg.lastDate) agg.lastDate = d;
    }

    const totalDays = daysBetween(startDate, endDate);

    const agentRows: AgentPerformance[] = scopedAgentIdArr.map((agId) => {
      const u = orgUsers.find((x) => x.id === agId)!;
      const agg = agentLeadMap.get(agId) ?? initAgent();
      // Use the effective TL (reporting_manager_id wins, campaign fallback)
      const effTlId = effectiveTlByAgent.get(agId) ?? null;
      const tlRow = effTlId ? tlById.get(effTlId) : undefined;
      return {
        agent_id: agId,
        agent_name: userLabel(u),
        agent_code: u.agent_code,
        tl_id: effTlId,
        tl_name: tlRow ? userLabel(tlRow) : null,
        total_leads: agg.total,
        today_leads: agg.today,
        week_leads: agg.week,
        month_leads: agg.month,
        avg_per_day: Number((agg.total / totalDays).toFixed(2)),
        campaigns_worked: agg.campaignSet.size,
        last_upload_date: agg.lastDate,
      };
    });

    agentRows.sort((a, b) => b.total_leads - a.total_leads);

    // ── TL summaries ─────────────────────────────────────────────────────────
    // Use effectiveTlByAgent (reporting_manager_id wins, campaign fallback)
    // so agents that are only campaign-linked are included correctly.
    const tlSummaries: TLSummary[] = [];
    if (isOM) {
      for (const tl of allTLs) {
        // All agents (not just scoped) whose effective TL is this one
        const tlAgentIds = allAgents
          .filter((u) => effectiveTlByAgent.get(u.id) === tl.id)
          .map((u) => u.id);

        const sub = agentRows.filter((a) => tlAgentIds.includes(a.agent_id));
        tlSummaries.push({
          tl_id: tl.id,
          tl_name: userLabel(tl),
          agent_count: tlAgentIds.length,
          total_leads: sub.reduce((s, a) => s + a.total_leads, 0),
          today_leads: sub.reduce((s, a) => s + a.today_leads, 0),
          week_leads: sub.reduce((s, a) => s + a.week_leads, 0),
          month_leads: sub.reduce((s, a) => s + a.month_leads, 0),
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
      };
    });

    campaignPerf.sort((a, b) => b.total_uploaded - a.total_uploaded);

    // ── Daily trend (last 30 days within range) ──────────────────────────────
    const trendStart =
      startDate < monthsAgoUTC(1) ? monthsAgoUTC(1) : startDate;

    const dailyMap = new Map<string, number>();
    for (const l of leadsInRange) {
      const d = l.created_at.slice(0, 10);
      if (d >= trendStart) {
        dailyMap.set(d, (dailyMap.get(d) ?? 0) + 1);
      }
    }

    // Fill gaps with 0
    const dailyTrend: DailyTrend[] = [];
    const cur = new Date(trendStart);
    const endDt = new Date(endDate);
    while (cur <= endDt) {
      const ds = toDateStr(cur);
      dailyTrend.push({ date: ds, leads: dailyMap.get(ds) ?? 0 });
      cur.setUTCDate(cur.getUTCDate() + 1);
    }

    // ── Summary ──────────────────────────────────────────────────────────────
    const totalLeads = agentRows.reduce((s, a) => s + a.total_leads, 0);
    const todayLeads = agentRows.reduce((s, a) => s + a.today_leads, 0);
    const weekLeads = agentRows.reduce((s, a) => s + a.week_leads, 0);
    const monthLeads = agentRows.reduce((s, a) => s + a.month_leads, 0);
    const activeCampaigns = scopedCampaigns.filter((c) => c.status === "active").length;
    const pendingAlloc = scopedCampaigns.reduce(
      (s, c) => s + (c.pending_allocation ?? c.total_allocation ?? 0),
      0
    );
    const topPerformer =
      agentRows.length > 0 && agentRows[0].total_leads > 0
        ? { name: agentRows[0].agent_name, total: agentRows[0].total_leads }
        : null;

    const response: TeamPerformanceResponse = {
      scope: isOM ? "organization" : "team",
      date_range: { start: startDate, end: endDate },
      summary: {
        total_leads: totalLeads,
        today_leads: todayLeads,
        week_leads: weekLeads,
        month_leads: monthLeads,
        active_campaigns: activeCampaigns,
        avg_per_day: Number((totalLeads / totalDays).toFixed(2)),
        top_performer: topPerformer,
        pending_allocation: pendingAlloc,
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
