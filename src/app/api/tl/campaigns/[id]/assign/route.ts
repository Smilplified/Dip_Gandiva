import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createNotifications } from "@/lib/notifications";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id: campaignId } = await params;
    if (!campaignId) {
      return NextResponse.json({ error: "Campaign ID required" }, { status: 400 });
    }

    const body = await request.json();
    const agent_ids = Array.isArray(body?.agent_ids) ? body.agent_ids : [];

    const { data: campaign } = await supabase
      .from("campaigns")
      .select("id")
      .eq("id", campaignId)
      .eq("organization_id", orgId)
      .single();

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    const { data: existing } = await supabase
      .from("campaign_assignments")
      .select("agent_id")
      .eq("campaign_id", campaignId);

    const existingIds = new Set(((existing ?? []) as { agent_id: string }[]).map((a) => a.agent_id));
    const newIds = new Set(agent_ids);

    const toInsert: { organization_id: string; campaign_id: string; agent_id: string; assigned_by: string }[] = [];
    const toDeactivate: string[] = [];

    for (const agentId of agent_ids) {
      if (!existingIds.has(agentId)) {
        toInsert.push({
          organization_id: orgId,
          campaign_id: campaignId,
          agent_id: agentId,
          assigned_by: user.id,
        });
      } else {
        await supabase
          .from("campaign_assignments")
          .update({ is_active: true, assigned_by: user.id } as never)
          .eq("campaign_id", campaignId)
          .eq("agent_id", agentId);
      }
    }

    for (const agentId of existingIds) {
      if (!newIds.has(agentId)) {
        toDeactivate.push(agentId);
      }
    }

    if (toDeactivate.length > 0) {
      await supabase
        .from("campaign_assignments")
        .update({ is_active: false } as never)
        .eq("campaign_id", campaignId)
        .in("agent_id", toDeactivate);
    }

    if (toInsert.length > 0) {
      const { error: insertError } = await supabase
        .from("campaign_assignments")
        .insert(toInsert as never);

      if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 500 });
      }

      // Fetch campaign name for the notification message
      const { data: campMeta } = await supabase
        .from("campaigns")
        .select("name, organization_id")
        .eq("id", campaignId)
        .single();
      const campName = (campMeta as { name: string; organization_id: string } | null)?.name ?? "a campaign";
      const campOrgId = (campMeta as { name: string; organization_id: string } | null)?.organization_id ?? orgId;

      void createNotifications(
        toInsert.map((a) => ({
          title: "Campaign Assigned",
          message: `You have been assigned to campaign "${campName}". Check your dashboard for leads.`,
          type: "campaign" as const,
          sender_id: user.id,
          receiver_id: a.agent_id,
          reference_type: "campaign" as const,
          reference_id: campaignId,
          organization_id: campOrgId,
        }))
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Assign agents error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
