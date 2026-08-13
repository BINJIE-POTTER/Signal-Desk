import { CalendarDays, Command, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { formatDate } from "@/lib/utils";

export function Topbar() {
  return (
    <header className="flex h-20 items-center justify-between border-b border-border/70 px-5 md:px-8">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[.18em] text-muted-foreground">
          Weekly intelligence
        </p>
        <h1 className="font-display text-2xl font-semibold">公开账号观测台</h1>
      </div>
      <div className="hidden items-center gap-3 md:flex">
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9 pr-14" placeholder="搜索账号或视频" />
          <span className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-1 rounded border px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground">
            <Command className="size-2.5" />K
          </span>
        </div>
        <div className="flex h-10 items-center gap-2 rounded-md border border-border bg-card/60 px-3 text-xs text-muted-foreground">
          <CalendarDays className="size-4" />
          {formatDate(new Date().toISOString())}
        </div>
      </div>
    </header>
  );
}
