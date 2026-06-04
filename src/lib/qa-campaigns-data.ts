import type { SupabaseClient } from "@supabase/supabase-js";
import { enrichLeadsWithCreatorNames } from "@/lib/lead-display-names";
import { applyScoredLeadTaggingFilter } from "@/lib/lead-tagging";
import { countAuditedLeads, countPendingAuditLeads } from "@/lib/qa-lead-audit";

const LEADS_PAGE_SIZE = 1000;

const leadsSelectBase =
  "id, lead_id, name, company_name, phone, email, city, status, qa_status, followup_date, notes, assigned_agent_id, created_by, creator_display_name, created_at, updated_at, campaign_id, job_title, job_function, job_level, direct_number, industry, company_number, employee_size, address, state, country, zip_code, founded_years, founded_years_link, revenue_range, revenue_link, contact_linkedin_url, company_linkedin_url, scored, scored_timezone, appointment, appointment_timezone, lead_tagging, lead_disposition";
const leadsSelectExtended =
  leadsSelectBase +
  ", salutation, first_name, last_name, domain, phone_number_link, department, job_title_link, tenurity, vv_status, email_status, ev_tool, see_all_employees, employee_size_link, company_website_link, sic_code, sic_code_link, naics_code, naics_code_link, ra_comment, special_comments, call_back, call_notes, primary_reason, secondary_reason, qa_comments, cq1, cq2, cq3, cq4, cq5, audit_date, qa_name, qa_audited_by_id, qa_audited_at, asset_title";

export type QaCampaignRow = {
  id: string;
  campaign_id?: string | null;
  campaign_code?: string | null;
  name: string;
  client_name?: string | null;
  description: string | null;
  industry: string | null;
  geography: string | null;
  target_designation?: string | null;
  lead_type?: string | null;
  status: string;
  start_date: string | null;
  end_date: string | null;
  created_at?: string;
  cpl?: number | null;
  revenue?: number | null;
  booked?: number | null;
  total_allocation?: number | null;
  post_qa?: number | null;
  achieved?: number | null;
  pending_allocation?: number | null;
  region?: string | null;
  weekly_call?: string | null;
  weekly_report?: string | null;
  additional_comments?: string | null;
  assigned_team_leader_id?: string | null;
  assigned_team_leader_name?: string | null;
  employee_size?: string[] | null;
  abm?: boolean | null;
  seniority?: string | null;
  job_function?: string | null;
  creatives_url?: string[] | null;
  leads: Record<string, unknown>[];
  last_lead_activity_at: string | null;
  leads_uploaded: number;
  leads_audited: number;
  leads_pending_audit: number;
};

export type QaCampaignsSummary = {
  total_leads_uploaded: number;
  total_audited: number;
  pending_audit: number;
  campaign_count: number;
};

export type QaCampaignsListResult = {
  campaigns: QaCampaignRow[];
  summary: QaCampaignsSummary;
};

async function fetchLeadsInUploadRange(
  supabase: SupabaseClient,
  orgId: string,
  campaignIds: string[],
  startUtc: string,
  endUtc: string
): Promise<Record<string, unknown>[]> {
  if (campaignIds.length === 0) return [];

  const all: Record<string, unknown>[] = [];
  let offset = 0;

  for (;;) {
    let query = applyScoredLeadTaggingFilter(
      supabase
        .from("leads")
        .select(leadsSelectExtended + ", disqualification_reasons, disqualification_reason, rectified_reason")
        .eq("organization_id", orgId)
        .in("campaign_id", campaignIds)
        .gte("created_at", startUtc)
        .lte("created_at", endUtc)
    )
      .order("created_at", { ascending: false })
      .range(offset, offset + LEADS_PAGE_SIZE - 1);

    let { data, error } = await query;

    if (error && (error.message?.includes("column") || error.message?.includes("disqualification"))) {
      query = applyScoredLeadTaggingFilter(
        supabase
          .from("leads")
          .select(leadsSelectBase + ", disqualification_reasons, disqualification_reason, rectified_reason")
          .eq("organization_id", orgId)
          .in("campaign_id", campaignIds)
          .gte("created_at", startUtc)
          .lte("created_at", endUtc)
      )
        .order("created_at", { ascending: false })
        .range(offset, offset + LEADS_PAGE_SIZE - 1);
      const fallback = await query;
      data = fallback.data;
      error = fallback.error;
    }

    if (error) throw new Error(error.message);

    const chunk = (data ?? []) as unknown as Record<string, unknown>[];
    for (const row of chunk) {
      all.push({
        ...row,
        disqualification_reasons: (row.disqualification_reasons as string | null) ?? null,
        disqualification_reason: (row.disqualification_reason as string | null) ?? null,
        rectified_reason: (row.rectified_reason as string | null) ?? null,
      });
    }
    if (chunk.length < LEADS_PAGE_SIZE) break;
    offset += LEADS_PAGE_SIZE;
  }

  return all;
}

