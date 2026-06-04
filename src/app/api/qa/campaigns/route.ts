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

    const range = resolveDateRangeParams(new URL(request.url).searchParams, "UTC");
    if ("error" in range) {
      return NextResponse.json({ error: range.error }, { status: 400 });
    }

    const { campaigns, summary } = await loadQaCampaignsForDateRange(
      supabase,
      orgId,
      range.startUtc,
      range.endUtc
    );

    return NextResponse.json({
      date_range: {
        start: range.startDate,
        end: range.endDate,
        single_day: range.startDate === range.endDate,
      },
      summary,
      campaigns,
    });
  } catch (err) {
    console.error("QA campaigns list error:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
