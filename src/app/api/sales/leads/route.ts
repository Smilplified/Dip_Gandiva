import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAdminClientSafe, ADMIN_NOT_CONFIGURED_MESSAGE } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

// sales_leads is a dedicated table for Sales UI,
// keeping CRM leads logic separate from agent/QA flows.
const SALES_LEADS_SELECT =
  [
    "id",
    "organization_id",
    "lead_name",
    "first_name",
    "last_name",
    "company_name",
    "email",
    "phone",
    "alt_phone",
    "job_title",
    "linkedin",
    "department",
    "website",
    "industry",
    "company_size",
    "annual_revenue",
    "business_type",
    "gst_number",
    "pan_number",
    "country",
    "state",
    "city",
    "zip",
    "address",
    "budget",
    "decision_maker",
    "purchase_timeline",
    "current_solution",
    "pain_points",
    "requirements",
    "lead_source",
    "source_type",
    "source_campaign",
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "deal_stage",
    "deal_value",
    "probability",
    "expected_close_date",
    "product_interest",
    "last_contacted",
    "next_followup",
    "followup_type",
    "interaction_notes",
    "qualification_status",
    "qa_status",
    "disqualification_reason",
    "rectified_reason",
    "status",
    "lead_score",
    "assigned_agent_id",
    "created_by",
    "created_at",
    "updated_at",
    "tags",
  ].join(", ");

async function getUserAndOrg() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const { data: profile } = await supabase
    .from("users")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  const orgId = (profile as { organization_id: string | null } | null)?.organization_id;
  if (!orgId) {
    return { error: NextResponse.json({ error: "No organization" }, { status: 400 }) };
  }

  const { data: roleRows } = await supabase
    .from("user_roles")
    .select("roles(name)")
    .eq("user_id", user.id);
  const roleNames = ((roleRows ?? []) as { roles: { name: string } | null }[])
    .map((r) => r.roles?.name?.toLowerCase().trim().replace(/\s+/g, "_"))
    .filter(Boolean) as string[];

  const canAccessSalesLeads =
    roleNames.includes("sales") ||
    roleNames.includes("sales_manager") ||
    roleNames.includes("admin");
  if (!canAccessSalesLeads) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { user, orgId, roleNames };
}

