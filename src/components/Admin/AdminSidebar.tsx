"use client";

import { Layout, Menu } from "antd";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  DashboardOutlined,
  UserOutlined,
  TeamOutlined,
  SettingOutlined,
  SafetyCertificateOutlined,
  DollarOutlined,
} from "@ant-design/icons";

const { Sider } = Layout;

const adminMenuItems = [
  { key: "/admin/dashboard", icon: <DashboardOutlined />, label: "Dashboard", href: "/admin/dashboard" },
  { key: "/admin/sales", icon: <DollarOutlined />, label: "Sales", href: "/admin/sales" },
  { key: "/admin/users", icon: <UserOutlined />, label: "User Management", href: "/admin/users" },
  { key: "/admin/roles", icon: <SafetyCertificateOutlined />, label: "Roles", href: "/admin/roles" },
  { key: "/admin/organizations", icon: <TeamOutlined />, label: "Organizations", href: "/admin/organizations" },
  { key: "/admin/settings", icon: <SettingOutlined />, label: "Settings", href: "/admin/settings" },
];

export default function AdminSidebar() {
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
          Admin Panel
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
          selectedKeys={[pathname || "/admin/dashboard"]}
          mode="inline"
          items={adminMenuItems.map((item) => ({
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
