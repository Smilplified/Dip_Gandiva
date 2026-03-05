"use client";

import { Layout, Menu } from "antd";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
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
      theme="light"
      breakpoint="lg"
      collapsedWidth="0"
      style={{
        minHeight: "100vh",
        height: "100vh",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        background: "#ffffff",
        borderRight: "1px solid rgba(0,0,0,0.06)",
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
          borderBottom: "1px solid rgba(0,0,0,0.06)",
          background: "#ffffff",
        }}
      >
        <Image
          src="/projects/gandiva_logo.png"
          alt="Gandiv CRM"
          width={190}
          height={48}
          style={{ objectFit: "contain", maxWidth: "100%" }}
          priority
        />
      </div>
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          overflowX: "hidden",
        }}
      >
        <Menu
          theme="light"
          selectedKeys={[pathname || "/admin/dashboard"]}
          mode="inline"
          items={adminMenuItems.map((item) => ({
            key: item.key,
            icon: item.icon,
            label: <Link href={item.href}>{item.label}</Link>,
          }))}
          style={{ marginTop: 16, border: "none", background: "#ffffff" }}
        />
      </div>
    </Sider>
  );
}
