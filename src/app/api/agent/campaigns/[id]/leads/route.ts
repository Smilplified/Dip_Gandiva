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

    const leadsSelectBase = "id, lead_id, name, company_name, phone, email, city, status, followup_date, notes, assigned_agent_id, created_by, created_at, updated_at, job_title, job_function, job_level, direct_number, industry, company_number, employee_size, address, state, country, zip_code, founded_years, founded_years_link, revenue_range, revenue_link, contact_linkedin_url, company_linkedin_url, scored, appointment, lead_tagging, lead_disposition";
    const leadsSelectExtended = leadsSelectBase + ", salutation, first_name, last_name, domain, phone_number_link, department, job_title_link, tenurity, vv_status, email_status, ev_tool, see_all_employees, employee_size_link, company_website_link, sic_code, sic_code_link, naics_code, naics_code_link, ra_comment, special_comments, call_back, call_notes, primary_reason, secondary_reason, qa_comments, cq1, cq2, cq3, cq4, cq5, audit_date, qa_name, asset_title";
    let leadsList: unknown[] | null = null;
    let leadsError: { message?: string } | null = null;
    let res = await supabase
      .from("leads")
      .select(leadsSelectExtended + ", qa_status, disqualification_reasons, disqualification_reason, rectified_reason")
      .eq("campaign_id", campaignId)
      .eq("assigned_agent_id", user.id)
      .order("created_at", { ascending: false });
    leadsList = res.data;
    leadsError = res.error;
    if (leadsError && (res.error?.message?.includes("column") || res.error?.message?.includes("qa_status"))) {
      res = await supabase
        .from("leads")
        .select(leadsSelectBase + ", qa_status, disqualification_reasons, disqualification_reason, rectified_reason")
        .eq("campaign_id", campaignId)
        .eq("assigned_agent_id", user.id)
        .order("created_at", { ascending: false });
      leadsList = res.data;
      leadsError = res.error;
    }

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
      scored: string | null;
      appointment: string | null;
      lead_tagging: string | null;
      lead_disposition: string | null;
      qa_status?: string | null;
      disqualification_reasons?: string | null;
      disqualification_reason?: string | null;
      rectified_reason?: string | null;
    };
    const rawLeads = (leadsList ?? []) as Record<string, unknown>[];
    const leads = rawLeads.map((row) => ({
      ...row,
      qa_status: (row.qa_status as string | null) ?? null,
      disqualification_reasons: (row.disqualification_reasons as string | null) ?? null,
      disqualification_reason: (row.disqualification_reason as string | null) ?? null,
      rectified_reason: (row.rectified_reason as string | null) ?? null,
    })) as LeadRow[];
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
      first_name,
      last_name,
      salutation,
      company_name,
      phone,
      email,
      domain,
      direct_number,
      company_number,
      phone_number_link,
      job_title,
      job_level,
      department,
      job_function,
      job_title_link,
      tenurity,
      vv_status,
      email_status,
      ev_tool,
      address,
      city,
      state,
      country,
      zip_code,
      employee_size,
      see_all_employees,
      industry,
      employee_size_link,
      company_website_link,
      revenue_range,
      revenue_link,
      sic_code,
      sic_code_link,
      naics_code,
      naics_code_link,
      founded_years,
      founded_years_link,
      contact_linkedin_url,
      company_linkedin_url,
      scored,
      appointment,
      lead_tagging,
      ra_comment,
      special_comments,
      call_back,
      call_notes,
      primary_reason,
      secondary_reason,
      qa_comments,
      cq1,
      cq2,
      cq3,
      cq4,
      cq5,
      audit_date,
      qa_name,
      asset_title,
      status,
      lead_disposition,
      followup_date,
      notes,
    } = body ?? {};

    const normalizeString = (value: unknown): string | null =>
      typeof value === "string" ? value.trim() || null : null;

    const normalizedFirstName = normalizeString(first_name);
    const normalizedLastName = normalizeString(last_name);
    const normalizedName = normalizeString(name);
    const normalizedCompanyName = normalizeString(company_name);
    const normalizedEmail = normalizeString(email);
    const normalizedDomain = normalizeString(domain);

    const derivedName =
      [normalizedFirstName, normalizedLastName].filter(Boolean).join(" ").trim() ||
      normalizedName ||
      null;

    if (!derivedName && !normalizedCompanyName && !normalizedEmail && !phone) {
      return NextResponse.json(
        { error: "At least one of name, company, email, or phone is required" },
        { status: 400 }
      );
    }

    // Duplicate lead check for Agent users based on
    // first_name, last_name, email, company_name, and domain
    if (
      normalizedFirstName &&
      normalizedLastName &&
      normalizedEmail &&
      normalizedCompanyName &&
      normalizedDomain
    ) {
      const { data: duplicateLeads, error: duplicateError } = await supabase
        .from("leads")
        .select("id, lead_id")
        .eq("organization_id", orgId)
        .eq("first_name", normalizedFirstName)
        .eq("last_name", normalizedLastName)
        .eq("email", normalizedEmail)
        .eq("company_name", normalizedCompanyName)
        .eq("domain", normalizedDomain)
        .limit(1);

      if (duplicateError) {
        return NextResponse.json(
          { error: duplicateError.message },
          { status: 500 }
        );
      }

      if (duplicateLeads && duplicateLeads.length > 0) {
        const existing = duplicateLeads[0] as { id: string; lead_id: string | null };
        return NextResponse.json(
          {
            error: "Duplicate lead",
            message:
              "A lead with the same first name, last name, email, company name, and domain already exists.",
            duplicate_lead_id: existing.lead_id ?? existing.id,
          },
          { status: 409 }
        );
      }
    }

    const leadStatus =
      typeof status === "string" && status.length > 0 ? status : "new";

    const { data: inserted, error: insertError } = await supabase
      .from("leads")
      .insert({
        organization_id: orgId,
        campaign_id: campaignId,
        assigned_agent_id: user.id,
        name: derivedName || null,
        first_name: normalizedFirstName || null,
        last_name: normalizedLastName || null,
        salutation: salutation || null,
        company_name: normalizedCompanyName || null,
        phone: phone || null,
        email: normalizedEmail || null,
        domain: normalizedDomain || null,
        direct_number: direct_number || null,
        company_number: company_number || null,
        phone_number_link: phone_number_link || null,
        job_title: job_title || null,
        job_level: job_level || null,
        department: department || null,
        job_function: job_function || null,
        job_title_link: job_title_link || null,
        tenurity: tenurity || null,
        vv_status: vv_status || null,
        email_status: email_status || null,
        ev_tool: ev_tool || null,
        address: address || null,
        city: city || null,
        state: state || null,
        country: country || null,
        zip_code: zip_code || null,
        employee_size: employee_size || null,
        see_all_employees: see_all_employees || null,
        industry: industry || null,
        employee_size_link: employee_size_link || null,
        company_website_link: company_website_link || null,
        revenue_range: revenue_range || null,
        revenue_link: revenue_link || null,
        sic_code: sic_code || null,
        sic_code_link: sic_code_link || null,
        naics_code: naics_code || null,
        naics_code_link: naics_code_link || null,
        founded_years: founded_years ?? null,
        founded_years_link: founded_years_link || null,
        contact_linkedin_url: contact_linkedin_url || null,
        company_linkedin_url: company_linkedin_url || null,
        scored: scored || null,
        appointment: appointment || null,
        lead_tagging: lead_tagging || null,
        ra_comment: ra_comment || null,
        special_comments: special_comments || null,
        call_back: call_back || null,
        call_notes: call_notes || null,
        primary_reason: primary_reason || null,
        secondary_reason: secondary_reason || null,
        qa_comments: qa_comments || null,
        cq1: cq1 || null,
        cq2: cq2 || null,
        cq3: cq3 || null,
        cq4: cq4 || null,
        cq5: cq5 || null,
        audit_date: audit_date || null,
        qa_name: qa_name || null,
        asset_title: asset_title || null,
        status: leadStatus,
        lead_disposition: lead_disposition || null,
        followup_date: followup_date || null,
        notes: notes || null,
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
      first_name,
      last_name,
      salutation,
      company_name,
      phone,
      email,
      domain,
      direct_number,
      company_number,
      phone_number_link,
      job_title,
      job_level,
      department,
      job_function,
      job_title_link,
      tenurity,
      vv_status,
      email_status,
      ev_tool,
      address,
      city,
      state,
      country,
      zip_code,
      employee_size,
      see_all_employees,
      industry,
      employee_size_link,
      company_website_link,
      revenue_range,
      revenue_link,
      sic_code,
      sic_code_link,
      naics_code,
      naics_code_link,
      founded_years,
      founded_years_link,
      contact_linkedin_url,
      company_linkedin_url,
      scored,
      appointment,
      lead_tagging,
      ra_comment,
      special_comments,
      call_back,
      call_notes,
      primary_reason,
      secondary_reason,
      qa_comments,
      cq1,
      cq2,
      cq3,
      cq4,
      cq5,
      audit_date,
      qa_name,
      asset_title,
      status,
      lead_disposition,
      followup_date,
      notes,
    } = body ?? {};

    if (!leadRowId) {
      return NextResponse.json(
        { error: "Lead id is required" },
        { status: 400 }
      );
    }

    const derivedName =
      [first_name, last_name].filter(Boolean).join(" ").trim() || name || null;

    const updates: Record<string, unknown> = {};
    if (name !== undefined || first_name !== undefined || last_name !== undefined)
      updates.name = derivedName || null;
    if (first_name !== undefined) updates.first_name = first_name || null;
    if (last_name !== undefined) updates.last_name = last_name || null;
    if (salutation !== undefined) updates.salutation = salutation || null;
    if (company_name !== undefined) updates.company_name = company_name || null;
    if (phone !== undefined) updates.phone = phone || null;
    if (email !== undefined) updates.email = email || null;
    if (domain !== undefined) updates.domain = domain || null;
    if (direct_number !== undefined) updates.direct_number = direct_number || null;
    if (company_number !== undefined) updates.company_number = company_number || null;
    if (phone_number_link !== undefined) updates.phone_number_link = phone_number_link || null;
    if (job_title !== undefined) updates.job_title = job_title || null;
    if (job_level !== undefined) updates.job_level = job_level || null;
    if (department !== undefined) updates.department = department || null;
    if (job_function !== undefined) updates.job_function = job_function || null;
    if (job_title_link !== undefined) updates.job_title_link = job_title_link || null;
    if (tenurity !== undefined) updates.tenurity = tenurity || null;
    if (vv_status !== undefined) updates.vv_status = vv_status || null;
    if (email_status !== undefined) updates.email_status = email_status || null;
    if (ev_tool !== undefined) updates.ev_tool = ev_tool || null;
    if (address !== undefined) updates.address = address || null;
    if (city !== undefined) updates.city = city || null;
    if (state !== undefined) updates.state = state || null;
    if (country !== undefined) updates.country = country || null;
    if (zip_code !== undefined) updates.zip_code = zip_code || null;
    if (employee_size !== undefined) updates.employee_size = employee_size || null;
    if (see_all_employees !== undefined) updates.see_all_employees = see_all_employees || null;
    if (industry !== undefined) updates.industry = industry || null;
    if (employee_size_link !== undefined) updates.employee_size_link = employee_size_link || null;
    if (company_website_link !== undefined) updates.company_website_link = company_website_link || null;
    if (revenue_range !== undefined) updates.revenue_range = revenue_range || null;
    if (revenue_link !== undefined) updates.revenue_link = revenue_link || null;
    if (sic_code !== undefined) updates.sic_code = sic_code || null;
    if (sic_code_link !== undefined) updates.sic_code_link = sic_code_link || null;
    if (naics_code !== undefined) updates.naics_code = naics_code || null;
    if (naics_code_link !== undefined) updates.naics_code_link = naics_code_link || null;
    if (founded_years !== undefined)
      updates.founded_years =
        founded_years !== null && founded_years !== "" ? Number(founded_years) : null;
    if (founded_years_link !== undefined) updates.founded_years_link = founded_years_link || null;
    if (contact_linkedin_url !== undefined) updates.contact_linkedin_url = contact_linkedin_url || null;
    if (company_linkedin_url !== undefined) updates.company_linkedin_url = company_linkedin_url || null;
    if (scored !== undefined) updates.scored = scored || null;
    if (appointment !== undefined) updates.appointment = appointment || null;
    if (lead_tagging !== undefined) updates.lead_tagging = lead_tagging || null;
    if (ra_comment !== undefined) updates.ra_comment = ra_comment || null;
    if (special_comments !== undefined) updates.special_comments = special_comments || null;
    if (call_back !== undefined) updates.call_back = call_back || null;
    if (call_notes !== undefined) updates.call_notes = call_notes || null;
    if (primary_reason !== undefined) updates.primary_reason = primary_reason || null;
    if (secondary_reason !== undefined) updates.secondary_reason = secondary_reason || null;
    if (qa_comments !== undefined) updates.qa_comments = qa_comments || null;
    if (cq1 !== undefined) updates.cq1 = cq1 || null;
    if (cq2 !== undefined) updates.cq2 = cq2 || null;
    if (cq3 !== undefined) updates.cq3 = cq3 || null;
    if (cq4 !== undefined) updates.cq4 = cq4 || null;
    if (cq5 !== undefined) updates.cq5 = cq5 || null;
    if (audit_date !== undefined) updates.audit_date = audit_date || null;
    if (qa_name !== undefined) updates.qa_name = qa_name || null;
    if (asset_title !== undefined) updates.asset_title = asset_title || null;
    if (status !== undefined && typeof status === "string" && status.length > 0) updates.status = status;
    if (lead_disposition !== undefined) updates.lead_disposition = lead_disposition || null;
    if (followup_date !== undefined) updates.followup_date = followup_date || null;
    if (notes !== undefined) updates.notes = notes || null;

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

