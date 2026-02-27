import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

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

    const { data: campaign } = await supabase
      .from("campaigns")
      .select("id")
      .eq("id", campaignId)
      .eq("organization_id", orgId)
      .single();

    if (!campaign) {
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 }
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
      qa_status,
      disqualification_reasons,
      disqualification_reason,
      rectified_reason,
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
    if (qa_status !== undefined) {
      updates.qa_status = qa_status && typeof qa_status === "string" ? qa_status : null;
    }
    if (disqualification_reasons !== undefined) {
      const val = Array.isArray(disqualification_reasons)
        ? disqualification_reasons.filter((v) => v != null && String(v).trim()).map((v) => String(v).trim()).join(", ")
        : typeof disqualification_reasons === "string"
        ? disqualification_reasons.trim() || null
        : null;
      updates.disqualification_reasons = val;
    }
    if (disqualification_reason !== undefined) {
      updates.disqualification_reason = disqualification_reason != null && String(disqualification_reason).trim() ? String(disqualification_reason).trim() : null;
    }
    if (rectified_reason !== undefined) {
      updates.rectified_reason = rectified_reason != null && String(rectified_reason).trim() ? String(rectified_reason).trim() : null;
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

    const { data: roleRows } = await supabase
      .from("user_roles")
      .select("roles(name)")
      .eq("user_id", user.id);
    const roleNames = ((roleRows ?? []) as { roles: { name: string } | null }[]).map((r) =>
      r.roles?.name?.toLowerCase().trim().replace(/\s+/g, "_")
    );
    const canEditQa = roleNames.includes("qa") || roleNames.includes("admin");
    if (!canEditQa) {
      delete updates.qa_status;
      delete updates.disqualification_reasons;
      delete updates.disqualification_reason;
      delete updates.rectified_reason;
    }

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
    console.error("TL leads update error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
