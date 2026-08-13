"use client";

import { ArrowDownRight, ArrowUpRight, Info, Trophy } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  AccountBadge,
  InfoTooltip,
  TextWithTooltip,
} from "@/features/dashboard/components/dashboard-primitives";
import { metricDefinitions } from "@/features/dashboard/config";
import { sumVideoMetrics, toVideoPoint } from "@/features/dashboard/selectors";
import type {
  AccountPerformance,
  DashboardSummary,
  VideoPoint,
  VideoRecord,
} from "@/features/dashboard/types";
import { formatCompact, formatDate, formatDelta } from "@/lib/utils";

function MetricCards({
  summary,
  totals,
}: {
  summary: DashboardSummary;
  totals: ReturnType<typeof sumVideoMetrics>;
}) {
  return (
    <div className="grid grid-cols-4 gap-6">
      {metricDefinitions.map(({ key, dataKey, label, icon: Icon, help }) => (
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
                ? `${formatDelta(summary.deltas[key])} 较上次采集日期`
                : "首次采集基线，等待下次对比"}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function TopVideoList({ videos }: { videos: VideoPoint[] }) {
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

export function OverviewPanel({
  summary,
  accountPerformance,
  videos,
}: {
  summary: DashboardSummary;
  accountPerformance: AccountPerformance[];
  videos: VideoRecord[];
}) {
  const videoPoints = videos.map(toVideoPoint);
  const totals = sumVideoMetrics(videoPoints);
  const strongestAccount = accountPerformance[0];
  const deltaItems = metricDefinitions
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
            <TopVideoList videos={videoPoints} />
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
                {strongestAccount ? `${strongestAccount.nickname} 当前账号点赞领先` : "等待账号数据"}
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
