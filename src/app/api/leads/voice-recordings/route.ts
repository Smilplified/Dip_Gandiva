import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAdminClientSafe } from "@/lib/supabase/admin";
import {
  PRIVILEGED_VOICE_ROLES,
  VOICE_BUCKET,
  type VoiceRecording,
} from "@/lib/voice-recordings";

export const dynamic = "force-dynamic";

const MAX_BATCH_LEADS = 100;
const SIGNED_URL_TTL_SECONDS = 60 * 60;

type LeadRow = { id: string; campaign_id: string; organization_id: string };

/**
 * Batch voice recordings for the leads visible on one table page.
 * One request replaces the per-lead `/api/agent/leads/[id]/voice-lock` fan-out:
 * storage listings run in parallel and all signed URLs are minted in a single
 * `createSignedUrls` call.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const leadIds = Array.isArray(body?.leadIds)
      ? [...new Set((body.leadIds as unknown[]).filter((v): v is string => typeof v === "string" && v.length > 0))].slice(0, MAX_BATCH_LEADS)
      : [];

    if (leadIds.length === 0) {
      return NextResponse.json({ recordings: {} });
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

    const admin = getAdminClientSafe();
    if (!admin) {
      // Storage browsing needs the service role; degrade to empty lists.
      return NextResponse.json({ recordings: {} });
    }

    const { data: roleRows } = await supabase
      .from("user_roles")
      .select("roles(name)")
      .eq("user_id", user.id);
    const roleNames = ((roleRows ?? []) as { roles: { name: string } | null }[])
      .map((r) => r.roles?.name?.toLowerCase().trim().replace(/\s+/g, "_"))
      .filter((n): n is string => !!n);
    const isPrivileged = roleNames.some((r) => PRIVILEGED_VOICE_ROLES.has(r));

    // Privileged roles (TL/QA/MIS/DC/Sales/Admin) may see any lead in their org —
    // same model as the per-lead voice-lock route. Everyone else (agents, command
    // viewers) goes through an RLS-scoped select so their policies decide visibility.
    let leads: LeadRow[] = [];
    if (isPrivileged) {
      const { data } = await admin
        .from("leads")
        .select("id, campaign_id, organization_id")
        .in("id", leadIds)
        .eq("organization_id", orgId);
      leads = (data ?? []) as LeadRow[];
    } else {
      const { data } = await supabase
        .from("leads")
        .select("id, campaign_id, organization_id")
        .in("id", leadIds);
      leads = ((data ?? []) as LeadRow[]).filter((l) => l.organization_id === orgId);
    }

    const listed = await Promise.all(
      leads.map(async (lead) => {
        const prefix = `${lead.organization_id}/${lead.campaign_id}/${lead.id}`;
        const { data: files, error: listError } = await admin.storage
          .from(VOICE_BUCKET)
          .list(prefix, {
            limit: 10,
            sortBy: { column: "created_at", order: "desc" } as never,
          });

        if (listError) {
          console.error("voice-recordings batch list:", listError.message);
        }

        return {
          leadId: lead.id,
          prefix,
          files: (files ?? []).filter((f) => f.name && f.name !== "lho"),
        };
      })
    );

    const allPaths = listed.flatMap((entry) =>
      entry.files.map((f) => `${entry.prefix}/${f.name}`)
    );

    const urlByPath = new Map<string, string | null>();
    if (allPaths.length > 0) {
      const { data: signed, error: signError } = await admin.storage
        .from(VOICE_BUCKET)
        .createSignedUrls(allPaths, SIGNED_URL_TTL_SECONDS);

      if (signError) {
        console.error("voice-recordings batch sign:", signError.message);
      }
      for (const s of signed ?? []) {
        if (s.path) {
          urlByPath.set(s.path, s.error ? null : s.signedUrl ?? null);
        }
      }
    }

    const recordings: Record<string, VoiceRecording[]> = {};
    for (const id of leadIds) {
      recordings[id] = [];
    }
    for (const entry of listed) {
      recordings[entry.leadId] = entry.files.map((f) => {
        const objectPath = `${entry.prefix}/${f.name}`;
        return {
          name: f.name,
          id: objectPath,
          path: objectPath,
          size: (f as { size?: number }).size ?? null,
          created_at: (f as { created_at?: string }).created_at ?? null,
          url: urlByPath.get(objectPath) ?? null,
        };
      });
    }

    return NextResponse.json({ recordings });
  } catch (err) {
    console.error("voice-recordings batch error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
