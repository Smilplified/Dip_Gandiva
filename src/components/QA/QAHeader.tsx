"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Layout, Avatar, Dropdown } from "antd";
import { UserOutlined, LogoutOutlined, SettingOutlined } from "@ant-design/icons";
import { useAuth } from "@/context/AuthContext";

const { Header } = Layout;

export default function QAHeader() {
  const router = useRouter();
  const { user, profile, signOut } = useAuth();
  const [signingOut, setSigningOut] = useState(false);

  const handleMenuClick = ({ key }: { key: string }) => {
    if (key === "logout") {
      setSigningOut(true);
      signOut(); // Fire-and-forget; redirect immediately for instant UX
      window.location.href = "/login";
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
        justifyContent: "flex-end",
        boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
        flexShrink: 0,
        zIndex: 99,
      }}
    >
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
            style={{ backgroundColor: "#722ed1", flexShrink: 0 }}
          />
          <div style={{ textAlign: "left", lineHeight: 1.3 }}>
            <div style={{ fontWeight: 600, fontSize: 14 }}>
              {signingOut ? "Signing out..." : (profile?.full_name || user?.email || "QA")}
            </div>
            <div style={{ fontSize: 12, color: "#8c8c8c" }}>
              {signingOut ? "..." : "QA"}
            </div>
          </div>
        </div>
      </Dropdown>
    </Header>
  );
}
