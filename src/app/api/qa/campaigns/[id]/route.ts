import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  enrichCampaignAllocationFields,
} from "@/lib/campaign-allocation";
import { aggregateTlLeadCountsByCampaign } from "@/lib/tl/dashboard-leads";
import { enrichLeadsWithCreatorNames } from "@/lib/lead-display-names";
import { applyScoredLeadTaggingFilter } from "@/lib/lead-tagging";

export const dynamic = "force-dynamic";

const LEADS_SELECT =
  "id, lead_id, name, company_name, phone, email, city, status, qa_status, disqualification_reasons, disqualification_reason, rectified_reason, followup_date, notes, assigned_agent_id, created_by, creator_display_name, created_at, updated_at, campaign_id, lead_type, job_title, job_function, job_level, direct_number, industry, company_number, employee_size, address, state, country, zip_code, founded_years, founded_years_link, revenue_range, revenue_link, contact_linkedin_url, company_linkedin_url, scored, scored_timezone, appointment, appointment_timezone, lead_tagging, lead_disposition, salutation, first_name, last_name, domain, phone_number_link, department, job_title_link, tenurity, vv_status, email_status, ev_tool, see_all_employees, employee_size_link, company_website_link, sic_code, sic_code_link, naics_code, naics_code_link, ra_comment, special_comments, call_back, call_notes, primary_reason, secondary_reason, qa_comments, cq1, cq2, cq3, cq4, cq5, extra_cq, audit_date, qa_name, qa_audited_by_id, qa_audited_at, asset_title, delivery_status, delivered_at";

type LeadRow = {
  assigned_agent_id: string | null;
  created_by: string | null;
  disqualification_reasons: string | null;
  disqualification_reason: string | null;
  rectified_reason: string | null;
  [key: string]: unknown;
};

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
      .select(`
        id, campaign_id, campaign_code, name, client_name, description, industry, geography, target_designation, lead_type, status,
        start_date, end_date, created_at, cpl, revenue, booked, total_allocation, post_qa, achieved, pending_allocation,
        weekly_call, weekly_report, additional_comments, assigned_team_leader_id,
        employee_size, abm, seniority, job_function, creatives_url
      `)
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

    const filesQuery = supabase
      .from("campaign_files")
      .select("id, file_name, file_path, file_size, mime_type, created_at")
      .eq("campaign_id", campaignId)
      .order("created_at", { ascending: false });

    let leadsQuery = applyScoredLeadTaggingFilter(
      supabase
        .from("leads")
        .select(LEADS_SELECT + ", disqualification_reasons, disqualification_reason, rectified_reason")
        .eq("campaign_id", campaignId)
    );
    let { data: leadsData, error: leadsError } = await leadsQuery.order("created_at", {
      ascending: false,
    });

    if (leadsError && (leadsError.message?.includes("column") || leadsError.message?.includes("disqualification"))) {
      leadsError = null;
      const fallback = await applyScoredLeadTaggingFilter(
        supabase
          .from("leads")
          .select("id, lead_id, name, company_name, phone, email, city, status, qa_status, followup_date, notes, assigned_agent_id, created_by, creator_display_name, created_at, updated_at, campaign_id, lead_type, job_title, job_function, job_level, direct_number, industry, company_number, employee_size, address, state, country, zip_code, founded_years, founded_years_link, revenue_range, revenue_link, contact_linkedin_url, company_linkedin_url, scored, scored_timezone, appointment, appointment_timezone, lead_tagging, lead_disposition, disqualification_reasons, disqualification_reason, rectified_reason, delivery_status, delivered_at")
          .eq("campaign_id", campaignId)
      ).order("created_at", { ascending: false });
      leadsData = fallback.data;
      leadsError = fallback.error;
    }

    const { data: fileRows, error: filesError } = await filesQuery;
    if (filesError) {
      console.error("QA campaign files fetch error:", filesError.message);
    }

    if (leadsError) {
      return NextResponse.json({ error: leadsError.message }, { status: 500 });
    }

    const rawList = (leadsData ?? []) as LeadRow[];
    const leadsList: LeadRow[] = rawList.map((row) => ({
      ...row,
      disqualification_reasons: row.disqualification_reasons ?? null,
      disqualification_reason: row.disqualification_reason ?? null,
      rectified_reason: row.rectified_reason ?? null,
    }));

    // Voice recordings load lazily via POST /api/leads/voice-recordings.
    const leadsWithRecordings = await enrichLeadsWithCreatorNames(supabase, leadsList, orgId);

    type FileRow = {
      id: string;
      file_name: string;
      file_path: string;
      file_size: number | null;
      mime_type: string | null;
      created_at: string;
    };
    const filesWithUrls = await Promise.all(
      ((fileRows ?? []) as FileRow[]).map(async (f) => {
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

    const leadCounts = await aggregateTlLeadCountsByCampaign(supabase, orgId, [campaignId]);
    const metrics = leadCounts[campaignId] ?? { total: 0, qualified: 0, delivered: 0 };
    const campaignWithAllocation = enrichCampaignAllocationFields(campaignWithTlName, metrics, {
      achievedFallback: "qualified",
    });

    return NextResponse.json({
      campaign: campaignWithAllocation,
      leads: leadsWithRecordings,
      files: filesWithUrls,
    });
  } catch (err) {
    console.error("QA campaign detail error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
