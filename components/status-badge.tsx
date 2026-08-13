import { Badge } from "@/components/ui/badge";

const labels: Record<string, string> = {
  success: "成功",
  partial: "部分成功",
  failed: "失败",
  running: "运行中",
  pending: "待运行",
  active: "跟踪中",
  expired: "已到期",
  unavailable: "不可访问",
  removed: "已移除",
  challenge: "验证拦截",
};
export function StatusBadge({ status }: { status: string }) {
  const variant =
    status === "success" || status === "active"
      ? "success"
      : status === "partial" || status === "running" || status === "pending"
        ? "warning"
        : "destructive";
  return <Badge variant={variant}>{labels[status] ?? status}</Badge>;
}
