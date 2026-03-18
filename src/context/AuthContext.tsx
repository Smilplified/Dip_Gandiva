"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import type { Tables } from "@/types/database.types";

// Role names as stored in DB - maps to route prefixes
export const ROLE_ROUTES: Record<string, string> = {
  admin: "/admin/dashboard",
  agent: "/agent/dashboard",
  team_leader: "/tl/dashboard",
  tl: "/tl/dashboard", // alias
  sales_manager: "/sales",
  sales: "/sales",
  qa: "/qa/dashboard",
  mis: "/mis/dashboard",
};

export const AUTH_STORAGE_KEYS = {
  lastRedirectPath: "gandiv:lastRedirectPath",
} as const;

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
  profile: UserProfile | null;
  roles: UserRole[];
  isLoading: boolean;
  isInitialized: boolean;
}

interface AuthContextValue extends AuthState {
  signIn: (email: string, password: string) => Promise<{ error: Error | null; redirectPath?: string }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  hasRole: (roleName: string) => boolean;
  getDefaultRedirect: () => string;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function normalizeRoleName(roleName: string | null | undefined) {
  return roleName?.toLowerCase().replace(/\s+/g, "_") ?? "";
}

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

function getRedirectPathForRoles(roles: UserRole[]) {
  for (const role of roles) {
    const name = normalizeRoleName(role.role_name);
    const path = ROLE_ROUTES[name] ?? ROLE_ROUTES[role.role_name?.toLowerCase() ?? ""];
    if (path) return path;
  }
  return "/agent/dashboard";
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    profile: null,
    roles: [],
    isLoading: true,
    isInitialized: false,
  });

  const supabase = createClient();

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

  const refreshProfile = useCallback(async () => {
    try {
      // Try getSession first (no locks), fallback to getUser
      const sessionResult = await supabase.auth.getSession();
      const user = sessionResult.data.session?.user ?? null;
      
      if (!user) {
        // Try getUser as fallback
        const userResult = await supabase.auth.getUser();
        const fallbackUser = userResult.data.user;
        
        if (!fallbackUser) {
          setState((s) => ({ ...s, user: null, profile: null, roles: [], isLoading: false, isInitialized: true }));
          return;
        }
        
        const { profile, roles } = await fetchProfileAndRoles(fallbackUser.id);
        setState((s) => ({ ...s, user: fallbackUser, profile, roles, isLoading: false, isInitialized: true }));
        return;
      }
      
      const { profile, roles } = await fetchProfileAndRoles(user.id);
      setState((s) => ({ ...s, user, profile, roles, isLoading: false, isInitialized: true }));
    } catch (err) {
      console.error("Refresh profile error:", err);
      setState((s) => ({ ...s, user: null, profile: null, roles: [], isLoading: false, isInitialized: true }));
    }
  }, [supabase, fetchProfileAndRoles]);

  useEffect(() => {
    let mounted = true;
    const userSetByListener = { current: false };

    const markInitialized = (user: User | null, profile: UserProfile | null, roles: UserRole[]) => {
      if (!mounted) return;
      setState((s) => ({ ...s, user, profile, roles, isLoading: false, isInitialized: true }));
    };

    const init = async () => {
      try {
        if (typeof window !== "undefined" && typeof navigator !== "undefined" && !navigator.onLine) {
          markInitialized(null, null, []);
          return;
        }
        await refreshProfile();
      } catch (err) {
        console.error("Auth init error:", err);
        if (!mounted) return;
        if (!userSetByListener.current) {
          markInitialized(null, null, []);
        }
      }
    };

    init();

    // Safety: if init hangs (e.g. Supabase slow in production), show login form after 15s so user isn't stuck
    const timeout = setTimeout(() => {
      if (!mounted) return;
      setState((s) => {
        if (s.isInitialized) return s;
        return { ...s, user: null, profile: null, roles: [], isLoading: false, isInitialized: true };
      });
    }, 15000);


    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      if (event === "SIGNED_OUT") {
        setState((s) => ({ ...s, user: null, profile: null, roles: [], isLoading: false, isInitialized: true }));
        return;
      }
      // INITIAL_SESSION fires when client loads
      if (event === "INITIAL_SESSION" || event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        if (session?.user) {
          userSetByListener.current = true;
          try {
            const { profile, roles } = await fetchProfileAndRoles(session.user.id);
            if (!mounted) return;
            setState((s) => ({ ...s, user: session.user, profile, roles, isLoading: false, isInitialized: true }));
          } catch (err) {
            console.error("Auth state change error:", err);
            if (!mounted) return;
            setState((s) => ({ ...s, user: session.user, profile: null, roles: [], isLoading: false, isInitialized: true }));
          }
        } else {
          setState((s) => ({ ...s, user: null, profile: null, roles: [], isLoading: false, isInitialized: true }));
        }
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
      clearTimeout(timeout);
      subscription.unsubscribe();
      if (typeof window !== "undefined") {
        window.removeEventListener("online", handleOnline);
      }
    };
  }, [supabase, fetchProfileAndRoles, refreshProfile]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      setState((s) => ({ ...s, isLoading: true }));
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          setState((s) => ({ ...s, isLoading: false }));
          return { error: error as Error };
        }

        if (data.user) {
          const { profile, roles } = await fetchProfileAndRoles(data.user.id);
          setState((s) => ({
            ...s,
            user: data.user!,
            profile,
            roles,
            isLoading: false,
            isInitialized: true,
          }));
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
          const redirectPath = getRedirectPathForRoles(roles);
          // Persist last successful redirect target for faster future logins
          if (typeof window !== "undefined") {
            try {
              window.localStorage.setItem(AUTH_STORAGE_KEYS.lastRedirectPath, redirectPath);
            } catch {
              // Ignore storage failures
            }
          }
          return { error: null, redirectPath };
        }

        // No error and no user (unexpected but handle gracefully)
        setState((s) => ({ ...s, isLoading: false }));
        return { error: null };
      } catch (err) {
        console.error("Auth signIn error:", err);
        setState((s) => ({ ...s, isLoading: false }));
        return { error: err as Error };
      }
    },
    [supabase, fetchProfileAndRoles]
  );

  const clearClientStorage = () => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.removeItem(AUTH_STORAGE_KEYS.lastRedirectPath);
    } catch (err) {
      console.warn("Failed to clear auth localStorage", err);
    }
  };

  const signOut = useCallback(async () => {
    // Optimistic: clear state and local storage immediately for instant UI feedback
    setState((s) => ({
      ...s,
      user: null,
      profile: null,
      roles: [],
      isInitialized: true,
      isLoading: false,
    }));
    clearClientStorage();

    const performServerSignout = async () => {
      try {
        // Clear server-side cookies first, then Supabase client session
        await fetch("/api/auth/signout", {
          method: "POST",
          credentials: "include",
        }).catch(() => {});
        await supabase.auth.signOut();
      } catch (err) {
        console.error("Auth signOut error:", err);
      }
    };

    // Run server/client signout in the background so UI can redirect instantly
    void performServerSignout();
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
    return getRedirectPathForRoles(state.roles);
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
