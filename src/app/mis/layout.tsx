"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import MISLayout from "@/components/MIS/MISLayout";
import { useAuth } from "@/context/AuthContext";
import { Spin } from "antd";

export default function MISRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { hasRole, isInitialized, isLoading } = useAuth();

  useEffect(() => {
    if (!isInitialized || isLoading) return;
    if (!hasRole("mis") && !hasRole("admin")) {
      router.replace("/login");
    }
  }, [isInitialized, isLoading, hasRole, router]);

  return (
    <MISLayout>
      {!isInitialized || isLoading ? (
        <div className="min-h-[60vh] flex items-center justify-center">
          <Spin size="large" />
        </div>
      ) : !hasRole("mis") && !hasRole("admin") ? (
        <div className="min-h-[60vh] flex items-center justify-center">
          <Spin size="large" tip="Redirecting..." />
        </div>
      ) : (
        children
      )}
    </MISLayout>
  );
}


