"use client";

import { useMemo, useRef, useState, type ComponentType, type ReactNode } from "react";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Bookmark,
  ChevronDown,
  ChevronsUpDown,
  CircleGauge,
  Clapperboard,
  Download,
  ExternalLink,
  Heart,
  Info,
  LogOut,
  MessageCircle,
  Plus,
  Power,
  RefreshCw,
  Search,
  Settings2,
  Share2,
  Trash2,
  TriangleAlert,
  Trophy,
  Users,
} from "lucide-react";
import {
  addAccountAction,
  deleteAccountAction,
  logoutAction,
  toggleAccountAction,
  triggerCollectorAction,
} from "@/app/actions";
import {
  HistoryChart,
  VideoRankingChart,
  metricChartConfig,
  type MetricDataKey,
} from "@/components/dashboard-charts";
import { DataTablePagination, DEFAULT_PAGE_SIZE } from "@/components/data-table-pagination";
import { StatusBadge } from "@/components/status-badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { MetricKey } from "@/lib/queries";
import { formatCompact, formatDate, formatDelta, formatNumber } from "@/lib/utils";

type View = "overview" | "trends" | "accounts" | "videos" | "system";
type Row = Record<string, number | string | null>;
type Trend = {
  date: string;
  accountId: number;
  videoId: number;
  publishedAt: string;
  likes: number;
  collects: number;
  comments: number;
  shares: number;
};
type SortKey = MetricDataKey | "publishedAt";
type Summary = {
  enabledAccounts: number;
  trackedVideos: number;
  newVideos: number;
  latestRunStatus: string;
  latestRunAt: string | null;
  successRate: number;
  hasComparison: boolean;
  deltas: Record<MetricKey, number>;
};

const navigation: Array<{
  id: View;
  label: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
}> = [
  { id: "overview", label: "总览", description: "关键指标", icon: CircleGauge },
  { id: "trends", label: "趋势", description: "分析变化", icon: BarChart3 },
  { id: "accounts", label: "账号", description: "跟踪配置", icon: Users },
  { id: "videos", label: "视频", description: "指标明细", icon: Clapperboard },
  { id: "system", label: "系统", description: "运行状态", icon: Settings2 },
];

const metrics = [
  {
    key: "like" as const,
    dataKey: "likes" as const,
    label: "点赞",
    icon: Heart,
    help: "最新快照中的点赞总数",
  },
  {
    key: "collect" as const,
    dataKey: "collects" as const,
    label: "收藏",
    icon: Bookmark,
    help: "最新快照中的收藏总数",
  },
  {
    key: "comment" as const,
    dataKey: "comments" as const,
    label: "评论",
    icon: MessageCircle,
    help: "最新快照中的评论总数",
  },
  {
    key: "share" as const,
    dataKey: "shares" as const,
    label: "可见分享",
    icon: Share2,
    help: "页面公开展示的分享数，不等同于全部传播次数",
  },
];

const metricByDataKey = new Map(metrics.map((metric) => [metric.dataKey, metric]));

function daysSince(date: string | null) {
  if (!date) return Number.POSITIVE_INFINITY;
  return Math.floor((Date.now() - new Date(date).getTime()) / 86_400_000);
}

function toVideoPoint(video: Row) {
  return {
    id: Number(video.id),
    title: String(video.title ?? "未命名视频").replace(/^.+?[：:]/, ""),
    accountName: String(video.accountName ?? "未知账号"),
    publishedAt: String(video.publishedAt ?? ""),
    likes: Number(video.likes ?? 0),
    collects: Number(video.collects ?? 0),
    comments: Number(video.comments ?? 0),
    shares: Number(video.shares ?? 0),
  };
}

function TextWithTooltip({ children, className }: { children: string; className?: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={className}>{children}</span>
      </TooltipTrigger>
      <TooltipContent className="max-w-sm whitespace-normal">{children}</TooltipContent>
    </Tooltip>
  );
}

