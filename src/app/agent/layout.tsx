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
      router.replace("/no-access");
    }
  }, [isInitialized, hasRole, router]);

  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Spin size="large" />
      </div>
    );
  }

  if (!hasRole("agent")) {
    return null;
  }

  return <AgentLayout>{children}</AgentLayout>;
}

