"use client";

import { ExternalLink, Plus, Power, Trash2 } from "lucide-react";
import { addAccountAction, deleteAccountAction, toggleAccountAction } from "@/features/accounts/actions";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
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
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MetricValue, TextWithTooltip } from "@/features/dashboard/components/dashboard-primitives";
import { usePagination } from "@/features/dashboard/hooks/use-pagination";
import type { Account, AccountPerformance } from "@/features/dashboard/types";
import { formatDate } from "@/lib/utils";

function DeleteAccountDialog({ account }: { account: Account }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button size="sm" variant="ghost" aria-label={`移除 ${account.nickname}`}>
          <Trash2 />
          移除
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>确认移除账号？</AlertDialogTitle>
          <AlertDialogDescription>
            将永久移除“{account.nickname}”及其视频快照历史。此操作无法撤销。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>取消</AlertDialogCancel>
          <form action={deleteAccountAction}>
            <input type="hidden" name="id" value={account.id} />
            <AlertDialogAction
              type="submit"
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              确认移除
            </AlertDialogAction>
          </form>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function AccountsPanel({
  accounts,
  accountPerformance,
}: {
  accounts: Account[];
  accountPerformance: AccountPerformance[];
}) {
  const trackedById = new Map(accountPerformance.map((item) => [item.id, item.trackedVideos]));
  const pagination = usePagination(accounts.length);
  const rows = pagination.slice(accounts);
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>添加账号</CardTitle>
          <CardDescription>
            粘贴公开账号主页链接；名称将在首次采集时自动识别，并为该账号启动首次采集。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={addAccountAction} className="flex gap-2">
            <Input type="url" name="profileUrl" placeholder="https://www.douyin.com/user/..." required />
            <Button>
              <Plus />
              添加并采集
            </Button>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>全部账号</CardTitle>
          <CardDescription>{accounts.length} 个账号配置</CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">账号</TableHead>
                <TableHead>主页视频</TableHead>
                <TableHead>近 90 天</TableHead>
                <TableHead>最后扫描</TableHead>
                <TableHead>状态</TableHead>
                <TableHead className="pr-6 text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((account) => (
                <TableRow key={account.id}>
                  <TableCell className="max-w-64 pl-6">
                    <div className="flex min-w-0 items-center gap-2">
                      <TextWithTooltip className="truncate font-medium">{account.nickname}</TextWithTooltip>
                      <Button variant="ghost" size="icon" className="size-7 shrink-0" asChild>
                        <a
                          href={account.profileUrl}
                          target="_blank"
                          rel="noreferrer"
                          aria-label={`打开 ${account.nickname} 主页`}
                        >
                          <ExternalLink />
                        </a>
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>
                    <MetricValue label="主页公开视频数" value={account.profileVideoCount} />
                  </TableCell>
                  <TableCell>
                    <MetricValue label="近 90 天跟踪视频" value={trackedById.get(account.id) ?? 0} />
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                    {formatDate(account.lastScannedAt, true)}
                  </TableCell>
                  <TableCell>
                    {account.enabled ? (
                      <StatusBadge status={account.lastScanStatus} />
                    ) : (
                      <Badge variant="secondary">已暂停</Badge>
                    )}
                  </TableCell>
                  <TableCell className="pr-6 text-right">
                    <div className="flex justify-end gap-1">
                      <form action={toggleAccountAction}>
                        <input type="hidden" name="id" value={account.id} />
                        <input type="hidden" name="enabled" value={account.enabled ? "0" : "1"} />
                        <Button size="sm" variant="outline">
                          <Power />
                          {account.enabled ? "暂停" : "启用"}
                        </Button>
                      </form>
                      <DeleteAccountDialog account={account} />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <DataTablePagination {...pagination.paginationProps} />
        </CardContent>
      </Card>
    </div>
  );
}
