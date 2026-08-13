import { cache } from "react";
import { getDb } from "@/lib/db";

export type MetricKey = "like" | "collect" | "comment" | "share";

type DashboardSummary = {
  enabledAccounts: number;
  trackedVideos: number;
  newVideos: number;
  latestRunStatus: string;
  latestRunAt: string | null;
  successRate: number;
  hasComparison: boolean;
  deltas: Record<MetricKey, number>;
};

const snapshotWindowSql = `
  WITH ranked AS (
    SELECT ms.*, ROW_NUMBER() OVER (PARTITION BY ms.video_id ORDER BY ms.captured_at DESC) rank
    FROM metric_snapshots ms
    WHERE ms.capture_status IN ('success', 'partial')
  )
`;

export const getDashboardSummary = cache((): DashboardSummary => {
  const db = getDb();
  const counts = db
    .prepare(
      `
    SELECT
      (SELECT COUNT(*) FROM accounts WHERE enabled = 1) enabled_accounts,
      (SELECT COUNT(*) FROM videos WHERE status = 'active' AND datetime(published_at) >= datetime('now', '-90 days')) tracked_videos,
      (SELECT COUNT(*) FROM videos WHERE status = 'active' AND datetime(first_seen_at) >= datetime('now', '-14 days')) new_videos
  `,
    )
    .get() as { enabled_accounts: number; tracked_videos: number; new_videos: number };
  const run = db.prepare("SELECT * FROM crawl_runs ORDER BY started_at DESC LIMIT 1").get() as
    Record<string, number | string | null> | undefined;
  const delta = db
    .prepare(
      `${snapshotWindowSql}, paired AS (
      SELECT video_id,
        MAX(CASE WHEN rank = 1 THEN like_count END) current_like, MAX(CASE WHEN rank = 2 THEN like_count END) previous_like,
        MAX(CASE WHEN rank = 1 THEN collect_count END) current_collect, MAX(CASE WHEN rank = 2 THEN collect_count END) previous_collect,
        MAX(CASE WHEN rank = 1 THEN comment_count END) current_comment, MAX(CASE WHEN rank = 2 THEN comment_count END) previous_comment,
        MAX(CASE WHEN rank = 1 THEN visible_share_count END) current_share, MAX(CASE WHEN rank = 2 THEN visible_share_count END) previous_share
      FROM ranked WHERE rank <= 2 GROUP BY video_id
    )
    SELECT
      COALESCE(SUM(CASE WHEN current_like IS NOT NULL AND previous_like IS NOT NULL THEN current_like - previous_like ELSE 0 END), 0) like_delta,
      COALESCE(SUM(CASE WHEN current_collect IS NOT NULL AND previous_collect IS NOT NULL THEN current_collect - previous_collect ELSE 0 END), 0) collect_delta,
      COALESCE(SUM(CASE WHEN current_comment IS NOT NULL AND previous_comment IS NOT NULL THEN current_comment - previous_comment ELSE 0 END), 0) comment_delta,
      COALESCE(SUM(CASE WHEN current_share IS NOT NULL AND previous_share IS NOT NULL THEN current_share - previous_share ELSE 0 END), 0) share_delta
    FROM paired
  `,
    )
    .get() as { like_delta: number; collect_delta: number; comment_delta: number; share_delta: number };
  const total =
    Number(run?.videos_succeeded ?? 0) + Number(run?.videos_partial ?? 0) + Number(run?.videos_failed ?? 0);
  const passed = Number(run?.videos_succeeded ?? 0) + Number(run?.videos_partial ?? 0);
  return {
    enabledAccounts: counts.enabled_accounts,
    trackedVideos: counts.tracked_videos,
    newVideos: counts.new_videos,
    latestRunStatus: String(run?.status ?? "pending"),
    latestRunAt: run?.started_at ? String(run.started_at) : null,
    successRate: total ? Math.round((passed / total) * 100) : 0,
    hasComparison:
      Number(
        (
          db
            .prepare(
              "SELECT COUNT(DISTINCT substr(captured_at, 1, 10)) count FROM metric_snapshots WHERE capture_status IN ('success','partial')",
            )
            .get() as { count: number }
        ).count,
      ) >= 2,
    deltas: {
      like: delta.like_delta,
      collect: delta.collect_delta,
      comment: delta.comment_delta,
      share: delta.share_delta,
    },
  };
});

export const getTrendData = cache(() => {
  return getDb()
    .prepare(
      `
    WITH daily AS (
      SELECT ms.*, ROW_NUMBER() OVER (
        PARTITION BY ms.video_id, substr(ms.captured_at, 1, 10)
        ORDER BY ms.captured_at DESC
      ) rank
      FROM metric_snapshots ms
      WHERE ms.capture_status IN ('success','partial')
    )
    SELECT substr(d.captured_at, 1, 10) date, v.account_id accountId, v.id videoId,
      v.published_at publishedAt, d.like_count likes, d.collect_count collects,
      d.comment_count comments, d.visible_share_count shares
    FROM daily d JOIN videos v ON v.id = d.video_id
    WHERE d.rank = 1 AND datetime(v.published_at) >= datetime('now', '-90 days')
    ORDER BY date ASC, v.id ASC
  `,
    )
    .all() as Array<{
    date: string;
    accountId: number;
    videoId: number;
    publishedAt: string;
    likes: number;
    collects: number;
    comments: number;
    shares: number;
  }>;
});

