import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAdminClientSafe, ADMIN_NOT_CONFIGURED_MESSAGE } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

async function getUserAndRoles() {
  const supabase = await createClient();
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

  const roleNames = ((roleRows ?? []) as { roles: { name: string } | null }[])
    .map((r) => r.roles?.name?.toLowerCase().trim().replace(/\s+/g, "_"))
    .filter(Boolean) as string[];

  const canAccessSales =
    roleNames.includes("sales") ||
    roleNames.includes("sales_manager") ||
    roleNames.includes("admin");

  if (!canAccessSales) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { user, roleNames };
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const ctx = await getUserAndRoles();
    if ("error" in ctx) return ctx.error;
    const { user, roleNames } = ctx;

    const admin = getAdminClientSafe();
    if (!admin) {
      return NextResponse.json({ error: ADMIN_NOT_CONFIGURED_MESSAGE }, { status: 503 });
    }

    const body = await request.json();
    const {
      stage,
      value,
      expected_close_date,
      owner_id,
    }: {
      stage?: string | null;
      value?: number | null;
      expected_close_date?: string | null;
      owner_id?: string | null;
    } = body ?? {};

    const updatePayload: Record<string, unknown> = {};
    if (stage !== undefined) updatePayload.stage = stage;
    if (value !== undefined) updatePayload.value = value;
    if (expected_close_date !== undefined) updatePayload.expected_close_date = expected_close_date;
    if (owner_id !== undefined) updatePayload.owner_id = owner_id;

    if (Object.keys(updatePayload).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    // Sales users can only update their own deals; manager/admin can update all.
    const isManagerOrAdmin =
      roleNames.includes("sales_manager") || roleNames.includes("admin");

    let query = admin
      .from("deals")
      .update(updatePayload as never)
      .eq("id", params.id)
      .select("id")
      .single();

    if (!isManagerOrAdmin) {
      query = admin
        .from("deals")
        .update(updatePayload as never)
        .eq("id", params.id)
        .eq("owner_id", user!.id)
        .select("id")
        .single();
    }

    const { data, error }: { data: { id: string } | null; error: { message: string } | null } =
      await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ id: params.id, success: true });
  } catch (err) {
    console.error("Sales deals PATCH error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

