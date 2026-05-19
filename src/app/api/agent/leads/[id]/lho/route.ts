import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAdminClientSafe, ADMIN_NOT_CONFIGURED_MESSAGE } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

// Store LHO (Lead Handover Sheet) files in the existing campaign-files bucket
const LHO_BUCKET = "campaign-files";
const MAX_LHO_FILES_PER_LEAD = 4;
const MAX_LHO_FILE_SIZE = 50 * 1024 * 1024; // 50MB

// Allow common doc/image/archive formats (aligned with campaign files)
const ALLOWED_LHO_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/csv",
  "text/plain",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/zip",
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/octet-stream",
];

type LeadRecord = {
  id: string;
  campaign_id: string;
  organization_id: string;
};

type LhoObject = {
  name: string;
  id: string;
  path: string;
  size: number | null;
  created_at: string | null;
  url: string | null;
};

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 200);
}

async function getAuthContext() {
  const supabase = await createClient();
  const admin = getAdminClientSafe();

  if (!admin) {
    return {
      error: NextResponse.json(
        { error: ADMIN_NOT_CONFIGURED_MESSAGE },
        { status: 503 }
      ),
    };
  }

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

  return { supabase, admin, userId: user.id, orgId };
}

async function getLeadForUser(
  supabase: Awaited<ReturnType<typeof createClient>>,
  orgId: string,
  userId: string,
  leadId: string
) {
  const { data: lead, error: leadError } = await supabase
    .from("leads")
    .select("id, campaign_id, organization_id")
    .eq("id", leadId)
    .single();

  if (leadError || !lead || (lead as LeadRecord).organization_id !== orgId) {
    return { error: NextResponse.json({ error: "Lead not found" }, { status: 404 }) };
  }

  const l = lead as LeadRecord;

  // Determine user roles: agents must be assigned; TL/QA/Admin/Sales can access any org lead.
  const { data: roleRows } = await supabase
    .from("user_roles")
    .select("roles(name)")
    .eq("user_id", userId);
  const roleNames = ((roleRows ?? []) as { roles: { name: string } | null }[])
    .map((r) => r.roles?.name?.toLowerCase().trim().replace(/\s+/g, "_"))
    .filter((n): n is string => !!n);

  const isAgent = roleNames.includes("agent");
  const isPrivileged =
    roleNames.includes("team_leader") ||
    roleNames.includes("tl") ||
    roleNames.includes("operations_manager") ||
    roleNames.includes("qa") ||
    roleNames.includes("admin") ||
    roleNames.includes("sales");

  if (isAgent && !isPrivileged) {
    const { data: assignment } = await supabase
      .from("campaign_assignments")
      .select("id")
      .eq("campaign_id", l.campaign_id)
      .eq("agent_id", userId)
      .eq("is_active", true)
      .maybeSingle();

    if (!assignment) {
      return {
        error: NextResponse.json(
          { error: "You are not assigned to this campaign" },
          { status: 403 }
        ),
      };
    }
  }

  return { lead: l };
}

