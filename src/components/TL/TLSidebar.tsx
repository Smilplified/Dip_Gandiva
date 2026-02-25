"use client";

import { Layout, Menu } from "antd";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  DashboardOutlined,
  TeamOutlined,
  FilterOutlined,
  FundProjectionScreenOutlined,
  UserOutlined,
} from "@ant-design/icons";

const { Sider } = Layout;

const tlMenuItems = [
  { key: "/tl/dashboard", icon: <DashboardOutlined />, label: "Dashboard", href: "/tl/dashboard" },
  { key: "/tl/campaigns", icon: <FundProjectionScreenOutlined />, label: "Campaigns", href: "/tl/campaigns" },
  { key: "/tl/users", icon: <UserOutlined />, label: "User Management", href: "/tl/users" },
  { key: "/tl/team", icon: <TeamOutlined />, label: "Team", href: "/tl/team" },
  { key: "/tl/pipeline", icon: <FilterOutlined />, label: "Pipeline", href: "/tl/pipeline" },
];

export default function TLSidebar() {
  const pathname = usePathname();

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
          Team Leader
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
          selectedKeys={[
            pathname?.startsWith("/tl/campaigns") ? "/tl/campaigns" :
            pathname?.startsWith("/tl/users") ? "/tl/users" :
            (pathname || "/tl/dashboard"),
          ]}
          mode="inline"
          items={tlMenuItems.map((item) => ({
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
