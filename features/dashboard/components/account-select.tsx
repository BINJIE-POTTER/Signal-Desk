"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Account } from "@/features/dashboard/types";

export function AccountSelect({
  value,
  onValueChange,
  accounts,
  ariaLabel = "筛选账号",
  className = "w-48",
}: {
  value: string;
  onValueChange: (value: string) => void;
  accounts: Pick<Account, "id" | "nickname">[];
  ariaLabel?: string;
  className?: string;
}) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className={className} aria-label={ariaLabel}>
        <SelectValue placeholder="全部账号" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">全部账号</SelectItem>
        {accounts.map((account) => (
          <SelectItem key={account.id} value={String(account.id)}>
            {account.nickname}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
