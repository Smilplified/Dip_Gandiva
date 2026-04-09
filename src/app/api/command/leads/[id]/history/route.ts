import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { hasCommandRole } from "@/lib/command/rules-engine";
import { getRoleNames, queryLeadHistory, clampLimit, getProfile } from "@/lib/command/db";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userRoles = await getRoleNames(supabase, user.id);
  if (!hasCommandRole(userRoles) && !userRoles.includes("client_viewer")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const profile = await getProfile(supabase, user.id);

  if (userRoles.includes("client_viewer")) {
    const { data: leadGuard } = await supabase
      .from("leads")
      .select("id, campaigns!inner(client_id)")
      .eq("id", id)
      .eq("campaigns.client_id", profile?.client_id ?? "__no_client__")
      .single();
    if (!leadGuard) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const sp = req.nextUrl.searchParams;
  const cursor = sp.get("cursor");
  const limit = clampLimit(sp.get("limit") ?? "50");

  try {
    const result = await queryLeadHistory(supabase, id, { limit, cursor });
    return NextResponse.json({
      history: result.items,
      nextCursor: result.nextCursor,
      hasMore: result.hasMore,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    );
  }
}
