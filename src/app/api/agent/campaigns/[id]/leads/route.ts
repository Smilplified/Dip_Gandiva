import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id: campaignId } = await params;
    if (!campaignId) {
      return NextResponse.json({ error: "Campaign ID required" }, { status: 400 });
    }

    // Ensure campaign exists (RLS will also enforce assignment)
    const { data: campaign } = await supabase
      .from("campaigns")
      .select("id")
      .eq("id", campaignId)
      .eq("organization_id", orgId)
      .single();

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    const { data: leadsList, error: leadsError } = await supabase
      .from("leads")
      .select(
        "id, lead_id, name, company_name, phone, email, city, status, followup_date, notes, assigned_agent_id, created_by, created_at, updated_at, job_title, job_function, job_level, direct_number, industry, company_number, employee_size, address, state, country, zip_code, founded_years, founded_years_link, revenue_range, revenue_link, contact_linkedin_url, company_linkedin_url, lead_disposition"
      )
      .eq("campaign_id", campaignId)
      .eq("assigned_agent_id", user.id)
      .order("created_at", { ascending: false });

    if (leadsError) {
      return NextResponse.json({ error: leadsError.message }, { status: 500 });
    }

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
    };
    const leads = (leadsList ?? []) as LeadRow[];
    const userIds = [...new Set(leads.flatMap((l) => [l.assigned_agent_id, l.created_by].filter(Boolean)))] as string[];
    let userNames: Record<string, string> = {};
    if (userIds.length > 0) {
      const { data: users } = await supabase.from("users").select("id, full_name, email").in("id", userIds);
      ((users ?? []) as { id: string; full_name: string | null; email: string | null }[]).forEach((u) => {
        userNames[u.id] = u.full_name || u.email || "Unknown";
      });
    }
    const leadsWithNames = leads.map((l) => ({
      ...l,
      assigned_agent_name: l.assigned_agent_id ? userNames[l.assigned_agent_id] ?? "—" : null,
      created_by_name: l.created_by ? userNames[l.created_by] ?? "—" : null,
    }));

    return NextResponse.json({ leads: leadsWithNames });
  } catch (err) {
    console.error("Agent leads fetch error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id: campaignId } = await params;
    if (!campaignId) {
      return NextResponse.json({ error: "Campaign ID required" }, { status: 400 });
    }

    // Ensure agent is assigned to this campaign
    const { data: assignment } = await supabase
      .from("campaign_assignments")
      .select("id")
      .eq("campaign_id", campaignId)
      .eq("agent_id", user.id)
      .eq("is_active", true)
      .maybeSingle();

    if (!assignment) {
      return NextResponse.json(
        { error: "You are not assigned to this campaign" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      name,
      company_name,
      phone,
      email,
      city,
      status,
      followup_date,
      notes,
      job_title,
      job_function,
      job_level,
      direct_number,
      industry,
      company_number,
      employee_size,
      address,
      state,
      country,
      zip_code,
      founded_years,
      founded_years_link,
      revenue_range,
      revenue_link,
      contact_linkedin_url,
      company_linkedin_url,
      lead_disposition,
    } = body ?? {};

    if (!name && !company_name && !email && !phone) {
      return NextResponse.json(
        { error: "At least one of name, company, email, or phone is required" },
        { status: 400 }
      );
    }

    const leadStatus =
      typeof status === "string" && status.length > 0 ? status : "new";

    const { data: inserted, error: insertError } = await supabase
      .from("leads")
      .insert({
        organization_id: orgId,
        campaign_id: campaignId,
        assigned_agent_id: user.id,
        name: name || null,
        company_name: company_name || null,
        phone: phone || null,
        email: email || null,
        city: city || null,
        status: leadStatus,
        followup_date: followup_date || null,
        notes: notes || null,
        job_title: job_title || null,
        job_function: job_function || null,
        job_level: job_level || null,
        direct_number: direct_number || null,
        industry: industry || null,
        company_number: company_number || null,
        employee_size: employee_size || null,
        address: address || null,
        state: state || null,
        country: country || null,
        zip_code: zip_code || null,
        founded_years: founded_years ?? null,
        founded_years_link: founded_years_link || null,
        revenue_range: revenue_range || null,
        revenue_link: revenue_link || null,
        contact_linkedin_url: contact_linkedin_url || null,
        company_linkedin_url: company_linkedin_url || null,
        lead_disposition: lead_disposition || null,
        created_by: user.id,
      } as never)
      .select("id, lead_id")
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    const row = inserted as { id: string; lead_id: string | null } | null;
    return NextResponse.json({ lead_id: row?.lead_id ?? row?.id, id: row?.id });
  } catch (err) {
    console.error("Agent leads create error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const orgId = (profile as { organization_id: string | null } | null)
      ?.organization_id;
    if (!orgId) {
      return NextResponse.json({ error: "No organization" }, { status: 400 });
    }

    const { id: campaignId } = await params;
    if (!campaignId) {
      return NextResponse.json(
        { error: "Campaign ID required" },
        { status: 400 }
      );
    }

    // Ensure agent is assigned to this campaign
    const { data: assignment } = await supabase
      .from("campaign_assignments")
      .select("id")
      .eq("campaign_id", campaignId)
      .eq("agent_id", user.id)
      .eq("is_active", true)
      .maybeSingle();

    if (!assignment) {
      return NextResponse.json(
        { error: "You are not assigned to this campaign" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      id: leadRowId,
      name,
      company_name,
      phone,
      email,
      city,
      status,
      followup_date,
      notes,
      job_title,
      job_function,
      job_level,
      direct_number,
      industry,
      company_number,
      employee_size,
      address,
      state,
      country,
      zip_code,
      founded_years,
      founded_years_link,
      revenue_range,
      revenue_link,
      contact_linkedin_url,
      company_linkedin_url,
      lead_disposition,
    } = body ?? {};

    if (!leadRowId) {
      return NextResponse.json(
        { error: "Lead id is required" },
        { status: 400 }
      );
    }

    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = name || null;
    if (company_name !== undefined) updates.company_name = company_name || null;
    if (phone !== undefined) updates.phone = phone || null;
    if (email !== undefined) updates.email = email || null;
    if (city !== undefined) updates.city = city || null;
    if (status !== undefined && typeof status === "string" && status.length > 0) {
      updates.status = status;
    }
    if (followup_date !== undefined)
      updates.followup_date = followup_date || null;
    if (notes !== undefined) updates.notes = notes || null;
    if (job_title !== undefined) updates.job_title = job_title || null;
    if (job_function !== undefined) updates.job_function = job_function || null;
    if (job_level !== undefined) updates.job_level = job_level || null;
    if (direct_number !== undefined)
      updates.direct_number = direct_number || null;
    if (industry !== undefined) updates.industry = industry || null;
    if (company_number !== undefined)
      updates.company_number = company_number || null;
    if (employee_size !== undefined)
      updates.employee_size = employee_size || null;
    if (address !== undefined) updates.address = address || null;
    if (state !== undefined) updates.state = state || null;
    if (country !== undefined) updates.country = country || null;
    if (zip_code !== undefined) updates.zip_code = zip_code || null;
    if (founded_years !== undefined)
      updates.founded_years =
        founded_years !== null && founded_years !== ""
          ? Number(founded_years)
          : null;
    if (founded_years_link !== undefined)
      updates.founded_years_link = founded_years_link || null;
    if (revenue_range !== undefined)
      updates.revenue_range = revenue_range || null;
    if (revenue_link !== undefined) updates.revenue_link = revenue_link || null;
    if (contact_linkedin_url !== undefined)
      updates.contact_linkedin_url = contact_linkedin_url || null;
    if (company_linkedin_url !== undefined)
      updates.company_linkedin_url = company_linkedin_url || null;
    if (lead_disposition !== undefined)
      updates.lead_disposition = lead_disposition || null;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 }
      );
    }

    const { data: updated, error: updateError } = await supabase
      .from("leads")
      .update(updates as never)
      .eq("id", leadRowId)
      .eq("campaign_id", campaignId)
      .eq("organization_id", orgId)
      .eq("assigned_agent_id", user.id)
      .select("id, lead_id")
      .maybeSingle();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }
    if (!updated) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Agent leads update error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

