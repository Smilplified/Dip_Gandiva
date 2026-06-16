import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fetchUserRoleNames } from "@/lib/auth/server-roles";
import { normalizeRoleName } from "@/lib/auth/config";
import {
  countCampaignLeads,
  enrichCampaignAllocationFields,
} from "@/lib/campaign-allocation";

export const dynamic = "force-dynamic";

async function assertAgentAssignedToCampaign(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  campaignId: string
): Promise<boolean> {
  const { data } = await supabase
    .from("campaign_assignments")
    .select("id")
    .eq("campaign_id", campaignId)
    .eq("agent_id", userId)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();
  return Boolean(data);
}

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

    const roleNames = await fetchUserRoleNames(supabase, user.id);
    const isAgent = roleNames.some((r) => normalizeRoleName(r) === "agent");
    if (!isAgent) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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

    const assigned = await assertAgentAssignedToCampaign(supabase, user.id, campaignId);
    if (!assigned) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    const { data: campaign, error: campaignError } = await supabase
      .from("campaigns")
      .select(
        "id, campaign_id, campaign_code, name, client_name, description, industry, geography, lead_type, status, start_date, end_date, total_allocation, post_qa, achieved, pending_allocation, additional_comments, employee_size, abm, seniority, job_function, creatives_url, campaign_questions"
      )
      .eq("id", campaignId)
      .eq("organization_id", orgId)
      .single();

    if (campaignError || !campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    const { data: fileRows, error: filesError } = await supabase
      .from("campaign_files")
      .select("id, file_name, file_path, file_size, mime_type, created_at")
      .eq("campaign_id", campaignId)
      .order("created_at", { ascending: false });

    if (filesError) {
      return NextResponse.json({ error: filesError.message }, { status: 500 });
    }

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
        const { data: signed } = await supabase.storage
          .from("campaign-files")
          .createSignedUrl(f.file_path, 3600);
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

    const leadCount = await countCampaignLeads(supabase, campaignId, orgId);
    const enrichedCampaign = enrichCampaignAllocationFields(campaign, leadCount);

    return NextResponse.json({ campaign: enrichedCampaign, files: filesWithUrls });
  } catch (err) {
    console.error("Agent campaign detail error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
