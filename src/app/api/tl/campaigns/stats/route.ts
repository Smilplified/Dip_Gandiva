import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

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

    const [campaignsRes, leadsRes] = await Promise.all([
      supabase
        .from("campaigns")
        .select("id, status")
        .eq("organization_id", orgId),
      supabase
        .from("leads")
        .select("id, status")
        .eq("organization_id", orgId),
    ]);

    const campaigns = (campaignsRes.data ?? []) as { id: string; status: string }[];
    const leads = (leadsRes.data ?? []) as { id: string; status: string }[];

    const totalCampaigns = campaigns.length;
    const activeCampaigns = campaigns.filter((c) => c.status === "active").length;
    const totalLeads = leads.length;
    const totalInterested = leads.filter((l) =>
      ["interested", "followup", "closed_won"].includes(l.status)
    ).length;
    const closedWon = leads.filter((l) => l.status === "closed_won").length;
    const conversionPct = totalLeads > 0 ? Math.round((closedWon / totalLeads) * 100) : 0;

    return NextResponse.json({
      totalCampaigns,
      activeCampaigns,
      totalLeads,
      totalInterested,
      conversionPct,
    });
  } catch (err) {
    console.error("Fetch campaign stats error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
