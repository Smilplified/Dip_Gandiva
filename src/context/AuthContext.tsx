"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from "react";
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

// ─── Public types ────────────────────────────────────────────────────────────

export type UserRole = {
  id: string;
  name: string;
  role_name: string;
  description?: string | null;
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

// ─── Helpers ─────────────────────────────────────────────────────────────────

const ANON_STATE: AuthState = {
  user: null,
  session: null,
  profile: null,
  roles: [],
  isLoading: false,
  isInitialized: true,
};

function toUserRoles(
  roleRows: { role_id: string; roles: { name: string } | null }[]
): UserRole[] {
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
  return roles.map((r) => r.role_name);
}

/**
 * Wipe every auth-related key from localStorage and sessionStorage.
 * Called on every sign-in (to clear previous user's stale data) and sign-out.
 */
function clearAllAuthStorage() {
  if (typeof window === "undefined") return;
  try {
    // Collect all sb-* and legacy supabase keys from localStorage.
    const toRemove: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (!key) continue;
      if (
        key.startsWith("sb-") ||
        key === "supabase.auth.token" ||
        key === AUTH_STORAGE_KEYS.lastRedirectPath
      ) {
        toRemove.push(key);
      }
    }
    toRemove.forEach((k) => window.localStorage.removeItem(k));

    // Also nuke sessionStorage entirely — it has no cross-session value.
    window.sessionStorage.clear();
  } catch (err) {
    console.warn("[auth] clearAllAuthStorage failed:", err);
  }
}

function getStoredRedirectPath(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(AUTH_STORAGE_KEYS.lastRedirectPath);
  } catch {
    return null;
  }
}

