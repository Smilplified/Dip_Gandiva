"use client";

import { useMemo } from "react";
import { useAuth } from "@/context/AuthContext";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function formatDate(): string {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

type Props = {
  /** Fallback first name shown when profile hasn't loaded yet */
  fallback?: string;
};

export default function DashboardGreeting({ fallback = "there" }: Props) {
  const { profile } = useAuth();

  const greeting  = useMemo(getGreeting,  []);
  const dateLabel = useMemo(formatDate,  []);

  const firstName = profile?.full_name?.split(" ")[0] || fallback;

  return (
    <div style={{ marginBottom: 28 }}>
      <div
        style={{
          fontSize: 13,
          fontWeight: 500,
          color: "#9ca3af",
          letterSpacing: "0.01em",
          marginBottom: 4,
        }}
      >
        {dateLabel}
      </div>
      <div
        style={{
          fontSize: 26,
          fontWeight: 700,
          color: "#111827",
          lineHeight: 1.3,
        }}
      >
        {greeting}, {firstName} 👋
      </div>
    </div>
  );
}
