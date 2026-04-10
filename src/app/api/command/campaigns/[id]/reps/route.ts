import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { hasCommandRole } from "@/lib/command/rules-engine";
import { getProfile, getRoleNames } from "@/lib/command/db";

export const dynamic = "force-dynamic";

/** Agents assigned to the campaign (for Leads tab Rep filter). */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: campaignId } = await params;
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

  let campQuery = supabase.from("campaigns").select("id").eq("id", campaignId);
  if (userRoles.includes("client_viewer")) {
    campQuery = campQuery.eq("client_id", profile?.client_id ?? "__no_client__");
  }
  const { data: camp, error: campErr } = await campQuery.single();
  if (campErr || !camp) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  const { data: assignments, error: asgErr } = await supabase
    .from("campaign_assignments")
    .select("agent_id")
    .eq("campaign_id", campaignId)
    .eq("is_active", true);

  if (asgErr) {
    return NextResponse.json({ error: asgErr.message }, { status: 500 });
  }

  let agentIds = [...new Set((assignments ?? []).map((a) => a.agent_id as string))];

  if (agentIds.length === 0) {
    const { data: leadAgents } = await supabase
      .from("leads")
      .select("assigned_agent_id")
      .eq("campaign_id", campaignId)
      .not("assigned_agent_id", "is", null);
    agentIds = [
      ...new Set(
        (leadAgents ?? [])
          .map((r) => r.assigned_agent_id as string | null)
          .filter((id): id is string => Boolean(id))
      ),
    ];
  }

  if (agentIds.length === 0) {
    return NextResponse.json({ reps: [] as { id: string; label: string; rep_id: string | null }[] });
  }

  const { data: users, error: uErr } = await supabase
    .from("users")
    .select("id, full_name, email, agent_code, employee_id")
    .in("id", agentIds);

  if (uErr) {
    return NextResponse.json({ error: uErr.message }, { status: 500 });
  }

  const reps = (users ?? []).map((u) => {
    const id = u.id as string;
    const name = (u.full_name as string | null)?.trim() || (u.email as string | null)?.trim() || id;
    const code = (u.agent_code as string | null)?.trim() || (u.employee_id as string | null)?.trim();
    const label = code ? `${name} (${code})` : name;
    return { id, label, rep_id: code ?? null };
  });
  reps.sort((a, b) => a.label.localeCompare(b.label));

  return NextResponse.json({ reps });
}
