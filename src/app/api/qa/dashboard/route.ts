import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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
  lead_disposition: string | null;
  qa_status: string | null;
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
        id, campaign_id, name, client_name, description, industry, geography, lead_type, status,
        start_date, end_date, created_at
      `)
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false });

    if (campaignsError) {
      return NextResponse.json({ error: campaignsError.message }, { status: 500 });
    }

    const campaignsList = (campaigns ?? []) as { id: string; campaign_id: string; name: string; client_name: string | null; description: string | null; industry: string | null; geography: string | null; lead_type: string | null; status: string; start_date: string | null; end_date: string | null; created_at: string }[];
    const campaignIds = campaignsList.map((c) => c.id);

    if (campaignIds.length === 0) {
      return NextResponse.json({ campaigns: campaignsList.map((c) => ({ ...c, leads: [] })) });
    }

    const { data: leadsData, error: leadsError } = await supabase
      .from("leads")
      .select("id, lead_id, name, company_name, phone, email, city, status, qa_status, followup_date, notes, assigned_agent_id, created_by, created_at, updated_at, campaign_id, job_title, job_function, job_level, direct_number, industry, company_number, employee_size, address, state, country, zip_code, founded_years, founded_years_link, revenue_range, revenue_link, contact_linkedin_url, company_linkedin_url, lead_disposition")
      .in("campaign_id", campaignIds)
      .order("created_at", { ascending: false });

    if (leadsError) {
      return NextResponse.json({ error: leadsError.message }, { status: 500 });
    }

    const leadsList = (leadsData ?? []) as LeadRow[];
    const userIds = [...new Set(leadsList.flatMap((l) => [l.assigned_agent_id, l.created_by].filter(Boolean)))] as string[];
    let userNames: Record<string, string> = {};
    if (userIds.length > 0) {
      const { data: usersData } = await supabase
        .from("users")
        .select("id, full_name, email")
        .in("id", userIds);
      ((usersData ?? []) as { id: string; full_name: string | null; email: string | null }[]).forEach((u) => {
        userNames[u.id] = u.full_name || u.email || "Unknown";
      });
    }

    const leadsWithNames = leadsList.map((l) => ({
      ...l,
      assigned_agent_name: l.assigned_agent_id ? userNames[l.assigned_agent_id] ?? "—" : null,
      created_by_name: l.created_by ? userNames[l.created_by] ?? "—" : null,
    }));

    const leadsByCampaign: Record<string, typeof leadsWithNames> = {};
    campaignsList.forEach((c) => {
      leadsByCampaign[c.id] = [];
    });
    leadsWithNames.forEach((l) => {
      if (leadsByCampaign[l.campaign_id]) {
        leadsByCampaign[l.campaign_id].push(l);
      }
    });

    const campaignsWithLeads = campaignsList.map((c) => ({
      ...c,
      leads: leadsByCampaign[c.id] ?? [],
    }));

    return NextResponse.json({ campaigns: campaignsWithLeads });
  } catch (err) {
    console.error("QA dashboard error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
