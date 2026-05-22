import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAdminClientSafe, ADMIN_NOT_CONFIGURED_MESSAGE } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const LOGO_BUCKET = "client-logos";
const MAX_LOGO_BYTES = 2 * 1024 * 1024;

async function requireAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const { data: roleRows } = await supabase
    .from("user_roles")
    .select("roles(name)")
    .eq("user_id", user.id);

  const isAdmin = (roleRows ?? []).some(
    (r: { roles: { name: string } | null }) => r.roles?.name?.toLowerCase() === "admin"
  );
  if (!isAdmin) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
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

  return { user, orgId };
}

async function getClientInOrg(
  admin: NonNullable<ReturnType<typeof getAdminClientSafe>>,
  orgId: string,
  clientId: string
) {
  const { data, error } = await admin
    .from("clients")
    .select("id, organization_id, logo_url, company_name")
    .eq("id", clientId)
    .single();

  if (error || !data) return null;
  const row = data as { id: string; organization_id: string; logo_url: string | null; company_name: string };
  if (row.organization_id !== orgId) return null;
  return row;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const auth = await requireAdmin(supabase);
    if ("error" in auth) return auth.error;

    const { id: clientId } = await params;
    const admin = getAdminClientSafe();
    if (!admin) {
      return NextResponse.json({ error: ADMIN_NOT_CONFIGURED_MESSAGE }, { status: 503 });
    }

    const client = await getClientInOrg(admin, auth.orgId, clientId);
    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    return NextResponse.json({ logo_url: client.logo_url });
  } catch (err) {
    console.error("GET client logo error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const auth = await requireAdmin(supabase);
    if ("error" in auth) return auth.error;

    const { id: clientId } = await params;
    const admin = getAdminClientSafe();
    if (!admin) {
      return NextResponse.json({ error: ADMIN_NOT_CONFIGURED_MESSAGE }, { status: 503 });
    }

    const client = await getClientInOrg(admin, auth.orgId, clientId);
    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file || !file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Valid image file required" }, { status: 400 });
    }
    if (file.size > MAX_LOGO_BYTES) {
      return NextResponse.json({ error: "Image must be 2MB or smaller" }, { status: 400 });
    }

    const ext = (file.name.split(".").pop() || "png").toLowerCase().replace(/[^a-z0-9]/g, "") || "png";
    const path = `${auth.orgId}/${clientId}/logo.${ext}`;
    const arrayBuffer = await file.arrayBuffer();

    const { error: uploadError } = await admin.storage.from(LOGO_BUCKET).upload(path, arrayBuffer, {
      upsert: true,
      contentType: file.type,
    });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const { data: urlData } = admin.storage.from(LOGO_BUCKET).getPublicUrl(path);
    const logoUrl = `${urlData.publicUrl}?v=${Date.now()}`;

    const { error: updateError } = await admin
      .from("clients")
      .update({ logo_url: logoUrl } as never)
      .eq("id", clientId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ logo_url: logoUrl });
  } catch (err) {
    console.error("POST client logo error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
