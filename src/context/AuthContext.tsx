"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Session, User } from "@supabase/supabase-js";
import type { Tables } from "@/types/database.types";
import {
  AUTH_STORAGE_KEYS,
  getDefaultRedirectPath,
  normalizeRoleName,
  resolvePostLoginRedirect,
} from "@/lib/auth/config";
import { authDebug } from "@/lib/auth/debug";

/** Cross-tab: any tab that signs out tells others to drop stale JS + cookies. */
const AUTH_SIGNOUT_BROADCAST_CHANNEL = "gandiv:auth-signout";

export type UserRole = {
  id: string;
  name: string;
  role_name: string;
  description?: string | null;
  // Optional because some deployments may not allow selecting organization_id
  // on the joined `roles` relation (RLS/column permissions).
  organization_id?: string | null;
};
export type UserProfile = Tables<"users">;

interface AuthState {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  roles: UserRole[];
  isLoading: boolean;
  isInitialized: boolean;
}

interface AuthContextValue extends AuthState {
  signIn: (
    email: string,
    password: string,
    requestedRedirectPath?: string
  ) => Promise<{ error: Error | null; redirectPath?: string }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  hasRole: (roleName: string) => boolean;
  getDefaultRedirect: () => string;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function toUserRoles(roleRows: { role_id: string; roles: { name: string } | null }[]): UserRole[] {
  return roleRows
    .filter((r) => r.roles?.name)
    .map((r) => ({
      id: r.role_id,
      name: r.roles!.name,
      role_name: r.roles!.name,
      description: null,
    }));
}

function getRoleNames(roles: UserRole[]) {
  return roles.map((role) => role.role_name);
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getStoredRedirectPath() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage.getItem(AUTH_STORAGE_KEYS.lastRedirectPath);
  } catch {
    return null;
  }
}

function persistRedirectPath(path: string) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(AUTH_STORAGE_KEYS.lastRedirectPath, path);
  } catch {
    // Ignore storage failures.
  }
}

function purgeSupabaseKeysFromStore(store: Storage) {
  const keys: string[] = [];
  for (let i = 0; i < store.length; i++) {
    const key = store.key(i);
    if (!key) continue;
    if (key.startsWith("sb-") || key.toLowerCase().includes("supabase")) {
      keys.push(key);
    }
  }
  keys.forEach((k) => store.removeItem(k));
}

function clearClientStorage() {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.removeItem(AUTH_STORAGE_KEYS.lastRedirectPath);
    purgeSupabaseKeysFromStore(window.localStorage);
    purgeSupabaseKeysFromStore(window.sessionStorage);
    try {
      window.sessionStorage.removeItem(AUTH_STORAGE_KEYS.dashboardRscResyncOnce);
    } catch {
      // ignore
    }
  } catch (err) {
    console.warn("Failed to clear auth browser storage", err);
  }
}

