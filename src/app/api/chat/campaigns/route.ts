import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type ChatInboxCampaignRow = {
  id: string;
  campaignId: string;
  name: string;
  clientName: string | null;
  clientId: string;
};

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("users")
      .select("organization_id, client_id")
      .eq("id", user.id)
      .single();

    const profileRow = profile as { organization_id: string | null; client_id: string | null } | null;
    const orgId = profileRow?.organization_id;
    if (!orgId) {
      return NextResponse.json({ error: "No organization" }, { status: 400 });
    }

    const { data: roleRows } = await supabase
      .from("user_roles")
      .select("roles(name)")
      .eq("user_id", user.id);

    const roleNames = ((roleRows ?? []) as { roles: { name: string } | null }[])
      .map((r) => r.roles?.name?.toLowerCase().trim().replace(/\s+/g, "_"))
      .filter(Boolean) as string[];

    const canViewAllCampaigns =
      roleNames.includes("sales_manager") ||
      roleNames.includes("internal_operator") ||
      roleNames.includes("internal_admin") ||
      roleNames.includes("admin");

    const isClientViewer = roleNames.includes("client_viewer");
    const userClientId = profileRow?.client_id ?? null;

    let query = supabase
      .from("campaigns")
      .select("id, campaign_id, name, client_name, client_id, status")
      .eq("organization_id", orgId)
      .eq("status", "active")
      .not("client_id", "is", null)
      .order("name", { ascending: true });

    if (!canViewAllCampaigns && isClientViewer) {
      if (!userClientId) {
        return NextResponse.json({ campaigns: [] as ChatInboxCampaignRow[] });
      }
      query = query.eq("client_id", userClientId);
    }

    const { data: rows, error: qErr } = await query;

    if (qErr) {
      return NextResponse.json({ error: qErr.message }, { status: 500 });
    }

    type Raw = {
      id: string;
      campaign_id: string;
      name: string;
      client_name: string | null;
      client_id: string;
    };

    const campaigns: ChatInboxCampaignRow[] = ((rows ?? []) as Raw[]).map((r) => ({
      id: r.id,
      campaignId: r.campaign_id,
      name: r.name,
      clientName: r.client_name,
      clientId: r.client_id,
    }));

    return NextResponse.json({ campaigns });
  } catch (e) {
    console.error("GET /api/chat/campaigns:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
