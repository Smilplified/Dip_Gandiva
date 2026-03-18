"use client";

import { Layout, Tooltip } from "antd";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import {
  DollarOutlined,
  FundProjectionScreenOutlined,
  TeamOutlined,
  UserOutlined,
  ApartmentOutlined,
  ProjectOutlined,
  ScheduleOutlined,
  BarChartOutlined,
  SettingOutlined,
} from "@ant-design/icons";

const { Sider } = Layout;

const menuItems = [
  { key: "/sales", icon: <DollarOutlined />, label: "Dashboard", href: "/sales" },
  { key: "/sales/clients", icon: <TeamOutlined />, label: "Clients", href: "/sales/clients" },
  { key: "/sales/campaigns", icon: <FundProjectionScreenOutlined />, label: "Campaigns", href: "/sales/campaigns" },
  { key: "/sales/leads", icon: <UserOutlined />, label: "Leads", href: "/sales/leads" },
  { key: "/sales/contacts", icon: <TeamOutlined />, label: "Contacts", href: "/sales/contacts" },
  { key: "/sales/accounts", icon: <ApartmentOutlined />, label: "Accounts", href: "/sales/accounts" },
  { key: "/sales/deals", icon: <ProjectOutlined />, label: "Deals ", href: "/sales/deals" },
  { key: "/sales/activities", icon: <ScheduleOutlined />, label: "Activities", href: "/sales/activities" },
  { key: "/sales/tasks", icon: <ScheduleOutlined />, label: "Follow-ups", href: "/sales/tasks" },
  { key: "/sales/reports", icon: <BarChartOutlined />, label: "Reports", href: "/sales/reports" },
  { key: "/sales/settings", icon: <SettingOutlined />, label: "Settings", href: "/sales/settings" },
];

export default function SalesSidebar() {
  const pathname = usePathname();

  const selectedKey = (() => {
    if (!pathname) return "/sales";
    // Prefer the most specific (longest) matching prefix, so /sales/leads wins over /sales
    const match = menuItems
      .filter(
        (item) =>
          pathname === item.key || pathname.startsWith(item.key + "/")
      )
      .sort((a, b) => b.key.length - a.key.length)[0];
    return match?.key ?? "/sales";
  })();

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
        overflow: "hidden",
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
          paddingBottom: 16,
          overflowY: "auto",
          overflowX: "hidden",
          maxHeight: "calc(100vh - 52px - 32px)",
          scrollbarWidth: "thin",
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
