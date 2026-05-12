"use client";

import { Layout, Tooltip } from "antd";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import {
  DashboardOutlined,
  TeamOutlined,
  ProjectOutlined,
  FileTextOutlined,
  BarChartOutlined,
  SettingOutlined,
  CustomerServiceOutlined,
  SendOutlined,
} from "@ant-design/icons";
import { useAuth } from "@/context/AuthContext";

const { Sider } = Layout;

/** Real App Router paths only — broken links here cause Next.js to prefetch 404 RSC routes and slow/hang first paint. */
const menuItems = [
  { key: "/sales/dashboard", icon: <DashboardOutlined />, label: "Dashboard", href: "/sales/dashboard" },
  { key: "/sales/contacts", icon: <TeamOutlined />, label: "Contacts", href: "/sales/contacts" },
  { key: "/sales/campaigns", icon: <SendOutlined />, label: "Campaigns", href: "/sales/campaigns" },
  { key: "/sales/deals", icon: <ProjectOutlined />, label: "Deals", href: "/sales/deals" },
  { key: "/sales/accounts", icon: <CustomerServiceOutlined />, label: "Companies", href: "/sales/accounts" },
  { key: "/sales/reports", icon: <BarChartOutlined />, label: "Reports", href: "/sales/reports" },
  { key: "/sales/activities", icon: <FileTextOutlined />, label: "Activities", href: "/sales/activities" },
  { key: "/sales/settings", icon: <SettingOutlined />, label: "Settings", href: "/sales/settings" },
];

function pickActiveMenuKey(pathname: string | null | undefined, items: { key: string }[]) {
  if (!pathname) return "/";
  const matches = items.filter(
    (item) => pathname === item.key || pathname.startsWith(`${item.key}/`)
  );
  if (!matches.length) return "/";
  return matches.reduce((best, cur) => (cur.key.length > best.key.length ? cur : best)).key;
}

export default function Sidebar() {
  const pathname = usePathname();
  const { hasRole } = useAuth();

  const isCommandCenterUser =
    hasRole("internal_operator") || hasRole("internal_admin") || hasRole("client_viewer");

  // On hard refresh, roles can hydrate one tick after `user` — without this we briefly render
  // the sales menu while already on `/dashboard/*`, and Next prefetches dead `/contacts`-style URLs.
  const onDashboardSection = Boolean(pathname?.startsWith("/dashboard"));

  const visibleMenuItems = isCommandCenterUser || onDashboardSection
    ? [
        { key: "/dashboard/overview", icon: <DashboardOutlined />, label: "Overview", href: "/dashboard/overview" },
        { key: "/dashboard/campaigns", icon: <SendOutlined />, label: "Campaigns", href: "/dashboard/campaigns" },
        { key: "/dashboard/leads", icon: <TeamOutlined />, label: "Leads", href: "/dashboard/leads" },
      ]
    : menuItems;

  const selectedKey = pickActiveMenuKey(pathname, visibleMenuItems);

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
          width={60}
          height={60}
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
        {visibleMenuItems.map((item) => {
          const active = selectedKey === item.key;
          return (
            <Tooltip key={item.key} title={item.label} placement="right">
              <Link
                href={item.href}
                prefetch={false}
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
                    background: active ? "#1677ff" : "#f3f4f6",
                    color: active ? "#ffffff" : "#4b5563",
                    boxShadow: active
                      ? "0 6px 14px rgba(22,119,255,0.28)"
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
