import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAdminClientSafe, ADMIN_NOT_CONFIGURED_MESSAGE } from "@/lib/supabase/admin";
import { hasTLAccess } from "@/lib/auth/tl-access";
import { fetchUserRoleNames } from "@/lib/auth/server-roles";

export const dynamic = "force-dynamic";

export type AgentProfileResponse = {
  agent: {
    id: string;
    full_name: string | null;
    email: string | null;
    agent_code: string | null;
    status: string;
    department: string | null;
    designation: string | null;
  };
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const roleNames = await fetchUserRoleNames(supabase, user.id);
    if (!hasTLAccess(roleNames) && !roleNames.includes("admin")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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

    const { id: agentId } = await params;
    if (!agentId) {
      return NextResponse.json({ error: "Agent ID required" }, { status: 400 });
    }

    const admin = getAdminClientSafe();
    if (!admin) {
      return NextResponse.json({ error: ADMIN_NOT_CONFIGURED_MESSAGE }, { status: 503 });
    }

    const { data: agent, error: agentError } = await admin
      .from("users")
      .select("id, full_name, email, agent_code, status, department, designation, organization_id")
      .eq("id", agentId)
      .single();

    if (agentError || !agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    const typedAgent = agent as {
      id: string;
      full_name: string | null;
      email: string | null;
      agent_code: string | null;
      status: string;
      department: string | null;
      designation: string | null;
      organization_id: string | null;
    };

    if (typedAgent.organization_id !== orgId) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    const response: AgentProfileResponse = {
      agent: {
        id: typedAgent.id,
        full_name: typedAgent.full_name,
        email: typedAgent.email,
        agent_code: typedAgent.agent_code,
        status: typedAgent.status,
        department: typedAgent.department,
        designation: typedAgent.designation,
      },
    };

    return NextResponse.json(response);
  } catch (err) {
    console.error("TL agent profile error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
