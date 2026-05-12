"use client";

import AppLayout from "@/components/Dashboard/AppLayout";
import { useAuth } from "@/context/AuthContext";
import { Spin } from "antd";
import { useRouter } from "next/navigation";
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
  const router = useRouter();

  const isAllowed = ALLOWED_ROLES.some((r) => hasRole(r));

  useEffect(() => {
    if (!isInitialized || isLoading) return;

    if (!user) {
      router.replace("/login?reason=session_expired");
      return;
    }

    if (!isAllowed) {
      router.replace("/login?reason=unauthorized");
    }
  }, [isInitialized, isLoading, user, isAllowed, router]);

  // Never render dashboard children until auth has fully finished loading — otherwise
  // `useAuthReady()` stays false while the shell is visible and data effects never run.
  if (!isInitialized || isLoading) {
    return (
      <AppLayout>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            minHeight: 400,
          }}
        >
          <Spin size="large" tip="Loading…" />
        </div>
      </AppLayout>
    );
  }

  if (!user || !isAllowed) {
    return (
      <AppLayout>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            minHeight: 400,
          }}
        >
          <Spin size="large" tip="Redirecting…" />
        </div>
      </AppLayout>
    );
  }

  return <AppLayout>{children}</AppLayout>;
}
