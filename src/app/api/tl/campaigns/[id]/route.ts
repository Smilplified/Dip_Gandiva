import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
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

    const { data: campaign, error: campaignError } = await supabase
      .from("campaigns")
      .select("id, name, client_name, description, industry, geography, target_designation, lead_type, status, start_date, end_date, cpl, revenue, booked, total_allocation, post_qa, achieved, pending_allocation, region, weekly_call, weekly_report, additional_comments, assigned_team_leader_id, created_at")
      .eq("id", campaignId)
      .eq("organization_id", orgId)
      .single();

    if (campaignError || !campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    const [leadsRes, assignmentsRes] = await Promise.all([
      supabase
        .from("leads")
        .select("id, name, company_name, phone, email, city, status, followup_date, notes, assigned_agent_id, created_at")
        .eq("campaign_id", campaignId),
      supabase
        .from("campaign_assignments")
        .select("id, agent_id, assigned_by, assigned_at, is_active")
        .eq("campaign_id", campaignId)
        .eq("is_active", true),
    ]);

    if (leadsRes.error) {
      return NextResponse.json({ error: leadsRes.error.message }, { status: 500 });
    }
    if (assignmentsRes.error) {
      return NextResponse.json({ error: assignmentsRes.error.message }, { status: 500 });
    }

    type AssignmentRow = { id: string; agent_id: string; assigned_by: string | null; assigned_at: string; is_active: boolean };
    const assignments = (assignmentsRes.data ?? []) as AssignmentRow[];
    const agentIds = [...new Set(assignments.map((a) => a.agent_id))];
    let agentNames: Record<string, string> = {};
    if (agentIds.length > 0) {
      const { data: agentUsers } = await supabase
        .from("users")
        .select("id, full_name, email")
        .in("id", agentIds);
      ((agentUsers ?? []) as { id: string; full_name: string | null; email: string | null }[]).forEach((u) => {
        agentNames[u.id] = u.full_name || u.email || "Unknown";
      });
    }

    const assignmentsWithNames = assignments.map((a) => ({
      ...a,
      agent_name: agentNames[a.agent_id] || "Unknown",
    }));

    return NextResponse.json({
      campaign,
      leads: leadsRes.data ?? [],
      assignments: assignmentsWithNames,
    });
  } catch (err) {
    console.error("Fetch campaign error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
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
      status,
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

    const updates: Record<string, unknown> = {};
    if (typeof name === "string") updates.name = name.trim();
    if (client_name !== undefined) updates.client_name = client_name?.trim() || null;
    if (description !== undefined) updates.description = description?.trim() || null;
    if (industry !== undefined) updates.industry = industry?.trim() || null;
    if (geography !== undefined) updates.geography = geography?.trim() || null;
    if (target_designation !== undefined) updates.target_designation = target_designation?.trim() || null;
    if (lead_type !== undefined) updates.lead_type = lead_type?.trim() || null;
    if (start_date !== undefined) updates.start_date = start_date || null;
    if (end_date !== undefined) updates.end_date = end_date || null;
    if (typeof status === "string" && ["draft", "active", "paused", "completed"].includes(status)) {
      updates.status = status;
    }
    if (cpl !== undefined) updates.cpl = cpl != null ? Number(cpl) : null;
    if (revenue !== undefined) updates.revenue = revenue != null ? Number(revenue) : null;
    if (booked !== undefined) updates.booked = booked != null ? Number(booked) : null;
    if (total_allocation !== undefined) updates.total_allocation = total_allocation != null ? Number(total_allocation) : null;
    if (post_qa !== undefined) updates.post_qa = post_qa != null ? Number(post_qa) : null;
    if (achieved !== undefined) updates.achieved = achieved != null ? Number(achieved) : null;
    if (pending_allocation !== undefined) updates.pending_allocation = pending_allocation != null ? Number(pending_allocation) : null;
    if (region !== undefined) updates.region = region?.trim() || null;
    if (weekly_call !== undefined) updates.weekly_call = weekly_call?.trim() || null;
    if (weekly_report !== undefined) updates.weekly_report = weekly_report?.trim() || null;
    if (additional_comments !== undefined) updates.additional_comments = additional_comments?.trim() || null;
    if (assigned_team_leader_id !== undefined) updates.assigned_team_leader_id = assigned_team_leader_id || null;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    const { data: campaign, error: updateError } = await supabase
      .from("campaigns")
      .update(updates as never)
      .eq("id", campaignId)
      .eq("organization_id", orgId)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }
    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    return NextResponse.json({ campaign });
  } catch (err) {
    console.error("Update campaign error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
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

    const { error: deleteError } = await supabase
      .from("campaigns")
      .delete()
      .eq("id", campaignId)
      .eq("organization_id", orgId);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Delete campaign error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
