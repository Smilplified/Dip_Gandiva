"use client";

import { Typography } from "antd";
import { useAuth } from "@/context/AuthContext";
import TeamHierarchyView from "@/components/TL/TeamHierarchyView";
import { getTLAreaRoleDisplayName } from "@/lib/auth/tl-access";

const { Text } = Typography;

export default function TLTeamPage() {
  const { roles } = useAuth();
  const roleLabel = getTLAreaRoleDisplayName(roles);
  const isOperationsManager = roleLabel === "Operations Manager";

  return (
    <>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>Team</h1>
        <Text type="secondary" style={{ fontSize: 14 }}>
          {isOperationsManager
            ? "Organization overview — team leaders and the agents under each."
            : "Your team — agents assigned to you via campaigns or reporting line."}
        </Text>
      </div>
      <TeamHierarchyView />
    </>
  );
}
