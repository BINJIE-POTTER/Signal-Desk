import { requireSession } from "@/lib/auth";
import { getRecentVideos } from "@/lib/queries";

function csvCell(value: unknown) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

export async function GET() {
  await requireSession();
  const rows = getRecentVideos(10_000);
  const headers = [
    "账号",
    "标题",
    "链接",
    "发布时间",
    "点赞",
    "收藏",
    "评论",
    "可见分享",
    "采集时间",
    "状态",
  ];
  const body = [
    headers,
    ...rows.map((row) => [
      row.accountName,
      row.title,
      row.videoUrl,
      row.publishedAt,
      row.likes,
      row.collects,
      row.comments,
      row.shares,
      row.capturedAt,
      row.captureStatus,
    ]),
  ]
    .map((row) => row.map(csvCell).join(","))
    .join("\n");
  return new Response(`\uFEFF${body}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="douyin-monitor-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
