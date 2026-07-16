"use client";

import { useRoleGuard } from "@/hooks/useRoleGuard";
import LeadFinderPage from "@/components/Admin/LeadFinder/LeadFinderPage";

export default function TlLeadFinderPage() {
  const { status } = useRoleGuard(["admin", "operations_manager"]);
  if (status !== "authorized") {
    return null;
  }
  return <LeadFinderPage />;
}
