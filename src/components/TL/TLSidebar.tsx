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
  HistoryOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import { useAuth } from "@/context/AuthContext";

const { Sider } = Layout;

const tlMenuItems = [
  { key: "/tl/dashboard", icon: <DashboardOutlined />, label: "Dashboard", href: "/tl/dashboard" },
  { key: "/tl/campaigns", icon: <FundProjectionScreenOutlined />, label: "Campaigns", href: "/tl/campaigns" },
  { key: "/tl/leads", icon: <FileSearchOutlined />, label: "Leads", href: "/tl/leads" },
  { key: "/tl/team", icon: <TeamOutlined />, label: "Team", href: "/tl/team" },
  { key: "/tl/team-performance", icon: <BarChartOutlined />, label: "Performance", href: "/tl/team-performance" },
  { key: "/tl/lead-transfer-history", icon: <HistoryOutlined />, label: "Transfers", href: "/tl/lead-transfer-history" },
];

const omMenuItems = [
  {
    key: "/tl/revenue-report",
    icon: <DollarOutlined />,
    label: "Revenue",
    href: "/tl/revenue-report",
  },
];

export default function TLSidebar() {
  const pathname = usePathname();
  const { hasRole } = useAuth();
  const isOm = hasRole("operations_manager");
  const isCampaignTl = hasRole("team_leader") || hasRole("tl");
  const baseTlItems = isCampaignTl
    ? tlMenuItems
    : tlMenuItems.filter((i) => i.key !== "/tl/lead-transfer-history");
  const menuItems = isOm
    ? [...baseTlItems, ...omMenuItems]
    : baseTlItems;

  const selectedKey =
    pathname?.startsWith("/tl/revenue-report")
      ? "/tl/revenue-report"
      : pathname?.startsWith("/tl/lead-transfer-history")
      ? "/tl/lead-transfer-history"
      : pathname?.startsWith("/tl/team-performance")
      ? "/tl/team-performance"
      : pathname?.startsWith("/tl/campaigns")
      ? "/tl/campaigns"
      : pathname?.startsWith("/tl/team")
      ? "/tl/team"
      : pathname?.startsWith("/tl/leads")
      ? "/tl/leads"
      : "/tl/dashboard";

  return (
    <Sider
      width={92}
      theme="light"
      style={{
        position: "fixed",
        insetInlineStart: 0,
        top: 0,
        bottom: 0,
        zIndex: 100,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "16px 0",
        background: "#ffffff",
        borderRight: "1px solid rgba(0,0,0,0.06)",
      }}
    >
      <div
        style={{
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
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "flex-start",
          paddingTop: 16,
          gap: 20,
        }}
      >
        {menuItems.map((item) => {
          const active = selectedKey === item.key;
          return (
            <Tooltip key={item.key} title={item.label} placement="right">
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
                    boxShadow: active
                      ? "0 6px 14px rgba(79,70,229,0.28)"
                      : "none",
                    fontSize: 20,
                  }}
                >
                  {item.icon}
                </div>
                <span
                  style={{
                    fontSize: 11,
                    lineHeight: 1.1,
                    color: active ? "#0f172a" : "#6b7280",
                    fontWeight: active ? 600 : 500,
                    textAlign: "center",
                    maxWidth: "100%",
                    whiteSpace: "nowrap",
                  }}
                >
                  {item.label}
                </span>
              </Link>
            </Tooltip>
          );
        })}
      </div>
    </Sider>
  );
}
