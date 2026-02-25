"use client";

import { useEffect } from "react";
import { useAuth } from "@/context/AuthContext";

export default function HomePage() {
  const { isInitialized, user, getDefaultRedirect } = useAuth();

  useEffect(() => {
    if (!isInitialized) return;
    if (!user) {
      window.location.href = "/login";
      return;
    }
    const path = getDefaultRedirect();
    window.location.href = path;
  }, [isInitialized, user, getDefaultRedirect]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="animate-pulse text-slate-400">Redirecting...</div>
    </div>
  );
}
