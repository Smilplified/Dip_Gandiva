import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { hasCommandRole } from "@/lib/command/rules-engine";
import { getRoleNames, getCampaignAnalytics, getProfile } from "@/lib/command/db";

export const dynamic = "force-dynamic";

interface LeadRow {
  id: string;
  status: string;
  consent_status: string | null;
  channel: string | null;
  created_at: string;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
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
    const { metrics, leads, history, alerts } = await getCampaignAnalytics(supabase, id);

    const typedLeads = leads as LeadRow[];

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
