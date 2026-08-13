const CHINESE_COUNT_PATTERN = /^([\d,.]+)\s*([万亿wWkK]?)$/;

export function parseVisibleCount(input: string | null | undefined): number | null {
  if (!input) return null;
  const normalized = input
    .trim()
    .replace(/,/g, "")
    .replace(/次|人|赞|评论|收藏|分享|转发/g, "");
  if (["-", "--", "—", ""].includes(normalized)) return null;
  const match = normalized.match(CHINESE_COUNT_PATTERN);
  if (!match) return null;
  const numeric = Number(match[1]);
  if (!Number.isFinite(numeric)) return null;
  const unit = match[2].toLowerCase();
  const multiplier =
    unit === "万" || unit === "w" ? 10_000 : unit === "亿" ? 100_000_000 : unit === "k" ? 1_000 : 1;
  return Math.round(numeric * multiplier);
}

export function calculateDelta(current: number | null, previous: number | null) {
  if (current === null || previous === null) return { value: null, flags: [] as string[] };
  const value = current - previous;
  return { value, flags: value < 0 ? ["negative_delta"] : [] };
}

export function trackingUntil(publishedAt: string) {
  const date = new Date(publishedAt);
  date.setUTCDate(date.getUTCDate() + 90);
  return date.toISOString();
}
