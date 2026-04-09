import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { hasCommandRole } from "@/lib/command/rules-engine";
import { getProfile, getRoleNames, queryCampaignMetricsHistory } from "@/lib/command/db";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const roles = await getRoleNames(supabase, user.id);
  if (!hasCommandRole(roles) && !roles.includes("client_viewer")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const profile = await getProfile(supabase, user.id);
  if (roles.includes("client_viewer")) {
    const { data: guard } = await supabase
      .from("campaigns")
      .select("id")
      .eq("id", id)
      .eq("client_id", profile?.client_id ?? "__no_client__")
      .single();
    if (!guard) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const limitRaw = Number(req.nextUrl.searchParams.get("limit") ?? "120");
  const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(365, limitRaw)) : 120;

  try {
    const history = await queryCampaignMetricsHistory(supabase, id, limit);
    return NextResponse.json({ history });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    );
  }
}

