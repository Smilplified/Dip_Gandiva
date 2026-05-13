"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";

/**
 * If profile/role sync (`isLoading`) never settles (slow network, etc.),
 * stuck network, etc.), dashboard pages would otherwise never run their first
 * `fetchWithAuthRetry` — cookies still authenticate API routes.
 */
/** Secondary safety if `isLoading` never clears (should be rare after auth bootstrap fixes). */
const AUTH_READY_STUCK_LOADING_MS = 4_000;

/**
 * True once Supabase has validated a user for this tab.
 *
 * IMPORTANT: We deliberately do NOT require `state.session.access_token`. After a
 * fresh tab open, `supabase.auth.getUser()` resolves before the in-memory session
 * is hydrated from storage — meaning `state.session` can be `null` even though the
 * user is valid and cookies are present. Server API routes authenticate via cookies,
 * and `fetchWithAuthRetry` already handles transient 401s, so gating on `user` alone
 * is the correct and fast signal.
 */
export function useAuthReady() {
  const { isInitialized, isLoading, user } = useAuth();
  const [unblockStuckLoading, setUnblockStuckLoading] = useState(false);

  useEffect(() => {
    if (!isInitialized || !user || !isLoading) {
      setUnblockStuckLoading(false);
      return;
    }
    const t = window.setTimeout(() => setUnblockStuckLoading(true), AUTH_READY_STUCK_LOADING_MS);
    return () => window.clearTimeout(t);
  }, [isInitialized, user, isLoading]);

  const ready =
    Boolean(isInitialized && user) && (!isLoading || unblockStuckLoading);
  return ready;
}
