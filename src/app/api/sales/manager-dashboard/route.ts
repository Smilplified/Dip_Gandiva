import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAdminClientSafe, ADMIN_NOT_CONFIGURED_MESSAGE } from "@/lib/supabase/admin";
import { LEAD_STATUS_OPTIONS } from "@/constants/salesLeadForm";
import { addDays, computePercentChange, timeAgo } from "@/lib/admin/dashboard-helpers";

export const dynamic = "force-dynamic";

type Trend = "up" | "down" | "neutral";

function normalizeRoleName(name: string | null | undefined) {
  return (name ?? "").toLowerCase().trim().replace(/\s+/g, "_");
}

const SALES_TEAM_ROLES = new Set(["sales", "sales_manager"]);

function parseDealValue(value: unknown): number {
  if (value == null) return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function formatCurrencyShort(num: number) {
  if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `$${Math.round(num / 1_000)}K`;
  return `$${num.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function formatCurrency(num: number) {
  return `$${num.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function shortRepName(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "—";
  if (parts.length === 1) return parts[0].slice(0, 8);
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
}

async function requireSalesManager() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const { data: roleRows } = await supabase
    .from("user_roles")
    .select("roles(name)")
    .eq("user_id", user.id);

  const roleNames = ((roleRows ?? []) as { roles: { name: string } | null }[])
    .map((r) => normalizeRoleName(r.roles?.name))
    .filter(Boolean);

  const isManagerOrAdmin = roleNames.includes("sales_manager") || roleNames.includes("admin");
  if (!isManagerOrAdmin) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  const { data: profile } = await supabase
    .from("users")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  const orgId = (profile as { organization_id: string | null } | null)?.organization_id;
  if (!orgId) {
    return { error: NextResponse.json({ error: "No organization" }, { status: 400 }) };
  }

  const admin = getAdminClientSafe();
  if (!admin) {
    return { error: NextResponse.json({ error: ADMIN_NOT_CONFIGURED_MESSAGE }, { status: 503 }) };
  }

  return { user, orgId, admin };
}

async function fetchSalesTeamUserIds(
  admin: NonNullable<ReturnType<typeof getAdminClientSafe>>,
  orgId: string
) {
  const { data: orgRoles } = await admin.from("roles").select("id, name").eq("organization_id", orgId);
  const salesRoleIds = ((orgRoles ?? []) as { id: string; name: string | null }[])
    .filter((r) => SALES_TEAM_ROLES.has(normalizeRoleName(r.name)))
    .map((r) => r.id);

  if (salesRoleIds.length === 0) return { userIds: [] as string[], users: [] as { id: string; full_name: string | null; email: string | null; status: string; created_at: string }[] };

  const { data: urRows } = await admin.from("user_roles").select("user_id").in("role_id", salesRoleIds);
  const userIds = [...new Set(((urRows ?? []) as { user_id: string }[]).map((r) => r.user_id))];
  if (userIds.length === 0) return { userIds: [], users: [] };

  const { data: userRows } = await admin
    .from("users")
    .select("id, full_name, email, status, created_at")
    .eq("organization_id", orgId)
    .in("id", userIds)
    .eq("status", "active");

  const users = (userRows ?? []) as {
    id: string;
    full_name: string | null;
    email: string | null;
    status: string;
    created_at: string;
  }[];

  return { userIds: users.map((u) => u.id), users };
}

export async function GET() {
  try {
    const ctx = await requireSalesManager();
    if ("error" in ctx) return ctx.error;

    const { orgId, admin } = ctx;
    const now = new Date();
    const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const { userIds: teamUserIds, users: teamUsers } = await fetchSalesTeamUserIds(admin, orgId);
    const teamMemberCount = teamUsers.length;
    const newMembersThisMonth = teamUsers.filter((u) => new Date(u.created_at) >= startMonth).length;

    // ── Deals (scoped to sales team owners) ─────────────────────────────────
    let deals: Array<{
      id: string;
      value: number | null;
      stage: string;
      owner_id: string | null;
      created_at: string;
      deal_name: string | null;
    }> = [];

    if (teamUserIds.length > 0) {
      const { data: dealRows } = await admin
        .from("deals")
        .select("id, value, stage, owner_id, created_at, deal_name")
        .in("owner_id", teamUserIds);
      deals = (dealRows ?? []) as typeof deals;
    }

    const closedWonDeals = deals.filter((d) => String(d.stage).toLowerCase() === "closed_won");
    const isInMonth = (iso: string, start: Date, end: Date) => {
      const d = new Date(iso);
      return d >= start && d < end;
    };

    const closedThisMonth = closedWonDeals.filter((d) =>
      isInMonth(d.created_at, startMonth, new Date(now.getFullYear(), now.getMonth() + 1, 1))
    );
    const closedPrevMonth = closedWonDeals.filter((d) =>
      isInMonth(d.created_at, startPrevMonth, startMonth)
    );

    const teamRevenueTotal = closedWonDeals.reduce((s, d) => s + parseDealValue(d.value), 0);
    const revenueThisMonth = closedThisMonth.reduce((s, d) => s + parseDealValue(d.value), 0);
    const revenuePrevMonth = closedPrevMonth.reduce((s, d) => s + parseDealValue(d.value), 0);
    const dealsClosedTrend = computePercentChange(closedThisMonth.length, closedPrevMonth.length);
    const revenueTrend = computePercentChange(revenueThisMonth, revenuePrevMonth);

    // ── Sales leads (org-wide conversion) ───────────────────────────────────
    const { data: allLeads } = await admin
      .from("sales_leads")
      .select("id, status, converted, assigned_agent_id, created_by, budget")
      .eq("organization_id", orgId);

    const leads = (allLeads ?? []) as Array<{
      id: string;
      status: string | null;
      converted: boolean | null;
      assigned_agent_id: string | null;
      created_by: string | null;
      budget: string | null;
    }>;

    const totalLeads = leads.length;
    const convertedLeads = leads.filter((l) => l.converted).length;
    const conversionRate = totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0;

    const { count: leads30Count } = await admin
      .from("sales_leads")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .gte("created_at", addDays(now, -30).toISOString());

    const { count: leadsPrev30Count } = await admin
      .from("sales_leads")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .gte("created_at", addDays(now, -60).toISOString())
      .lt("created_at", addDays(now, -30).toISOString());

    const { count: convertedLast30 } = await admin
      .from("sales_leads")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .eq("converted", true)
      .gte("created_at", addDays(now, -30).toISOString());

    const { count: convertedPrev30 } = await admin
      .from("sales_leads")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .eq("converted", true)
      .gte("created_at", addDays(now, -60).toISOString())
      .lt("created_at", addDays(now, -30).toISOString());

    const convLast30Rate =
      (leads30Count ?? 0) > 0 ? ((convertedLast30 ?? 0) / (leads30Count ?? 1)) * 100 : 0;
    const convPrev30Rate =
      (leadsPrev30Count ?? 0) > 0 ? ((convertedPrev30 ?? 0) / (leadsPrev30Count ?? 1)) * 100 : 0;
    const conversionTrend = computePercentChange(convLast30Rate, convPrev30Rate);

    // ── Monthly team revenue (6 months) ─────────────────────────────────────
    const monthlyBuckets: { month: string; revenue: number; deals: number; start: Date; end: Date }[] = [];
    for (let i = 5; i >= 0; i -= 1) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      monthlyBuckets.push({
        month: start.toLocaleDateString("en-US", { month: "short" }),
        revenue: 0,
        deals: 0,
        start,
        end,
      });
    }

    for (const deal of closedWonDeals) {
      const d = new Date(deal.created_at);
      for (const bucket of monthlyBuckets) {
        if (d >= bucket.start && d < bucket.end) {
          bucket.revenue += parseDealValue(deal.value);
          bucket.deals += 1;
          break;
        }
      }
    }

    const monthlyTeamData = monthlyBuckets.map(({ month, revenue, deals: dealCount }) => ({
      month,
      revenue,
      deals: dealCount,
    }));

    // ── Pipeline by lead status ─────────────────────────────────────────────
    const statusOrder = LEAD_STATUS_OPTIONS.map((s) => s.value);
    const statusCounts: Record<string, number> = {};
    for (const v of statusOrder) statusCounts[v] = 0;
    for (const l of leads) {
      const st = (l.status ?? "new") as string;
      statusCounts[st] = (statusCounts[st] ?? 0) + 1;
    }
    const pipelineMax = Math.max(1, ...Object.values(statusCounts));
    const pipelineStages = statusOrder
      .map((st, i) => {
        const count = statusCounts[st] ?? 0;
        const colors = ["#4f46e5", "#40a9ff", "#52c41a", "#f59e0b", "#f59e0b", "#389e0d", "#722ed1", "#6b7280"];
        return {
          stage: LEAD_STATUS_OPTIONS.find((o) => o.value === st)?.label ?? st,
          count,
          color: colors[i % colors.length],
          max: pipelineMax,
        };
      })
      .filter((s) => s.count > 0);

    // ── Per-rep stats ───────────────────────────────────────────────────────
    type RepBucket = {
      id: string;
      name: string;
      dealsAll: number;
      revenueAll: number;
      dealsMonth: number;
      revenueMonth: number;
      dealsPrevMonth: number;
      totalLeads: number;
      convertedLeads: number;
    };

    const repMap = new Map<string, RepBucket>();
    const ensureRep = (id: string, name: string) => {
      if (!repMap.has(id)) {
        repMap.set(id, {
          id,
          name,
          dealsAll: 0,
          revenueAll: 0,
          dealsMonth: 0,
          revenueMonth: 0,
          dealsPrevMonth: 0,
          totalLeads: 0,
          convertedLeads: 0,
        });
      }
      return repMap.get(id)!;
    };

    for (const u of teamUsers) {
      ensureRep(u.id, u.full_name || u.email || "Unknown");
    }

    for (const deal of closedWonDeals) {
      if (!deal.owner_id) continue;
      const rep = repMap.get(deal.owner_id);
      if (!rep) continue;
      const val = parseDealValue(deal.value);
      rep.dealsAll += 1;
      rep.revenueAll += val;
      if (isInMonth(deal.created_at, startMonth, new Date(now.getFullYear(), now.getMonth() + 1, 1))) {
        rep.dealsMonth += 1;
        rep.revenueMonth += val;
      }
      if (isInMonth(deal.created_at, startPrevMonth, startMonth)) {
        rep.dealsPrevMonth += 1;
      }
    }

    for (const lead of leads) {
      const ownerId = lead.assigned_agent_id || lead.created_by;
      if (!ownerId || !repMap.has(ownerId)) continue;
      const rep = repMap.get(ownerId)!;
      rep.totalLeads += 1;
      if (lead.converted) rep.convertedLeads += 1;
    }

    const repList = [...repMap.values()].sort((a, b) => b.revenueAll - a.revenueAll);

    const repPerformanceData = repList
      .filter((r) => r.dealsMonth > 0 || r.revenueMonth > 0)
      .slice(0, 8)
      .map((r) => ({
        name: shortRepName(r.name),
        deals: r.dealsMonth,
        revenue: Math.round(r.revenueMonth / 1000),
      }));

    const teamMembers = repList.slice(0, 10).map((r) => {
      const conversion = r.totalLeads > 0 ? Math.round((r.convertedLeads / r.totalLeads) * 100) : 0;
      const trend: Trend =
        r.dealsMonth > r.dealsPrevMonth ? "up" : r.dealsMonth < r.dealsPrevMonth ? "down" : "neutral";
      return {
        key: r.id,
        name: r.name,
        deals: r.dealsAll,
        revenue: formatCurrency(r.revenueAll),
        conversion,
        trend,
        status: "active",
      };
    });

    // ── Recent team activity ────────────────────────────────────────────────
    let activityQuery = admin
      .from("activities")
      .select("id, activity_type, related_to_type, related_to_id, notes, activity_date, owner_id, created_at")
      .order("activity_date", { ascending: false })
      .limit(8);

    if (teamUserIds.length > 0) {
      activityQuery = activityQuery.in("owner_id", teamUserIds);
    }

    const { data: activityRows } = await activityQuery;
    const activityList = (activityRows ?? []) as Array<{
      id: string;
      activity_type: string;
      related_to_type: string | null;
      related_to_id: string | null;
      notes: string | null;
      activity_date: string | null;
      owner_id: string | null;
      created_at: string | null;
    }>;

    const ownerNames: Record<string, string> = {};
    teamUsers.forEach((u) => {
      ownerNames[u.id] = u.full_name || u.email || "Unknown";
    });

    const leadIds = [
      ...new Set(activityList.filter((a) => a.related_to_type === "lead").map((a) => a.related_to_id).filter(Boolean)),
    ] as string[];
    const dealIds = [
      ...new Set(activityList.filter((a) => a.related_to_type === "deal").map((a) => a.related_to_id).filter(Boolean)),
    ] as string[];

    let leadNames: Record<string, string> = {};
    let leadBudgets: Record<string, number> = {};
    if (leadIds.length > 0) {
      const { data: leadRows } = await admin
        .from("sales_leads")
        .select("id, lead_name, first_name, last_name, budget")
        .in("id", leadIds);
      (leadRows ?? []).forEach((r: Record<string, unknown>) => {
        const id = r.id as string;
        leadNames[id] =
          (r.lead_name as string) ||
          [r.first_name, r.last_name].filter(Boolean).join(" ").trim() ||
          "Lead";
        const budgetRaw = r.budget as string | null;
        const budgetNum = budgetRaw ? Number(String(budgetRaw).replace(/[^0-9.]/g, "")) : NaN;
        if (Number.isFinite(budgetNum)) leadBudgets[id] = budgetNum;
      });
    }

    let dealMeta: Record<string, { name: string; value: number }> = {};
    if (dealIds.length > 0) {
      const { data: dealRows } = await admin
        .from("deals")
        .select("id, deal_name, value")
        .in("id", dealIds);
      (dealRows ?? []).forEach((r: Record<string, unknown>) => {
        dealMeta[r.id as string] = {
          name: (r.deal_name as string) || "Deal",
          value: parseDealValue(r.value),
        };
      });
    }

    const actionForType = (activityType: string) => {
      const t = activityType.toLowerCase();
      if (t === "note") return "added a note for";
      if (t === "call") return "logged a call with";
      if (t === "email") return "sent an email to";
      if (t === "meeting") return "scheduled a meeting with";
      if (t === "task") return "created a task for";
      if (t === "lifecycle_change") return "updated status for";
      return "updated record";
    };

    const recentActivities = activityList.map((a) => {
      const userName = a.owner_id ? ownerNames[a.owner_id] ?? "Unknown" : "Unknown";
      const relId = a.related_to_id;
      let target = "—";
      let value = "—";

      if (a.related_to_type === "lead" && relId) {
        target = leadNames[relId] ?? "Lead";
        if (leadBudgets[relId]) value = formatCurrency(leadBudgets[relId]);
      } else if (a.related_to_type === "deal" && relId) {
        target = dealMeta[relId]?.name ?? "Deal";
        if (dealMeta[relId]?.value) value = formatCurrency(dealMeta[relId].value);
      }

      const iso = a.activity_date ?? a.created_at ?? new Date().toISOString();
      return {
        id: a.id,
        user: shortRepName(userName),
        action: actionForType(a.activity_type ?? ""),
        target,
        value,
        time: timeAgo(iso),
        type: a.activity_type === "lifecycle_change" ? "success" : "default",
      };
    });

    return NextResponse.json({
      stats: {
        teamMembers: {
          value: String(teamMemberCount),
          change: newMembersThisMonth > 0 ? `+${newMembersThisMonth} this month` : "No new hires",
          trend: newMembersThisMonth > 0 ? "up" : "neutral",
        },
        teamDealsClosed: {
          value: String(closedThisMonth.length),
          change: dealsClosedTrend.changeText + " vs last month",
          trend: dealsClosedTrend.trend,
        },
        teamRevenue: {
          value: formatCurrencyShort(teamRevenueTotal),
          change: revenueTrend.changeText + " vs last month",
          trend: revenueTrend.trend,
        },
        avgConversion: {
          value: `${conversionRate.toFixed(1)}%`,
          change: conversionTrend.changeText + " vs prior 30d",
          trend: conversionTrend.trend,
        },
      },
      monthlyTeamData,
      pipelineStages,
      repPerformanceData,
      recentActivities,
      teamMembers,
    });
  } catch (err) {
    console.error("Sales manager dashboard GET error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
