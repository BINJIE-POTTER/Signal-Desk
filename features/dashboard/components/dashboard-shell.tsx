"use client";

import { Activity, LogOut } from "lucide-react";
import { useRef, useState } from "react";
import { logoutAction } from "@/features/auth/actions";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AccountsPanel } from "@/features/dashboard/components/accounts-panel";
import { OverviewPanel } from "@/features/dashboard/components/overview-panel";
import { SystemPanel } from "@/features/dashboard/components/system-panel";
import { TextWithTooltip } from "@/features/dashboard/components/dashboard-primitives";
import { TrendsPanel } from "@/features/dashboard/components/trends-panel";
import { VideoTable } from "@/features/dashboard/components/video-table";
import { dashboardNavigation, dashboardTitles } from "@/features/dashboard/config";
import type { DashboardData, DashboardView } from "@/features/dashboard/types";
import { formatDate } from "@/lib/utils";

function Sidebar({
  view,
  onViewChange,
  username,
}: {
  view: DashboardView;
  onViewChange: (view: DashboardView) => void;
  username: string;
}) {
  return (
    <aside className="flex h-screen w-60 shrink-0 flex-col border-r bg-muted/20 p-6">
      <div className="flex items-center gap-2 px-2 py-2">
        <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Activity className="size-4" />
        </div>
        <div className="min-w-0">
          <p className="font-semibold leading-none">灯塔</p>
          <p className="mt-1 text-xs text-muted-foreground">抖音账号观测</p>
        </div>
      </div>
      <Separator className="my-4" />
      <nav className="space-y-1">
        {dashboardNavigation.map(({ id, label, description, icon: Icon }) => (
          <Button
            type="button"
            variant={view === id ? "secondary" : "ghost"}
            className="h-10 w-full justify-start px-3"
            onClick={() => onViewChange(id)}
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

function Header({ view, lastRun }: { view: DashboardView; lastRun: string | null }) {
  const title = dashboardTitles[view];
  return (
    <header className="flex h-[72px] items-center justify-between border-b px-6">
      <div className="min-w-0">
        <h1 className="text-lg font-semibold tracking-tight">{title[0]}</h1>
        <p className="truncate text-sm text-muted-foreground">{title[1]}</p>
      </div>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="text-xs text-muted-foreground">最近采集 {formatDate(lastRun, true)}</span>
        </TooltipTrigger>
        <TooltipContent>所有页面展示的指标来自最近一次有效快照</TooltipContent>
      </Tooltip>
    </header>
  );
}

export function DashboardShell({ username, data }: { username: string; data: DashboardData }) {
  const [view, setView] = useState<DashboardView>("overview");
  const mainRef = useRef<HTMLElement>(null);
  const changeView = (next: DashboardView) => {
    setView(next);
    mainRef.current?.scrollTo({ top: 0 });
  };
  return (
    <TooltipProvider delayDuration={250}>
      <div className="min-w-[1180px] bg-background text-foreground">
        <div className="flex h-screen overflow-hidden">
          <Sidebar view={view} onViewChange={changeView} username={username} />
          <section className="flex min-w-0 flex-1 flex-col">
            <Header view={view} lastRun={data.summary.latestRunAt} />
            <main ref={mainRef} className="flex-1 overflow-y-auto bg-background p-6">
              {view === "overview" ? (
                <OverviewPanel
                  summary={data.summary}
                  accountPerformance={data.accountPerformance}
                  videos={data.videos}
                />
              ) : view === "trends" ? (
                <TrendsPanel trends={data.trends} videos={data.videos} accounts={data.accounts} />
              ) : view === "accounts" ? (
                <AccountsPanel accounts={data.accounts} accountPerformance={data.accountPerformance} />
              ) : view === "videos" ? (
                <VideoTable videos={data.videos} accounts={data.accounts} />
              ) : (
                <SystemPanel summary={data.summary} runs={data.runs} errors={data.errors} />
              )}
            </main>
          </section>
        </div>
      </div>
    </TooltipProvider>
  );
}
