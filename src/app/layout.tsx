import type { Metadata } from "next";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import { ConfigProvider } from "antd";
import { AuthProvider } from "@/context/AuthContext";
import "./globals.css";

const theme = {
  token: {
    colorPrimary: "#1677ff",
    borderRadius: 8,
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  },
  components: {
    Layout: {
      headerBg: "#ffffff",
      siderBg: "#001529",
      bodyBg: "#f5f5f5",
    },
  },
};

export const metadata: Metadata = {
  title: "CRM Dashboard | Professional Pipeline Management",
  description: "Clean and professional CRM dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>
        <AntdRegistry>
          <ConfigProvider theme={theme}>
            <AuthProvider>{children}</AuthProvider>
          </ConfigProvider>
        </AntdRegistry>
      </body>
    </html>
  );
}
