import { chromium } from "playwright";
import { env } from "@/lib/env";

async function main() {
  const context = await chromium.launchPersistentContext(env.COLLECTOR_PROFILE_DIR, {
    headless: false,
    channel: "chrome",
    viewport: null,
  });
  const page = context.pages()[0] ?? (await context.newPage());
  await page.goto("https://www.douyin.com/", { waitUntil: "domcontentloaded" });
  process.stdout.write("请在打开的 Chrome 中完成抖音登录。登录完成后，在终端按 Enter 保存并退出。\n");
  await new Promise<void>((resolve) => process.stdin.once("data", () => resolve()));
  await context.close();
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
