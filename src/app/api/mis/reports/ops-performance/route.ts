import { NextResponse, type NextRequest } from "next/server";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { createClient } from "@/lib/supabase/server";
import { getAdminClientSafe, ADMIN_NOT_CONFIGURED_MESSAGE } from "@/lib/supabase/admin";
import { isAgentRole } from "@/lib/tl/team-hierarchy";
import {
  buildOpsPerformanceReport,
  buildQaUserMaps,
} from "@/lib/mis/ops-performance-report";

export const dynamic = "force-dynamic";

dayjs.extend(utc);
dayjs.extend(timezone);

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

function monthsAgoInTz(tz: string, n: number): string {
  return dayjs().tz(tz).subtract(n, "month").format("YYYY-MM-DD");
}

function utcStartOfDayInTz(dateStr: string, tz: string): string {
  return dayjs.tz(`${dateStr} 00:00:00.000`, "YYYY-MM-DD HH:mm:ss.SSS", tz).utc().toISOString();
}

function utcEndOfDayInTz(dateStr: string, tz: string): string {
  return dayjs.tz(`${dateStr} 23:59:59.999`, "YYYY-MM-DD HH:mm:ss.SSS", tz).utc().toISOString();
}

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

    const sp = request.nextUrl.searchParams;
    const tzParam = sp.get("tz");
    const appTz = isValidTimeZone(tzParam) ? tzParam : "UTC";
    const today = todayInTz(appTz);
    const startDate = sp.get("start_date") || monthsAgoInTz(appTz, 1);
    const endDate = sp.get("end_date") || today;
    const startUtc = utcStartOfDayInTz(startDate, appTz);
    const endUtc = utcEndOfDayInTz(endDate, appTz);

    const { data: allUsers, error: usersErr } = await admin
      .from("users")
      .select("id, full_name, email, user_roles(roles(name))")
      .eq("organization_id", orgId)
      .eq("status", "active");

    if (usersErr) {
      return NextResponse.json({ error: usersErr.message }, { status: 500 });
    }

    type OrgUser = {
      id: string;
      full_name: string | null;
      email: string | null;
      user_roles: { roles: { name: string } | null }[] | null;
    };

    const orgUsers = (allUsers ?? []) as OrgUser[];
    const userById = new Map(orgUsers.map((u) => [u.id, u]));
    const userLabel = (id: string, fallback?: string | null) => {
      const u = userById.get(id);
      if (u) return u.full_name?.trim() || u.email?.trim() || fallback?.trim() || "Unknown";
      return fallback?.trim() || "Unknown";
    };

    const agentIds = new Set(
      orgUsers
        .filter((u) => (u.user_roles ?? []).some((r) => isAgentRole(r.roles?.name)))
        .map((u) => u.id)
    );

    const qaUsers = orgUsers.filter((u) =>
      (u.user_roles ?? []).some((r) => {
        const n = (r.roles?.name ?? "").trim().toLowerCase().replace(/\s+/g, "_");
        return n === "qa";
      })
    );

    const { qaIds, qaNameToId } = buildQaUserMaps(qaUsers, (u) => userLabel(u.id));

    const { data: campaigns, error: campErr } = await admin
      .from("campaigns")
      .select("id, name")
      .eq("organization_id", orgId);

    if (campErr) {
      return NextResponse.json({ error: campErr.message }, { status: 500 });
    }

    const campaignRows = (campaigns ?? []) as { id: string; name: string }[];
    const campaignIds = campaignRows.map((c) => c.id);
    const campaignNameById = new Map(campaignRows.map((c) => [c.id, c.name]));

    const report = await buildOpsPerformanceReport(admin, orgId, {
      startDate,
      endDate,
      startUtc,
      endUtc,
      appTz,
      userLabel,
      agentIds,
      qaUsers,
      qaIds,
      qaNameToId,
      campaignIds,
      campaignNameById,
    });

    return NextResponse.json(report);
  } catch (err) {
    console.error("MIS ops performance report error:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