export async function loadQaCampaignsForDateRange(
  supabase: SupabaseClient,
  orgId: string,
  startUtc: string,
  endUtc: string
): Promise<QaCampaignsListResult> {
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

  if (campaignsError) throw new Error(campaignsError.message);

  const campaignsList = (campaigns ?? []) as Omit<
    QaCampaignRow,
    "leads" | "last_lead_activity_at" | "leads_uploaded" | "leads_audited" | "leads_pending_audit" | "assigned_team_leader_name"
  >[];

  if (campaignsList.length === 0) {
    return {
      campaigns: [],
      summary: {
        total_leads_uploaded: 0,
        total_audited: 0,
        pending_audit: 0,
        campaign_count: 0,
      },
    };
  }

  const tlIds = [
    ...new Set(campaignsList.map((c) => c.assigned_team_leader_id).filter(Boolean)),
  ] as string[];
  const tlNames: Record<string, string> = {};
  if (tlIds.length > 0) {
    const { data: tlUsers } = await supabase.from("users").select("id, full_name, email").in("id", tlIds);
    ((tlUsers ?? []) as { id: string; full_name: string | null; email: string | null }[]).forEach((u) => {
      tlNames[u.id] = u.full_name || u.email || "Unknown";
    });
  }

  const campaignIds = campaignsList.map((c) => c.id);
  const rawLeads = await fetchLeadsInUploadRange(supabase, orgId, campaignIds, startUtc, endUtc);
  const leadsWithNames = await enrichLeadsWithCreatorNames(supabase, rawLeads, orgId);

  const leadsByCampaign: Record<string, typeof leadsWithNames> = {};
  for (const c of campaignsList) {
    leadsByCampaign[c.id] = [];
  }
  for (const l of leadsWithNames) {
    const cid = l.campaign_id as string;
    if (leadsByCampaign[cid]) {
      leadsByCampaign[cid].push(l);
    }
  }

  const visible: QaCampaignRow[] = [];

  for (const c of campaignsList) {
    const leads = (leadsByCampaign[c.id] ?? []) as Record<string, unknown>[];
    if (leads.length === 0) continue;

    let activityMs = 0;
    for (const l of leads) {
      const createdMs = new Date(String(l.created_at)).getTime();
      if (Number.isFinite(createdMs) && createdMs > activityMs) activityMs = createdMs;
    }

    visible.push({
      ...c,
      assigned_team_leader_name: c.assigned_team_leader_id
        ? tlNames[c.assigned_team_leader_id] ?? null
        : null,
      leads,
      last_lead_activity_at: activityMs > 0 ? new Date(activityMs).toISOString() : null,
      leads_uploaded: leads.length,
      leads_audited: countAuditedLeads(leads as { qa_status?: string | null }[]),
      leads_pending_audit: countPendingAuditLeads(leads as { qa_status?: string | null }[]),
    });
  }

  visible.sort((a, b) => {
    const aMs = a.last_lead_activity_at ? new Date(a.last_lead_activity_at).getTime() : 0;
    const bMs = b.last_lead_activity_at ? new Date(b.last_lead_activity_at).getTime() : 0;
    if (bMs !== aMs) return bMs - aMs;
    const aCreated = a.created_at ? new Date(a.created_at).getTime() : 0;
    const bCreated = b.created_at ? new Date(b.created_at).getTime() : 0;
    return bCreated - aCreated;
  });

  const allLeads = visible.flatMap((c) => c.leads);
  const summary: QaCampaignsSummary = {
    total_leads_uploaded: allLeads.length,
    total_audited: countAuditedLeads(allLeads as { qa_status?: string | null }[]),
    pending_audit: countPendingAuditLeads(allLeads as { qa_status?: string | null }[]),
    campaign_count: visible.length,
  };

  return { campaigns: visible, summary };
}
