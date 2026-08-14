"use client";

import { useState } from "react";
import { AccountBadge, TextWithTooltip } from "@/features/dashboard/components/dashboard-primitives";
import { AccountSelect } from "@/features/dashboard/components/account-select";
import { FilterBar, FilterField } from "@/features/dashboard/components/filter-bar";
import { PeriodFilter } from "@/features/dashboard/components/period-filter";
import {
  AccountRankingChart,
  HistoryChart,
  VideoRankingChart,
} from "@/features/dashboard/components/analytics-charts";
import { metricByDataKey, metricDefinitions } from "@/features/dashboard/config";
import { useTrendFilters } from "@/features/dashboard/hooks/use-trend-filters";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { Account, TrendSnapshot, VideoRecord } from "@/features/dashboard/types";
import { formatCompact } from "@/lib/utils";

export function TrendsPanel({
  trends,
  videos,
  accounts,
}: {
  trends: TrendSnapshot[];
  videos: VideoRecord[];
  accounts: Account[];
}) {
  const filters = useTrendFilters(videos, trends);
  const activeMetric = metricByDataKey.get(filters.metric) ?? metricDefinitions[0];
  const [tab, setTab] = useState<"trend" | "ranking" | "accounts">("trend");
  const descriptions = {
    trend: "按采集日期同时对比点赞、收藏、评论与可见分享；选中的指标会在图中加粗",
    ranking: filters.leadingVideo ? (
      <span className="flex min-w-0 items-center gap-1">
        <span>领先视频</span>
        <TextWithTooltip className="max-w-80 truncate text-foreground">
          {filters.leadingVideo.title}
        </TextWithTooltip>
        <AccountBadge name={filters.leadingVideo.accountName} />
      </span>
    ) : (
      "筛选范围内暂无数据"
    ),
    accounts: "比较当前筛选下各账号的总量，悬停可查看四项指标",
  } as const;
  const titles = {
    trend: "指标对比",
    ranking: `${activeMetric.label}视频排行`,
    accounts: `${activeMetric.label}账号对比`,
  } as const;

  return (
    <div className="flex flex-col gap-6">
      <FilterBar resultCount={filters.videos.length} onReset={filters.reset} isFiltered={filters.isFiltered}>
        <FilterField label="账号">
          <AccountSelect value={filters.accountId} onValueChange={filters.setAccountId} accounts={accounts} />
        </FilterField>
        <FilterField label="发布时间">
          <PeriodFilter value={filters.period} onValueChange={filters.setPeriod} />
        </FilterField>
      </FilterBar>
      <ToggleGroup
        type="single"
        value={filters.metric}
        onValueChange={(value) => value && filters.setMetric(value as typeof filters.metric)}
        className="grid grid-cols-4 gap-0 overflow-hidden rounded-lg border"
      >
        {metricDefinitions.map((item) => (
          <ToggleGroupItem
            key={item.key}
            value={item.dataKey}
            className="h-auto justify-start rounded-none border-0 border-r p-0 text-left last:border-r-0 data-[state=on]:bg-primary/5 data-[state=on]:text-foreground"
          >
            <div className="w-full p-6">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{item.label}</span>
                <item.icon className="size-4 text-muted-foreground" />
              </div>
              <p className="mt-2 text-2xl font-bold tabular-nums">
                {formatCompact(filters.totals[item.dataKey])}
              </p>
              <p className="mt-1 text-xs font-normal text-muted-foreground">当前筛选范围总量</p>
            </div>
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      <Card>
        <Tabs value={tab} onValueChange={(value) => setTab(value as typeof tab)}>
          <CardHeader className="gap-4 border-b sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <CardTitle>{titles[tab]}</CardTitle>
              <CardDescription className="mt-1 min-w-0">{descriptions[tab]}</CardDescription>
            </div>
            <TabsList>
              <TabsTrigger value="trend">采集趋势</TabsTrigger>
              <TabsTrigger value="ranking">视频排行</TabsTrigger>
              <TabsTrigger value="accounts">账号对比</TabsTrigger>
            </TabsList>
          </CardHeader>
          <CardContent className="pt-6">
            <TabsContent value="trend" className="mt-0">
              <HistoryChart data={filters.trends} highlightKey={filters.metric} />
            </TabsContent>
            <TabsContent value="ranking" className="mt-0">
              <VideoRankingChart data={filters.videos} dataKey={filters.metric} />
            </TabsContent>
            <TabsContent value="accounts" className="mt-0">
              <AccountRankingChart data={filters.accounts} dataKey={filters.metric} />
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>
    </div>
  );
}
