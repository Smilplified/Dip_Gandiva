import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
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

    const body = await request.json();
    const {
      name,
      client_name,
      description,
      industry,
      geography,
      target_designation,
      lead_type,
      start_date,
      end_date,
      status = "draft",
      cpl,
      revenue,
      booked,
      total_allocation,
      post_qa,
      achieved,
      pending_allocation,
      region,
      weekly_call,
      weekly_report,
      additional_comments,
      assigned_team_leader_id,
    } = body;

    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "Campaign Name is required" }, { status: 400 });
    }

    const validStatus = ["draft", "active", "paused", "completed"].includes(status)
      ? status
      : "draft";

    const { data: campaign, error: insertError } = await supabase
      .from("campaigns")
      .insert({
        organization_id: orgId,
        name: name.trim(),
        client_name: client_name?.trim() || null,
        description: description?.trim() || null,
        industry: industry?.trim() || null,
        geography: geography?.trim() || null,
        target_designation: target_designation?.trim() || null,
        lead_type: lead_type?.trim() || null,
        start_date: start_date || null,
        end_date: end_date || null,
        status: validStatus,
        cpl: cpl != null ? Number(cpl) : null,
        revenue: revenue != null ? Number(revenue) : null,
        booked: booked != null ? Number(booked) : null,
        total_allocation: total_allocation != null ? Number(total_allocation) : null,
        post_qa: post_qa != null ? Number(post_qa) : null,
        achieved: achieved != null ? Number(achieved) : null,
        pending_allocation: pending_allocation != null ? Number(pending_allocation) : null,
        region: region?.trim() || null,
        weekly_call: weekly_call?.trim() || null,
        weekly_report: weekly_report?.trim() || null,
        additional_comments: additional_comments?.trim() || null,
        assigned_team_leader_id: assigned_team_leader_id || null,
        created_by: user.id,
      } as never)
      .select("id")
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ campaign_id: (campaign as { id: string } | null)?.id });
  } catch (err) {
    console.error("Create campaign error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
