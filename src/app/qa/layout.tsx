"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import QALayout from "@/components/QA/QALayout";
import { useAuth } from "@/context/AuthContext";
import { Spin } from "antd";

export default function QARootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { hasRole, isInitialized, isLoading } = useAuth();

  useEffect(() => {
    if (!isInitialized || isLoading) return;
    if (!hasRole("qa") && !hasRole("admin")) {
      router.replace("/login");
    }
  }, [isInitialized, isLoading, hasRole, router]);

  return (
    <QALayout>
      {!isInitialized || isLoading ? (
        <div className="min-h-[60vh] flex items-center justify-center">
          <Spin size="large" />
        </div>
      ) : !hasRole("qa") && !hasRole("admin") ? (
        <div className="min-h-[60vh] flex items-center justify-center">
          <Spin size="large" tip="Redirecting..." />
        </div>
      ) : (
        children
      )}
    </QALayout>
  );
}
