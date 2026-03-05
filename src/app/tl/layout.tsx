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
      router.replace("/login");
    }
  }, [isInitialized, hasRole, router]);

  return (
    <TLLayout>
      {!isInitialized ? (
        <div className="min-h-[60vh] flex items-center justify-center">
          <Spin size="large" />
        </div>
      ) : !hasRole("team_leader") && !hasRole("tl") ? (
        <div className="min-h-[60vh] flex items-center justify-center">
          <Spin size="large" tip="Redirecting..." />
        </div>
      ) : (
        children
      )}
    </TLLayout>
  );
}
