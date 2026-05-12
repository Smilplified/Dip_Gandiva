"use client";

import { useAuth } from "@/context/AuthContext";

/**
 * True when the Supabase session has finished syncing (no in-flight auth load).
 * Use this before calling authenticated `/api/*` routes so a hard refresh does not
 * fire fetches while cookies / client state are still settling.
 */
export function useAuthReady() {
  const { isInitialized, isLoading, user } = useAuth();
  return Boolean(isInitialized && !isLoading && user);
}
