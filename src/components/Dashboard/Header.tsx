"use client";

import CrmHeader from "@/components/shared/CrmHeader";
import GlobalSearch from "@/components/Dashboard/GlobalSearch";
import { useAuth } from "@/context/AuthContext";
import { COMMAND_CENTER_ROLES } from "@/lib/auth/config";

export default function DashboardHeader() {
  const { roles, profile, hasRole } = useAuth();

  const roleNames = roles.map((r) => r.role_name?.toLowerCase() ?? "");
  const isClientViewer = hasRole("client_viewer");
  const isCommandCenterUser = COMMAND_CENTER_ROLES.some((role) => hasRole(role));
  const clientLogoUrl =
    (profile as { client_logo_url?: string | null } | null)?.client_logo_url ?? null;

  const roleLabel = roleNames.includes("internal_admin")
    ? "Internal Admin"
    : roleNames.includes("internal_operator")
      ? "Internal Operator"
      : roleNames.includes("client_viewer")
        ? "Client Viewer"
        : roleNames.includes("admin")
          ? "Admin"
          : roleNames.length > 0
            ? roles[0]?.role_name ?? "User"
            : "User";

  const trailingSlot =
    isClientViewer && clientLogoUrl ? (
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
      roleLabel={roleLabel}
      fallbackName="User"
      profilePath={isCommandCenterUser ? "/dashboard/profile" : undefined}
      showSettings={!isClientViewer}
      search={<GlobalSearch />}
      trailingSlot={trailingSlot}
    />
  );
}
