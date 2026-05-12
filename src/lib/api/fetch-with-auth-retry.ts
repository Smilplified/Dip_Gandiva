/**
 * Same-origin authenticated fetches with retries when the session cookie is not
 * yet visible to the server right after navigation / refresh (common in Chrome + production).
 */
export async function fetchWithAuthRetry(
  input: RequestInfo | URL,
  init: RequestInit = {},
  maxAttempts = 6
): Promise<Response> {
  let last!: Response;
  for (let i = 0; i < maxAttempts; i++) {
    if (i > 0) {
      await new Promise((r) => setTimeout(r, 100 * i));
    }
    last = await fetch(input, {
      ...init,
      credentials: init.credentials ?? "include",
      cache: init.cache ?? "no-store",
    });
    if (last.status !== 401 && last.status !== 403) break;
  }
  return last;
}
