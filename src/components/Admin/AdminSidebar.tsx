"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";
import {
  BarChartOutlined,
  DashboardOutlined,
  DollarOutlined,
  SolutionOutlined,
  FundProjectionScreenOutlined,
  SettingOutlined,
  SafetyCertificateOutlined,
  TeamOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { useAuth } from "@/context/AuthContext";
import CrmSidebar, { type CrmSidebarItem } from "@/components/shared/CrmSidebar";
import { resolveSidebarSelectedKey } from "@/lib/sidebar-utils";

const adminMenuItems: CrmSidebarItem[] = [
  { key: "/admin/dashboard", icon: <DashboardOutlined />, label: "Dashboard", href: "/admin/dashboard" },
  { key: "/admin/sales", icon: <DollarOutlined />, label: "Sales", href: "/admin/sales" },
  { key: "/admin/users", icon: <UserOutlined />, label: "Users", href: "/admin/users" },
  { key: "/admin/roles", icon: <SafetyCertificateOutlined />, label: "Roles", href: "/admin/roles" },
  { key: "/admin/settings", icon: <SettingOutlined />, label: "Settings", href: "/admin/settings" },
];

const omMenuItems: CrmSidebarItem[] = [
  { key: "/admin/team-performance", icon: <BarChartOutlined />, label: "Performance", href: "/admin/team-performance" },
  { key: "/admin/revenue-report", icon: <DollarOutlined />, label: "Revenue", href: "/admin/revenue-report" },
  { key: "/admin/team", icon: <TeamOutlined />, label: "Team", href: "/admin/team" },
  { key: "/admin/campaigns", icon: <FundProjectionScreenOutlined />, label: "Campaigns", href: "/admin/campaigns" },
  { key: "/admin/leads", icon: <SolutionOutlined />, label: "Leads", href: "/admin/leads" },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const { hasRole } = useAuth();
  const showOmNav = hasRole("operations_manager") || hasRole("admin");

  const sections = useMemo(
    () => (showOmNav ? [adminMenuItems, omMenuItems] : [adminMenuItems]),
    [showOmNav]
  );

  const allItems = useMemo(
    () => (showOmNav ? [...adminMenuItems, ...omMenuItems] : adminMenuItems),
    [showOmNav]
  );

  const selectedKey = resolveSidebarSelectedKey(pathname, allItems, "/admin/dashboard");

  return (
    <CrmSidebar
      sections={sections}
      selectedKey={selectedKey}
      siderClassName="admin-sidebar-sider"
    />
  );
}