function persistRedirectPath(path: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(AUTH_STORAGE_KEYS.lastRedirectPath, path);
  } catch {
    // ignore
  }
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    profile: null,
    roles: [],
    isLoading: true,
    isInitialized: false,
  });

  const supabase = createClient();

  /**
   * Each time we start a new load, we increment this counter and capture the
   * value.  Any branch that finds `loadCounterRef.current !== myToken` was
   * superseded by a newer load and must not mutate state.
   */
  const loadCounterRef = useRef(0);

  /** The user-id that is currently reflected in UI state (null = anonymous). */
  const currentUserIdRef = useRef<string | null>(null);

  // ── Profile + roles fetchers ───────────────────────────────────────────────

  const fetchProfileAndRolesFromApi = useCallback(async () => {
    const res = await fetch("/api/profile", {
      credentials: "include",
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    if (!res.ok) throw new Error(`Profile API returned ${res.status}`);
    const data = (await res.json()) as {
      profile?: (UserProfile & { roles?: string[] }) | null;
    };
    const profile = (data.profile ?? null) as UserProfile | null;
    const roles = (data.profile?.roles ?? [])
      .filter((n): n is string => typeof n === "string" && n.trim().length > 0)
      .map((name) => ({ id: name, name, role_name: name, description: null }));
    return { profile, roles };
  }, []);

  const fetchProfileAndRoles = useCallback(
    async (userId: string) => {
      const [profileRes, rolesRes] = await Promise.all([
        supabase.from("users").select("*").eq("id", userId).single(),
        supabase
          .from("user_roles")
          .select("role_id, roles(name)")
          .eq("user_id", userId),
      ]);

      const profile = profileRes.error ? null : (profileRes.data as UserProfile);
      const roleRows = (rolesRes.data ?? []) as {
        role_id: string;
        roles: { name: string } | null;
      }[];
      const roles = toUserRoles(roleRows);

      // Fallback: client-side RLS can silently block role rows for some users.
      // The server-side profile API bypasses RLS and is the authoritative source.
      if (rolesRes.error || roles.length === 0) {
        try {
          const apiData = await fetchProfileAndRolesFromApi();
          if (apiData.roles.length > 0 || apiData.profile) {
            return apiData;
          }
        } catch (err) {
          console.warn("[auth] Profile API fallback failed:", err);
        }
      }

      return { profile, roles };
    },
    [fetchProfileAndRolesFromApi, supabase]
  );

  // ── Core loader ────────────────────────────────────────────────────────────

  /**
   * Single source-of-truth auth loader.
   *
   * - Always calls `getUser()` (server-round-trip, never stale).
   * - Cancellable via `loadCounterRef`.
   * - Never leaves `isLoading` stuck — every code path resolves it.
   * - Returns the loaded result so callers (signIn) can read fresh roles.
   */
  const loadUser = useCallback(
    async (
      source: string,
      opts?: { silent?: boolean }
    ): Promise<{ user: User; roles: UserRole[] } | null> => {
      const myToken = ++loadCounterRef.current;

      if (!opts?.silent) {
        setState((prev) => ({ ...prev, isLoading: true }));
      }

      authDebug("provider", `loadUser start: ${source}`, { myToken });

      try {
        // ① Server-verified user — immune to stale local storage / cache.
        const {
          data: { user },
          error: userErr,
        } = await supabase.auth.getUser();

        if (loadCounterRef.current !== myToken) return null; // superseded

        if (userErr || !user) {
          currentUserIdRef.current = null;
          setState({ ...ANON_STATE });
          authDebug("provider", `loadUser anon: ${source}`, { myToken });
          return null;
        }

        // ② Get the local session object (for access-token in downstream calls).
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (loadCounterRef.current !== myToken) return null; // superseded

        // ③ Fetch profile + roles (with fallback to server API).
        const { profile, roles } = await fetchProfileAndRoles(user.id);

        if (loadCounterRef.current !== myToken) return null; // superseded

        currentUserIdRef.current = user.id;
        setState({
          user,
          session: session ?? null,
          profile,
          roles,
          isLoading: false,
          isInitialized: true,
        });

        authDebug("provider", `loadUser success: ${source}`, {
          myToken,
          userId: user.id,
          roles: getRoleNames(roles),
        });

        return { user, roles };
      } catch (err) {
        if (loadCounterRef.current !== myToken) return null; // superseded

        console.error(`[auth] loadUser error (${source}):`, err);
        authDebug("provider", `loadUser error: ${source}`, {
          myToken,
          error: err instanceof Error ? err.message : String(err),
        });

        setState((prev) => {
          // If the user was already in a working session, keep them visible
          // (transient network error should not log them out).
          if (prev.isInitialized && prev.user !== null) {
            return { ...prev, isLoading: false };
          }
          // Cold-start error — go anonymous.
          currentUserIdRef.current = null;
          return { ...ANON_STATE };
        });

        return null;
      }
    },
    [fetchProfileAndRoles, supabase]
  );

  const refreshProfile = useCallback(
    async () => {
      await loadUser("manual-refresh", { silent: true });
    },
    [loadUser]
  );

  // ── Safety timeout ─────────────────────────────────────────────────────────
  // Prevent infinite spinner if something goes catastrophically wrong on init.
  useEffect(() => {
    if (state.isInitialized) return;
    const timer = setTimeout(() => {
      setState((prev) => (prev.isInitialized ? prev : { ...ANON_STATE }));
    }, 12_000);
    return () => clearTimeout(timer);
  }, [state.isInitialized]);

  // ── Mount: init + auth-state listener ─────────────────────────────────────
  useEffect(() => {
    // Kick off the initial load immediately.
    void loadUser("init");

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      authDebug("provider", `auth event: ${event}`, {
        userId: session?.user?.id ?? null,
        currentUserId: currentUserIdRef.current,
      });

      // ── SIGNED_OUT ──────────────────────────────────────────────────────
      if (event === "SIGNED_OUT") {
        // Cancel any in-flight load so it won't overwrite the anon state.
        loadCounterRef.current++;
        currentUserIdRef.current = null;
        setState({ ...ANON_STATE });
        return;
      }

      // ── INITIAL_SESSION ─────────────────────────────────────────────────
      // The loadUser("init") above already handles this; skip to avoid a
      // duplicate full sync on mount which causes the loading race.
      if (event === "INITIAL_SESSION") {
        return;
      }

      // ── TOKEN_REFRESHED ─────────────────────────────────────────────────
      // Only the JWT rotated — user identity and roles are unchanged.
      // Patch the session silently so the dashboard never flashes a spinner.
      if (event === "TOKEN_REFRESHED") {
        setState((prev) =>
          prev.isInitialized
            ? { ...prev, session: session ?? null, user: session?.user ?? prev.user }
            : prev
        );
        return;
      }

      // ── SIGNED_IN ───────────────────────────────────────────────────────
      if (event === "SIGNED_IN") {
        // Same user already loaded (cross-tab sync / bfcache restore):
        // just patch the session object, no DB round-trip needed.
        if (
          session?.user?.id &&
          session.user.id === currentUserIdRef.current
        ) {
          setState((prev) => ({
            ...prev,
            session,
            user: session.user ?? prev.user,
          }));
          return;
        }
        // Different / new user → full fresh load.
        await loadUser(`event:${event}`);
        return;
      }

      // ── USER_UPDATED ────────────────────────────────────────────────────
      if (event === "USER_UPDATED") {
        const isSameUser = session?.user?.id === currentUserIdRef.current;
        await loadUser(`event:${event}`, { silent: isSameUser });
      }
    });

    // Re-sync silently when the browser comes back online.
    const handleOnline = () => {
      void loadUser("online-recovery", { silent: true }).catch(console.error);
    };
    if (typeof window !== "undefined") {
      window.addEventListener("online", handleOnline);
    }

    return () => {
      subscription.unsubscribe();
      if (typeof window !== "undefined") {
        window.removeEventListener("online", handleOnline);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // ← intentionally empty: loadUser and supabase are stable refs

  // ── signIn ─────────────────────────────────────────────────────────────────

  const signIn = useCallback(
    async (
      email: string,
      password: string,
      requestedRedirectPath?: string
    ): Promise<{ error: Error | null; redirectPath?: string }> => {
      setState((prev) => ({ ...prev, isLoading: true }));
      authDebug("provider", "signIn start", { email });

      // Wipe any previous user's tokens/cache before attempting a new login.
      clearAllAuthStorage();

      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          setState((prev) => ({ ...prev, isLoading: false, isInitialized: true }));
          return { error: error as Error };
        }

        if (!data.user) {
          setState((prev) => ({ ...prev, isLoading: false, isInitialized: true }));
          return { error: new Error("Authentication did not return a user.") };
        }

        // Full server-verified load so roles are fresh for the redirect calculation.
        const loaded = await loadUser("signIn");

        // Fire-and-forget audit log.
        void supabase
          .from("login_logs")
          .insert({
            user_id: data.user.id,
            ip_address: null,
            device_info:
              typeof navigator !== "undefined" ? navigator.userAgent : null,
          } as never)
          .then(() => {}, () => {});

        const roles = loaded?.roles ?? [];
        const redirectPath = resolvePostLoginRedirect({
          requestedPath: requestedRedirectPath,
          storedPath: getStoredRedirectPath(),
          roleNames: getRoleNames(roles),
        });

        persistRedirectPath(redirectPath);
        authDebug("provider", "signIn success", {
          userId: data.user.id,
          redirectPath,
          roles: getRoleNames(roles),
        });

        return { error: null, redirectPath };
      } catch (err) {
        console.error("[auth] signIn error:", err);
        setState((prev) => ({ ...prev, isLoading: false, isInitialized: true }));
        return { error: err as Error };
      }
    },
    [supabase, loadUser]
  );

  // ── signOut ────────────────────────────────────────────────────────────────

  const signOut = useCallback(async () => {
    authDebug("provider", "signOut start");

    // Cancel any in-flight load immediately.
    loadCounterRef.current++;
    currentUserIdRef.current = null;

    // Optimistically clear UI state first — no waiting.
    setState({ ...ANON_STATE });

    // Clear every auth token from every storage layer.
    clearAllAuthStorage();

    // Server-side session invalidation (best-effort, don't block redirect).
    void fetch("/api/auth/signout", {
      method: "POST",
      credentials: "include",
      cache: "no-store",
    }).catch(() => {});

    // Local Supabase session revocation.
    try {
      await supabase.auth.signOut({ scope: "local" });
    } catch (err) {
      console.warn("[auth] supabase.signOut error:", err);
    }

    authDebug("provider", "signOut complete");

    // Hard redirect — forces a complete React tree remount so no stale state
    // from the previous user can bleed into the new session.
    window.location.replace("/login");
  }, [supabase]);

  // ── hasRole / getDefaultRedirect ───────────────────────────────────────────

  const hasRole = useCallback(
    (roleName: string) => {
      const normalized = normalizeRoleName(roleName);
      return state.roles.some(
        (r) =>
          normalizeRoleName(r.role_name) === normalized ||
          r.role_name?.toLowerCase() === roleName.toLowerCase()
      );
    },
    [state.roles]
  );

  const getDefaultRedirect = useCallback(
    () => getDefaultRedirectPath(getRoleNames(state.roles)),
    [state.roles]
  );

  // ── Context value ──────────────────────────────────────────────────────────

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
