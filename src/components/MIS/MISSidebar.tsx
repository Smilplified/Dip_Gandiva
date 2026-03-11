"use client";

import { Layout, Menu } from "antd";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import {
  DashboardOutlined,
  TeamOutlined,
  AppstoreOutlined,
  CloudUploadOutlined,
  DatabaseOutlined,
  BarChartOutlined,
} from "@ant-design/icons";

const { Sider } = Layout;

const misMenuItems = [
  { key: "/mis/dashboard", icon: <DashboardOutlined />, label: "Dashboard", href: "/mis/dashboard" },
  {
    key: "/mis/campaigns",
    icon: <AppstoreOutlined />,
    label: "Campaign Management",
    href: "/mis/campaigns",
  },
  {
    key: "/mis/lead-upload",
    icon: <CloudUploadOutlined />,
    label: "Lead Upload",
    href: "/mis/lead-upload",
  },
  {
    key: "/mis/leads",
    icon: <DatabaseOutlined />,
    label: "Lead Database",
    href: "/mis/leads",
  },
  {
    key: "/mis/reports",
    icon: <BarChartOutlined />,
    label: "Reports & Analytics",
    href: "/mis/reports",
  },
];

export default function MISSidebar() {
  const pathname = usePathname();

  const selectedKey =
    pathname?.startsWith("/mis/campaigns")
      ? "/mis/campaigns"
      : pathname?.startsWith("/mis/lead-upload")
      ? "/mis/lead-upload"
      : pathname?.startsWith("/mis/leads")
      ? "/mis/leads"
      : pathname?.startsWith("/mis/reports")
      ? "/mis/reports"
      : "/mis/dashboard";

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
          selectedKeys={[selectedKey]}
          mode="inline"
          items={misMenuItems.map((item) => ({
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