async function listLhoObjects(
  storageClient: { storage: NonNullable<ReturnType<typeof getAdminClientSafe>>["storage"] },
  orgId: string,
  lead: LeadRecord
): Promise<{ files: LhoObject[]; error?: NextResponse }> {
  const prefix = `${orgId}/${lead.campaign_id}/${lead.id}/lho`;

  const { data: entries, error: listError } = await storageClient.storage
    .from(LHO_BUCKET)
    .list(prefix, {
      limit: 20,
      sortBy: { column: "created_at", order: "desc" } as never,
    });

  if (listError) {
    return {
      files: [],
      error: NextResponse.json(
        { error: listError.message ?? "Failed to list LHO files" },
        { status: 500 }
      ),
    };
  }

  const files: LhoObject[] = [];
  for (const f of entries ?? []) {
    const objectPath = `${prefix}/${f.name}`;
    const { data: signed, error: urlError } = await storageClient.storage
      .from(LHO_BUCKET)
      .createSignedUrl(objectPath, 60 * 60);

    files.push({
      name: f.name,
      id: objectPath,
      path: objectPath,
      size: (f as { size?: number }).size ?? null,
      created_at: (f as { created_at?: string }).created_at ?? null,
      url: urlError ? null : signed?.signedUrl ?? null,
    });
  }

  return { files };
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthContext();
    if ("error" in auth) return auth.error;
    const { supabase, admin, orgId, userId } = auth;

    const { id: leadId } = await params;
    if (!leadId) {
      return NextResponse.json({ error: "Lead ID required" }, { status: 400 });
    }

    const leadResult = await getLeadForUser(supabase, orgId, userId, leadId);
    if ("error" in leadResult) return leadResult.error;
    const { lead } = leadResult;

    const { files, error } = await listLhoObjects(admin, orgId, lead);
    if (error) return error;

    return NextResponse.json({ files });
  } catch (err) {
    console.error("LHO GET error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthContext();
    if ("error" in auth) return auth.error;
    const { supabase, admin, orgId, userId } = auth;

    const { id: leadId } = await params;
    if (!leadId) {
      return NextResponse.json({ error: "Lead ID required" }, { status: 400 });
    }

    const leadResult = await getLeadForUser(supabase, orgId, userId, leadId);
    if ("error" in leadResult) return leadResult.error;
    const { lead } = leadResult;

    const { files: existing } = await listLhoObjects(admin, orgId, lead);
    if (existing.length >= MAX_LHO_FILES_PER_LEAD) {
      return NextResponse.json(
        { error: `Maximum of ${MAX_LHO_FILES_PER_LEAD} LHO files reached for this lead` },
        { status: 400 }
      );
    }

    const formData = await request.formData();
    const file =
      (formData.get("file") as File | null) ||
      (formData.get("files") as File | null);

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (typeof file.size !== "number" || file.size <= 0) {
      return NextResponse.json({ error: "Invalid file" }, { status: 400 });
    }

    if (file.size > MAX_LHO_FILE_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 50MB." },
        { status: 400 }
      );
    }

    const mime = file.type || "application/octet-stream";
    const allowed =
      ALLOWED_LHO_TYPES.includes(mime) ||
      mime.startsWith("image/") ||
      mime.startsWith("application/") ||
      mime.startsWith("text/");
    if (!allowed) {
      return NextResponse.json(
        { error: "This file type is not allowed for LHO upload" },
        { status: 400 }
      );
    }

    const safeName = sanitizeFileName(file.name || "lho");
    const objectPath = `${orgId}/${lead.campaign_id}/${lead.id}/lho/${crypto.randomUUID()}_${safeName}`;

    const { error: uploadError } = await admin.storage
      .from(LHO_BUCKET)
      .upload(objectPath, file, {
        contentType: mime,
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json(
        { error: uploadError.message ?? "Failed to upload LHO file" },
        { status: 500 }
      );
    }

    const { files, error } = await listLhoObjects(admin, orgId, lead);
    if (error) return error;

    return NextResponse.json({ files });
  } catch (err) {
    console.error("LHO POST error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthContext();
    if ("error" in auth) return auth.error;
    const { supabase, admin, orgId, userId } = auth;

    const { id: leadId } = await params;
    if (!leadId) {
      return NextResponse.json({ error: "Lead ID required" }, { status: 400 });
    }

    const leadResult = await getLeadForUser(supabase, orgId, userId, leadId);
    if ("error" in leadResult) return leadResult.error;
    const { lead } = leadResult;

    const body = await request.json().catch(() => null);
    const path = body?.path as string | undefined;

    if (!path || typeof path !== "string") {
      return NextResponse.json({ error: "File path is required" }, { status: 400 });
    }

    const expectedPrefix = `${orgId}/${lead.campaign_id}/${lead.id}/lho/`;
    if (!path.startsWith(expectedPrefix)) {
      return NextResponse.json({ error: "Invalid LHO file path" }, { status: 400 });
    }

    const { error: removeError } = await admin.storage
      .from(LHO_BUCKET)
      .remove([path]);

    if (removeError) {
      return NextResponse.json(
        { error: removeError.message ?? "Failed to delete LHO file" },
        { status: 500 }
      );
    }

    const { files, error } = await listLhoObjects(admin, orgId, lead);
    if (error) return error;

    return NextResponse.json({ files });
  } catch (err) {
    console.error("LHO DELETE error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

