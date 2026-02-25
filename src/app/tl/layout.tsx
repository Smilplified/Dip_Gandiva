"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import TLLayout from "@/components/TL/TLLayout";
import { useAuth } from "@/context/AuthContext";
import { Spin } from "antd";

export default function TLRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { hasRole, isInitialized } = useAuth();

  useEffect(() => {
    if (!isInitialized) return;
    if (!hasRole("team_leader") && !hasRole("tl")) {
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

  if (!hasRole("team_leader") && !hasRole("tl")) {
    return null;
  }

  return <TLLayout>{children}</TLLayout>;
}
