"use client";

import { Layout, Menu } from "antd";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { DollarOutlined, FundProjectionScreenOutlined } from "@ant-design/icons";

const { Sider } = Layout;

const menuItems = [
  { key: "/sales", icon: <DollarOutlined />, label: "Sales Dashboard", href: "/sales" },
  { key: "/sales/campaigns", icon: <FundProjectionScreenOutlined />, label: "Campaign", href: "/sales/campaigns" },
];

export default function SalesSidebar() {
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
          Sales
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
          selectedKeys={pathname?.startsWith("/sales/campaigns") ? ["/sales/campaigns"] : [pathname || "/sales"]}
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
