"use client";

import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import type { MetricDataKey, TrendTotal, VideoPoint } from "@/features/dashboard/types";
import { formatCompact } from "@/lib/utils";

export const metricChartConfig = {
  likes: { label: "点赞", color: "hsl(var(--chart-1))" },
  collects: { label: "收藏", color: "hsl(var(--chart-2))" },
  comments: { label: "评论", color: "hsl(var(--chart-3))" },
  shares: { label: "分享", color: "hsl(var(--chart-4))" },
} satisfies ChartConfig;

function shortDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("zh-CN", { month: "numeric", day: "numeric" });
}

function EmptyChart({ children }: { children: string }) {
  return (
    <div className="flex h-[320px] items-center justify-center text-sm text-muted-foreground">{children}</div>
  );
}

export function HistoryChart({ data, dataKey }: { data: TrendTotal[]; dataKey: MetricDataKey }) {
  const item = metricChartConfig[dataKey];
  if (!data.length) return <EmptyChart>筛选范围内暂无快照</EmptyChart>;
  if (data.length === 1) {
    return (
      <div className="flex h-[320px] flex-col items-center justify-center gap-1 border-t border-dashed">
        <p className="text-3xl font-semibold tabular-nums">{formatCompact(data[0][dataKey])}</p>
        <p className="text-sm text-muted-foreground">{data[0].date} · 首次采集基线</p>
        <p className="mt-3 max-w-sm text-center text-xs text-muted-foreground">
          至少需要两个不同采集日期才能计算变化趋势。
        </p>
      </div>
    );
  }
  return (
    <ChartContainer config={{ [dataKey]: item }} className="h-[320px] w-full">
      <AreaChart accessibilityLayer data={data} margin={{ left: 4, right: 12, top: 12 }}>
        <defs>
          <linearGradient id={`fill-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={`var(--color-${dataKey})`} stopOpacity={0.8} />
            <stop offset="95%" stopColor={`var(--color-${dataKey})`} stopOpacity={0.1} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} tickFormatter={shortDate} />
        <YAxis
          width={48}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value: number) => formatCompact(value)}
        />
        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent
              indicator="dot"
              labelFormatter={(_, payload) => `采集日期 ${String(payload?.[0]?.payload?.date ?? "")}`}
              formatter={(value, name) => (
                <div className="flex min-w-36 items-center justify-between gap-6">
                  <span className="text-muted-foreground">
                    {metricChartConfig[name as MetricDataKey]?.label}
                  </span>
                  <span className="font-mono font-medium tabular-nums">
                    {Number(value).toLocaleString("zh-CN")}
                  </span>
                </div>
              )}
            />
          }
        />
        <Area
          dataKey={dataKey}
          type="natural"
          fill={`url(#fill-${dataKey})`}
          fillOpacity={0.4}
          stroke={`var(--color-${dataKey})`}
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 5 }}
        />
      </AreaChart>
    </ChartContainer>
  );
}

export function VideoRankingChart({ data, dataKey }: { data: VideoPoint[]; dataKey: MetricDataKey }) {
  const ranked = data.slice(0, 10).map((video) => ({
    ...video,
    shortTitle: video.title.length > 16 ? `${video.title.slice(0, 16)}…` : video.title,
  }));
  if (!ranked.length) return <EmptyChart>筛选范围内暂无视频</EmptyChart>;
  return (
    <ChartContainer config={{ [dataKey]: metricChartConfig[dataKey] }} className="h-[360px] w-full">
      <BarChart accessibilityLayer data={ranked} layout="vertical" margin={{ left: 8, right: 20 }}>
        <CartesianGrid horizontal={false} />
        <XAxis type="number" hide />
        <YAxis type="category" dataKey="shortTitle" tickLine={false} axisLine={false} width={140} />
        <ChartTooltip
          cursor={{ fill: "hsl(var(--muted))" }}
          content={
            <ChartTooltipContent
              hideLabel
              indicator="line"
              formatter={(value, name, item) => (
                <div className="grid min-w-64 gap-2">
                  <div className="min-w-0">
                    <p className="max-w-72 whitespace-normal font-medium leading-5">
                      {String(item.payload.title)}
                    </p>
                    <p className="mt-1 text-muted-foreground">
                      {String(item.payload.accountName)} · {String(item.payload.publishedAt).slice(0, 10)}
                    </p>
                  </div>
                  <div className="flex items-center justify-between border-t pt-2">
                    <span className="text-muted-foreground">
                      {metricChartConfig[name as MetricDataKey]?.label}
                    </span>
                    <span className="font-mono font-medium tabular-nums">
                      {Number(value).toLocaleString("zh-CN")}
                    </span>
                  </div>
                </div>
              )}
            />
          }
        />
        <Bar dataKey={dataKey} fill={`var(--color-${dataKey})`} radius={4} barSize={20} />
      </BarChart>
    </ChartContainer>
  );
}
