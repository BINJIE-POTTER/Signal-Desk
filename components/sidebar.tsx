"use client";

import { BarChart3, CircleGauge, Clapperboard, Settings2, TriangleAlert, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AppLogo } from "@/components/app-logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { logoutAction } from "@/app/actions";

const links = [
  { href: "/", label: "总览", icon: CircleGauge },
  { href: "/accounts", label: "账号", icon: Users },
  { href: "/videos", label: "视频", icon: Clapperboard },
  { href: "/runs", label: "运行记录", icon: BarChart3 },
  { href: "/errors", label: "异常", icon: TriangleAlert },
];

export function Sidebar({ username }: { username: string }) {
  const pathname = usePathname();
  return (
    <aside className="sticky top-0 hidden h-screen w-[248px] shrink-0 flex-col border-r border-border/70 bg-background/80 p-5 backdrop-blur-xl lg:flex">
      <AppLogo className="mb-10" />
      <div className="mb-3 flex items-center justify-between px-3">
        <span className="font-mono text-[10px] uppercase tracking-[.18em] text-muted-foreground">
          Workspace
        </span>
        <Badge>LIVE</Badge>
      </div>
      <nav className="space-y-1">
        {links.map(({ href, label, icon: Icon }) => (
          <Link
            href={href}
            key={href}
            className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${(href === "/" ? pathname === "/" : pathname.startsWith(href)) ? "bg-foreground text-background shadow-lg" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
          >
            <Icon className="size-[17px]" />
            <span>{label}</span>
          </Link>
        ))}
      </nav>
      <div className="mt-auto rounded-xl border border-border/80 bg-card/70 p-4">
        <div className="mb-3 flex items-center gap-3">
          <div className="grid size-8 place-items-center rounded-full bg-primary/12 font-display font-semibold text-primary">
            {username.slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{username}</p>
            <p className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
              Internal operator
            </p>
          </div>
        </div>
        <form action={logoutAction}>
          <Button className="w-full" variant="outline" size="sm">
            <Settings2 />
            退出登录
          </Button>
        </form>
      </div>
    </aside>
  );
}
