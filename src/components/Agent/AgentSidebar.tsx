"use client";

import { Layout, Menu } from "antd";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  DashboardOutlined,
  FundProjectionScreenOutlined,
  UserOutlined,
} from "@ant-design/icons";

const { Sider } = Layout;

const agentMenuItems = [
  { key: "/agent/dashboard", icon: <DashboardOutlined />, label: "Dashboard", href: "/agent/dashboard" },
  { key: "/agent/campaigns", icon: <FundProjectionScreenOutlined />, label: "My Campaigns", href: "/agent/campaigns" },
  { key: "/agent/leads", icon: <UserOutlined />, label: "My Leads", href: "/agent/leads" },
];

export default function AgentSidebar() {
  const pathname = usePathname();

  const selectedKey = pathname?.startsWith("/agent/leads")
    ? "/agent/leads"
    : pathname?.startsWith("/agent/campaigns")
      ? "/agent/campaigns"
      : "/agent/dashboard";

  return (
    <Sider
      width={240}
      theme="dark"
      breakpoint="lg"
      collapsedWidth="0"
      style={{
        minHeight: "100vh",
        height: "100vh",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          height: 64,
          minHeight: 64,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          padding: "0 24px",
          borderBottom: "1px solid rgba(255,255,255,0.1)",
        }}
      >
        <span
          style={{
            color: "#fff",
            fontSize: 20,
            fontWeight: 700,
            letterSpacing: "-0.5px",
          }}
        >
          Agent
        </span>
      </div>
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          overflowX: "hidden",
        }}
      >
        <Menu
          theme="dark"
          selectedKeys={[selectedKey]}
          mode="inline"
          items={agentMenuItems.map((item) => ({
            key: item.key,
            icon: item.icon,
            label: <Link href={item.href}>{item.label}</Link>,
          }))}
          style={{ marginTop: 16, border: "none" }}
        />
      </div>
    </Sider>
  );
}

