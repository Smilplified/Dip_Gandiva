import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { hasCommandRole } from "@/lib/command/rules-engine";
import {
  getProfile,
  getRoleNames,
  clampLimit,
  encodeCursor,
  decodeCursor,
} from "@/lib/command/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
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

  const sp = request.nextUrl.searchParams;
  const campaignId = sp.get("campaign_id");
  const status = sp.get("status");
  const consentStatus = sp.get("consent_status");
  const channel = sp.get("channel");
  const cursor = sp.get("cursor");
  const limit = clampLimit(sp.get("limit") ?? "25");

  // Build base query with cursor-based pagination
  let query = supabase
    .from("leads")
    .select(
      `id, name, company_name, email, phone, city, status, consent_status,
       channel, risk_flags, created_at, updated_at, campaign_id,
       campaigns(id, name, campaign_id, client_id, client_name, status, start_date, end_date)`,
      { count: "exact" }
    )
    .eq("organization_id", profile?.organization_id ?? "")
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit + 1); // fetch one extra to know if there's a next page

  // Cursor position (keyset pagination)
  if (cursor) {
    const decoded = decodeCursor(cursor);
    if (decoded) {
      query = query.or(
        `created_at.lt.${decoded.created_at},and(created_at.eq.${decoded.created_at},id.lt.${decoded.id})`
      );
    }
  }

  if (campaignId) query = query.eq("campaign_id", campaignId);
  if (status) query = query.eq("status", status);
  if (consentStatus) query = query.eq("consent_status", consentStatus);
  if (channel) query = query.eq("channel", channel);

  // client_viewer: restrict to campaigns where client_id = user.client_id
  if (userRoles.includes("client_viewer")) {
    if (!profile?.client_id) {
      return NextResponse.json({ leads: [], total: 0, limit, nextCursor: null, hasMore: false });
    }
    query = query.eq("campaigns.client_id", profile.client_id);
  }

  const { data: leads, count, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = (leads ?? []) as Record<string, unknown>[];
  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;

  const last = items[items.length - 1];
  const nextCursor =
    hasMore && last
      ? encodeCursor(last.id as string, last.created_at as string)
      : null;

  return NextResponse.json({
    leads: items,
    total: count ?? 0,
    limit,
    nextCursor,
    hasMore,
  });
}
