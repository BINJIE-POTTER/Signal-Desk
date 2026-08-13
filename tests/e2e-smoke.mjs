import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true, channel: "chrome" });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const consoleErrors = [];
  const badResponses = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("response", (response) => {
    if (response.status() >= 400) badResponses.push(`${response.status()} ${response.url()}`);
  });
  const baseUrl = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3000";
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  if (page.url().endsWith("/login")) {
    const username = process.env.E2E_USERNAME;
    const password = process.env.E2E_PASSWORD;
    if (!username || !password) throw new Error("Set E2E_USERNAME and E2E_PASSWORD to test authentication.");
    await page.getByLabel("用户名").fill(username);
    await page.getByLabel("密码").fill(password);
    await Promise.all([
      page.waitForURL(`${baseUrl}/`),
      page.getByRole("button", { name: /进入观测台/ }).click(),
    ]);
    await page.waitForLoadState("networkidle");
    consoleErrors.length = 0;
    badResponses.length = 0;
  }

  await page.getByRole("heading", { name: "数据总览" }).waitFor();
  await page.getByText("表现最佳视频").waitFor();
  const firstTitle = page.locator("tbody tr").first().locator("td").first().locator("span").first();
  await firstTitle.hover();
  await page.getByRole("tooltip").waitFor();
  await page.screenshot({ path: "/private/tmp/douyin-monitor-shadcn-overview.png", fullPage: true });

  for (const [button, heading] of [
    ["趋势", "趋势分析"],
    ["账号", "跟踪账号"],
    ["视频", "视频明细"],
    ["系统", "采集系统"],
  ]) {
    await page.getByRole("button", { name: new RegExp(`^${button}`) }).click();
    await page.getByRole("heading", { name: heading, exact: true }).waitFor();
  }

  await page.getByRole("button", { name: /^趋势/ }).click();
  await page.getByRole("radio", { name: "收藏" }).click();
  await page.getByRole("tab", { name: "采集趋势" }).click();
  await page
    .getByText(/首次采集基线|采集日期/)
    .first()
    .waitFor();
  await page.getByRole("tab", { name: "视频排行" }).click();
  await page.getByLabel("筛选账号").click();
  await page.getByRole("option").nth(1).click();
  await page
    .locator(".recharts-wrapper")
    .last()
    .hover({ position: { x: 700, y: 160 } });
  await page.screenshot({ path: "/private/tmp/douyin-monitor-shadcn-trends.png", fullPage: true });

  await page.getByRole("button", { name: /^视频/ }).click();
  await page.getByPlaceholder("搜索视频标题或账号").fill("峰哥");
  await page.getByLabel("视频排序").click();
  await page.getByRole("option", { name: "按点赞" }).click();
  await page.getByLabel("筛选视频账号").click();
  await page.getByRole("option").nth(1).click();
  await page.screenshot({ path: "/private/tmp/douyin-monitor-shadcn-videos.png", fullPage: true });

  await page.getByRole("button", { name: /^账号/ }).click();
  await page.getByPlaceholder("https://www.douyin.com/user/...").waitFor();
  if (process.env.E2E_EXPECT_ACCOUNT === "1") {
    await page.getByRole("button", { name: "暂停", exact: true }).first().waitFor();
    await page
      .getByRole("button", { name: /^移除 / })
      .first()
      .click();
    await page.getByRole("alertdialog").waitFor();
    await page.getByRole("button", { name: "取消" }).click();
  }

  const overflow = await page.evaluate(() => {
    const root = document.documentElement;
    return { scrollWidth: root.scrollWidth, clientWidth: root.clientWidth };
  });
  const legacy = await page.request.get(`${baseUrl}/videos`, { maxRedirects: 0 });
  if (![307, 308].includes(legacy.status()))
    throw new Error(`Expected legacy redirect, got ${legacy.status()}`);
  if (consoleErrors.length || badResponses.length)
    throw new Error(JSON.stringify({ consoleErrors, badResponses }));
  if (overflow.scrollWidth > overflow.clientWidth)
    throw new Error(`Horizontal overflow: ${JSON.stringify(overflow)}`);
  process.stdout.write(
    `${JSON.stringify({ consoleErrors, badResponses, overflow, legacyStatus: legacy.status() }, null, 2)}\n`,
  );
} finally {
  await browser.close();
}
