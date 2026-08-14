import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true, channel: "chrome" });
try {
  const baseUrl = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3000";
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  if (process.env.E2E_SESSION_TOKEN) {
    await context.addCookies([
      {
        name: "douyin_monitor_session",
        value: process.env.E2E_SESSION_TOKEN,
        url: baseUrl,
        httpOnly: true,
        sameSite: "Strict",
      },
    ]);
  }
  const page = await context.newPage();
  const consoleErrors = [];
  const badResponses = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("response", (response) => {
    if (response.status() >= 400) badResponses.push(`${response.status()} ${response.url()}`);
  });
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
  await page.getByText("本次观察").waitFor();
  if (await page.locator(".recharts-wrapper").count())
    throw new Error("Overview should not repeat trend charts");
  const overviewTooltipTarget = page
    .locator("main")
    .getByText(/和解剖了|第23集|峰哥/)
    .first();
  await overviewTooltipTarget.hover();
  await page.getByRole("tooltip").waitFor();
  await page.screenshot({ path: "/private/tmp/douyin-monitor-shadcn-overview.png" });

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
  const rankingChart = page.locator(".recharts-wrapper").last();
  const titleLayout = await rankingChart.evaluate((chart) => {
    const chartBounds = chart.getBoundingClientRect();
    const labels = [...chart.querySelectorAll(".recharts-yAxis .recharts-cartesian-axis-tick text")];
    return {
      chartLeft: chartBounds.left,
      labelLefts: labels.map((label) => label.getBoundingClientRect().left),
      lineCounts: labels.map((label) => label.querySelectorAll("tspan").length),
    };
  });
  if (!titleLayout.labelLefts.length) throw new Error("Ranking chart must render video title labels");
  if (titleLayout.labelLefts.some((left) => left < titleLayout.chartLeft)) {
    throw new Error(`Ranking title overflow: ${JSON.stringify(titleLayout)}`);
  }
  if (titleLayout.lineCounts.some((count) => count < 1 || count > 2)) {
    throw new Error(`Ranking titles must use one or two lines: ${JSON.stringify(titleLayout)}`);
  }
  await page
    .locator(".recharts-wrapper")
    .last()
    .hover({ position: { x: 700, y: 160 }, force: true });
  await page.screenshot({ path: "/private/tmp/douyin-monitor-shadcn-trends.png" });

  await page.getByRole("button", { name: /^视频/ }).click();
  if ((await page.getByLabel("每页显示数量").textContent())?.trim() !== "50") {
    throw new Error("Tables must default to 50 rows per page");
  }
  await page.getByText(/显示 1–50，共/).waitFor();
  await page.getByLabel("下一页").click();
  await page.getByText(/显示 51–/).waitFor();
  await page.getByLabel("上一页").click();
  await page.getByPlaceholder("搜索标题或账号").fill("峰哥");
  await page.getByLabel("视频排序").click();
  await page.getByRole("option", { name: "按点赞" }).click();
  await page.getByLabel("排序方向：降序").click();
  await page.getByText("当前按点赞升序排列").waitFor();
  await page.getByRole("button", { name: /点赞，当前升序，点击按降序排列/ }).click();
  await page.getByText("当前按点赞降序排列").waitFor();
  await page.getByLabel("筛选视频账号").click();
  await page.getByRole("option").nth(1).click();
  await page.getByLabel("每页显示数量").click();
  await page.getByRole("option", { name: "25" }).click();
  await page.getByText(/显示 1–21，共 21 条|显示 1–25/).waitFor();
  await page.locator("main").evaluate((element) => element.scrollTo({ top: 0 }));
  await page.screenshot({ path: "/private/tmp/douyin-monitor-shadcn-videos.png" });

  await page.getByRole("button", { name: /^账号/ }).click();
  await page.getByPlaceholder("https://www.douyin.com/user/...").waitFor();
  await page.screenshot({ path: "/private/tmp/douyin-monitor-shadcn-accounts.png" });
  if (process.env.E2E_EXPECT_ACCOUNT === "1") {
    await page.getByRole("button", { name: "暂停", exact: true }).first().waitFor();
    await page
      .getByRole("button", { name: /^移除 / })
      .first()
      .click();
    await page.getByRole("alertdialog").waitFor();
    await page.getByRole("button", { name: "取消" }).click();
  }

  await page.getByRole("button", { name: /^系统/ }).click();
  await page.getByRole("button", { name: "启动全量采集" }).click();
  const collectorDialog = page.getByRole("alertdialog");
  await collectorDialog.waitFor();
  await collectorDialog.getByText("任务可能持续数十分钟").waitFor();
  await page.getByRole("button", { name: "取消" }).click();
  await page.screenshot({ path: "/private/tmp/douyin-monitor-shadcn-system.png" });

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
