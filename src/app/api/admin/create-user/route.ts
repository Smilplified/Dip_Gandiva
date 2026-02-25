import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify admin role
    const { data: roleRows } = await supabase
      .from("user_roles")
      .select("roles(name)")
      .eq("user_id", user.id);

    const isAdmin = (roleRows ?? []).some(
      (r: { roles: { name: string } | null }) => r.roles?.name?.toLowerCase() === "admin"
    );

    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden: Admin role required" }, { status: 403 });
    }

    const body = await request.json();
    const { email, password, full_name, role_id, department, designation } = body;

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    if (!password || typeof password !== "string") {
      return NextResponse.json({ error: "Password is required" }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    // Create user with email and password - no invite email
    const { data: createData, error: createError } = await admin.auth.admin.createUser({
      email: email.trim(),
      password: password.trim(),
      email_confirm: true, // Skip email confirmation - user can login immediately
      user_metadata: { full_name: full_name?.trim() || undefined },
    });

    if (createError) {
      return NextResponse.json(
        { error: createError.message || "Failed to create user" },
        { status: 400 }
      );
    }

    const createdUserId = createData.user?.id;
    if (!createdUserId) {
      return NextResponse.json({ error: "User creation succeeded but no user ID returned" }, { status: 500 });
    }

    // Get current user's organization
    const { data: currentProfile } = await supabase
      .from("users")
      .select("organization_id")
      .eq("id", user.id)
      .single();

    const orgId = (currentProfile as { organization_id: string | null } | null)?.organization_id;
    if (!orgId) {
      return NextResponse.json(
        { error: "Your account is not assigned to an organization" },
        { status: 400 }
      );
    }

    // Update public.users with org and profile (trigger may have created minimal record)
    const { error: updateError } = await admin
      .from("users")
      .update({
        organization_id: orgId,
        full_name: full_name?.trim() || null,
        department: department?.trim() || null,
        designation: designation?.trim() || null,
      } as never)
      .eq("id", createdUserId);

    if (updateError) {
      return NextResponse.json(
        { error: "User created but profile update failed: " + updateError.message },
        { status: 500 }
      );
    }

    // Assign role if provided
    if (role_id && typeof role_id === "string") {
      const { error: roleError } = await admin
        .from("user_roles")
        .insert({ user_id: createdUserId, role_id } as never);

      if (roleError) {
        return NextResponse.json(
          { error: "User created but role assignment failed: " + roleError.message },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      user_id: createdUserId,
      message: "User created successfully. They can login with email and password.",
    });
  } catch (err) {
    console.error("Create user error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
