import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAdminClientSafe, ADMIN_NOT_CONFIGURED_MESSAGE } from "@/lib/supabase/admin";
import { buildRecordingDownloadFilename } from "@/lib/qa/recording-filename";

export const dynamic = "force-dynamic";

const VOICE_BUCKET = "campaign-files";
const SIGNED_URL_EXPIRY = 60 * 60; // 1 hour

type LeadRow = {
  id: string;
  lead_id: string | null;
  name: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  assigned_agent_id: string | null;
};

type UserRow = {
  id: string;
  full_name: string | null;
  email: string | null;
};

type StorageFile = {
  name: string;
  size?: number;
  created_at?: string;
};

export type RecordingEntry = {
  path: string;
  url: string | null;
  display_name: string;
  original_name: string;
  size: number | null;
  created_at: string | null;
};

export type LeadWithRecordings = {
  id: string;
  lead_id: string | null;
  name: string | null;
  email: string | null;
  agent_name: string | null;
  recordings: RecordingEntry[];
};

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ campaignId: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = getAdminClientSafe();
    if (!admin) {
      return NextResponse.json({ error: ADMIN_NOT_CONFIGURED_MESSAGE }, { status: 503 });
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

    const { campaignId } = await params;
    if (!campaignId) {
      return NextResponse.json({ error: "Campaign ID required" }, { status: 400 });
    }

    // Verify campaign belongs to org
    const { data: campaign, error: campaignError } = await supabase
      .from("campaigns")
      .select("id, name")
      .eq("id", campaignId)
      .eq("organization_id", orgId)
      .single();

    if (campaignError || !campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }
    const campaignRow = campaign as { id: string; name: string };

    // List all lead folders under this campaign in storage
    const campaignPrefix = `${orgId}/${campaignId}`;
    const { data: leadFolders, error: listErr } = await admin.storage
      .from(VOICE_BUCKET)
      .list(campaignPrefix, { limit: 1000 });

    if (listErr) {
      return NextResponse.json({ error: listErr.message }, { status: 500 });
    }

    // These are subfolder entries (lead UUIDs) — exclude campaign-level files
    const leadIds: string[] = (leadFolders ?? [])
      .filter((f) => !f.name.includes(".") && f.name !== "lho")
      .map((f) => f.name);

    if (leadIds.length === 0) {
      return NextResponse.json({
        campaign: { id: campaignRow.id, name: campaignRow.name },
        leads: [],
      });
    }

    // Fetch lead rows (batch)
    const { data: leads, error: leadsErr } = await supabase
      .from("leads")
      .select("id, lead_id, name, first_name, last_name, email, assigned_agent_id")
      .in("id", leadIds)
      .eq("campaign_id", campaignId)
      .eq("organization_id", orgId);

    if (leadsErr) {
      return NextResponse.json({ error: leadsErr.message }, { status: 500 });
    }

    const leadsArr = (leads ?? []) as LeadRow[];

    // Fetch agent names (batch by unique agent ids)
    const agentIds = [...new Set(leadsArr.map((l) => l.assigned_agent_id).filter(Boolean) as string[])];
    const agentMap: Record<string, string> = {};
    if (agentIds.length > 0) {
      const { data: users } = await supabase
        .from("users")
        .select("id, full_name, email")
        .in("id", agentIds);
      for (const u of (users ?? []) as UserRow[]) {
        agentMap[u.id] = u.full_name?.trim() || u.email || u.id;
      }
    }

    const leadsWithRecordings: LeadWithRecordings[] = [];

    for (const lead of leadsArr) {
      const leadPrefix = `${campaignPrefix}/${lead.id}`;
      const { data: files, error: filesErr } = await admin.storage
        .from(VOICE_BUCKET)
        .list(leadPrefix, { limit: 20, sortBy: { column: "created_at", order: "desc" } as never });

      if (filesErr || !files || files.length === 0) continue;

      const agentName = lead.assigned_agent_id
        ? (agentMap[lead.assigned_agent_id] ?? "Unknown")
        : "Unknown";
      const leadName =
        [lead.first_name, lead.last_name].filter(Boolean).join(" ").trim() ||
        lead.name ||
        lead.lead_id ||
        lead.id;

      const recordings: RecordingEntry[] = [];

      for (const f of files as StorageFile[]) {
        if (!f.name || f.name === "lho") continue;
        const objectPath = `${leadPrefix}/${f.name}`;
        const { data: signed } = await admin.storage
          .from(VOICE_BUCKET)
          .createSignedUrl(objectPath, SIGNED_URL_EXPIRY);

        const dateStr = formatDate(f.created_at);
        const displayName = buildRecordingDownloadFilename({
          agentName,
          campaignName: campaignRow.name,
          email: lead.email,
          date: dateStr || "Unknown-Date",
          originalName: f.name,
        });

        recordings.push({
          path: objectPath,
          url: signed?.signedUrl ?? null,
          display_name: displayName,
          original_name: f.name,
          size: f.size ?? null,
          created_at: f.created_at ?? null,
        });
      }

      if (recordings.length > 0) {
        leadsWithRecordings.push({
          id: lead.id,
          lead_id: lead.lead_id,
          name: leadName,
          email: lead.email ?? null,
          agent_name: agentName,
          recordings,
        });
      }
    }

    return NextResponse.json({
      campaign: { id: campaignRow.id, name: campaignRow.name },
      leads: leadsWithRecordings,
    });
  } catch (err) {
    console.error("QA Recordings GET error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
