import type { createClient } from "@/lib/supabase/server";
import { getAdminClientSafe } from "@/lib/supabase/admin";

type SupabaseServer = Awaited<ReturnType<typeof createClient>>;

/** User ids with client_viewer role in the organization. */
export async function getClientViewerUserIdsForOrg(
  supabase: SupabaseServer,
  organizationId: string
): Promise<string[]> {
  const admin = getAdminClientSafe();
  const lookupClient = admin ?? supabase;

  const { data: roleRows, error: roleErr } = await lookupClient
    .from("roles")
    .select("id, name")
    .eq("organization_id", organizationId);
  if (roleErr) throw new Error(roleErr.message);

  const clientViewerRoleIds = ((roleRows ?? []) as { id: string; name: string | null }[])
    .filter((r) => (r.name ?? "").toLowerCase().trim().replace(/\s+/g, "_") === "client_viewer")
    .map((r) => r.id);

  if (clientViewerRoleIds.length === 0) return [];

  const { data: links, error: linkErr } = await lookupClient
    .from("user_roles")
    .select("user_id")
    .in("role_id", clientViewerRoleIds);
  if (linkErr) throw new Error(linkErr.message);

  const userIds = [
    ...new Set(((links ?? []) as { user_id: string }[]).map((r) => r.user_id).filter(Boolean)),
  ];
  if (userIds.length === 0) return [];

  const { data: usersRows, error: usersErr } = await lookupClient
    .from("users")
    .select("id")
    .eq("organization_id", organizationId)
    .in("id", userIds);
  if (usersErr) throw new Error(usersErr.message);

  return ((usersRows ?? []) as { id: string }[]).map((u) => u.id);
}

/** Campaign ids visible to client_viewer (same scope as command campaigns list). */
export async function getClientViewerCampaignIds(
  supabase: SupabaseServer,
  organizationId: string,
  clientId: string
): Promise<string[]> {
  const clientViewerUserIds = await getClientViewerUserIdsForOrg(supabase, organizationId);
  if (clientViewerUserIds.length === 0) return [];

  const { data: campaigns, error } = await supabase
    .from("campaigns")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("client_id", clientId)
    .in("created_by", clientViewerUserIds);

  if (error) throw new Error(error.message);
  return ((campaigns ?? []) as { id: string }[]).map((c) => c.id);
}
