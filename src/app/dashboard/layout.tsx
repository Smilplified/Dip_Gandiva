"use client";

import AppLayout from "@/components/Dashboard/AppLayout";
import { useAuth } from "@/context/AuthContext";
import { Spin } from "antd";
import { useEffect } from "react";

const ALLOWED_ROLES = [
  "client_viewer",
  "internal_operator",
  "internal_admin",
  "admin",
  "qa",
  "mis",
  "sales",
  "sales_manager",
  "agent",
  "team_leader",
  "tl",
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isInitialized, isLoading, hasRole, user } = useAuth();
  const isAllowed = ALLOWED_ROLES.some((r) => hasRole(r));

  // Hard-redirect unauthenticated visitors — window.location.replace ensures
  // a full page reload so no React state from the previous user survives.
  useEffect(() => {
    if (!isInitialized || isLoading) return;
    if (!user) {
      window.location.replace("/login");
    }
  }, [isInitialized, isLoading, user]);

  // ── Loading state ─────────────────────────────────────────────────────────
  // Do NOT wrap in <AppLayout> here — that would render Sidebar + Header with
  // potentially stale role data before auth is resolved, causing the flicker.
  if (!isInitialized || isLoading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
          background: "#f8fafc",
        }}
      >
        <Spin size="large" tip="Loading…" />
      </div>
    );
  }

  // ── Not authenticated / not authorized ────────────────────────────────────
  if (!user || !isAllowed) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
          background: "#f8fafc",
        }}
      >
        <Spin size="large" tip="Redirecting…" />
      </div>
    );
  }

  return <AppLayout>{children}</AppLayout>;
}
