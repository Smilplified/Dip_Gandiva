import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resolveDateRangeParams } from "@/lib/date-range-tz";
import { loadQaCampaignsForDateRange } from "@/lib/qa-campaigns-data";

export const dynamic = "force-dynamic";

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

    const { data: profile } = await supabase
      .from("users")
      .select("organization_id")
      .eq("id", user.id)
      .single();

    const orgId = (profile as { organization_id: string | null } | null)?.organization_id;
    if (!orgId) {
      return NextResponse.json({ error: "No organization" }, { status: 400 });
    }

    const sp = new URL(request.url).searchParams;
    const range = resolveDateRangeParams(sp, "UTC");
    if ("error" in range) {
      return NextResponse.json({ error: range.error }, { status: 400 });
    }

    const page = Math.max(1, parseInt(sp.get("page") ?? "1", 10) || 1);
    const requestedLimit = Math.max(1, parseInt(sp.get("limit") ?? "10", 10) || 10);
    const includeLeads = sp.get("include_leads") === "1";
    const campaignIds = (sp.get("campaign_ids") ?? "")
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);
    const maxLimit = campaignIds.length > 0 ? 500 : 100;
    const limit = Math.min(
      maxLimit,
      campaignIds.length > 0 ? Math.max(requestedLimit, campaignIds.length) : requestedLimit
    );

    const { campaigns, summary, pagination } = await loadQaCampaignsForDateRange(
      supabase,
      orgId,
      range.startUtc,
      range.endUtc,
      {
        page,
        limit,
        includeLeads,
        campaignIds: campaignIds.length > 0 ? campaignIds : undefined,
      }
    );

    return NextResponse.json({
      date_range: {
        start: range.startDate,
        end: range.endDate,
        single_day: range.startDate === range.endDate,
      },
      summary,
      campaigns,
      pagination,
    });
  } catch (err) {
    console.error("QA campaigns list error:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
