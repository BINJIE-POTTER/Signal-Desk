import { Activity } from "lucide-react";
import { cn } from "@/lib/utils";

export function AppLogo({ compact = false, className }: { compact?: boolean; className?: string }) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="relative grid size-10 place-items-center rounded-[10px] bg-foreground text-background">
        <Activity className="size-5" />
        <span className="absolute -right-1 -top-1 size-2.5 rounded-full border-2 border-background bg-accent" />
      </div>
      {compact ? null : (
        <div>
          <p className="font-display text-xl font-semibold leading-none">灯塔</p>
          <p className="mt-1 font-mono text-[9px] uppercase tracking-[.22em] text-muted-foreground">
            Public Signal Desk
          </p>
        </div>
      )}
    </div>
  );
}