export const getAccountPerformance = cache(() => {
  return getDb()
    .prepare(
      `${snapshotWindowSql}
    SELECT a.id, a.nickname, a.profile_url profileUrl, a.profile_video_count profileVideoCount,
      a.last_scanned_at lastScannedAt, a.last_scan_status lastScanStatus,
      COUNT(DISTINCT CASE WHEN v.status = 'active' THEN v.id END) trackedVideos,
      COALESCE(SUM(CASE WHEN r.rank = 1 THEN r.like_count ELSE 0 END), 0) likes,
      COALESCE(SUM(CASE WHEN r.rank = 1 THEN r.collect_count ELSE 0 END), 0) collects,
      COALESCE(SUM(CASE WHEN r.rank = 1 THEN r.comment_count ELSE 0 END), 0) comments,
      COALESCE(SUM(CASE WHEN r.rank = 1 THEN r.visible_share_count ELSE 0 END), 0) shares
    FROM accounts a
    LEFT JOIN videos v ON v.account_id = a.id AND datetime(v.published_at) >= datetime('now', '-90 days')
    LEFT JOIN ranked r ON r.video_id = v.id AND r.rank = 1
    WHERE a.enabled = 1
    GROUP BY a.id ORDER BY likes DESC
  `,
    )
    .all() as Array<Record<string, number | string | null>>;
});

export const getRecentVideos = cache((limit = 12) => {
  return getDb()
    .prepare(
      `${snapshotWindowSql}
    SELECT v.id, v.account_id accountId, v.title, v.video_url videoUrl, v.published_at publishedAt, v.status,
      a.nickname accountName, r.captured_at capturedAt,
      r.like_count likes, r.collect_count collects, r.comment_count comments,
      r.visible_share_count shares, r.capture_status captureStatus, r.quality_flags qualityFlags
    FROM videos v JOIN accounts a ON a.id = v.account_id
    LEFT JOIN ranked r ON r.video_id = v.id AND r.rank = 1
    WHERE datetime(v.published_at) >= datetime('now', '-90 days')
    ORDER BY datetime(v.published_at) DESC LIMIT ?
  `,
    )
    .all(limit) as Array<Record<string, number | string | null>>;
});

export const getRunHistory = cache((limit = 10) => {
  return getDb()
    .prepare(
      `
    SELECT cr.*,
      (SELECT COUNT(*) FROM crawl_errors ce WHERE ce.crawl_run_id = cr.id) error_count
    FROM crawl_runs cr ORDER BY cr.started_at DESC LIMIT ?
  `,
    )
    .all(limit) as Array<Record<string, number | string | null>>;
});

export const getErrors = cache((limit = 20) => {
  return getDb()
    .prepare(
      `
    SELECT ce.*, a.nickname account_name, v.title video_title
    FROM crawl_errors ce
    LEFT JOIN accounts a ON a.id = ce.account_id
    LEFT JOIN videos v ON v.id = ce.video_id
    ORDER BY ce.created_at DESC LIMIT ?
  `,
    )
    .all(limit) as Array<Record<string, number | string | null>>;
});

export function listAccounts() {
  return getDb().prepare("SELECT * FROM accounts ORDER BY enabled DESC, nickname ASC").all() as Array<
    Record<string, number | string | null>
  >;
}

export function addAccount(profileUrl: string) {
  const accountId = profileUrl.match(/\/user\/([^/?]+)/)?.[1];
  const temporaryName = accountId ? `待识别 · ${accountId.slice(-6)}` : "待识别账号";
  const result = getDb()
    .prepare(
      `
    INSERT INTO accounts (nickname, profile_url, last_scan_status)
    VALUES (?, ?, 'pending')
    ON CONFLICT(profile_url) DO UPDATE SET enabled = 1, last_scan_status = 'pending', updated_at = CURRENT_TIMESTAMP
    RETURNING id
  `,
    )
    .get(temporaryName, profileUrl) as { id: number };
  return result.id;
}

export function setAccountEnabled(id: number, enabled: boolean) {
  return getDb()
    .prepare("UPDATE accounts SET enabled = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
    .run(enabled ? 1 : 0, id);
}

export function deleteAccount(id: number) {
  const db = getDb();
  const account = db.prepare("SELECT id FROM accounts WHERE id = ?").get(id) as { id: number } | undefined;
  if (!account) return false;
  db.transaction(() => {
    db.prepare(
      `
        DELETE FROM crawl_errors
        WHERE account_id = ?
          OR video_id IN (SELECT id FROM videos WHERE account_id = ?)
      `,
    ).run(id, id);
    db.prepare("DELETE FROM accounts WHERE id = ?").run(id);
  })();
  return true;
}
