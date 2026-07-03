"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";
import {
  BarChartOutlined,
  BellOutlined,
  DashboardOutlined,
  DollarOutlined,
  SolutionOutlined,
  FundProjectionScreenOutlined,
  HistoryOutlined,
  TeamOutlined,
  DatabaseOutlined,
} from "@ant-design/icons";
import { useAuth } from "@/context/AuthContext";
import CrmSidebar, { type CrmSidebarItem } from "@/components/shared/CrmSidebar";
import { resolveSidebarSelectedKey } from "@/lib/sidebar-utils";

const tlDashboardItem: CrmSidebarItem = {
  key: "/tl/dashboard",
  icon: <DashboardOutlined />,
  label: "Dashboard",
  href: "/tl/dashboard",
};

/** OM org-wide tools — mirrors admin OM section, on /tl routes. */
const omInsightMenuItems: CrmSidebarItem[] = [
  {
    key: "/tl/team-performance",
    icon: <BarChartOutlined />,
    label: "Performance",
    href: "/tl/team-performance",
  },
  {
    key: "/tl/revenue-report",
    icon: <DollarOutlined />,
    label: "Revenue",
    href: "/tl/revenue-report",
  },
  { key: "/tl/team", icon: <TeamOutlined />, label: "Team", href: "/tl/team" },
  {
    key: "/tl/campaigns",
    icon: <FundProjectionScreenOutlined />,
    label: "Campaigns",
    href: "/tl/campaigns",
  },
  {
    key: "/tl/announcements",
    icon: <BellOutlined />,
    label: "Announcements",
    href: "/tl/announcements",
  },
  { key: "/tl/leads", icon: <SolutionOutlined />, label: "Leads", href: "/tl/leads" },
];

const checkDataMenuItem: CrmSidebarItem = {
  key: "/tl/check-data",
  icon: <DatabaseOutlined />,
  label: "Check Data",
  href: "/tl/check-data",
};

const tlCampaignLeaderItems: CrmSidebarItem[] = [
  tlDashboardItem,
  {
    key: "/tl/campaigns",
    icon: <FundProjectionScreenOutlined />,
    label: "Campaigns",
    href: "/tl/campaigns",
  },
  {
    key: "/tl/announcements",
    icon: <BellOutlined />,
    label: "Announcements",
    href: "/tl/announcements",
  },
  { key: "/tl/leads", icon: <SolutionOutlined />, label: "Leads", href: "/tl/leads" },
  { key: "/tl/team", icon: <TeamOutlined />, label: "Team", href: "/tl/team" },
  {
    key: "/tl/team-performance",
    icon: <BarChartOutlined />,
    label: "Performance",
    href: "/tl/team-performance",
  },
  {
    key: "/tl/lead-transfer-history",
    icon: <HistoryOutlined />,
    label: "Transfers",
    href: "/tl/lead-transfer-history",
  },
];

const omRevenueOnly: CrmSidebarItem[] = [
  {
    key: "/tl/revenue-report",
    icon: <DollarOutlined />,
    label: "Revenue",
    href: "/tl/revenue-report",
  },
];

export default function TLSidebar() {
  const pathname = usePathname();
  const { hasRole } = useAuth();
  const isOm = hasRole("operations_manager");
  const isCampaignTl = hasRole("team_leader") || hasRole("tl");

  const sections = useMemo(() => {
    const withCheckData = (items: CrmSidebarItem[]) =>
      isOm ? [...items, checkDataMenuItem] : items;

    if (isOm && !isCampaignTl) {
      return [[tlDashboardItem], withCheckData(omInsightMenuItems)];
    }
    if (isOm && isCampaignTl) {
      return [withCheckData(tlCampaignLeaderItems), omRevenueOnly];
    }
    if (isCampaignTl) {
      return [tlCampaignLeaderItems];
    }
    return [[tlDashboardItem], omInsightMenuItems];
  }, [isOm, isCampaignTl]);

  const allItems = useMemo(() => sections.flat(), [sections]);

  const selectedKey = resolveSidebarSelectedKey(pathname, allItems, "/tl/dashboard");

  return <CrmSidebar sections={sections} selectedKey={selectedKey} />;
}
