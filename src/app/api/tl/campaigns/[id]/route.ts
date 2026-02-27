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
      .select("id, campaign_id, name, client_name, description, industry, geography, target_designation, lead_type, status, start_date, end_date, cpl, revenue, booked, total_allocation, post_qa, achieved, pending_allocation, region, weekly_call, weekly_report, additional_comments, assigned_team_leader_id, employee_size, abm, seniority, job_function, creatives_url, created_at")
      .eq("id", campaignId)
      .eq("organization_id", orgId)
      .single();

    if (campaignError || !campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    const camp = campaign as { assigned_team_leader_id?: string | null; [k: string]: unknown };
    let assigned_team_leader_name: string | null = null;
    if (camp.assigned_team_leader_id) {
      const { data: tlUser } = await supabase
        .from("users")
        .select("full_name, email")
        .eq("id", camp.assigned_team_leader_id)
        .single();
      const u = tlUser as { full_name: string | null; email: string | null } | null;
      assigned_team_leader_name = u ? (u.full_name || u.email || null) : null;
    }
    const campaignWithTlName = { ...(campaign as Record<string, unknown>), assigned_team_leader_name };

    const [leadsRes, assignmentsRes, filesRes] = await Promise.all([
      supabase
        .from("leads")
        .select(
          "id, lead_id, name, company_name, phone, email, city, status, qa_status, followup_date, notes, assigned_agent_id, created_by, created_at, updated_at, job_title, job_function, job_level, direct_number, industry, company_number, employee_size, address, state, country, zip_code, founded_years, founded_years_link, revenue_range, revenue_link, contact_linkedin_url, company_linkedin_url, lead_disposition"
        )
        .eq("campaign_id", campaignId)
        .order("created_at", { ascending: false }),
      supabase
        .from("campaign_assignments")
        .select("id, agent_id, assigned_by, assigned_at, is_active")
        .eq("campaign_id", campaignId)
        .eq("is_active", true),
      supabase
        .from("campaign_files")
        .select("id, file_name, file_path, file_size, mime_type, created_at")
        .eq("campaign_id", campaignId)
        .order("created_at", { ascending: false }),
    ]);

    if (leadsRes.error) {
      return NextResponse.json({ error: leadsRes.error.message }, { status: 500 });
    }
    if (assignmentsRes.error) {
      return NextResponse.json({ error: assignmentsRes.error.message }, { status: 500 });
    }
    const fileRows = filesRes.error ? [] : (filesRes.data ?? []);

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

    type LeadRow = {
      id: string;
      lead_id: string | null;
      name: string | null;
      company_name: string | null;
      phone: string | null;
      email: string | null;
      city: string | null;
      status: string;
      followup_date: string | null;
      notes: string | null;
      assigned_agent_id: string | null;
      created_by: string | null;
      created_at: string;
      updated_at: string;
      job_title: string | null;
      job_function: string | null;
      job_level: string | null;
      direct_number: string | null;
      industry: string | null;
      company_number: string | null;
      employee_size: string | null;
      address: string | null;
      state: string | null;
      country: string | null;
      zip_code: string | null;
      founded_years: number | null;
      founded_years_link: string | null;
      revenue_range: string | null;
      revenue_link: string | null;
      contact_linkedin_url: string | null;
      company_linkedin_url: string | null;
      lead_disposition: string | null;
      qa_status: string | null;
    };
    const leadsList = (leadsRes.data ?? []) as LeadRow[];
    const leadUserIds = [...new Set(leadsList.flatMap((l) => [l.assigned_agent_id, l.created_by].filter(Boolean)))] as string[];
    let leadUserNames: Record<string, string> = {};
    if (leadUserIds.length > 0) {
      const { data: leadUsers } = await supabase
        .from("users")
        .select("id, full_name, email")
        .in("id", leadUserIds);
      ((leadUsers ?? []) as { id: string; full_name: string | null; email: string | null }[]).forEach((u) => {
        leadUserNames[u.id] = u.full_name || u.email || "Unknown";
      });
    }
    const leadsWithNames = leadsList.map((l) => ({
      ...l,
      assigned_agent_name: l.assigned_agent_id ? leadUserNames[l.assigned_agent_id] ?? "—" : null,
      created_by_name: l.created_by ? leadUserNames[l.created_by] ?? "—" : null,
    }));

    type FileRow = { id: string; file_name: string; file_path: string; file_size: number | null; mime_type: string | null; created_at: string };
    const files = fileRows as FileRow[];
    const filesWithUrls = await Promise.all(
      files.map(async (f) => {
        const { data: signed } = await supabase.storage.from("campaign-files").createSignedUrl(f.file_path, 3600);
        return {
          id: f.id,
          file_name: f.file_name,
          file_path: f.file_path,
          file_size: f.file_size,
          mime_type: f.mime_type,
          created_at: f.created_at,
          download_url: signed?.signedUrl ?? null,
        };
      })
    );

    return NextResponse.json({
      campaign: campaignWithTlName,
      leads: leadsWithNames,
      assignments: assignmentsWithNames,
      files: filesWithUrls,
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
      employee_size,
      abm,
      seniority,
      job_function,
      creatives_url,
    } = body;

    const updates: Record<string, unknown> = {};
    if (typeof name === "string") updates.name = name.trim();
    if (client_name !== undefined) updates.client_name = client_name?.trim() || null;
    if (description !== undefined) updates.description = description?.trim() || null;
    if (industry !== undefined) updates.industry = industry?.trim() || null;
    if (geography !== undefined) updates.geography = geography?.trim() || null;
    if (target_designation !== undefined) updates.target_designation = target_designation?.trim() || null;
    if (lead_type !== undefined) {
      const leadTypeStr =
        Array.isArray(lead_type) && lead_type.length
          ? lead_type
              .map((v: unknown) => (typeof v === "string" ? v.trim() : String(v).trim()))
              .filter(Boolean)
              .join(", ")
          : typeof lead_type === "string"
          ? lead_type.trim() || null
          : null;
      updates.lead_type = leadTypeStr;
    }
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
    if (employee_size !== undefined) updates.employee_size = Array.isArray(employee_size) && employee_size.length > 0 ? employee_size.filter((v) => v && typeof v === "string").map((v) => String(v).trim()) : null;
    if (abm !== undefined) updates.abm = abm === true || abm === "true" || abm === "yes" ? true : abm === false || abm === "false" || abm === "no" ? false : null;
    if (seniority !== undefined) updates.seniority = seniority != null && typeof seniority === "string" ? seniority.trim() || null : null;
    if (job_function !== undefined) updates.job_function = job_function != null && typeof job_function === "string" ? job_function.trim() || null : null;
    if (creatives_url !== undefined) updates.creatives_url = Array.isArray(creatives_url) && creatives_url.length > 0 ? creatives_url.filter((v) => v && typeof v === "string").map((v) => String(v).trim()).filter(Boolean) : null;

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
