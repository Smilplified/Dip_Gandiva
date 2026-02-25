import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

async function verifyAdmin(): Promise<{
  error: NextResponse | null;
  user: { id: string } | null;
  orgId: string | null;
}> {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }), user: null, orgId: null };
  }

  const { data: roleRows } = await supabase
    .from("user_roles")
    .select("roles(name)")
    .eq("user_id", user.id);

  const isAdmin = (roleRows ?? []).some(
    (r: { roles: { name: string } | null }) => r.roles?.name?.toLowerCase() === "admin"
  );

  if (!isAdmin) {
    return { error: NextResponse.json({ error: "Forbidden: Admin role required" }, { status: 403 }), user: null, orgId: null };
  }

  const { data: currentProfile } = await supabase
    .from("users")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  const orgId = (currentProfile as { organization_id: string | null } | null)?.organization_id;
  if (!orgId) {
    return { error: NextResponse.json({ error: "Your account is not assigned to an organization" }, { status: 400 }), user: null, orgId: null };
  }

  return { error: null, user, orgId };
}

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error: authErr, user: adminUser, orgId } = await verifyAdmin();
    if (authErr) return authErr;

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 });
    }

    const body = await _request.json();
    const { status } = body;

    if (!status || !["active", "inactive"].includes(status)) {
      return NextResponse.json({ error: "Valid status (active/inactive) required" }, { status: 400 });
    }

    const admin = createAdminClient();

    // Ensure user belongs to same org
    const { data: targetUser, error: fetchErr } = await admin
      .from("users")
      .select("id, organization_id")
      .eq("id", id)
      .single();

    if (fetchErr || !targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const typedTarget = targetUser as { id: string; organization_id: string | null };
    if (typedTarget.organization_id !== orgId) {
      return NextResponse.json({ error: "Cannot update user from another organization" }, { status: 403 });
    }

    if (id === adminUser?.id && status === "inactive") {
      return NextResponse.json({ error: "You cannot deactivate your own account" }, { status: 400 });
    }

    const { error: updateError } = await admin
      .from("users")
      .update({ status } as never)
      .eq("id", id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, status });
  } catch (err) {
    console.error("Update user status error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error: authErr, user: adminUser, orgId } = await verifyAdmin();
    if (authErr) return authErr;

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 });
    }

    const admin = createAdminClient();

    // Ensure user belongs to same org
    const { data: targetUser, error: fetchErr } = await admin
      .from("users")
      .select("id, organization_id")
      .eq("id", id)
      .single();

    if (fetchErr || !targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const typedTarget = targetUser as { id: string; organization_id: string | null };
    if (typedTarget.organization_id !== orgId) {
      return NextResponse.json({ error: "Cannot delete user from another organization" }, { status: 403 });
    }

    if (id === adminUser?.id) {
      return NextResponse.json({ error: "You cannot delete your own account" }, { status: 400 });
    }

    // Delete from auth.users - this cascades to public.users via ON DELETE CASCADE
    const { error: deleteAuthError } = await admin.auth.admin.deleteUser(id);

    if (deleteAuthError) {
      return NextResponse.json(
        { error: deleteAuthError.message || "Failed to delete user" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Delete user error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
