import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { enrichLeadsWithCreatorNames } from "@/lib/lead-display-names";

export const dynamic = "force-dynamic";

const LEADS_SELECT_BASE =
  "id, lead_id, campaign_id, name, company_name, phone, email, city, status, followup_date, notes, assigned_agent_id, created_by, creator_display_name, created_at, updated_at, job_title, job_function, job_level, direct_number, industry, company_number, employee_size, address, state, country, zip_code, founded_years, founded_years_link, revenue_range, revenue_link, contact_linkedin_url, company_linkedin_url, scored, scored_timezone, appointment, appointment_timezone, lead_tagging, lead_disposition";
const LEADS_SELECT_EXTENDED =
  LEADS_SELECT_BASE +
  ", salutation, first_name, last_name, domain, phone_number_link, department, job_title_link, tenurity, vv_status, email_status, ev_tool, see_all_employees, employee_size_link, company_website_link, sic_code, sic_code_link, naics_code, naics_code_link, ra_comment, special_comments, call_back, call_notes, primary_reason, secondary_reason, qa_comments, cq1, cq2, cq3, cq4, cq5, audit_date, qa_name, asset_title";

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

    let res = await supabase
      .from("leads")
      .select(LEADS_SELECT_EXTENDED + ", qa_status, disqualification_reasons, disqualification_reason, rectified_reason")
      .eq("assigned_agent_id", user.id)
      .order("created_at", { ascending: false });

    let leadsList = res.data as Record<string, unknown>[] | null;
    if (res.error && (res.error?.message?.includes("column") || res.error?.message?.includes("qa_status"))) {
      res = await supabase
        .from("leads")
        .select(LEADS_SELECT_BASE + ", qa_status, disqualification_reasons, disqualification_reason, rectified_reason")
        .eq("assigned_agent_id", user.id)
        .order("created_at", { ascending: false });
      leadsList = res.data as Record<string, unknown>[] | null;
    }

    if (res.error) {
      return NextResponse.json({ error: res.error.message }, { status: 500 });
    }

    const rawLeads = (leadsList ?? []) as (Record<string, unknown> & { campaign_id?: string })[];
    const campaignIds = [...new Set(rawLeads.map((l) => l.campaign_id).filter(Boolean))] as string[];

    let campaignNames: Record<string, string> = {};
    if (campaignIds.length > 0) {
      const { data: campaigns } = await supabase
        .from("campaigns")
        .select("id, name")
        .in("id", campaignIds);
      ((campaigns ?? []) as { id: string; name: string }[]).forEach((c) => {
        campaignNames[c.id] = c.name ?? "—";
      });
    }

    const enriched = await enrichLeadsWithCreatorNames(supabase, rawLeads, orgId);

    const leads = enriched.map((row) => ({
      ...row,
      campaign_name: row.campaign_id ? campaignNames[row.campaign_id as string] ?? "—" : null,
      assigned_agent_name: row.assigned_agent_name ?? "—",
      created_by_name: row.created_by_name,
      qa_status: (row.qa_status as string | null) ?? null,
      disqualification_reasons: (row.disqualification_reasons as string | null) ?? null,
      disqualification_reason: (row.disqualification_reason as string | null) ?? null,
      rectified_reason: (row.rectified_reason as string | null) ?? null,
    }));

    return NextResponse.json({ leads });
  } catch (err) {
    console.error("Agent leads (all) error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
