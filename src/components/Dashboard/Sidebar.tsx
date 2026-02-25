"use client";

import { Layout, Menu } from "antd";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
  { key: "/", icon: <DashboardOutlined />, label: "Dashboard", href: "/" },
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
          Gandiv CRM
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
          selectedKeys={[pathname || "/"]}
          mode="inline"
          items={menuItems.map((item) => ({
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
