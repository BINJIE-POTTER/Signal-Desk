import { getDb } from "@/lib/db";

export function addAccount(profileUrl: string) {
  const douyinAccountId = profileUrl.match(/\/user\/([^/?]+)/)?.[1];
  const temporaryName = douyinAccountId ? `待识别 · ${douyinAccountId.slice(-6)}` : "待识别账号";
  const result = getDb()
    .prepare(
      `
        INSERT INTO accounts (nickname, profile_url, douyin_account_id, last_scan_status)
        VALUES (?, ?, ?, 'pending')
        ON CONFLICT(profile_url) DO UPDATE SET
          enabled = 1,
          last_scan_status = 'pending',
          updated_at = CURRENT_TIMESTAMP
        RETURNING id
      `,
    )
    .get(temporaryName, profileUrl, douyinAccountId ?? null) as { id: number };

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
