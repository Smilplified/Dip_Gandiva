import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminClientSafe } from "@/lib/supabase/admin";

export const VOICE_BUCKET = "campaign-files";

/** Roles that may list/upload lead voice recordings without agent campaign assignment. */
export const PRIVILEGED_VOICE_ROLES = new Set([
  "team_leader",
  "tl",
  "operations_manager",
  "qa",
  "mis",
  "admin",
  "sales",
  "dc",
]);export const MAX_VOICE_RECORDINGS_PER_LEAD = 4;

export type VoiceRecording = {
  id: string;
  name: string;
  path: string;
  url: string | null;
  size: number | null;
  created_at: string | null;
};

type StorageClient = Pick<SupabaseClient, "storage">;

export async function listLeadVoiceRecordings(
  storageClient: StorageClient,
  orgId: string,
  campaignId: string,
  leadId: string
): Promise<VoiceRecording[]> {
  const prefix = `${orgId}/${campaignId}/${leadId}`;

  const { data: files, error: listError } = await storageClient.storage
    .from(VOICE_BUCKET)
    .list(prefix, {
      limit: 10,
      sortBy: { column: "created_at", order: "desc" } as never,
    });

  if (listError) {
    console.error("listLeadVoiceRecordings:", listError.message);
    return [];
  }

  const recordings: VoiceRecording[] = [];

  for (const f of files ?? []) {
    if (!f.name || f.name === "lho") continue;

    const objectPath = `${prefix}/${f.name}`;
    const { data: signed, error: urlError } = await storageClient.storage
      .from(VOICE_BUCKET)
      .createSignedUrl(objectPath, 60 * 60);

    recordings.push({
      name: f.name,
      id: objectPath,
      path: objectPath,
      size: (f as { size?: number }).size ?? null,
      created_at: (f as { created_at?: string }).created_at ?? null,
      url: urlError ? null : signed?.signedUrl ?? null,
    });
  }

  return recordings;
}

function leadRowId(lead: unknown): string | null {
  const id = (lead as { id?: unknown }).id;
  return typeof id === "string" && id.length > 0 ? id : null;
}

export async function attachVoiceRecordingsToLeads<T>(
  storageClient: StorageClient,
  orgId: string,
  campaignId: string,
  leads: T[]
): Promise<(T & { voice_recordings: VoiceRecording[] })[]> {
  if (leads.length === 0) return [];

  const withRecordings = await Promise.all(
    leads.map(async (lead) => {
      const id = leadRowId(lead);
      return {
        ...lead,
        voice_recordings: id
          ? await listLeadVoiceRecordings(storageClient, orgId, campaignId, id)
          : [],
      };
    })
  );

  return withRecordings;
}

/** Attach voice recordings when admin storage is available; otherwise empty arrays. */
export async function enrichCampaignLeadsWithVoiceRecordings<T>(
  orgId: string,
  campaignId: string,
  leads: T[]
): Promise<(T & { voice_recordings: VoiceRecording[] })[]> {
  const admin = getAdminClientSafe();
  if (!admin) {
    return leads.map((lead) => ({ ...lead, voice_recordings: [] }));
  }
  return attachVoiceRecordingsToLeads(admin, orgId, campaignId, leads);
}
