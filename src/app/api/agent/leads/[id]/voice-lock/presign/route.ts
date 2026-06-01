import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAdminClientSafe, ADMIN_NOT_CONFIGURED_MESSAGE } from "@/lib/supabase/admin";
import { PRIVILEGED_VOICE_ROLES } from "@/lib/voice-recordings";

export const dynamic = "force-dynamic";

const VOICE_BUCKET = "campaign-files";
const MAX_RECORDINGS_PER_LEAD = 4;
const ALLOWED_AUDIO_TYPES = [
  "audio/mpeg", "audio/mp3", "audio/wav", "audio/x-wav",
  "audio/webm", "audio/ogg",
];

type LeadRecord = { id: string; campaign_id: string; organization_id: string };

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 200);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const admin = getAdminClientSafe();
    if (!admin) {
      return NextResponse.json({ error: ADMIN_NOT_CONFIGURED_MESSAGE }, { status: 503 });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("users").select("organization_id").eq("id", user.id).single();
    const orgId = (profile as { organization_id: string | null } | null)?.organization_id;
    if (!orgId) {
      return NextResponse.json({ error: "No organization" }, { status: 400 });
    }

    const { id: leadId } = await params;
    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .select("id, campaign_id, organization_id")
      .eq("id", leadId)
      .single();

    if (leadError || !lead || (lead as LeadRecord).organization_id !== orgId) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }
    const l = lead as LeadRecord;

    // Check agent is assigned (same logic as voice-lock POST)
    const { data: roleRows } = await supabase
      .from("user_roles").select("roles(name)").eq("user_id", user.id);
    const roleNames = ((roleRows ?? []) as { roles: { name: string } | null }[])
      .map((r) => r.roles?.name?.toLowerCase().trim().replace(/\s+/g, "_"))
      .filter((n): n is string => !!n);
    const isAgent = roleNames.includes("agent");
    const isPrivileged = roleNames.some((r) => PRIVILEGED_VOICE_ROLES.has(r));

    if (isAgent && !isPrivileged) {
      const { data: assignment } = await supabase
        .from("campaign_assignments")
        .select("id")
        .eq("campaign_id", l.campaign_id)
        .eq("agent_id", user.id)
        .eq("is_active", true)
        .maybeSingle();
      if (!assignment) {
        return NextResponse.json({ error: "You are not assigned to this campaign" }, { status: 403 });
      }
    }

    // Check current recording count
    const prefix = `${orgId}/${l.campaign_id}/${l.id}`;
    const { data: existing } = await admin.storage
      .from(VOICE_BUCKET).list(prefix, { limit: 10 });
    const existingCount = (existing ?? []).filter((f) => f.name && f.name !== "lho").length;
    if (existingCount >= MAX_RECORDINGS_PER_LEAD) {
      return NextResponse.json(
        { error: `Maximum of ${MAX_RECORDINGS_PER_LEAD} recordings reached` },
        { status: 400 }
      );
    }

    // Validate file metadata sent from client
    const body = await request.json();
    const fileName = typeof body?.fileName === "string" ? body.fileName : "recording";
    const mimeType = typeof body?.mimeType === "string" ? body.mimeType : "audio/mpeg";
    const isAudio = ALLOWED_AUDIO_TYPES.includes(mimeType) || mimeType.startsWith("audio/");
    if (!isAudio) {
      return NextResponse.json({ error: "Only audio files are allowed" }, { status: 400 });
    }

    const safeName = sanitizeFileName(fileName);
    const objectPath = `${orgId}/${l.campaign_id}/${l.id}/${crypto.randomUUID()}_${safeName}`;

    // Create a signed upload URL (valid 5 minutes)
    const { data: signed, error: signErr } = await admin.storage
      .from(VOICE_BUCKET)
      .createSignedUploadUrl(objectPath);

    if (signErr || !signed) {
      return NextResponse.json(
        { error: signErr?.message ?? "Failed to create upload URL" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      signedUrl: signed.signedUrl,
      token: signed.token,
      path: objectPath,
    });
  } catch (err) {
    console.error("Voice presign error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
