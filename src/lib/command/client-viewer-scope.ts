import type { createClient } from "@/lib/supabase/server";
import { getAllowedCampaignIdsForClientViewer } from "@/lib/command/db";

type SupabaseServer = Awaited<ReturnType<typeof createClient>>;

/** Campaign ids visible to client_viewer (all campaigns for the bound client). */
export async function getClientViewerCampaignIds(
  supabase: SupabaseServer,
  organizationId: string,
  clientId: string
): Promise<string[]> {
  return getAllowedCampaignIdsForClientViewer(supabase, organizationId, clientId);
}
