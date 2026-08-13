import type { Metadata } from "next";
import "@/app/globals.css";

export const metadata: Metadata = {
  title: "灯塔 · 抖音账号观测",
  description: "内部抖音公开账号周度数据观测台",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
