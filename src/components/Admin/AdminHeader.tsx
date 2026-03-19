"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Layout, Avatar, Dropdown } from "antd";
import {
  UserOutlined,
  LogoutOutlined,
  SettingOutlined,
} from "@ant-design/icons";
import { useAuth } from "@/context/AuthContext";
import NotificationBell from "@/components/Notifications/NotificationBell";
import GlobalSearch from "@/components/shared/GlobalSearch";

const { Header } = Layout;

export default function AdminHeader() {
  const router = useRouter();
  const { user, profile, signOut } = useAuth();
  const [signingOut, setSigningOut] = useState(false);
  const [avatarBust, setAvatarBust] = useState<string>("");
  useEffect(() => {
    try {
      setAvatarBust(sessionStorage.getItem("gandiv:avatar_updated") ?? "");
    } catch {
      /* ignore */
    }
  }, [profile]);

  const handleMenuClick = ({ key }: { key: string }) => {
    if (key === "profile") {
      router.push("/admin/profile");
      return;
    }
    if (key === "logout") {
      setSigningOut(true);
      void signOut().catch(() => {
        setSigningOut(false);
      });
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
        height: 70,
        minHeight: 70,
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
      <GlobalSearch />
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 24,
          flexShrink: 0,
        }}
      >
        <NotificationBell />
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
              src={
                profile?.avatar_url
                  ? `${profile.avatar_url}${avatarBust ? `?v=${avatarBust}` : ""}`
                  : undefined
              }
              icon={<UserOutlined />}
              style={{ backgroundColor: profile?.avatar_url ? "transparent" : "#1677ff", flexShrink: 0 }}
            />
            <div style={{ textAlign: "left", lineHeight: 1.3 }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>
                {signingOut ? "Signing out..." : (profile?.full_name || user?.email || "Admin")}
              </div>
              <div style={{ fontSize: 12, color: "#8c8c8c" }}>
                {signingOut ? "Signing out..." : "Admin"}
              </div>
            </div>
          </div>
        </Dropdown>
      </div>
    </Header>
  );
}
