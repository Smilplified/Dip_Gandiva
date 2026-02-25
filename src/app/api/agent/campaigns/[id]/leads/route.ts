import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
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

    const orgId = (profile as { organization_id: string | null } | null)?.organization_id;
    if (!orgId) {
      return NextResponse.json({ error: "No organization" }, { status: 400 });
    }

    const { id: campaignId } = await params;
    if (!campaignId) {
      return NextResponse.json({ error: "Campaign ID required" }, { status: 400 });
    }

    // Ensure campaign exists (RLS will also enforce assignment)
    const { data: campaign } = await supabase
      .from("campaigns")
      .select("id")
      .eq("id", campaignId)
      .eq("organization_id", orgId)
      .single();

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    const { data: leads, error: leadsError } = await supabase
      .from("leads")
      .select(
        "id, name, company_name, phone, email, city, status, followup_date, notes, assigned_agent_id, created_at"
      )
      .eq("campaign_id", campaignId)
      .eq("assigned_agent_id", user.id)
      .order("created_at", { ascending: false });

    if (leadsError) {
      return NextResponse.json({ error: leadsError.message }, { status: 500 });
    }

    return NextResponse.json({ leads: leads ?? [] });
  } catch (err) {
    console.error("Agent leads fetch error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

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

    const orgId = (profile as { organization_id: string | null } | null)?.organization_id;
    if (!orgId) {
      return NextResponse.json({ error: "No organization" }, { status: 400 });
    }

    const { id: campaignId } = await params;
    if (!campaignId) {
      return NextResponse.json({ error: "Campaign ID required" }, { status: 400 });
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
    const {
      name,
      company_name,
      phone,
      email,
      city,
      status,
      followup_date,
      notes,
    } = body ?? {};

    if (!name && !company_name && !email && !phone) {
      return NextResponse.json(
        { error: "At least one of name, company, email, or phone is required" },
        { status: 400 }
      );
    }

    const leadStatus =
      typeof status === "string" && status.length > 0 ? status : "new";

    const { data: inserted, error: insertError } = await supabase
      .from("leads")
      .insert({
        organization_id: orgId,
        campaign_id: campaignId,
        assigned_agent_id: user.id,
        name: name || null,
        company_name: company_name || null,
        phone: phone || null,
        email: email || null,
        city: city || null,
        status: leadStatus,
        followup_date: followup_date || null,
        notes: notes || null,
        created_by: user.id,
      } as never)
      .select("id")
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ lead_id: (inserted as { id: string } | null)?.id });
  } catch (err) {
    console.error("Agent leads create error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

