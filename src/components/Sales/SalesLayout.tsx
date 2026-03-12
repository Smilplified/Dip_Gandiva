"use client";

import { Layout } from "antd";
import SalesSidebar from "./SalesSidebar";
import SalesHeader from "./SalesHeader";

const { Content } = Layout;

interface SalesLayoutProps {
  children: React.ReactNode;
}

export default function SalesLayout({ children }: SalesLayoutProps) {
  return (
    <Layout style={{ height: "100vh", overflow: "hidden" }}>
      <SalesSidebar />
      <Layout
        style={{
          flex: 1,
          minWidth: 0,
          height: "100vh",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          marginLeft: 92,
        }}
      >
        <SalesHeader />
        <Content
          style={{
            flex: 1,
            margin: "24px",
            padding: 24,
            overflowY: "auto",
            overflowX: "auto",
            minWidth: 0,
            background: "#f5f5f5",
            borderRadius: 12,
          }}
        >
          {children}
        </Content>
      </Layout>
    </Layout>
  );
}
