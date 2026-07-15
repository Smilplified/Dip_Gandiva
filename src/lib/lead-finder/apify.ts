/**
 * Server-only Apify API client. APIFY_API_TOKEN lives in Vercel env vars -
 * never NEXT_PUBLIC_*, never sent to the browser.
 */

const APIFY_BASE = "https://api.apify.com/v2";
/** Actor path uses ~ between user and name. Override via env if it changes. */
const DEFAULT_ACTOR_ID = "code_crafter~leads-finder";

const MAX_RETRIES = 3;

/** User-facing name for the underlying provider - keep vendor branding out of the UI. */
const ENGINE = "Lead engine";

export function getApifyToken(): string | null {
  return process.env.APIFY_API_TOKEN?.trim() || null;
}

export function getActorId(): string {
  return process.env.APIFY_ACTOR_ID?.trim() || DEFAULT_ACTOR_ID;
}

export class ApifyError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

/** fetch with exponential backoff on 429/5xx (max 3 retries). */
async function apifyFetch(url: string, init?: RequestInit): Promise<Response> {
  let lastError: unknown = null;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(url, init);
      if (res.status === 429 || res.status >= 500) {
        lastError = new ApifyError(`Lead engine responded ${res.status}`, res.status);
      } else {
        return res;
      }
    } catch (err) {
      lastError = err;
    }
    if (attempt < MAX_RETRIES) {
      await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Apify request failed");
}

export type ApifyRunInfo = {
  id: string;
  status: string; // READY | RUNNING | SUCCEEDED | FAILED | ABORTED | TIMED-OUT ...
  defaultDatasetId: string | null;
  startedAt: string | null;
  finishedAt: string | null;
};

function toRunInfo(data: Record<string, unknown>): ApifyRunInfo {
  return {
    id: String(data.id ?? ""),
    status: String(data.status ?? "UNKNOWN"),
    defaultDatasetId: (data.defaultDatasetId as string | undefined) ?? null,
    startedAt: (data.startedAt as string | undefined) ?? null,
    finishedAt: (data.finishedAt as string | undefined) ?? null,
  };
}

export async function startActorRun(
  input: Record<string, unknown>
): Promise<ApifyRunInfo> {
  const token = getApifyToken();
  if (!token) throw new ApifyError(`${ENGINE} is not configured (set APIFY_API_TOKEN)`, 503);

  const res = await apifyFetch(
    `${APIFY_BASE}/acts/${getActorId()}/runs?token=${encodeURIComponent(token)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }
  );
  const json = (await res.json().catch(() => ({}))) as {
    data?: Record<string, unknown>;
    error?: { message?: string };
  };
  if (!res.ok || !json.data) {
    throw new ApifyError(
      json.error?.message ?? `Failed to start the search (${res.status})`,
      res.status === 401 ? 401 : res.status
    );
  }
  return toRunInfo(json.data);
}

export async function getActorRun(apifyRunId: string): Promise<ApifyRunInfo> {
  const token = getApifyToken();
  if (!token) throw new ApifyError(`${ENGINE} is not configured (set APIFY_API_TOKEN)`, 503);

  const res = await apifyFetch(
    `${APIFY_BASE}/actor-runs/${apifyRunId}?token=${encodeURIComponent(token)}`
  );
  const json = (await res.json().catch(() => ({}))) as {
    data?: Record<string, unknown>;
    error?: { message?: string };
  };
  if (!res.ok || !json.data) {
    throw new ApifyError(
      json.error?.message ?? `Failed to check search status (${res.status})`,
      res.status
    );
  }
  return toRunInfo(json.data);
}

/** Dataset page (clean JSON items). */
export async function fetchDatasetItems(
  datasetId: string,
  offset: number,
  limit: number
): Promise<Record<string, unknown>[]> {
  const token = getApifyToken();
  if (!token) throw new ApifyError(`${ENGINE} is not configured (set APIFY_API_TOKEN)`, 503);

  const res = await apifyFetch(
    `${APIFY_BASE}/datasets/${datasetId}/items?format=json&clean=true&offset=${offset}&limit=${limit}&token=${encodeURIComponent(token)}`
  );
  if (!res.ok) {
    throw new ApifyError(`Failed to fetch dataset items (${res.status})`, res.status);
  }
  const items = (await res.json().catch(() => [])) as unknown;
  return Array.isArray(items) ? (items as Record<string, unknown>[]) : [];
}

export async function getDatasetItemCount(datasetId: string): Promise<number | null> {
  const token = getApifyToken();
  if (!token) return null;
  try {
    const res = await apifyFetch(
      `${APIFY_BASE}/datasets/${datasetId}?token=${encodeURIComponent(token)}`
    );
    const json = (await res.json().catch(() => ({}))) as {
      data?: { itemCount?: number };
    };
    return typeof json.data?.itemCount === "number" ? json.data.itemCount : null;
  } catch {
    return null;
  }
}
