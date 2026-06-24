"use client";

import CrmHeader from "@/components/shared/CrmHeader";
import GlobalSearch from "@/components/shared/GlobalSearch";

export default function AgentHeader() {
  return (
    <CrmHeader
      roleLabel="Agent"
      fallbackName="Agent"
      profilePath="/agent/profile"
      search={<GlobalSearch />}
    />
  );
}
