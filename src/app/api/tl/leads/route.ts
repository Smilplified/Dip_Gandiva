import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { enrichLeadsWithCreatorNames } from "@/lib/lead-display-names";
import { hasOrgWideCampaignAccess } from "@/lib/auth/tl-access";
import { fetchUserRoleNames } from "@/lib/auth/server-roles";
import { fetchCampaignIdsForTeamLeader } from "@/lib/campaign/team-leader-assignments";
import { resolveLeadTypeForExport } from "@/lib/campaign-lead-type";

export const dynamic = "force-dynamic";

const LEADS_SELECT_BASE =
  "id, lead_id, campaign_id, name, company_name, phone, email, city, status, followup_date, notes, assigned_agent_id, created_by, creator_display_name, created_at, updated_at, lead_type, job_title, job_function, job_level, direct_number, industry, company_number, employee_size, address, state, country, zip_code, founded_years, founded_years_link, revenue_range, revenue_link, contact_linkedin_url, company_linkedin_url, scored, scored_timezone, appointment, appointment_timezone, lead_tagging, lead_disposition, delivery_status, delivered_at";
const LEADS_SELECT_EXTENDED =
  LEADS_SELECT_BASE +
  ", salutation, first_name, last_name, domain, phone_number_link, department, job_title_link, tenurity, vv_status, email_status, ev_tool, see_all_employees, employee_size_link, company_website_link, sic_code, sic_code_link, naics_code, naics_code_link, ra_comment, special_comments, call_back, call_notes, primary_reason, secondary_reason, qa_comments, cq1, cq2, cq3, cq4, cq5, audit_date, qa_name, qa_audited_by_id, qa_audited_at, asset_title";

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

    const roleNames = await fetchUserRoleNames(supabase, user.id);
    const seeAllOrgCampaigns = hasOrgWideCampaignAccess(roleNames);

    let campaignsQuery = supabase
      .from("campaigns")
      .select("id, name, lead_type")
      .eq("organization_id", orgId);

    if (!seeAllOrgCampaigns) {
      const junctionCampaignIds = await fetchCampaignIdsForTeamLeader(supabase, user.id, orgId);
      if (junctionCampaignIds.length > 0) {
        const idList = junctionCampaignIds.map((id) => `"${id}"`).join(",");
        campaignsQuery = campaignsQuery.or(
          `assigned_team_leader_id.eq.${user.id},id.in.(${idList})`
        );
      } else {
        campaignsQuery = campaignsQuery.eq("assigned_team_leader_id", user.id);
      }
    }

    const { data: campaigns, error: campaignsError } = await campaignsQuery;

    if (campaignsError) {
      return NextResponse.json({ error: campaignsError.message }, { status: 500 });
    }

    const campaignList = (campaigns ?? []) as { id: string; name: string; lead_type: string | null }[];
    if (campaignList.length === 0) {
      return NextResponse.json({ leads: [] });
    }

    const campaignIds = campaignList.map((c) => c.id);
    const campaignMeta = campaignList.reduce<
      Record<string, { name: string; lead_type: string | null }>
    >((acc, c) => {
      acc[c.id] = { name: c.name ?? "—", lead_type: c.lead_type ?? null };
      return acc;
    }, {});

    let leadsRes = await supabase
      .from("leads")
      .select(LEADS_SELECT_EXTENDED + ", qa_status, disqualification_reasons, disqualification_reason, rectified_reason")
      .in("campaign_id", campaignIds)
      .order("created_at", { ascending: false });

    if (
      leadsRes.error &&
      (leadsRes.error.message?.includes("column") || leadsRes.error.message?.includes("qa_status"))
    ) {
      leadsRes = await supabase
        .from("leads")
        .select(LEADS_SELECT_BASE + ", qa_status, disqualification_reasons, disqualification_reason, rectified_reason")
        .in("campaign_id", campaignIds)
        .order("created_at", { ascending: false });
    }

    if (leadsRes.error) {
      return NextResponse.json({ error: leadsRes.error.message }, { status: 500 });
    }

    const rawLeads = (leadsRes.data ?? []) as (Record<string, unknown> & {
      campaign_id?: string;
      assigned_agent_id?: string;
      created_by?: string;
    })[];

    const enriched = await enrichLeadsWithCreatorNames(supabase, rawLeads, orgId);

    const leads = enriched.map((row) => {
      const meta = row.campaign_id ? campaignMeta[row.campaign_id as string] : undefined;
      return {
      ...row,
      campaign_name: meta?.name ?? "—",
      lead_type: resolveLeadTypeForExport(
        row.lead_type as string | null | undefined,
        meta?.lead_type
      ),
      assigned_agent_name: row.assigned_agent_name ?? "—",
      created_by_name: row.created_by_name ?? "—",
      qa_status: (row.qa_status as string | null) ?? null,
      disqualification_reasons: (row.disqualification_reasons as string | null) ?? null,
      disqualification_reason: (row.disqualification_reason as string | null) ?? null,
      rectified_reason: (row.rectified_reason as string | null) ?? null,
    };
    });

    return NextResponse.json({ leads });
  } catch (error) {
    console.error("TL leads (all) error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
