import os from "node:os";
import { getDb } from "@/lib/db";

const LEASE_NAME = "weekly-collector";
const owner = `${os.hostname()}:${process.pid}`;

export function acquireLease(ttlMinutes = 180) {
  const db = getDb();
  const now = new Date();
  const expires = new Date(now.getTime() + ttlMinutes * 60_000);
  const transaction = db.transaction(() => {
    db.prepare("DELETE FROM job_lease WHERE name = ? AND datetime(expires_at) <= datetime(?)").run(
      LEASE_NAME,
      now.toISOString(),
    );
    const result = db
      .prepare("INSERT OR IGNORE INTO job_lease (name, owner, acquired_at, expires_at) VALUES (?, ?, ?, ?)")
      .run(LEASE_NAME, owner, now.toISOString(), expires.toISOString());
    return result.changes === 1;
  });
  return transaction();
}

export function releaseLease() {
  getDb().prepare("DELETE FROM job_lease WHERE name = ? AND owner = ?").run(LEASE_NAME, owner);
}
