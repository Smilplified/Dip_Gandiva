import type { SupabaseClient } from "@supabase/supabase-js";

const LEADS_PAGE_SIZE = 1000;

const LEADS_SELECT_BASE =
  "id, lead_id, campaign_id, name, company_name, phone, email, city, status, followup_date, notes, assigned_agent_id, created_by, creator_display_name, created_at, updated_at, lead_type, job_title, job_function, job_level, direct_number, industry, company_number, employee_size, address, state, country, zip_code, founded_years, founded_years_link, revenue_range, revenue_link, contact_linkedin_url, company_linkedin_url, scored, scored_timezone, appointment, appointment_timezone, lead_tagging, lead_disposition, delivery_status, delivered_at";

const LEADS_SELECT_EXTENDED =
  LEADS_SELECT_BASE +
  ", salutation, first_name, last_name, domain, phone_number_link, department, job_title_link, tenurity, vv_status, email_status, ev_tool, see_all_employees, employee_size_link, company_website_link, sic_code, sic_code_link, naics_code, naics_code_link, ra_comment, special_comments, call_back, call_notes, primary_reason, secondary_reason, qa_comments, cq1, cq2, cq3, cq4, cq5, audit_date, qa_name, qa_audited_by_id, qa_audited_at, asset_title";

const QA_EXTRA =
  ", qa_status, disqualification_reasons, disqualification_reason, rectified_reason";

function isMissingColumnError(message: string | undefined): boolean {
  return Boolean(
    message?.includes("column") || message?.includes("qa_status")
  );
}

/** Paginated fetch — Supabase returns at most 1000 rows per request. */
export async function fetchTlLeadsForCampaigns(
  supabase: SupabaseClient,
  campaignIds: string[]
): Promise<Record<string, unknown>[]> {
  if (campaignIds.length === 0) return [];

  const all: Record<string, unknown>[] = [];
  let offset = 0;
  let useExtendedSelect = true;

  for (;;) {
    const select = (useExtendedSelect ? LEADS_SELECT_EXTENDED : LEADS_SELECT_BASE) + QA_EXTRA;

    const { data, error } = await supabase
      .from("leads")
      .select(select)
      .in("campaign_id", campaignIds)
      .order("created_at", { ascending: false })
      .range(offset, offset + LEADS_PAGE_SIZE - 1);

    if (error && useExtendedSelect && isMissingColumnError(error.message)) {
      useExtendedSelect = false;
      offset = 0;
      all.length = 0;
      continue;
    }

    if (error) throw new Error(error.message);

    const chunk = (data ?? []) as unknown as Record<string, unknown>[];
    all.push(...chunk);
    if (chunk.length < LEADS_PAGE_SIZE) break;
    offset += LEADS_PAGE_SIZE;
  }

  return all;
}
