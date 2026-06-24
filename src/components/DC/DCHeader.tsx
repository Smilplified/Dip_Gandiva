"use client";

import CrmHeader from "@/components/shared/CrmHeader";
import GlobalSearch from "@/components/shared/GlobalSearch";
import { useAuth } from "@/context/AuthContext";

export default function DCHeader() {
  const { profile } = useAuth();
  const clientLogoUrl =
    (profile as { client_logo_url?: string | null } | null)?.client_logo_url ?? null;

  const trailingSlot = clientLogoUrl ? (
    <img
      src={clientLogoUrl}
      alt="Client logo"
      className="crm-header__client-logo"
      style={{
        height: 36,
        maxWidth: 160,
        width: "auto",
        objectFit: "contain",
        flexShrink: 0,
      }}
    />
  ) : null;

  return (
    <CrmHeader
      roleLabel="DC"
      fallbackName="DC"
      profilePath="/dc/profile"
      showSettings={false}
      search={<GlobalSearch />}
      trailingSlot={trailingSlot}
    />
  );
}
