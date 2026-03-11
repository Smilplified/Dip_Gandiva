import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

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
    const rawLeads = Array.isArray(body?.leads) ? body.leads : [];
    if (rawLeads.length === 0) {
      return NextResponse.json({ error: "No leads to import" }, { status: 400 });
    }
    if (rawLeads.length > 500) {
      return NextResponse.json(
        { error: "Maximum 500 leads per import" },
        { status: 400 }
      );
    }

    const normalizeString = (value: unknown): string | null =>
      typeof value === "string" ? value.trim() || null : null;

    const errors: string[] = [];
    let created = 0;

    for (let i = 0; i < rawLeads.length; i++) {
      const row = rawLeads[i] as Record<string, unknown>;

      // Explicitly ignore any id or lead_id coming from file – Lead ID is system generated
      delete row.id;
      delete row.lead_id;
      delete row.created_by;
      delete row.created_by_name;

      // Normalize core identification fields
      const first_name = normalizeString(row.first_name);
      const last_name = normalizeString(row.last_name);
      const name = normalizeString(row.name);
      const company_name = normalizeString(row.company_name);
      const email = normalizeString(row.email);
      const domain = normalizeString(row.domain);
      const phone =
        typeof row.phone === "string" ? row.phone.trim() || null : null;

      const derivedName =
        [first_name, last_name].filter(Boolean).join(" ").trim() ||
        name ||
        null;

      if (!derivedName && !company_name && !email && !phone) {
        errors.push(
          `Row ${i + 1}: At least one of name, company, email, or phone is required`
        );
        continue;
      }

      // Duplicate lead check based on same keys as single-lead create
      if (
        first_name &&
        last_name &&
        email &&
        company_name &&
        domain
      ) {
        const { data: duplicateLeads, error: duplicateError } = await supabase
          .from("leads")
          .select("id, lead_id")
          .eq("organization_id", orgId)
          .eq("campaign_id", campaignId)
          .eq("first_name", first_name)
          .eq("last_name", last_name)
          .eq("email", email)
          .eq("company_name", company_name)
          .eq("domain", domain)
          .limit(1);

        if (duplicateError) {
          errors.push(`Row ${i + 1}: ${duplicateError.message}`);
          continue;
        }

        if (duplicateLeads && duplicateLeads.length > 0) {
          const existing = duplicateLeads[0] as {
            id: string;
            lead_id: string | null;
          };
          errors.push(
            `Row ${i + 1}: Duplicate lead (${existing.lead_id ?? existing.id})`
          );
          continue;
        }
      }

      const leadStatus =
        typeof row.status === "string" && row.status.length > 0
          ? (row.status as string)
          : "new";

      const insertPayload: Record<string, unknown> = {
        organization_id: orgId,
        campaign_id: campaignId,
        assigned_agent_id: user.id,
        name: derivedName || null,
        first_name,
        last_name,
        salutation: row.salutation ?? null,
        company_name,
        phone,
        email,
        domain,
        direct_number: row.direct_number ?? null,
        company_number: row.company_number ?? null,
        phone_number_link: row.phone_number_link ?? null,
        job_title: row.job_title ?? null,
        job_level: row.job_level ?? null,
        department: row.department ?? null,
        job_function: row.job_function ?? null,
        job_title_link: row.job_title_link ?? null,
        tenurity: row.tenurity ?? null,
        vv_status: row.vv_status ?? null,
        email_status: row.email_status ?? null,
        ev_tool: row.ev_tool ?? null,
        address: row.address ?? null,
        city: row.city ?? null,
        state: row.state ?? null,
        country: row.country ?? null,
        zip_code: row.zip_code ?? null,
        employee_size: row.employee_size ?? null,
        see_all_employees: row.see_all_employees ?? null,
        industry: row.industry ?? null,
        employee_size_link: row.employee_size_link ?? null,
        company_website_link: row.company_website_link ?? null,
        revenue_range: row.revenue_range ?? null,
        revenue_link: row.revenue_link ?? null,
        sic_code: row.sic_code ?? null,
        sic_code_link: row.sic_code_link ?? null,
        naics_code: row.naics_code ?? null,
        naics_code_link: row.naics_code_link ?? null,
        founded_years:
          row.founded_years != null
            ? Number(row.founded_years)
            : null,
        founded_years_link: row.founded_years_link ?? null,
        contact_linkedin_url: row.contact_linkedin_url ?? null,
        company_linkedin_url: row.company_linkedin_url ?? null,
        scored: row.scored ?? null,
        appointment: row.appointment ?? null,
        lead_tagging: row.lead_tagging ?? null,
        ra_comment: row.ra_comment ?? null,
        special_comments: row.special_comments ?? null,
        call_back: row.call_back ?? null,
        call_notes: row.call_notes ?? null,
        // QA-only fields are deliberately ignored (asset_title, qa_status, qa_name, audit_date, qa_comments, primary_reason, secondary_reason, etc.)
        lead_disposition: row.lead_disposition ?? null,
        followup_date: row.followup_date ?? null,
        notes: row.notes ?? null,
        status: leadStatus,
        created_by: user.id,
      };

      const { error: insertError } = await supabase
        .from("leads")
        .insert(insertPayload as never);

      if (insertError) {
        errors.push(`Row ${i + 1}: ${insertError.message}`);
      } else {
        created++;
      }
    }

    return NextResponse.json({
      created,
      updated: 0,
      total: rawLeads.length,
      errors,
    });
  } catch (err) {
    console.error("Agent leads import error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

