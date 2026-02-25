"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Layout, Input, Badge, Avatar, Dropdown } from "antd";
import {
  SearchOutlined,
  BellOutlined,
  UserOutlined,
  LogoutOutlined,
  SettingOutlined,
} from "@ant-design/icons";
import { useAuth } from "@/context/AuthContext";

const { Header } = Layout;

export default function TLHeader() {
  const router = useRouter();
  const { user, profile, signOut } = useAuth();
  const [signingOut, setSigningOut] = useState(false);

  const handleMenuClick = async ({ key }: { key: string }) => {
    if (key === "logout") {
      setSigningOut(true);
      await signOut();
      router.replace("/login");
      setSigningOut(false);
    }
  };

  const userMenuItems = [
    { key: "profile", icon: <UserOutlined />, label: "Profile" },
    { key: "settings", icon: <SettingOutlined />, label: "Settings" },
    { type: "divider" as const },
    { key: "logout", icon: <LogoutOutlined />, label: "Sign out", danger: true },
  ];

  return (
    <Header
      style={{
        height: 64,
        minHeight: 64,
        padding: "0 24px",
        background: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
        flexShrink: 0,
        zIndex: 99,
        overflow: "visible",
      }}
    >
      <Input
        placeholder="Search deals, contacts..."
        prefix={<SearchOutlined style={{ color: "#bfbfbf" }} />}
        allowClear
        style={{ maxWidth: 400, borderRadius: 8 }}
      />
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 24,
          flexShrink: 0,
        }}
      >
        <div style={{ padding: "4px 8px", display: "flex", alignItems: "center" }}>
          <Badge count={0} size="small" offset={[0, 4]}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                height: 32,
                width: 32,
              }}
            >
              <BellOutlined style={{ fontSize: 18, color: "#595959" }} />
            </span>
          </Badge>
        </div>
        <Dropdown
          menu={{ items: userMenuItems, onClick: handleMenuClick }}
          placement="bottomRight"
          disabled={signingOut}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              cursor: signingOut ? "wait" : "pointer",
              opacity: signingOut ? 0.7 : 1,
            }}
          >
            <Avatar
              size={36}
              icon={<UserOutlined />}
              style={{ backgroundColor: "#1677ff", flexShrink: 0 }}
            />
            <div style={{ textAlign: "left", lineHeight: 1.3 }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>
                {signingOut ? "Signing out..." : (profile?.full_name || user?.email || "Team Leader")}
              </div>
              <div style={{ fontSize: 12, color: "#8c8c8c" }}>
                {signingOut ? "Signing out..." : "Team Leader"}
              </div>
            </div>
          </div>
        </Dropdown>
      </div>
    </Header>
  );
}
