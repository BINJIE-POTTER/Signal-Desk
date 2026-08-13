import { getDb } from "@/lib/db";

const LEASE_NAME = "weekly-collector";

export function isCollectorRunning() {
  const row = getDb()
    .prepare(
      `
        SELECT EXISTS(
          SELECT 1 FROM job_lease
          WHERE name = ? AND datetime(expires_at) > datetime('now')
        ) running
      `,
    )
    .get(LEASE_NAME) as { running: number };

  return row.running === 1;
}
