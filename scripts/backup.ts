import fs from "node:fs";
import path from "node:path";
import { closeDb, getDb } from "@/lib/db";

async function main() {
  const directory = path.join(process.cwd(), "data", "backups");
  fs.mkdirSync(directory, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const destination = path.join(directory, `douyin-monitor-${stamp}.db`);
  await getDb().backup(destination);
  const backups = fs
    .readdirSync(directory)
    .filter((name) => name.endsWith(".db"))
    .sort()
    .reverse();
  for (const stale of backups.slice(30)) fs.unlinkSync(path.join(directory, stale));
  process.stdout.write(`Backup written to ${destination}\n`);
  closeDb();
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
