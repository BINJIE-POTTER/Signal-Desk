import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { isCollectorRunning } from "@/server/repositories/collector";

export async function startCollectorProcess({ accountId }: { accountId?: number }) {
  const alreadyRunning = isCollectorRunning();
  if (alreadyRunning && !accountId) return false;

  const artifactDirectory = path.join(process.cwd(), "artifacts");
  fs.mkdirSync(artifactDirectory, { recursive: true });
  const output = fs.openSync(path.join(artifactDirectory, "manual-collector.log"), "a");
  try {
    const child = spawn("/usr/bin/env", ["npm", "run", "collect"], {
      cwd: process.cwd(),
      detached: true,
      env: {
        ...process.env,
        COLLECTOR_TRIGGER: "manual",
        ...(accountId ? { COLLECTOR_ACCOUNT_ID: String(accountId) } : {}),
      },
      stdio: ["ignore", output, output],
    });
    child.unref();
  } finally {
    fs.closeSync(output);
  }

  if (!alreadyRunning) {
    for (let attempt = 0; attempt < 20; attempt += 1) {
      await new Promise<void>((resolve) => setTimeout(resolve, 100));
      if (isCollectorRunning()) break;
    }
  }

  return true;
}
