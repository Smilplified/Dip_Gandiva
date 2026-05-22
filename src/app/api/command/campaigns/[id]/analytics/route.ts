import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { hasCommandRole } from "@/lib/command/rules-engine";
import { getRoleNames, getCampaignAnalytics, getProfile } from "@/lib/command/db";
import dayjs from "dayjs";

export const dynamic = "force-dynamic";

interface LeadRow {
  id: string;
  status: string;
  consent_status: string | null;
  channel: string | null;
  delivery_status: string | null;
  created_at: string;
}

const QUALIFIED_LIKE = new Set(["qualified", "registered", "attended", "no_show"]);
const QA_REVIEWED = new Set(["qualified", "disqualified", "registered", "attended", "no_show"]);
const REGISTERED_LIKE = new Set(["registered", "attended", "no_show"]);

function normStatus(s: string): string {
  return String(s ?? "").toLowerCase();
}

function eachDayInRange(start: string, end: string): string[] {
  const a = dayjs(start, "YYYY-MM-DD", true);
  const b = dayjs(end, "YYYY-MM-DD", true);
  if (!a.isValid() || !b.isValid() || a.isAfter(b, "day")) return [];
  const out: string[] = [];
  for (let d = a; !d.isAfter(b, "day"); d = d.add(1, "day")) {
    out.push(d.format("YYYY-MM-DD"));
  }
  return out;
}

function buildTrendSeries(typedLeads: LeadRow[], start: string, end: string) {
  const days = eachDayInRange(start, end);
  const daily = days.map((d) => {
    const ingested = typedLeads.filter((l) => l.created_at.slice(0, 10) === d).length;
    const cum = typedLeads.filter((l) => l.created_at.slice(0, 10) <= d);
    const n = cum.length;
    const q = cum.filter((l) => QUALIFIED_LIKE.has(normStatus(l.status))).length;
    const dq = cum.filter((l) => normStatus(l.status) === "disqualified").length;
    const reg = cum.filter((l) => REGISTERED_LIKE.has(normStatus(l.status))).length;
    const qualDen = Math.max(1, q);
    return {
      date: d,
      leadVolume: ingested,
      qualificationRate: n > 0 ? Math.round((q / n) * 1000) / 10 : null,
      dqRate: n > 0 ? Math.round((dq / n) * 1000) / 10 : null,
      registrationRate: Math.round((reg / qualDen) * 1000) / 10,
    };
  });

  const weekly: {
    period: string;
    leadVolume: number;
    qualificationRate: number | null;
    dqRate: number | null;
    registrationRate: number | null;
  }[] = [];

  for (let i = 0; i < daily.length; i += 7) {
    const chunk = daily.slice(i, i + 7);
    if (chunk.length === 0) continue;
    const last = chunk[chunk.length - 1];
    weekly.push({
      period: `${chunk[0].date} → ${last.date}`,
      leadVolume: chunk.reduce((s, r) => s + r.leadVolume, 0),
      qualificationRate: last.qualificationRate,
      dqRate: last.dqRate,
      registrationRate: last.registrationRate,
    });
  }

  return { daily, weekly };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userRoles = await getRoleNames(supabase, user.id);
  if (!hasCommandRole(userRoles) && !userRoles.includes("client_viewer")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const profile = await getProfile(supabase, user.id);

  if (userRoles.includes("client_viewer")) {
    const { data: campaignGuard } = await supabase
      .from("campaigns")
      .select("id")
      .eq("id", id)
      .eq("client_id", profile?.client_id ?? "__no_client__")
      .single();
    if (!campaignGuard) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  try {
    const { data: campaignDates } = await supabase
      .from("campaigns")
      .select("start_date, end_date")
      .eq("id", id)
      .single();

    const { metrics, leads, history, alerts } = await getCampaignAnalytics(supabase, id);

    const typedLeadsAll = leads as LeadRow[];
    const typedLeads = userRoles.includes("client_viewer")
      ? typedLeadsAll.filter(
          (l) => String(l.delivery_status ?? "").toLowerCase() === "delivered"
        )
      : typedLeadsAll;

    const statusBreakdown = typedLeads.reduce<Record<string, number>>((acc, l) => {
      acc[l.status] = (acc[l.status] ?? 0) + 1;
      return acc;
    }, {});

    const consentBreakdown = typedLeads.reduce<Record<string, number>>((acc, l) => {
      const cs = l.consent_status ?? "pending";
      acc[cs] = (acc[cs] ?? 0) + 1;
      return acc;
    }, {});

    const channelBreakdown = typedLeads.reduce<Record<string, number>>((acc, l) => {
      const ch = l.channel ?? "email";
      acc[ch] = (acc[ch] ?? 0) + 1;
      return acc;
    }, {});

    const dailyLeads = typedLeads.reduce<Record<string, number>>((acc, l) => {
      const day = l.created_at.slice(0, 10);
      acc[day] = (acc[day] ?? 0) + 1;
      return acc;
    }, {});

    const leadDays = typedLeads.map((l) => l.created_at.slice(0, 10)).sort();
    const dataMin = leadDays[0] ?? dayjs().format("YYYY-MM-DD");
    const dataMax = leadDays[leadDays.length - 1] ?? dataMin;

    const sp = request.nextUrl.searchParams;
    let rangeStart =
      sp.get("date_from")?.trim() ||
      dataMin ||
      (campaignDates as { start_date?: string | null } | null)?.start_date;
    let rangeEnd =
      sp.get("date_to")?.trim() ||
      dataMax ||
      (campaignDates as { end_date?: string | null } | null)?.end_date;

    if (!rangeStart) rangeStart = dataMin;
    if (!rangeEnd) rangeEnd = dataMax;
    if (rangeStart > rangeEnd) {
      const t = rangeStart;
      rangeStart = rangeEnd;
      rangeEnd = t;
    }

    const trends = buildTrendSeries(typedLeads, rangeStart, rangeEnd);

    return NextResponse.json({
      metrics,
      leads: {
        total: typedLeads.length,
        statusBreakdown,
        consentBreakdown,
        channelBreakdown,
        dailyLeads: Object.entries(dailyLeads)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([date, count]) => ({ date, count })),
      },
      trends: {
        rangeStart,
        rangeEnd,
        daily: trends.daily,
        weekly: trends.weekly,
      },
      history,
      alerts,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    );
  }
}
