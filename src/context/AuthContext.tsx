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

function clearClientStorage() {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.removeItem(AUTH_STORAGE_KEYS.lastRedirectPath);
  } catch (err) {
    console.warn("Failed to clear auth localStorage", err);
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

  const supabase = createClient();
  const syncRequestRef = useRef(0);

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
    const sessionResult = await supabase.auth.getSession();
    const session = sessionResult.data.session ?? null;

    if (session?.user) {
      return { session, user: session.user };
    }

    const userResult = await supabase.auth.getUser();
    return { session: null, user: userResult.data.user ?? null };
  }, [supabase]);

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
      // silent=true keeps the existing UI visible during background refreshes
      // (e.g. coming back online) so the dashboard doesn't flash a loading spinner.
      if (!options?.silent) {
        setState((current) => ({ ...current, isLoading: true }));
      }
      authDebug("provider", `sync start: ${source}`, {
        requestId,
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
        setState({
          user: null,
          session: null,
          profile: null,
          roles: [],
          isLoading: false,
          isInitialized: true,
        });
        return { user: null, session: null, profile: null, roles: [] as UserRole[] };
      }
    },
    [fetchProfileAndRoles, resolveSessionUser]
  );

  const refreshProfile = useCallback(async () => {
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
      });

      if (event === "SIGNED_OUT") {
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
        return;
      }

      if (event === "TOKEN_REFRESHED") {
        // Token refresh only updates the JWT — user identity and roles are unchanged.
        // Update the session silently in state to avoid triggering a loading spinner
        // (which previously caused the dashboard to flash "Loading..." on every tab switch).
        setState((current) =>
          current.isInitialized
            ? { ...current, session, user: session?.user ?? current.user }
            : current
        );
        return;
      }

      if (event === "SIGNED_IN" || event === "USER_UPDATED") {
        await syncAuthState(`event:${event}`, {
          session,
          user: session?.user ?? null,
        });
      }
    });

    // When the browser comes back online, proactively refresh the profile/session.
    const handleOnline = () => {
      if (!mounted) return;
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

          // Audit log in background - don't block redirect
          void Promise.resolve(
            supabase
              .from("login_logs")
              .insert({
                user_id: data.user.id,
                ip_address: null,
                device_info:
                  typeof navigator !== "undefined" ? navigator.userAgent : null,
              } as never)
          ).catch(() => {});

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

    try {
      await supabase.auth.signOut({ scope: "local" });
    } catch (err) {
      console.error("Auth signOut error:", err);
    }

    setState({
      user: null,
      session: null,
      profile: null,
      roles: [],
      isInitialized: true,
      isLoading: false,
    });
    authDebug("provider", "signOut complete");

    if (typeof window !== "undefined" && window.location.pathname !== "/login") {
      window.location.assign("/login");
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
