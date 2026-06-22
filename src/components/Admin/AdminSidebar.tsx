"use client";

import { Layout, Tooltip } from "antd";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import {
  BarChartOutlined,
  DashboardOutlined,
  DollarOutlined,
  FileSearchOutlined,
  FundProjectionScreenOutlined,
  SettingOutlined,
  SafetyCertificateOutlined,
  TeamOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { useAuth } from "@/context/AuthContext";

const { Sider } = Layout;

const adminMenuItems = [
  { key: "/admin/dashboard", icon: <DashboardOutlined />, label: "Dashboard", href: "/admin/dashboard" },
  { key: "/admin/sales", icon: <DollarOutlined />, label: "Sales", href: "/admin/sales" },
  { key: "/admin/users", icon: <UserOutlined />, label: "Users", href: "/admin/users" },
  { key: "/admin/roles", icon: <SafetyCertificateOutlined />, label: "Roles", href: "/admin/roles" },
  { key: "/admin/settings", icon: <SettingOutlined />, label: "Settings", href: "/admin/settings" },
];

const omMenuItems = [
  { key: "/admin/team-performance", icon: <BarChartOutlined />, label: "Performance", href: "/admin/team-performance" },
  { key: "/admin/revenue-report", icon: <DollarOutlined />, label: "Revenue", href: "/admin/revenue-report" },
  { key: "/admin/team", icon: <TeamOutlined />, label: "Team", href: "/admin/team" },
  { key: "/admin/campaigns", icon: <FundProjectionScreenOutlined />, label: "Campaigns", href: "/admin/campaigns" },
  { key: "/admin/leads", icon: <FileSearchOutlined />, label: "Leads", href: "/admin/leads" },
];

function resolveSelectedKey(pathname: string | null) {
  if (!pathname) return "/admin/dashboard";

  const allItems = [...adminMenuItems, ...omMenuItems];
  const match = allItems
    .filter((item) => pathname === item.key || pathname.startsWith(`${item.key}/`))
    .sort((a, b) => b.key.length - a.key.length)[0];

  return match?.key ?? "/admin/dashboard";
}

export default function AdminSidebar() {
  const pathname = usePathname();
  const { hasRole } = useAuth();
  const showOmNav = hasRole("operations_manager") || hasRole("admin");
  const selectedKey = resolveSelectedKey(pathname);
  const menuItems = showOmNav ? [...adminMenuItems, ...omMenuItems] : adminMenuItems;

  return (
    <Sider
      width={92}
      theme="light"
      className="admin-sidebar-sider"
      style={{
        position: "fixed",
        insetInlineStart: 0,
        top: 0,
        bottom: 0,
        height: "100vh",
        zIndex: 100,
        overflow: "hidden",
        background: "#ffffff",
        borderRight: "1px solid rgba(0,0,0,0.06)",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          height: "100%",
          overflow: "hidden",
          padding: "16px 0",
        }}
      >
        <div
          style={{
            flexShrink: 0,
            height: 52,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 8,
          }}
        >
          <Image
            src="/projects/sidebar_logo.png"
            alt="Gandiv"
            width={50}
            height={50}
            style={{ objectFit: "contain" }}
            priority
          />
        </div>
        <div
          className="admin-sidebar-nav"
          style={{
            flex: 1,
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            paddingTop: 8,
            paddingBottom: 16,
            gap: 16,
            overflowY: "auto",
            overflowX: "hidden",
            width: "100%",
          }}
        >
          {menuItems.map((item) => {
            const active = selectedKey === item.key;
            const isOmSectionStart = showOmNav && item.key === omMenuItems[0]?.key;

            return (
              <div key={item.key} style={{ display: "contents" }}>
                {isOmSectionStart && (
                  <div
                    style={{
                      width: 48,
                      height: 1,
                      background: "rgba(0,0,0,0.08)",
                      flexShrink: 0,
                    }}
                  />
                )}
                <Tooltip title={item.label} placement="right">
                  <Link
                    href={item.href}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                      width: 64,
                      padding: "6px 4px",
                      borderRadius: 14,
                      textDecoration: "none",
                      background: active ? "#eff6ff" : "transparent",
                      transition: "all 0.18s ease",
                      cursor: "pointer",
                      flexShrink: 0,
                    }}
                  >
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: "999px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: active ? "#4f46e5" : "#f3f4f6",
                        color: active ? "#ffffff" : "#4b5563",
                        boxShadow: active ? "0 6px 14px rgba(79,70,229,0.28)" : "none",
                        fontSize: 20,
                      }}
                    >
                      {item.icon}
                    </div>
                    <span
                      style={{
                        fontSize: 10,
                        lineHeight: 1.2,
                        color: active ? "#0f172a" : "#6b7280",
                        fontWeight: active ? 600 : 500,
                        textAlign: "center",
                        maxWidth: 72,
                        whiteSpace: "normal",
                        wordBreak: "break-word",
                      }}
                    >
                      {item.label}
                    </span>
                  </Link>
                </Tooltip>
              </div>
            );
          })}
        </div>
      </div>
    </Sider>
  );
}
