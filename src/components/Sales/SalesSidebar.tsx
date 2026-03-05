"use client";

import { Layout, Menu } from "antd";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { DollarOutlined, FundProjectionScreenOutlined, TeamOutlined } from "@ant-design/icons";

const { Sider } = Layout;

const menuItems = [
  { key: "/sales", icon: <DollarOutlined />, label: "Sales Dashboard", href: "/sales" },
  { key: "/sales/clients", icon: <TeamOutlined />, label: "Clients", href: "/sales/clients" },
  { key: "/sales/campaigns", icon: <FundProjectionScreenOutlined />, label: "Campaign", href: "/sales/campaigns" },
];

export default function SalesSidebar() {
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
          selectedKeys={
            pathname?.startsWith("/sales/campaigns")
              ? ["/sales/campaigns"]
              : pathname?.startsWith("/sales/clients")
                ? ["/sales/clients"]
                : [pathname || "/sales"]
          }
          mode="inline"
          items={menuItems.map((item) => ({
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
