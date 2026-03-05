"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import AgentLayout from "@/components/Agent/AgentLayout";
import { useAuth } from "@/context/AuthContext";
import { Spin } from "antd";

export default function AgentRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { hasRole, isInitialized } = useAuth();

  useEffect(() => {
    if (!isInitialized) return;
    if (!hasRole("agent")) {
      router.replace("/login");
    }
  }, [isInitialized, hasRole, router]);

  return (
    <AgentLayout>
      {!isInitialized ? (
        <div className="min-h-[60vh] flex items-center justify-center">
          <Spin size="large" />
        </div>
      ) : !hasRole("agent") ? (
        <div className="min-h-[60vh] flex items-center justify-center">
          <Spin size="large" tip="Redirecting..." />
        </div>
      ) : (
        children
      )}
    </AgentLayout>
  );
}

