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
  sales: "/sales",
  qa: "/qa/dashboard",
};

export type UserRole = { id: string; name: string; role_name: string; description?: string | null; organization_id: string };
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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    profile: null,
    roles: [],
    isLoading: true,
    isInitialized: false,
  });

  const supabase = createClient();

  const fetchProfileAndRoles = useCallback(async (userId: string) => {
    const [profileRes, rolesRes] = await Promise.all([
      supabase.from("users").select("*").eq("id", userId).single(),
      supabase
        .from("user_roles")
        .select("role_id, roles(id, name, description, organization_id)")
        .eq("user_id", userId),
    ]);

    const profile = profileRes.error ? null : profileRes.data;
    const roleRows = (rolesRes.data ?? []) as { roles: { id: string; name: string; description: string | null; organization_id: string } | null }[];
    const roles: UserRole[] = roleRows
      .filter((r) => r.roles?.name)
      .map((r) => ({
        id: r.roles!.id,
        name: r.roles!.name,
        role_name: r.roles!.name,
        description: r.roles!.description,
        organization_id: r.roles!.organization_id,
      }));

    return { profile, roles };
  }, [supabase]);

  const refreshProfile = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setState((s) => ({ ...s, user: null, profile: null, roles: [], isLoading: false, isInitialized: true }));
      return;
    }
    const { profile, roles } = await fetchProfileAndRoles(user.id);
    setState((s) => ({ ...s, user, profile, roles, isLoading: false, isInitialized: true }));
  }, [supabase, fetchProfileAndRoles]);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        // Use getUser() - validates session with server, more reliable after redirect
        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
        if (!mounted) return;

        if (authError || !authUser) {
          setState((s) => ({ ...s, user: null, profile: null, roles: [], isLoading: false, isInitialized: true }));
          return;
        }

        const { profile, roles } = await fetchProfileAndRoles(authUser.id);
        if (!mounted) return;
        setState((s) => ({
          ...s,
          user: authUser,
          profile,
          roles,
          isLoading: false,
          isInitialized: true,
        }));
      } catch (err) {
        console.error("Auth init error:", err);
        if (!mounted) return;
        setState((s) => ({
          ...s,
          user: null,
          profile: null,
          roles: [],
          isLoading: false,
          isInitialized: true,
        }));
      }
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      if (event === "SIGNED_OUT") {
        setState((s) => ({ ...s, user: null, profile: null, roles: [], isLoading: false, isInitialized: true }));
        return;
      }
      // INITIAL_SESSION fires when client loads - can arrive before getUser() completes
      if (event === "INITIAL_SESSION" || event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        if (session?.user) {
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

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase, fetchProfileAndRoles]);

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
          let redirectPath = "/agent/dashboard";
          for (const role of roles) {
            const name = role.role_name?.toLowerCase().replace(/\s+/g, "_");
            const path =
              ROLE_ROUTES[name] ??
              ROLE_ROUTES[role.role_name?.toLowerCase() ?? ""];
            if (path) {
              redirectPath = path;
              break;
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

  const signOut = useCallback(async () => {
    // Optimistic: clear state immediately for instant UI feedback
    setState((s) => ({
      ...s,
      user: null,
      profile: null,
      roles: [],
      isInitialized: true,
      isLoading: false,
    }));
    // Parallel cleanup: client session + server cookies; swallow errors
    try {
      await Promise.all([
        supabase.auth.signOut(),
        fetch("/api/auth/signout", {
          method: "POST",
          credentials: "include",
        }).catch(() => {}),
      ]);
    } catch (err) {
      console.error("Auth signOut error:", err);
    }
  }, [supabase]);

  const hasRole = useCallback(
    (roleName: string) => {
      const normalized = roleName.toLowerCase().replace(/\s+/g, "_");
      return state.roles.some((r) => {
        const rNormalized = r.role_name?.toLowerCase().replace(/\s+/g, "_");
        return rNormalized === normalized || r.role_name?.toLowerCase() === roleName.toLowerCase();
      });
    },
    [state.roles]
  );

  const getDefaultRedirect = useCallback(() => {
    for (const role of state.roles) {
      const name = role.role_name?.toLowerCase().replace(/\s+/g, "_");
      const path = ROLE_ROUTES[name] ?? ROLE_ROUTES[role.role_name?.toLowerCase() ?? ""];
      if (path) return path;
    }
    return "/agent/dashboard"; // fallback
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