function InfoTooltip({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button type="button" aria-label={label} className="text-muted-foreground hover:text-foreground">
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

function AccountBadge({ name }: { name: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge variant="secondary" className="max-w-44 truncate font-normal">
          {name}
        </Badge>
      </TooltipTrigger>
      <TooltipContent>{name}</TooltipContent>
    </Tooltip>
  );
}

function MetricValue({ value, label }: { value: number | null; label: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="cursor-default font-mono tabular-nums">{formatNumber(value)}</span>
      </TooltipTrigger>
      <TooltipContent>
        {label}：{Number(value ?? 0).toLocaleString("zh-CN")}
      </TooltipContent>
    </Tooltip>
  );
}

function Rail({ view, setView, username }: { view: View; setView: (view: View) => void; username: string }) {
  return (
    <aside className="flex h-screen w-60 shrink-0 flex-col border-r bg-muted/20 p-6">
      <div className="flex items-center gap-2 px-2 py-2">
        <div className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <Activity className="size-4" />
        </div>
        <div className="min-w-0">
          <p className="font-semibold leading-none">灯塔</p>
          <p className="mt-1 text-xs text-muted-foreground">抖音账号观测</p>
        </div>
      </div>
      <Separator className="my-4" />
      <nav className="space-y-1">
        {navigation.map(({ id, label, description, icon: Icon }) => (
          <Button
            type="button"
            variant={view === id ? "secondary" : "ghost"}
            className="h-10 w-full justify-start px-3"
            onClick={() => setView(id)}
            key={id}
          >
            <Icon className="size-4" />
            <span>{label}</span>
            <span className="ml-auto text-xs font-normal text-muted-foreground">{description}</span>
          </Button>
        ))}
      </nav>
      <div className="mt-auto">
        <Separator className="mb-4" />
        <div className="mb-2 flex min-w-0 items-center gap-3 px-2">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
            {username.slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0">
            <TextWithTooltip className="block truncate text-sm font-medium">{username}</TextWithTooltip>
            <p className="text-xs text-muted-foreground">内部账号</p>
          </div>
        </div>
        <form action={logoutAction}>
          <Button variant="ghost" size="sm" className="w-full justify-start">
            <LogOut />
            退出登录
          </Button>
        </form>
      </div>
    </aside>
  );
}

function PageHeader({ view, lastRun }: { view: View; lastRun: string | null }) {
  const titles: Record<View, [string, string]> = {
    overview: ["数据总览", "查看当前规模、数据质量和表现最好的视频"],
    trends: ["趋势分析", "按账号、发布时间和指标比较视频表现"],
    accounts: ["跟踪账号", "添加、暂停或移除公开账号"],
    videos: ["视频明细", "搜索、筛选和排序最近 90 天的视频"],
    system: ["采集系统", "检查任务运行情况和异常记录"],
  };
  return (
    <header className="flex h-[72px] items-center justify-between border-b px-6">
      <div className="min-w-0">
        <h1 className="text-lg font-semibold tracking-tight">{titles[view][0]}</h1>
        <p className="truncate text-sm text-muted-foreground">{titles[view][1]}</p>
      </div>
      <div className="flex items-center gap-4">
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="text-xs text-muted-foreground">最近采集 {formatDate(lastRun, true)}</span>
          </TooltipTrigger>
          <TooltipContent>所有页面展示的指标来自最近一次有效快照</TooltipContent>
        </Tooltip>
        <form action={triggerCollectorAction}>
          <Button size="sm">
            <RefreshCw />
            立即采集
          </Button>
        </form>
      </div>
    </header>
  );
}

function MetricCards({ summary, totals }: { summary: Summary; totals: Record<MetricDataKey, number> }) {
  return (
    <div className="grid grid-cols-4 gap-6">
      {metrics.map(({ key, dataKey, label, icon: Icon, help }) => (
        <Card key={key}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="flex items-center gap-1.5 text-sm font-medium">
              {label}
              <InfoTooltip label={help}>
                <Info className="size-3.5" />
              </InfoTooltip>
            </CardTitle>
            <Icon className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">{formatCompact(totals[dataKey])}</div>
            <p className="mt-1 text-xs text-muted-foreground">
              {summary.hasComparison
                ? `${formatDelta(summary.deltas[key])} 较上次采集`
                : "首次采集基线，等待下次对比"}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function TopVideoList({ videos }: { videos: ReturnType<typeof toVideoPoint>[] }) {
  const topVideos = videos
    .slice()
    .sort((left, right) => right.likes - left.likes)
    .slice(0, 5);
  return (
    <div className="divide-y">
      {topVideos.map((video, index) => (
        <div className="flex items-center gap-4 py-3 first:pt-0 last:pb-0" key={video.id}>
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-sm font-semibold text-primary">
            {index + 1}
          </div>
          <div className="min-w-0 flex-1">
            <TextWithTooltip className="block truncate text-sm font-medium">{video.title}</TextWithTooltip>
            <div className="mt-1 flex items-center gap-2">
              <AccountBadge name={video.accountName} />
              <span className="text-xs text-muted-foreground">{formatDate(video.publishedAt)}</span>
            </div>
          </div>
          <div className="text-right">
            <p className="font-mono text-sm font-semibold tabular-nums">{formatCompact(video.likes)}</p>
            <p className="text-xs text-muted-foreground">点赞</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function OverviewPanel({
  summary,
  accountPerformance,
  videos,
}: {
  summary: Summary;
  accountPerformance: Row[];
  videos: Row[];
}) {
  const latestVideos = videos.map(toVideoPoint);
  const totals = metrics.reduce(
    (result, metric) => {
      result[metric.dataKey] = latestVideos.reduce((sum, video) => sum + video[metric.dataKey], 0);
      return result;
    },
    { likes: 0, collects: 0, comments: 0, shares: 0 } as Record<MetricDataKey, number>,
  );
  const strongestAccount = accountPerformance[0];
  const deltaItems = metrics
    .map((metric) => ({ ...metric, delta: summary.deltas[metric.key] }))
    .sort((left, right) => Math.abs(right.delta) - Math.abs(left.delta));
  return (
    <div className="space-y-6">
      <MetricCards summary={summary} totals={totals} />
      <div className="grid grid-cols-[minmax(0,1.4fr)_minmax(360px,1fr)] gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="size-4 text-primary" />
              表现最佳视频
            </CardTitle>
            <CardDescription>近 90 天按当前点赞排序，快速发现值得关注的内容</CardDescription>
          </CardHeader>
          <CardContent>
            <TopVideoList videos={latestVideos} />
          </CardContent>
        </Card>
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>采集状态</CardTitle>
              <CardDescription>最近一次任务的数据可用率</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-end justify-between">
                <p className="text-3xl font-bold tabular-nums">{summary.successRate}%</p>
                <StatusBadge status={summary.latestRunStatus} />
              </div>
              <Progress value={summary.successRate} className="mt-4" />
              <div className="mt-6 grid grid-cols-3 gap-4 border-t pt-4 text-center">
                <div>
                  <p className="font-semibold tabular-nums">{summary.enabledAccounts}</p>
                  <p className="text-xs text-muted-foreground">账号</p>
                </div>
                <div>
                  <p className="font-semibold tabular-nums">{summary.trackedVideos}</p>
                  <p className="text-xs text-muted-foreground">视频</p>
                </div>
                <div>
                  <p className="font-semibold tabular-nums">{summary.newVideos}</p>
                  <p className="text-xs text-muted-foreground">新发现</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>本次观察</CardTitle>
              <CardDescription>
                {strongestAccount ? `${String(strongestAccount.nickname)} 当前账号点赞领先` : "等待账号数据"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {deltaItems.slice(0, 3).map((item) => {
                const positive = item.delta >= 0;
                const DeltaIcon = positive ? ArrowUpRight : ArrowDownRight;
                return (
                  <div className="flex items-center justify-between" key={item.key}>
                    <span className="flex items-center gap-2 text-sm text-muted-foreground">
                      <item.icon className="size-4" />
                      {item.label}
                    </span>
                    <span
                      className={
                        positive
                          ? "flex items-center gap-1 text-sm font-medium text-success"
                          : "flex items-center gap-1 text-sm font-medium text-destructive"
                      }
                    >
                      <DeltaIcon className="size-4" />
                      {summary.hasComparison ? formatDelta(item.delta) : "等待对比"}
                    </span>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function TrendsPanel({ trends, videos, accounts }: { trends: Trend[]; videos: Row[]; accounts: Row[] }) {
  const [metricKey, setMetricKey] = useState<MetricDataKey>("likes");
  const [period, setPeriod] = useState("90");
  const [accountId, setAccountId] = useState("all");
  const filteredVideos = useMemo(
    () =>
      videos.filter(
        (video) =>
          daysSince(video.publishedAt as string | null) <= Number(period) &&
          (accountId === "all" || String(video.accountId) === accountId),
      ),
    [accountId, period, videos],
  );
  const videoPoints = useMemo(() => filteredVideos.map(toVideoPoint), [filteredVideos]);
  const filteredTrends = useMemo(() => {
    const grouped = new Map<string, Trend>();
    for (const point of trends) {
      if (daysSince(point.publishedAt) > Number(period)) continue;
      if (accountId !== "all" && String(point.accountId) !== accountId) continue;
      const current = grouped.get(point.date) ?? {
        date: point.date,
        accountId: 0,
        videoId: 0,
        publishedAt: point.publishedAt,
        likes: 0,
        collects: 0,
        comments: 0,
        shares: 0,
      };
      current.likes += Number(point.likes ?? 0);
      current.collects += Number(point.collects ?? 0);
      current.comments += Number(point.comments ?? 0);
      current.shares += Number(point.shares ?? 0);
      grouped.set(point.date, current);
    }
    return [...grouped.values()].sort((left, right) => left.date.localeCompare(right.date));
  }, [accountId, period, trends]);
  const totals = useMemo(
    () =>
      metrics.reduce(
        (result, metric) => {
          result[metric.dataKey] = videoPoints.reduce((sum, video) => sum + video[metric.dataKey], 0);
          return result;
        },
        { likes: 0, collects: 0, comments: 0, shares: 0 } as Record<MetricDataKey, number>,
      ),
    [videoPoints],
  );
  const activeMetric = metricByDataKey.get(metricKey) ?? metrics[0];
  const leadingVideo = videoPoints.slice().sort((a, b) => b[metricKey] - a[metricKey])[0];

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="flex items-center justify-between gap-4 p-6">
          <div className="flex items-center gap-2">
            <Select value={accountId} onValueChange={setAccountId}>
              <SelectTrigger className="w-48" aria-label="筛选账号">
                <SelectValue placeholder="全部账号" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部账号</SelectItem>
                {accounts.map((account) => (
                  <SelectItem key={String(account.id)} value={String(account.id)}>
                    {String(account.nickname)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <ToggleGroup
              type="single"
              value={period}
              onValueChange={(value) => value && setPeriod(value)}
              variant="outline"
              size="sm"
            >
              {[30, 60, 90].map((days) => (
                <ToggleGroupItem key={days} value={String(days)} aria-label={`最近 ${days} 天`}>
                  {days} 天
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{filteredVideos.length}</span> 条视频
          </p>
        </CardContent>
      </Card>

      <ToggleGroup
        type="single"
        value={metricKey}
        onValueChange={(value) => value && setMetricKey(value as MetricDataKey)}
        className="grid grid-cols-4 gap-6"
      >
        {metrics.map((item) => (
          <ToggleGroupItem
            key={item.key}
            value={item.dataKey}
            className="h-auto justify-start border p-0 text-left data-[state=on]:border-foreground data-[state=on]:bg-background"
          >
            <div className="w-full p-6">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{item.label}</span>
                <item.icon className="size-4 text-muted-foreground" />
              </div>
              <p className="mt-2 text-2xl font-bold tabular-nums">{formatCompact(totals[item.dataKey])}</p>
              <p className="mt-1 text-xs font-normal text-muted-foreground">当前筛选范围总量</p>
            </div>
          </ToggleGroupItem>
        ))}
      </ToggleGroup>

      <Card>
        <Tabs defaultValue="trend">
          <CardHeader className="gap-4 border-b sm:flex-row sm:items-start sm:justify-between sm:space-y-0">
            <div className="min-w-0">
              <CardTitle>{activeMetric.label}表现</CardTitle>
              <CardDescription className="mt-1 flex min-w-0 items-center gap-1">
                {leadingVideo ? (
                  <>
                    <span>领先视频</span>
                    <TextWithTooltip className="max-w-80 truncate text-foreground">
                      {leadingVideo.title}
                    </TextWithTooltip>
                    <AccountBadge name={leadingVideo.accountName} />
                  </>
                ) : (
                  "筛选范围内暂无数据"
                )}
              </CardDescription>
            </div>
            <TabsList>
              <TabsTrigger value="trend">采集趋势</TabsTrigger>
              <TabsTrigger value="ranking">视频排行</TabsTrigger>
            </TabsList>
          </CardHeader>
          <CardContent className="pt-6">
            <TabsContent value="trend" className="mt-0">
              <HistoryChart data={filteredTrends} dataKey={metricKey} />
            </TabsContent>
            <TabsContent value="ranking" className="mt-0">
              <VideoRankingChart data={videoPoints} dataKey={metricKey} />
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>
    </div>
  );
}

function DeleteAccountDialog({ account }: { account: Row }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button size="sm" variant="ghost" aria-label={`移除 ${String(account.nickname)}`}>
          <Trash2 />
          移除
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>确认移除账号？</AlertDialogTitle>
          <AlertDialogDescription>
            将永久移除“{String(account.nickname)}”及其视频快照历史。此操作无法撤销。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>取消</AlertDialogCancel>
          <form action={deleteAccountAction}>
            <input type="hidden" name="id" value={String(account.id)} />
            <AlertDialogAction
              type="submit"
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              确认移除
            </AlertDialogAction>
          </form>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function AccountsPanel({ accounts, accountPerformance }: { accounts: Row[]; accountPerformance: Row[] }) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const trackedById = useMemo(
    () => new Map(accountPerformance.map((item) => [Number(item.id), Number(item.trackedVideos)])),
    [accountPerformance],
  );
  const pageCount = Math.max(1, Math.ceil(accounts.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const paginatedAccounts = accounts.slice((safePage - 1) * pageSize, safePage * pageSize);
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>添加账号</CardTitle>
          <CardDescription>粘贴公开账号主页链接；名称将在首次采集时自动识别。</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={addAccountAction} className="flex gap-2">
            <Input type="url" name="profileUrl" placeholder="https://www.douyin.com/user/..." required />
            <Button>
              <Plus />
              添加并采集
            </Button>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>全部账号</CardTitle>
          <CardDescription>{accounts.length} 个账号配置</CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">账号</TableHead>
                <TableHead>主页视频</TableHead>
                <TableHead>近 90 天</TableHead>
                <TableHead>最后扫描</TableHead>
                <TableHead>状态</TableHead>
                <TableHead className="pr-6 text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedAccounts.map((account) => (
                <TableRow key={String(account.id)}>
                  <TableCell className="max-w-64 pl-6">
                    <div className="flex min-w-0 items-center gap-2">
                      <TextWithTooltip className="truncate font-medium">
                        {String(account.nickname)}
                      </TextWithTooltip>
                      <Button variant="ghost" size="icon" className="size-7 shrink-0" asChild>
                        <a
                          href={String(account.profile_url)}
                          target="_blank"
                          rel="noreferrer"
                          aria-label={`打开 ${String(account.nickname)} 主页`}
                        >
                          <ExternalLink />
                        </a>
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>
                    <MetricValue
                      label="主页公开视频数"
                      value={account.profile_video_count as number | null}
                    />
                  </TableCell>
                  <TableCell>
                    <MetricValue label="近 90 天跟踪视频" value={trackedById.get(Number(account.id)) ?? 0} />
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                    {formatDate(account.last_scanned_at as string | null, true)}
                  </TableCell>
                  <TableCell>
                    {Number(account.enabled) ? (
                      <StatusBadge status={String(account.last_scan_status)} />
                    ) : (
                      <Badge variant="secondary">已暂停</Badge>
                    )}
                  </TableCell>
                  <TableCell className="pr-6 text-right">
                    <div className="flex justify-end gap-1">
                      <form action={toggleAccountAction}>
                        <input type="hidden" name="id" value={String(account.id)} />
                        <input type="hidden" name="enabled" value={Number(account.enabled) ? "0" : "1"} />
                        <Button size="sm" variant="outline">
                          <Power />
                          {Number(account.enabled) ? "暂停" : "启用"}
                        </Button>
                      </form>
                      <DeleteAccountDialog account={account} />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <DataTablePagination
            page={safePage}
            pageSize={pageSize}
            totalItems={accounts.length}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function VideoTable({ videos, compact = false }: { videos: Row[]; compact?: boolean }) {
  const [query, setQuery] = useState("");
  const [period, setPeriod] = useState("90");
  const [sortKey, setSortKey] = useState<SortKey>(compact ? "likes" : "publishedAt");
  const [accountId, setAccountId] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const accounts = useMemo(
    () => [...new Map(videos.map((video) => [String(video.accountId), String(video.accountName)])).entries()],
    [videos],
  );
  const visibleVideos = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return videos
      .filter(
        (video) =>
          daysSince(video.publishedAt as string | null) <= Number(period) &&
          (accountId === "all" || String(video.accountId) === accountId) &&
          (!normalizedQuery ||
            String(video.title ?? "")
              .toLowerCase()
              .includes(normalizedQuery) ||
            String(video.accountName).toLowerCase().includes(normalizedQuery)),
      )
      .sort((left, right) =>
        sortKey === "publishedAt"
          ? new Date(String(right.publishedAt)).getTime() - new Date(String(left.publishedAt)).getTime()
          : Number(right[sortKey] ?? 0) - Number(left[sortKey] ?? 0),
      );
  }, [accountId, period, query, sortKey, videos]);
  const pageCount = Math.max(1, Math.ceil(visibleVideos.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const rows = compact
    ? visibleVideos.slice(0, 6)
    : visibleVideos.slice((safePage - 1) * pageSize, safePage * pageSize);
  const sortLabel = sortKey === "publishedAt" ? "发布时间" : metricChartConfig[sortKey].label;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>{compact ? "表现最佳视频" : "视频明细"}</CardTitle>
          <CardDescription>
            {compact ? `按点赞排序 · ${rows.length} 条` : `${visibleVideos.length} 条结果`}
          </CardDescription>
        </div>
        {compact ? null : (
          <Button variant="outline" size="sm" asChild>
            <a href="/api/export">
              <Download />
              导出 CSV
            </a>
          </Button>
        )}
      </CardHeader>
      {compact ? null : (
        <div className="flex items-center justify-between gap-4 border-y bg-muted/20 px-6 py-4">
          <div className="relative w-80">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
              placeholder="搜索视频标题或账号"
              className="pl-9"
            />
          </div>
          <div className="flex items-center gap-2">
            <Select
              value={accountId}
              onValueChange={(value) => {
                setAccountId(value);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-40" aria-label="筛选视频账号">
                <SelectValue placeholder="全部账号" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部账号</SelectItem>
                {accounts.map(([id, name]) => (
                  <SelectItem value={id} key={id}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={period}
              onValueChange={(value) => {
                setPeriod(value);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-36" aria-label="发布时间范围">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[30, 60, 90].map((days) => (
                  <SelectItem key={days} value={String(days)}>
                    最近 {days} 天
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sortKey} onValueChange={(value) => setSortKey(value as SortKey)}>
              <SelectTrigger className="w-36" aria-label="视频排序">
                <ChevronsUpDown className="mr-2 size-4 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="publishedAt">按发布时间</SelectItem>
                <SelectItem value="likes">按点赞</SelectItem>
                <SelectItem value="collects">按收藏</SelectItem>
                <SelectItem value="comments">按评论</SelectItem>
                <SelectItem value="shares">按分享</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}
      <CardContent className="px-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[42%] pl-6">视频</TableHead>
              <TableHead>发布</TableHead>
              {(["likes", "collects"] as MetricDataKey[]).map((key) => (
                <TableHead key={key} className="text-right">
                  {metricChartConfig[key].label}
                  {sortKey === key ? <ChevronDown className="ml-1 inline size-3" /> : null}
                </TableHead>
              ))}
              {compact
                ? null
                : (["comments", "shares"] as MetricDataKey[]).map((key) => (
                    <TableHead key={key} className="text-right">
                      {metricChartConfig[key].label}
                      {sortKey === key ? <ChevronDown className="ml-1 inline size-3" /> : null}
                    </TableHead>
                  ))}
              <TableHead className="pr-6">状态</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((video) => (
              <TableRow key={String(video.id)}>
                <TableCell className="max-w-0 pl-6">
                  <div className="flex min-w-0 items-center gap-2">
                    <a
                      className="min-w-0 flex-1"
                      href={String(video.videoUrl)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <TextWithTooltip className="block truncate font-medium hover:underline">
                        {String(video.title ?? "未命名视频")}
                      </TextWithTooltip>
                    </a>
                    <AccountBadge name={String(video.accountName)} />
                  </div>
                </TableCell>
                <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span>{formatDate(String(video.publishedAt))}</span>
                    </TooltipTrigger>
                    <TooltipContent>
                      发布于 {formatDate(String(video.publishedAt), true)}
                      <br />
                      快照采集于 {formatDate(video.capturedAt as string | null, true)}
                    </TooltipContent>
                  </Tooltip>
                </TableCell>
                <TableCell className="text-right">
                  <MetricValue label="点赞" value={video.likes as number | null} />
                </TableCell>
                <TableCell className="text-right">
                  <MetricValue label="收藏" value={video.collects as number | null} />
                </TableCell>
                {compact ? null : (
                  <>
                    <TableCell className="text-right">
                      <MetricValue label="评论" value={video.comments as number | null} />
                    </TableCell>
                    <TableCell className="text-right">
                      <MetricValue label="分享" value={video.shares as number | null} />
                    </TableCell>
                  </>
                )}
                <TableCell className="pr-6">
                  <StatusBadge status={String(video.captureStatus ?? video.status)} />
                </TableCell>
              </TableRow>
            ))}
            {rows.length ? null : (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                  没有符合当前筛选条件的视频
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        {compact ? null : (
          <>
            <div className="border-t px-6 py-4 text-xs text-muted-foreground">当前按{sortLabel}降序排列</div>
            <DataTablePagination
              page={safePage}
              pageSize={pageSize}
              totalItems={visibleVideos.length}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          </>
        )}
      </CardContent>
    </Card>
  );
}

function SystemPanel({ runs, errors }: { runs: Row[]; errors: Row[] }) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const pageCount = Math.max(1, Math.ceil(runs.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const paginatedRuns = runs.slice((safePage - 1) * pageSize, safePage * pageSize);
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_380px] gap-6">
      <Card>
        <CardHeader>
          <CardTitle>采集运行</CardTitle>
          <CardDescription>最近 20 次任务</CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">时间</TableHead>
                <TableHead>触发</TableHead>
                <TableHead>账号</TableHead>
                <TableHead>成功</TableHead>
                <TableHead>失败</TableHead>
                <TableHead className="pr-6">状态</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedRuns.map((run) => (
                <TableRow key={String(run.id)}>
                  <TableCell className="whitespace-nowrap pl-6 text-xs">
                    {formatDate(String(run.started_at), true)}
                  </TableCell>
                  <TableCell>{String(run.trigger)}</TableCell>
                  <TableCell>{String(run.accounts_scanned)}</TableCell>
                  <TableCell>{String(run.videos_succeeded)}</TableCell>
                  <TableCell>{String(run.videos_failed)}</TableCell>
                  <TableCell className="pr-6">
                    <StatusBadge status={String(run.status)} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <DataTablePagination
            page={safePage}
            pageSize={pageSize}
            totalItems={runs.length}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TriangleAlert className="size-4" />
            异常
          </CardTitle>
          <CardDescription>{errors.length} 条近期记录</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {errors.length ? (
            errors.map((error) => (
              <div className="rounded-md border p-3" key={String(error.id)}>
                <div className="flex items-center justify-between gap-2">
                  <Badge variant="outline" className="max-w-48 truncate">
                    {String(error.category)}
                  </Badge>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatDate(String(error.created_at))}
                  </span>
                </div>
                {error.account_name ? (
                  <div className="mt-2">
                    <AccountBadge name={String(error.account_name)} />
                  </div>
                ) : null}
                <TextWithTooltip className="mt-2 line-clamp-3 block text-xs leading-5 text-muted-foreground">
                  {String(error.message)}
                </TextWithTooltip>
              </div>
            ))
          ) : (
            <p className="py-10 text-center text-sm text-muted-foreground">暂无异常</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function DashboardConsole({
  username,
  summary,
  trends,
  accountPerformance,
  accounts,
  videos,
  runs,
  errors,
}: {
  username: string;
  summary: Summary;
  trends: Trend[];
  accountPerformance: Row[];
  accounts: Row[];
  videos: Row[];
  runs: Row[];
  errors: Row[];
}) {
  const [view, setView] = useState<View>("overview");
  const mainRef = useRef<HTMLElement>(null);
  function changeView(nextView: View) {
    setView(nextView);
    mainRef.current?.scrollTo({ top: 0 });
  }
  return (
    <TooltipProvider delayDuration={250}>
      <div className="min-w-[1180px] bg-background text-foreground">
        <div className="flex h-screen overflow-hidden">
          <Rail view={view} setView={changeView} username={username} />
          <section className="flex min-w-0 flex-1 flex-col">
            <PageHeader view={view} lastRun={summary.latestRunAt} />
            <main ref={mainRef} className="flex-1 overflow-y-auto bg-muted/20 p-6">
              {view === "overview" ? (
                <OverviewPanel summary={summary} accountPerformance={accountPerformance} videos={videos} />
              ) : view === "trends" ? (
                <TrendsPanel trends={trends} videos={videos} accounts={accounts} />
              ) : view === "accounts" ? (
                <AccountsPanel accounts={accounts} accountPerformance={accountPerformance} />
              ) : view === "videos" ? (
                <VideoTable videos={videos} />
              ) : (
                <SystemPanel runs={runs} errors={errors} />
              )}
            </main>
          </section>
        </div>
      </div>
    </TooltipProvider>
  );
}
