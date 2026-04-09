import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { hasCommandRole } from "@/lib/command/rules-engine";
import {
  getProfile,
  getRoleNames,
  queryAlerts,
  clampLimit,
  getAllowedCampaignIdsForClientViewer,
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
  const severity = sp.get("severity");
  const resolvedParam = sp.get("resolved");
  const resolved = resolvedParam !== null ? resolvedParam === "true" : null;
  const cursor = sp.get("cursor");
  const limit = clampLimit(sp.get("limit") ?? "25");

  try {
    const isClientViewer = userRoles.includes("client_viewer");
    const allowedCampaignIds = isClientViewer
      ? await getAllowedCampaignIdsForClientViewer(
          supabase,
          profile?.organization_id ?? "",
          profile?.client_id ?? null
        )
      : null;

    const result = await queryAlerts(supabase, {
      organizationId: profile?.organization_id ?? "",
      campaignId,
      allowedCampaignIds,
      severity,
      resolved,
      limit,
      cursor,
    });

    return NextResponse.json({
      alerts: result.items,
      nextCursor: result.nextCursor,
      hasMore: result.hasMore,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    );
  }
}