function broadcastAuthSignedOut() {
  if (typeof window === "undefined" || typeof BroadcastChannel === "undefined") {
    return;
  }
  try {
    const bc = new BroadcastChannel(AUTH_SIGNOUT_BROADCAST_CHANNEL);
    bc.postMessage("signed-out");
    bc.close();
  } catch {
    // Ignore — e.g. private mode restrictions.
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    profile: null,
    roles: [],
    isLoading: true,
    isInitialized: false,
  });

  // Stable singleton — createClient() returns a module-level cached instance,
  // but calling it on every render is unnecessary. useRef ensures one call.
  const supabase = useRef(createClient()).current;
  const syncRequestRef = useRef(0);

  // Tracks the currently authenticated user's ID so event handlers can detect
  // whether an incoming auth event is for the same user (background token refresh /
  // cross-tab session sync) vs. a genuine new sign-in that requires a full re-sync.
  const currentUserIdRef = useRef<string | null>(null);

  // In-flight deduplication for getUser(): if init() and a SIGNED_IN event handler
  // both call resolveSessionUser() at the same moment, they share a single server
  // round-trip instead of making N parallel requests (rate-limit & perf guard).
  const getUserInFlightRef = useRef<ReturnType<typeof supabase.auth.getUser> | null>(null);

  const getValidatedUser = useCallback(() => {
    if (!getUserInFlightRef.current) {
      getUserInFlightRef.current = supabase.auth.getUser().finally(() => {
        getUserInFlightRef.current = null;
      });
    }
    return getUserInFlightRef.current;
  }, [supabase]);

  const fetchProfileAndRolesFromApi = useCallback(async () => {
    const response = await fetch("/api/profile", {
      method: "GET",
      credentials: "include",
      cache: "no-store",
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      throw new Error(`Profile API returned ${response.status}`);
    }

    const data = await response.json() as {
      profile?: (UserProfile & { roles?: string[] }) | null;
    };

    const profile = (data.profile ?? null) as UserProfile | null;
    const roles = (data.profile?.roles ?? [])
      .filter((name): name is string => typeof name === "string" && name.trim().length > 0)
      .map((name) => ({
        id: name,
        name,
        role_name: name,
        description: null,
      }));

    return { profile, roles };
  }, []);

  const resolveSessionUser = useCallback(async () => {
    // Always validate with the server first. getSession() reads from local cookies
    // without a network call and can return stale/expired sessions — especially
    // after tab close or role switches. getValidatedUser() is the authoritative
    // source and deduplicates concurrent requests.
    const { data: { user }, error } = await getValidatedUser();

    if (error || !user) {
      return { session: null, user: null };
    }

    // Only read session data after we've confirmed the user is valid server-side.
    const { data: { session } } = await supabase.auth.getSession();
    return { session: session ?? null, user };
  }, [supabase, getValidatedUser]);

  const fetchProfileAndRoles = useCallback(async (userId: string) => {
    const [profileRes, rolesRes] = await Promise.all([
      supabase.from("users").select("*").eq("id", userId).single(),
      supabase
        .from("user_roles")
        // Keep this selection minimal and aligned with `middleware.ts`:
        // only fetch the role name to avoid RLS/column-permission issues
        // in production that can lead to an empty `roles` array.
        .select("role_id, roles(name)")
        .eq("user_id", userId),
    ]);

    const profile = profileRes.error ? null : profileRes.data;
    const roleRows = (rolesRes.data ?? []) as { role_id: string; roles: { name: string } | null }[];
    const roles = toUserRoles(roleRows);

    if (rolesRes.error) {
      console.warn("Direct role fetch failed, falling back to profile API:", rolesRes.error.message);
    }

    // In production, some users can authenticate successfully but the browser-side
    // role join can still return empty because of RLS/permission differences.
    // Fallback to the server profile API so role-based layouts still resolve.
    if (rolesRes.error || roles.length === 0) {
      try {
        const apiData = await fetchProfileAndRolesFromApi();
        if (apiData.roles.length > 0 || apiData.profile) {
          return apiData;
        }
      } catch (err) {
        console.warn("Profile API fallback failed:", err);
      }
    }

    return { profile, roles };
  }, [fetchProfileAndRolesFromApi, supabase]);

  const syncAuthState = useCallback(
    async (
      source: string,
      preferred?: {
        session?: Session | null;
        user?: User | null;
      },
      options?: { silent?: boolean }
    ) => {
      const requestId = ++syncRequestRef.current;

      // silent=true: keeps the existing UI visible during background refreshes so the
      // dashboard never flashes a loading spinner (e.g. online-recovery, USER_UPDATED).
      if (!options?.silent) {
        setState((current) => ({ ...current, isLoading: true }));
      }

      authDebug("provider", `sync start: ${source}`, {
        requestId,
        silent: Boolean(options?.silent),
        preferredUserId: preferred?.user?.id ?? preferred?.session?.user?.id ?? null,
      });

      try {
        let session = preferred?.session ?? null;
        let user = preferred?.user ?? session?.user ?? null;

        if (!user) {
          const resolved = await resolveSessionUser();
          session = resolved.session ?? session;
          user = resolved.user;
        }

        if (!user) {
          if (syncRequestRef.current !== requestId) {
            return null;
          }

          currentUserIdRef.current = null;
          setState({
            user: null,
            session: null,
            profile: null,
            roles: [],
            isLoading: false,
            isInitialized: true,
          });
          authDebug("provider", `sync anonymous: ${source}`, { requestId });
          return { user: null, session: null, profile: null, roles: [] as UserRole[] };
        }

        const { profile, roles } = await fetchProfileAndRoles(user.id);
        if (syncRequestRef.current !== requestId) {
          return null;
        }

        currentUserIdRef.current = user.id;
        setState({
          user,
          session,
          profile,
          roles,
          isLoading: false,
          isInitialized: true,
        });
        authDebug("provider", `sync success: ${source}`, {
          requestId,
          userId: user.id,
          roles: getRoleNames(roles),
          hasSession: Boolean(session),
        });

        return { user, session, profile, roles };
      } catch (err) {
        if (syncRequestRef.current !== requestId) {
          return null;
        }

        console.error("Refresh profile error:", err);
        authDebug("provider", `sync error: ${source}`, {
          requestId,
          error: err instanceof Error ? err.message : String(err),
        });

        // If already authenticated, preserve the existing session on transient errors
        // (e.g. network flap). Clearing state here would log the user out on any
        // temporary connectivity issue — which is unacceptable for a CRM dashboard.
        setState((current) => {
          if (current.isInitialized && current.user !== null) {
            authDebug("provider", `sync error - preserving existing session: ${source}`, { requestId });
            return { ...current, isLoading: false };
          }
          // Initial load failed — no session to preserve.
          currentUserIdRef.current = null;
          return {
            user: null,
            session: null,
            profile: null,
            roles: [],
            isLoading: false,
            isInitialized: true,
          };
        });

        return null;
      }
    },
    [fetchProfileAndRoles, resolveSessionUser]
  );

  const refreshProfile = useCallback(async () => {
    // Always silent — the user is already viewing the dashboard, no spinner needed.
    await syncAuthState("manual-refresh", undefined, { silent: true });
  }, [syncAuthState]);

  const waitForSessionConfirmation = useCallback(
    async (expectedUserId: string, timeoutMs = 4000) => {
      const startedAt = Date.now();

      while (Date.now() - startedAt < timeoutMs) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.id === expectedUserId) {
          return session;
        }

        await wait(150);
      }

      return null;
    },
    [supabase]
  );

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        if (typeof window !== "undefined" && typeof navigator !== "undefined" && !navigator.onLine) {
          setState({
            user: null,
            session: null,
            profile: null,
            roles: [],
            isLoading: false,
            isInitialized: true,
          });
          authDebug("provider", "init offline - starting anonymous");
          return;
        }

        await syncAuthState("init");
      } catch (err) {
        console.error("Auth init error:", err);
        if (!mounted) return;
        setState({
          user: null,
          session: null,
          profile: null,
          roles: [],
          isLoading: false,
          isInitialized: true,
        });
      }
    };

    void init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      authDebug("provider", `auth event: ${event}`, {
        hasSession: Boolean(session),
        userId: session?.user?.id ?? null,
        currentUserId: currentUserIdRef.current,
      });

      if (event === "SIGNED_OUT") {
        currentUserIdRef.current = null;
        setState({
          user: null,
          session: null,
          profile: null,
          roles: [],
          isLoading: false,
          isInitialized: true,
        });
        return;
      }

      if (event === "INITIAL_SESSION") {
        // Handled by init() above — skip to avoid a duplicate full sync on mount.
        return;
      }

      if (event === "TOKEN_REFRESHED") {
        // A token refresh only rotates the JWT — the user's identity and roles are
        // unchanged. Patch the session silently so the dashboard never flashes a
        // loading spinner when the browser refreshes the token (e.g. on tab switch).
        authDebug("provider", "TOKEN_REFRESHED - silent session update", {
          userId: session?.user?.id,
        });
        setState((current) =>
          current.isInitialized
            ? { ...current, session, user: session?.user ?? current.user }
            : current
        );
        return;
      }

      if (event === "SIGNED_IN") {
        // If the same user is already authenticated (cross-tab token sync, bfcache
        // page restore, or Supabase SDK re-emitting SIGNED_IN after TOKEN_REFRESHED),
        // just patch the session silently — no loading spinner, no DB round-trip.
        if (session?.user?.id && session.user.id === currentUserIdRef.current) {
          authDebug("provider", "SIGNED_IN - same user, silent session update", {
            userId: session.user.id,
          });
          setState((current) => ({
            ...current,
            session,
            user: session.user ?? current.user,
          }));
          return;
        }

        // Different user or first sign-in — full sync with loading state.
        authDebug("provider", "SIGNED_IN - new user, full sync", {
          userId: session?.user?.id,
        });
        await syncAuthState(`event:${event}`, {
          session,
          user: session?.user ?? null,
        });
        return;
      }

      if (event === "USER_UPDATED") {
        // User metadata changed. If it's the same user, re-fetch profile silently
        // (no loading spinner). If somehow a different user, do a full sync.
        const isSameUser = session?.user?.id === currentUserIdRef.current;
        authDebug("provider", `USER_UPDATED - ${isSameUser ? "silent" : "full"} sync`, {
          userId: session?.user?.id,
        });
        await syncAuthState(
          `event:${event}`,
          { session, user: session?.user ?? null },
          { silent: isSameUser }
        );
      }
    });

    // When the browser comes back online, proactively refresh the profile/session.
    // Use silent mode so the dashboard stays visible during the background re-sync.
    const handleOnline = () => {
      if (!mounted) return;
      authDebug("provider", "network online - silent background refresh");
      void refreshProfile().catch((err) => {
        console.error("Auth online refresh error:", err);
      });
    };

    if (typeof window !== "undefined") {
      window.addEventListener("online", handleOnline);
    }

    return () => {
      mounted = false;
      subscription.unsubscribe();
      if (typeof window !== "undefined") {
        window.removeEventListener("online", handleOnline);
      }
    };
  }, [supabase, refreshProfile, syncAuthState]);

  useEffect(() => {
    if (typeof window === "undefined" || typeof BroadcastChannel === "undefined") {
      return;
    }
    const bc = new BroadcastChannel(AUTH_SIGNOUT_BROADCAST_CHANNEL);
    bc.onmessage = (ev: MessageEvent) => {
      if (ev.data !== "signed-out") return;
      authDebug("provider", "cross-tab sign-out broadcast — hard navigation to login");
      window.location.replace("/login");
    };
    return () => bc.close();
  }, []);

  const signIn = useCallback(
    async (email: string, password: string, requestedRedirectPath?: string) => {
      setState((current) => ({ ...current, isLoading: true }));
      authDebug("provider", "signIn start", { email });

      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          setState((current) => ({ ...current, isLoading: false, isInitialized: true }));
          return { error: error as Error };
        }

        if (data.user) {
          // Drop any in-flight getUser() from a previous session so the next validation
          // is not tied to a stale promise after account switches.
          getUserInFlightRef.current = null;
          await supabase.auth.getSession();

          const confirmedSession =
            data.session?.user?.id === data.user.id
              ? data.session
              : await waitForSessionConfirmation(data.user.id);

          const resolved = await syncAuthState("signIn", {
            session: confirmedSession,
            user: data.user,
          });

          if (!resolved?.user) {
            return {
              error: new Error("Sign-in succeeded but the session could not be restored."),
            };
          }

          // Audit log after sync so REST uses the same JWT as the validated session.
          void (async () => {
            await supabase.auth.getSession();
            await supabase
              .from("login_logs")
              .insert({
                user_id: data.user.id,
                ip_address: null,
                device_info:
                  typeof navigator !== "undefined" ? navigator.userAgent : null,
              } as never);
          })().catch(() => {});

          const redirectPath = resolvePostLoginRedirect({
            requestedPath: requestedRedirectPath,
            storedPath: getStoredRedirectPath(),
            roleNames: getRoleNames(resolved.roles),
          });

          persistRedirectPath(redirectPath);
          authDebug("provider", "signIn success", {
            userId: resolved.user.id,
            redirectPath,
            roles: getRoleNames(resolved.roles),
          });

          return { error: null, redirectPath };
        }

        // No error and no user (unexpected but handle gracefully)
        setState((current) => ({ ...current, isLoading: false, isInitialized: true }));
        return { error: new Error("Authentication did not return a user.") };
      } catch (err) {
        console.error("Auth signIn error:", err);
        setState((current) => ({ ...current, isLoading: false, isInitialized: true }));
        return { error: err as Error };
      }
    },
    [supabase, syncAuthState, waitForSessionConfirmation]
  );

  const signOut = useCallback(async () => {
    authDebug("provider", "signOut start");
    setState((current) => ({ ...current, isLoading: true }));
    getUserInFlightRef.current = null;

    try {
      await supabase.auth.signOut({ scope: "global" });
    } catch (err) {
      console.error("Auth signOut error:", err);
    }

    clearClientStorage();

    try {
      await fetch("/api/auth/signout", {
        method: "POST",
        credentials: "include",
        cache: "no-store",
      });
    } catch (err) {
      console.error("Server signOut error:", err);
    }

    broadcastAuthSignedOut();

    currentUserIdRef.current = null;
    setState({
      user: null,
      session: null,
      profile: null,
      roles: [],
      isInitialized: true,
      isLoading: false,
    });
    authDebug("provider", "signOut complete");

    if (typeof window !== "undefined") {
      window.location.replace("/login");
    }
  }, [supabase]);

  const hasRole = useCallback(
    (roleName: string) => {
      const normalized = normalizeRoleName(roleName);
      return state.roles.some((r) => {
        const rNormalized = normalizeRoleName(r.role_name);
        return rNormalized === normalized || r.role_name?.toLowerCase() === roleName.toLowerCase();
      });
    },
    [state.roles]
  );

  const getDefaultRedirect = useCallback(() => {
    return getDefaultRedirectPath(getRoleNames(state.roles));
  }, [state.roles]);

  const value: AuthContextValue = {
    ...state,
    signIn,
    signOut,
    refreshProfile,
    hasRole,
    getDefaultRedirect,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
