import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAdminClientSafe } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

async function verifyDC(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  orgId: string
): Promise<boolean> {
  const { data: roles } = await supabase.from("roles").select("id, name").eq("organization_id", orgId);
  const dcRoles = ((roles ?? []) as { id: string; name: string | null }[]).filter(
    (r) => r.name?.toLowerCase() === "dc"
  );
  if (dcRoles.length === 0) return false;
  const { data: ur } = await supabase
    .from("user_roles").select("role_id").eq("user_id", userId)
    .in("role_id", dcRoles.map((r) => r.id));
  return (ur ?? []).length > 0;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabase.from("users").select("organization_id").eq("id", user.id).single();
    const orgId = (profile as { organization_id: string | null } | null)?.organization_id;
    if (!orgId) return NextResponse.json({ error: "No organization" }, { status: 400 });

    const isDC = await verifyDC(supabase, user.id, orgId);
    if (!isDC) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const admin = getAdminClientSafe();
    if (!admin) return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });

    const { id: campaignId } = await params;

    const { data: campaign, error: campaignError } = await admin
      .from("campaigns")
      .select(
        "id, campaign_id, campaign_code, name, description, industry, geography, lead_type, status, start_date, end_date, total_allocation, post_qa, achieved, pending_allocation, region, additional_comments, employee_size, abm, seniority, job_function, creatives_url, cpl, revenue, booked, weekly_call, weekly_report, client_name"
      )
      .eq("id", campaignId)
      .eq("organization_id", orgId)
      .single();

    if (campaignError || !campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    // Files with signed download URLs
    const { data: fileRows } = await admin
      .from("campaign_files")
      .select("id, file_name, file_path, file_size, mime_type, created_at")
      .eq("campaign_id", campaignId)
      .order("created_at", { ascending: false });

    type FileRow = { id: string; file_name: string; file_path: string; file_size: number | null; mime_type: string | null; created_at: string };
    const filesWithUrls = await Promise.all(
      ((fileRows ?? []) as FileRow[]).map(async (f) => {
        const { data: signed } = await admin.storage.from("campaign-files").createSignedUrl(f.file_path, 3600);
        return { ...f, download_url: signed?.signedUrl ?? null };
      })
    );

    // DC only sees leads that MIS has delivered.
    // Accept both standard delivered status and MIS-delivered status values.
    const { data: leads } = await admin
      .from("leads")
      .select("id, lead_id, name, first_name, last_name, email, phone, company_name, designation, status, qa_status, delivery_status, lead_tagging, created_at, updated_at")
      .eq("campaign_id", campaignId)
      .in("delivery_status", ["delivered", "delivered_by_mis"])
      .order("created_at", { ascending: false });

    return NextResponse.json({ campaign, files: filesWithUrls, leads: leads ?? [] });
  } catch (err) {
    console.error("DC campaign detail error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
