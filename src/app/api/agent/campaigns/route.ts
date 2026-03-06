import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
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

    // Find campaigns this agent is assigned to
    const { data: assignments, error: assignmentsError } = await supabase
      .from("campaign_assignments")
      .select("campaign_id")
      .eq("agent_id", user.id)
      .eq("is_active", true);

    if (assignmentsError) {
      return NextResponse.json({ error: assignmentsError.message }, { status: 500 });
    }

    const campaignIds = [...new Set(((assignments ?? []) as { campaign_id: string }[]).map((a) => a.campaign_id))];
    if (campaignIds.length === 0) {
      return NextResponse.json({ campaigns: [] });
    }

    const { data: campaigns, error: campaignsError } = await supabase
      .from("campaigns")
      .select(
        "id, name, client_name, description, industry, geography, lead_type, status, start_date, end_date, region, created_at"
      )
      .eq("organization_id", orgId)
      .in("id", campaignIds)
      .order("created_at", { ascending: false });

    if (campaignsError) {
      return NextResponse.json({ error: campaignsError.message }, { status: 500 });
    }

    // Lead stats for this agent only
    const { data: leadsRes, error: leadsError } = await supabase
      .from("leads")
      .select("campaign_id, status, qa_status")
      .in("campaign_id", campaignIds)
      .eq("assigned_agent_id", user.id);

    if (leadsError) {
      return NextResponse.json({ error: leadsError.message }, { status: 500 });
    }

    const leadsByCampaign: Record<
      string,
      { total: number; active: number; won: number; qualified: number }
    > = {};

    ((leadsRes ?? []) as { campaign_id: string; status: string; qa_status: string | null }[]).forEach((l) => {
      if (!leadsByCampaign[l.campaign_id]) {
        leadsByCampaign[l.campaign_id] = { total: 0, active: 0, won: 0, qualified: 0 };
      }
      const bucket = leadsByCampaign[l.campaign_id];
      bucket.total += 1;
      if (["interested", "followup"].includes(l.status)) bucket.active += 1;
      if (l.status === "closed_won") bucket.won += 1;
      const qa = String(l.qa_status ?? "").trim().toLowerCase();
      if (qa === "qualified" || qa === "approved" || qa === "pass") bucket.qualified += 1;
    });

    type CampaignRow = { id: string; name: string; client_name: string | null; description: string | null; industry: string | null; geography: string | null; lead_type: string | null; status: string; start_date: string | null; end_date: string | null; region: string | null; created_at: string };
    const campaignsWithStats = ((campaigns ?? []) as CampaignRow[]).map((c) => ({
      ...c,
      total_leads: leadsByCampaign[c.id]?.total ?? 0,
      active_leads: leadsByCampaign[c.id]?.active ?? 0,
      won_leads: leadsByCampaign[c.id]?.won ?? 0,
      qualified_leads: leadsByCampaign[c.id]?.qualified ?? 0,
    }));

    return NextResponse.json({ campaigns: campaignsWithStats });
  } catch (err) {
    console.error("Agent campaigns error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

