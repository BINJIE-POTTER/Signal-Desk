import { RotateCcw } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function FilterField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      {children}
    </div>
  );
}

export function FilterBar({
  children,
  resultCount,
  onReset,
  isFiltered,
  embedded = false,
  className,
}: {
  children: ReactNode;
  resultCount: number;
  onReset?: () => void;
  isFiltered?: boolean;
  embedded?: boolean;
  className?: string;
}) {
  const content = (
    <div className={cn("flex items-end justify-between gap-4", embedded ? "p-4" : "p-6", className)}>
      <div className="flex flex-wrap items-end gap-3">
        {children}
        {onReset && isFiltered ? (
          <Button variant="ghost" size="sm" onClick={onReset}>
            <RotateCcw />
            重置
          </Button>
        ) : null}
      </div>
      <p className="shrink-0 pb-2 text-sm text-muted-foreground">
        <span className="font-medium text-foreground">{resultCount}</span> 条视频
      </p>
    </div>
  );

  if (embedded) return content;
  return <div className="rounded-lg border bg-card">{content}</div>;
}
