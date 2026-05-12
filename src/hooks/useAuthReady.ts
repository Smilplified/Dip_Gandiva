"use client";

import { useAuth } from "@/context/AuthContext";

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
  return Boolean(isInitialized && !isLoading && user);
}
