import {
  BarChart3,
  Bookmark,
  CircleGauge,
  Clapperboard,
  Heart,
  MessageCircle,
  Settings2,
  Share2,
  Users,
} from "lucide-react";
import type { ComponentType } from "react";
import type { DashboardView, MetricDataKey, MetricKey } from "@/features/dashboard/types";

export const dashboardNavigation: Array<{
  id: DashboardView;
  label: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
}> = [
  { id: "overview", label: "总览", description: "关键指标", icon: CircleGauge },
  { id: "trends", label: "趋势", description: "分析变化", icon: BarChart3 },
  { id: "accounts", label: "账号", description: "跟踪配置", icon: Users },
  { id: "videos", label: "视频", description: "指标明细", icon: Clapperboard },
  { id: "system", label: "系统", description: "采集与运行", icon: Settings2 },
];

export const dashboardTitles: Record<DashboardView, [string, string]> = {
  overview: ["数据总览", "查看当前规模、数据质量和表现最好的视频"],
  trends: ["趋势分析", "按采集日期对比四项指标，并比较视频与账号表现"],
  accounts: ["跟踪账号", "添加、暂停或移除公开账号"],
  videos: ["视频明细", "搜索、筛选和排序最近 90 天的视频"],
  system: ["采集系统", "启动采集并检查任务运行情况和异常记录"],
};

export const metricDefinitions: Array<{
  key: MetricKey;
  dataKey: MetricDataKey;
  label: string;
  icon: ComponentType<{ className?: string }>;
  help: string;
}> = [
  { key: "like", dataKey: "likes", label: "点赞", icon: Heart, help: "最新快照中的点赞总数" },
  { key: "collect", dataKey: "collects", label: "收藏", icon: Bookmark, help: "最新快照中的收藏总数" },
  { key: "comment", dataKey: "comments", label: "评论", icon: MessageCircle, help: "最新快照中的评论总数" },
  {
    key: "share",
    dataKey: "shares",
    label: "可见分享",
    icon: Share2,
    help: "页面公开展示的分享数，不等同于全部传播次数",
  },
];

export const metricByDataKey = new Map(metricDefinitions.map((metric) => [metric.dataKey, metric]));
