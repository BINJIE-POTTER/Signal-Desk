"use client";

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { PeriodDays } from "@/features/dashboard/types";

export function PeriodFilter({
  value,
  onValueChange,
}: {
  value: PeriodDays;
  onValueChange: (value: PeriodDays) => void;
}) {
  return (
    <ToggleGroup
      type="single"
      value={String(value)}
      onValueChange={(next) => next && onValueChange(Number(next) as PeriodDays)}
      variant="outline"
      size="sm"
    >
      {([30, 60, 90] as PeriodDays[]).map((days) => (
        <ToggleGroupItem key={days} value={String(days)} aria-label={`最近 ${days} 天`}>
          {days} 天
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
