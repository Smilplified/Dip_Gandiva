import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { enrichLeadsWithCreatorNames } from "@/lib/lead-display-names";
import { applyScoredLeadTaggingFilter } from "@/lib/lead-tagging";

export const dynamic = "force-dynamic";

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
  campaign_id: string;
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
  qa_status: string | null;
  disqualification_reasons: string | null;
  disqualification_reason: string | null;
  rectified_reason: string | null;
};

export async function GET() {
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

    const { data: campaigns, error: campaignsError } = await supabase
      .from("campaigns")
      .select(`
        id, campaign_id, campaign_code, name, client_name, description, industry, geography, target_designation, lead_type, status,
        start_date, end_date, created_at, cpl, revenue, booked, total_allocation, post_qa, achieved, pending_allocation,
        region, weekly_call, weekly_report, additional_comments, assigned_team_leader_id,
        employee_size, abm, seniority, job_function, creatives_url
      `)
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false });

    if (campaignsError) {
      return NextResponse.json({ error: campaignsError.message }, { status: 500 });
    }

    const campaignsList = (campaigns ?? []) as { id: string; campaign_id: string; name: string; client_name: string | null; description: string | null; industry: string | null; geography: string | null; target_designation: string | null; lead_type: string | null; status: string; start_date: string | null; end_date: string | null; created_at: string; cpl: number | null; revenue: number | null; booked: number | null; total_allocation: number | null; post_qa: number | null; achieved: number | null; pending_allocation: number | null; region: string | null; weekly_call: string | null; weekly_report: string | null; additional_comments: string | null; assigned_team_leader_id: string | null; employee_size: string[] | null; abm: boolean | null; seniority: string | null; job_function: string | null; creatives_url: string[] | null }[];
    const tlIds = [...new Set(campaignsList.map((c) => c.assigned_team_leader_id).filter(Boolean))] as string[];
    let tlNames: Record<string, string> = {};
    if (tlIds.length > 0) {
      const { data: tlUsers } = await supabase.from("users").select("id, full_name, email").in("id", tlIds);
      ((tlUsers ?? []) as { id: string; full_name: string | null; email: string | null }[]).forEach((u) => {
        tlNames[u.id] = u.full_name || u.email || "Unknown";
      });
    }
    const campaignsWithTlName = campaignsList.map((c) => ({
      ...c,
      assigned_team_leader_name: c.assigned_team_leader_id ? tlNames[c.assigned_team_leader_id] ?? null : null,
    }));
    const campaignIds = campaignsList.map((c) => c.id);

    if (campaignIds.length === 0) {
      return NextResponse.json({ campaigns: campaignsWithTlName.map((c) => ({ ...c, leads: [] })) });
    }

    /** Latest agent lead create/update per campaign — drives QA campaigns table order. */
    const lastLeadActivityMs: Record<string, number> = {};
    const { data: leadActivityRows, error: leadActivityError } = await supabase
      .from("leads")
      .select("campaign_id, created_at, updated_at")
      .in("campaign_id", campaignIds);

    if (leadActivityError) {
      console.error("QA dashboard lead activity:", leadActivityError.message);
    } else {
      for (const row of (leadActivityRows ?? []) as {
        campaign_id: string;
        created_at: string;
        updated_at: string;
      }[]) {
        const createdMs = new Date(row.created_at).getTime();
        const updatedMs = new Date(row.updated_at).getTime();
        const activityMs = Math.max(
          Number.isFinite(createdMs) ? createdMs : 0,
          Number.isFinite(updatedMs) ? updatedMs : 0
        );
        if (!activityMs) continue;
        const prev = lastLeadActivityMs[row.campaign_id] ?? 0;
        if (activityMs > prev) lastLeadActivityMs[row.campaign_id] = activityMs;
      }
    }

    const leadsSelectBase = "id, lead_id, name, company_name, phone, email, city, status, qa_status, followup_date, notes, assigned_agent_id, created_by, creator_display_name, created_at, updated_at, campaign_id, job_title, job_function, job_level, direct_number, industry, company_number, employee_size, address, state, country, zip_code, founded_years, founded_years_link, revenue_range, revenue_link, contact_linkedin_url, company_linkedin_url, scored, scored_timezone, appointment, appointment_timezone, lead_tagging, lead_disposition";
    const leadsSelectExtended = leadsSelectBase + ", salutation, first_name, last_name, domain, phone_number_link, department, job_title_link, tenurity, vv_status, email_status, ev_tool, see_all_employees, employee_size_link, company_website_link, sic_code, sic_code_link, naics_code, naics_code_link, ra_comment, special_comments, call_back, call_notes, primary_reason, secondary_reason, qa_comments, cq1, cq2, cq3, cq4, cq5, audit_date, qa_name, asset_title";
    let { data: leadsData, error: leadsError } = await applyScoredLeadTaggingFilter(
      supabase
        .from("leads")
        .select(leadsSelectExtended + ", disqualification_reasons, disqualification_reason, rectified_reason")
        .in("campaign_id", campaignIds)
    ).order("created_at", { ascending: false });

    if (leadsError && (leadsError.message?.includes("column") || leadsError.message?.includes("disqualification"))) {
      leadsError = null;
      const fallback = await applyScoredLeadTaggingFilter(
        supabase
          .from("leads")
          .select(leadsSelectBase + ", disqualification_reasons, disqualification_reason, rectified_reason")
          .in("campaign_id", campaignIds)
      ).order("created_at", { ascending: false });
      leadsData = fallback.data;
      leadsError = fallback.error;
    }

    if (leadsError) {
      return NextResponse.json({ error: leadsError.message }, { status: 500 });
    }

    const rawList = (leadsData ?? []) as Record<string, unknown>[];
    const leadsList = rawList.map((row) => ({
      ...row,
      disqualification_reasons: (row.disqualification_reasons as string | null) ?? null,
      disqualification_reason: (row.disqualification_reason as string | null) ?? null,
      rectified_reason: (row.rectified_reason as string | null) ?? null,
    })) as LeadRow[];
    const leadsWithNames = await enrichLeadsWithCreatorNames(supabase, leadsList, orgId);

    const leadsByCampaign: Record<string, typeof leadsWithNames> = {};
    campaignsWithTlName.forEach((c) => {
      leadsByCampaign[c.id] = [];
    });
    leadsWithNames.forEach((l) => {
      if (leadsByCampaign[l.campaign_id]) {
        leadsByCampaign[l.campaign_id].push(l);
      }
    });

    const campaignsWithLeads = campaignsWithTlName
      .map((c) => {
        const activityMs = lastLeadActivityMs[c.id] ?? 0;
        return {
          ...c,
          leads: leadsByCampaign[c.id] ?? [],
          last_lead_activity_at: activityMs > 0 ? new Date(activityMs).toISOString() : null,
        };
      })
      .sort((a, b) => {
        const aMs = lastLeadActivityMs[a.id] ?? 0;
        const bMs = lastLeadActivityMs[b.id] ?? 0;
        if (bMs !== aMs) return bMs - aMs;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

    return NextResponse.json({ campaigns: campaignsWithLeads });
  } catch (err) {
    console.error("QA dashboard error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