export async function GET() {
  try {
    const ctx = await getUserAndOrg();
    if ("error" in ctx) return ctx.error;
    const { orgId, user, roleNames } = ctx;

    const admin = getAdminClientSafe();
    if (!admin) {
      return NextResponse.json({ error: ADMIN_NOT_CONFIGURED_MESSAGE }, { status: 503 });
    }

    let query = admin
      .from("sales_leads")
      .select(SALES_LEADS_SELECT)
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false });

    // Sales Manager & Admin: see entire team's leads. Sales: leads they own or are assigned.
    const isManagerOrAdmin =
      roleNames.includes("sales_manager") || roleNames.includes("admin");
    if (!isManagerOrAdmin) {
      query = query.or(
        `assigned_agent_id.eq.${user!.id},created_by.eq.${user!.id}`
      );
    }

    const { data: leadsRes, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const leads = (leadsRes ?? []) as any[];

    const userIds = Array.from(
      new Set(
        leads
          .flatMap((l: any) => [l.assigned_agent_id, l.created_by])
          .filter(Boolean) as string[]
      )
    );

    let userNames: Record<string, string> = {};
    if (userIds.length > 0) {
      const { data: users } = await admin
        .from("users")
        .select("id, full_name, email")
        .in("id", userIds);
      ((users ?? []) as { id: string; full_name: string | null; email: string | null }[]).forEach(
        (u) => {
          userNames[u.id] = u.full_name || u.email || "Unknown";
        }
      );
    }

    const { data: agentUsers } = await admin
      .from("users")
      .select("id, full_name, email, department")
      .eq("organization_id", orgId);

    const agents =
      (agentUsers ?? []).map((u: any) => ({
        id: u.id as string,
        name: (u.full_name as string | null) || (u.email as string | null) || "Unknown",
        department: (u.department as string | null) ?? null,
      })) ?? [];

    const shapedLeads = leads.map((l: any) => {
      const primaryName =
        l.lead_name ||
        [l.first_name, l.last_name]
          .filter((p: string | null) => p && String(p).trim())
          .join(" ")
          .trim() ||
        null;
      return {
        id: l.id,
        // Identity
        lead_name: primaryName,
        first_name: l.first_name ?? null,
        last_name: l.last_name ?? null,
        // Contact & company
        company: l.company_name ?? null,
        email: l.email,
        phone: l.phone,
        alt_phone: l.alt_phone ?? null,
        job_title: l.job_title ?? null,
        linkedin: l.linkedin ?? null,
        department: l.department ?? null,
        website: l.website ?? null,
        industry: l.industry ?? null,
        company_size: l.company_size ?? null,
        annual_revenue: l.annual_revenue ?? null,
        business_type: l.business_type ?? null,
        gst_number: l.gst_number ?? null,
        pan_number: l.pan_number ?? null,
        // Address
        country: l.country ?? null,
        state: l.state ?? null,
        city: l.city ?? null,
        zip: l.zip ?? null,
        address: l.address ?? null,
        // Qualification
        budget: l.budget ?? null,
        decision_maker: l.decision_maker ?? null,
        purchase_timeline: l.purchase_timeline ?? null,
        current_solution: l.current_solution ?? null,
        pain_points: l.pain_points ?? null,
        requirements: l.requirements ?? null,
        // Source & tracking
        lead_source: l.lead_source,
        source_type: l.source_type ?? null,
        source_campaign: l.source_campaign ?? null,
        utm_source: l.utm_source ?? null,
        utm_medium: l.utm_medium ?? null,
        utm_campaign: l.utm_campaign ?? null,
        // Pipeline
        status: l.status,
        lead_score: l.lead_score ?? null,
        deal_stage: l.deal_stage ?? null,
        deal_value: l.deal_value ?? null,
        probability: l.probability ?? null,
        expected_close_date: l.expected_close_date ?? null,
        product_interest: l.product_interest ?? null,
        // Activity
        last_contacted: l.last_contacted ?? null,
        next_followup: l.next_followup ?? null,
        followup_type: l.followup_type ?? null,
        interaction_notes: l.interaction_notes ?? null,
        // Qualification & QA
        qualification_status: l.qualification_status ?? null,
        qa_status: l.qa_status ?? null,
        disqualification_reason: l.disqualification_reason ?? null,
        rectified_reason: l.rectified_reason ?? null,
        // Ownership & audit
        assigned_to_id: l.assigned_agent_id,
        assigned_to_name: l.assigned_agent_id ? userNames[l.assigned_agent_id] ?? "—" : null,
        created_at: l.created_at,
        created_by_name: l.created_by ? userNames[l.created_by] ?? null : null,
        updated_at: l.updated_at ?? null,
        // Tags
        tags: l.tags ?? null,
      };
    });

    return NextResponse.json({ leads: shapedLeads, agents });
  } catch (err) {
    console.error("Sales leads GET error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await getUserAndOrg();
    if ("error" in ctx) return ctx.error;
    const { user, orgId } = ctx;

    const admin = getAdminClientSafe();
    if (!admin) {
      return NextResponse.json({ error: ADMIN_NOT_CONFIGURED_MESSAGE }, { status: 503 });
    }

    const body = await request.json();
    const {
      lead_name,
      first_name,
      last_name,
      company,
      email,
      phone,
      alt_phone,
      job_title,
      linkedin,
      department,
      website,
      industry,
      company_size,
      annual_revenue,
      business_type,
      gst_number,
      pan_number,
      country,
      state,
      city,
      zip,
      address,
      budget,
      decision_maker,
      purchase_timeline,
      current_solution,
      pain_points,
      requirements,
      lead_source,
      source_type,
      source_campaign,
      utm_source,
      utm_medium,
      utm_campaign,
      deal_stage,
      deal_value,
      probability,
      expected_close_date,
      product_interest,
      last_contacted,
      next_followup,
      followup_type,
      interaction_notes,
      qualification_status,
      qa_status,
      disqualification_reason,
      rectified_reason,
      status,
      lead_score,
      assigned_to_id,
      tags,
    }: Record<string, unknown> = body ?? {};

    const composedLeadName =
      lead_name ||
      [first_name, last_name]
        .filter((p) => p && String(p).trim())
        .join(" ")
        .trim() ||
      null;

    const insertPayload = {
      organization_id: orgId,
      lead_name: composedLeadName,
      first_name: first_name ?? null,
      last_name: (last_name as string | null) ?? null,
      company_name: (company as string | null) ?? null,
      email: (email as string | null) ?? null,
      phone: (phone as string | null) ?? null,
      alt_phone: (alt_phone as string | null) ?? null,
      job_title: (job_title as string | null) ?? null,
      linkedin: (linkedin as string | null) ?? null,
      department: (department as string | null) ?? null,
      website: (website as string | null) ?? null,
      industry: (industry as string | null) ?? null,
      company_size: (company_size as string | null) ?? null,
      annual_revenue: (annual_revenue as string | null) ?? null,
      business_type: (business_type as string | null) ?? null,
      gst_number: (gst_number as string | null) ?? null,
      pan_number: (pan_number as string | null) ?? null,
      country: (country as string | null) ?? null,
      state: (state as string | null) ?? null,
      city: (city as string | null) ?? null,
      zip: (zip as string | null) ?? null,
      address: (address as string | null) ?? null,
      budget: (budget as string | null) ?? null,
      decision_maker: (decision_maker as string | null) ?? null,
      purchase_timeline: (purchase_timeline as string | null) ?? null,
      current_solution: (current_solution as string | null) ?? null,
      pain_points: (pain_points as string | null) ?? null,
      requirements: (requirements as string | null) ?? null,
      lead_source: (lead_source as string | null) ?? null,
      source_type: (source_type as string | null) ?? null,
      source_campaign: (source_campaign as string | null) ?? null,
      utm_source: (utm_source as string | null) ?? null,
      utm_medium: (utm_medium as string | null) ?? null,
      utm_campaign: (utm_campaign as string | null) ?? null,
      deal_stage: (deal_stage as string | null) ?? null,
      deal_value: (deal_value as string | null) ?? null,
      probability:
        typeof probability === "number" ? (probability as number) : null,
      expected_close_date: (expected_close_date as string | null) ?? null,
      product_interest: (product_interest as string | null) ?? null,
      last_contacted: (last_contacted as string | null) ?? null,
      next_followup: (next_followup as string | null) ?? null,
      followup_type: (followup_type as string | null) ?? null,
      interaction_notes: (interaction_notes as string | null) ?? null,
      qualification_status: (qualification_status as string | null) ?? null,
      qa_status: (qa_status as string | null) ?? null,
      disqualification_reason:
        (disqualification_reason as string | null) ?? null,
      rectified_reason: (rectified_reason as string | null) ?? null,
      status: (status as string | null) ?? "new",
      lead_score:
        typeof lead_score === "number" ? (lead_score as number) : null,
      assigned_agent_id: assigned_to_id ?? user!.id,
      created_by: user!.id,
      tags: (tags as string[]) ?? [],
    };

    const { data, error } = await admin
      .from("sales_leads")
      .insert(insertPayload as never)
      .select(SALES_LEADS_SELECT)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ lead: data }, { status: 201 });
  } catch (err) {
    console.error("Sales leads POST error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

