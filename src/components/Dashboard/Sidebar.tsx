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

const { Sider } = Layout;

const menuItems = [
  { key: "/sales", icon: <DashboardOutlined />, label: "Dashboard", href: "/sales" },
  { key: "/contacts", icon: <TeamOutlined />, label: "Contacts", href: "/contacts" },
  { key: "/campaigns", icon: <SendOutlined />, label: "Campaigns", href: "/campaigns" },
  { key: "/deals", icon: <ProjectOutlined />, label: "Deals", href: "/deals" },
  { key: "/companies", icon: <CustomerServiceOutlined />, label: "Companies", href: "/companies" },
  { key: "/reports", icon: <BarChartOutlined />, label: "Reports", href: "/reports" },
  { key: "/documents", icon: <FileTextOutlined />, label: "Documents", href: "/documents" },
  { key: "/settings", icon: <SettingOutlined />, label: "Settings", href: "/settings" },
];

export default function Sidebar() {
  const pathname = usePathname();

  const selectedKey =
    menuItems.find((item) => pathname?.startsWith(item.key))?.key || "/";

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
