"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Layout, Avatar, Dropdown } from "antd";
import type { MenuProps } from "antd";
import { UserOutlined, LogoutOutlined, SettingOutlined } from "@ant-design/icons";
import { useAuth } from "@/context/AuthContext";
import NotificationBell from "@/components/Notifications/NotificationBell";
import { brand, header as headerTokens, text } from "@/design-tokens";

const { Header } = Layout;

export type CrmHeaderProps = {
  /** Shown under the user name (e.g. "Sales Manager", "Admin"). */
  roleLabel: string;
  /** Fallback display name when profile name is missing. */
  fallbackName: string;
  /** Role-specific global search component. */
  search: React.ReactNode;
  /** Navigate on Profile menu click. Omit to keep item visible but inert. */
  profilePath?: string;
  /** Navigate on Settings menu click. Omit to keep item visible but inert. */
  settingsPath?: string;
  /** Include Settings in the user dropdown (MIS/DC omit this). */
  showSettings?: boolean;
  /** Rendered before the notification bell (e.g. client logo). */
  trailingSlot?: React.ReactNode;
  /** Avatar fallback when no profile image. Defaults to brand indigo. */
  avatarFallbackColor?: string;
};

export default function CrmHeader({
  roleLabel,
  fallbackName,
  search,
  profilePath,
  settingsPath,
  showSettings = true,
  trailingSlot,
  avatarFallbackColor = brand[600],
}: CrmHeaderProps) {
  const router = useRouter();
  const { user, profile, signOut } = useAuth();
  const [signingOut, setSigningOut] = useState(false);
  const [avatarBust, setAvatarBust] = useState("");

  useEffect(() => {
    try {
      setAvatarBust(sessionStorage.getItem("gandiv:avatar_updated") ?? "");
    } catch {
      /* ignore */
    }
  }, [profile]);

  const displayName = signingOut
    ? "Signing out..."
    : profile?.full_name || user?.email || fallbackName;

  const subLabel = signingOut ? "Please wait…" : roleLabel;

  const userMenuItems = useMemo((): MenuProps["items"] => {
    const items: MenuProps["items"] = [
      { key: "profile", icon: <UserOutlined />, label: "Profile" },
    ];
    if (showSettings) {
      items.push({ key: "settings", icon: <SettingOutlined />, label: "Settings" });
    }
    items.push({ type: "divider" });
    items.push({ key: "logout", icon: <LogoutOutlined />, label: "Sign out", danger: true });
    return items;
  }, [showSettings]);

  const handleMenuClick: MenuProps["onClick"] = ({ key }) => {
    if (key === "profile" && profilePath) {
      router.push(profilePath);
      return;
    }
    if (key === "settings" && settingsPath) {
      router.push(settingsPath);
      return;
    }
    if (key === "logout") {
      setSigningOut(true);
      void signOut().catch(() => {
        setSigningOut(false);
      });
    }
  };

  const avatarSrc = profile?.avatar_url
    ? `${profile.avatar_url}${avatarBust ? `?v=${avatarBust}` : ""}`
    : undefined;

  return (
    <Header className="crm-header" style={{ height: headerTokens.height, lineHeight: `${headerTokens.height}px` }}>
      <div className="crm-header__search">{search}</div>

      <div className="crm-header__actions">
        {trailingSlot}
        <NotificationBell />
        <Dropdown
          menu={{ items: userMenuItems, onClick: handleMenuClick }}
          placement="bottomRight"
          disabled={signingOut}
          trigger={["click"]}
        >
          <button
            type="button"
            className="crm-header__user"
            disabled={signingOut}
            aria-label="Account menu"
          >
            <Avatar
              size={36}
              src={avatarSrc}
              icon={<UserOutlined />}
              style={{
                backgroundColor: avatarSrc ? "transparent" : avatarFallbackColor,
                flexShrink: 0,
              }}
            />
            <div className="crm-header__user-text">
              <span className="crm-header__user-name">{displayName}</span>
              <span className="crm-header__user-role" style={{ color: text.tertiary }}>
                {subLabel}
              </span>
            </div>
          </button>
        </Dropdown>
      </div>
    </Header>
  );
}
