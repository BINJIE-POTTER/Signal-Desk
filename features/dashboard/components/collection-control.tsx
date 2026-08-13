"use client";

import { Clock3, Play, RefreshCw } from "lucide-react";
import { useFormStatus } from "react-dom";
import { triggerCollectorAction } from "@/features/collector/actions";
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
import type { DashboardSummary } from "@/features/dashboard/types";
import { formatDate } from "@/lib/utils";

function StartButton() {
  const { pending } = useFormStatus();
  return (
    <AlertDialogAction type="submit" disabled={pending}>
      {pending ? <RefreshCw className="animate-spin" /> : <Play />}
      {pending ? "正在启动…" : "确认启动"}
    </AlertDialogAction>
  );
}

export function CollectionControl({ summary }: { summary: DashboardSummary }) {
  const running = summary.collectorRunning;
  return (
    <Card className="border-primary/20 bg-primary/[0.025]">
      <CardHeader className="flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle>手动采集</CardTitle>
          <CardDescription className="mt-1">
            打开长期登录的 Chrome，逐个访问已启用账号和近 90 天视频。任务可能持续数十分钟。
          </CardDescription>
        </div>
        {running ? (
          <Badge variant="warning">任务运行中</Badge>
        ) : (
          <StatusBadge status={summary.latestRunStatus} />
        )}
      </CardHeader>
      <CardContent className="flex items-center justify-between">
        <div className="flex items-center gap-6 text-sm">
          <span className="flex items-center gap-2 text-muted-foreground">
            <Clock3 className="size-4" />
            最近启动 {formatDate(summary.latestRunAt, true)}
          </span>
          <span>
            <strong>{summary.enabledAccounts}</strong> 个启用账号
          </span>
          <span>
            <strong>{summary.trackedVideos}</strong> 条跟踪视频
          </span>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button disabled={running}>
              <Play />
              {running ? "采集中" : "启动全量采集"}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>启动全量采集？</AlertDialogTitle>
              <AlertDialogDescription>
                采集器将在后台启动，并控制已登录的 Chrome
                访问所有启用账号。不要同时启动第二个任务；任务可能持续数十分钟，运行状态可在下方查看。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>取消</AlertDialogCancel>
              <form action={triggerCollectorAction}>
                <StartButton />
              </form>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
