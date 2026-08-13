import type { Locator, Page } from "playwright";
import { parseVisibleCount } from "@/lib/metrics";
import type { DiscoveredVideo, VisibleMetrics } from "@/collector/types";

const VIDEO_ID_PATTERN = /\/video\/(\d+)/;
const DATE_PATTERNS = [/(20\d{2})[-/.年](\d{1,2})[-/.月](\d{1,2})日?/, /(\d{1,2})[-/.月](\d{1,2})日?/];

export function parsePublishedDate(text: string, now = new Date()) {
  const exactDateTime = text.match(
    /(?:发布时间[:：]\s*)?(20\d{2})[-/.年](\d{1,2})[-/.月](\d{1,2})日?\s+(\d{1,2}):(\d{2})/,
  );
  if (exactDateTime) {
    const [, year, month, day, hour, minute] = exactDateTime;
    return new Date(
      `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}T${hour.padStart(2, "0")}:${minute}:00+08:00`,
    ).toISOString();
  }
  if (/\d+\s*(小时前|分钟前)/.test(text) || /刚刚|今天/.test(text)) return now.toISOString();
  if (/昨天/.test(text)) {
    const date = new Date(now);
    date.setDate(date.getDate() - 1);
    return date.toISOString();
  }
  for (const [index, pattern] of DATE_PATTERNS.entries()) {
    const match = text.match(pattern);
    if (!match) continue;
    const year = index === 0 ? Number(match[1]) : now.getFullYear();
    const month = Number(index === 0 ? match[2] : match[1]);
    const day = Number(index === 0 ? match[3] : match[2]);
    const result = new Date(Date.UTC(year, month - 1, day, 12));
    if (index === 1 && result.getTime() > now.getTime() + 86_400_000) result.setUTCFullYear(year - 1);
    return result.toISOString();
  }
  return null;
}

export async function detectBlocker(page: Page) {
  const body = (await page.locator("body").innerText({ timeout: 15_000 })).slice(0, 12_000);
  if (/验证码|安全验证|完成验证|拖动滑块|访问过于频繁/.test(body)) return "challenge";
  if (/登录后即可|扫码登录|验证码登录|密码登录/.test(body) && !/退出登录/.test(body)) return "login_required";
  return null;
}

export async function extractProfileVideoCount(page: Page) {
  const body = await page.locator("body").innerText();
  const match = body.match(/(?:作品|视频)\s*([\d,.万亿wWkK]+)\s*(?:个|条)?/);
  return match ? parseVisibleCount(match[1]) : null;
}

export async function extractProfileName(page: Page) {
  const candidates = [
    page.locator("h1"),
    page.locator('[data-e2e="user-title"]'),
    page.locator('[class*="user-info"] h2'),
  ];
  for (const locator of candidates) {
    const text = await locator
      .first()
      .innerText({ timeout: 1_500 })
      .catch(() => "");
    const normalized = cleanProfileName(text);
    if (normalized) return normalized;
  }
  const metadata = await page.evaluate(() => ({
    openGraphTitle: document.querySelector('meta[property="og:title"]')?.getAttribute("content") ?? "",
    title: document.title,
  }));
  return cleanProfileName(metadata.openGraphTitle) ?? cleanProfileName(metadata.title);
}

export function cleanProfileName(value: string | null | undefined) {
  if (!value) return null;
  const normalized = value
    .replace(/[-_|｜]\s*抖音.*$/u, "")
    .replace(/的抖音主页.*$/u, "")
    .replace(/抖音号[:：].*$/u, "")
    .trim();
  if (!normalized || normalized === "抖音" || normalized.length > 80) return null;
  return normalized;
}

export async function discoverVisibleVideos(page: Page, profileName: string | null) {
  return page.locator('a[href*="/video/"]:has(img[alt])').evaluateAll((anchors, expectedName) => {
    const seen = new Set<string>();
    return anchors.flatMap((anchor) => {
      const element = anchor as HTMLAnchorElement;
      const absolute = new URL(element.href, window.location.origin).toString().split("?")[0];
      if (seen.has(absolute)) return [];
      const image = element.querySelector("img");
      const imageAlt = image?.getAttribute("alt")?.trim() ?? "";
      if (
        expectedName &&
        !imageAlt.startsWith(`${expectedName}：`) &&
        !imageAlt.startsWith(`${expectedName}:`)
      ) {
        return [];
      }
      seen.add(absolute);
      return [
        {
          href: absolute,
          title: imageAlt || element.getAttribute("aria-label") || null,
          text: "",
        },
      ];
    });
  }, profileName);
}

export function toDiscoveredVideo(
  item: { href: string; title: string | null; text: string },
  now = new Date(),
): DiscoveredVideo {
  return {
    douyinVideoId: item.href.match(VIDEO_ID_PATTERN)?.[1] ?? null,
    videoUrl: item.href,
    title: item.title,
    publishedAt: parsePublishedDate(item.text, now),
  };
}

async function firstVisibleText(locators: Locator[]) {
  for (const locator of locators) {
    const count = await locator.count();
    for (let index = 0; index < Math.min(count, 4); index += 1) {
      const item = locator.nth(index);
      if (await item.isVisible().catch(() => false)) {
        const text =
          (await item.getAttribute("aria-label")) ??
          (await item.getAttribute("title")) ??
          (await item.innerText().catch(() => ""));
        if (text?.trim()) return text.trim();
      }
    }
  }
  return null;
}

async function metricText(page: Page, labels: string[]) {
  const expression = labels.join("|");
  return firstVisibleText([
    page.locator(`[aria-label*="${labels[0]}"]`),
    page.locator(`[title*="${labels[0]}"]`),
    page.getByText(new RegExp(`^(?:${expression})?\\s*[\\d,.万亿wWkK]+\\s*(?:${expression})?$`)),
  ]);
}

async function metricContainerText(page: Page, selector: string) {
  const containers = page.locator(selector);
  const count = await containers.count();
  for (let index = 0; index < count; index += 1) {
    const container = containers.nth(index);
    const text = (await container.innerText().catch(() => "")).trim();
    const value = text.match(/[\d,.]+\s*[万亿wWkK]?/)?.[0];
    if (value) return value;
  }
  return null;
}

function metric(raw: string | null) {
  const numberText = raw?.match(/[\d,.]+\s*[万亿wWkK]?/)?.[0] ?? raw;
  return { raw, value: parseVisibleCount(numberText) };
}

export function parseVisibleMetricSet(
  likeRaw: string | null,
  collectRaw: string | null,
  commentRaw: string | null,
  shareRaw: string | null,
): VisibleMetrics {
  const result = {
    like: metric(likeRaw),
    collect: metric(collectRaw),
    comment: metric(commentRaw),
    share: metric(shareRaw),
    qualityFlags: [] as string[],
  };
  for (const [key, value] of Object.entries(result)) {
    if (key !== "qualityFlags" && (value as { value: number | null }).value === null)
      result.qualityFlags.push(`missing_${key}`);
  }
  return result;
}

export async function extractVisibleMetrics(page: Page): Promise<VisibleMetrics> {
  const [semanticLike, semanticCollect, semanticComment, semanticShare] = await Promise.all([
    metricContainerText(page, '[data-e2e="video-player-digg"]'),
    metricContainerText(page, '[data-e2e="video-player-collect"]'),
    metricContainerText(page, '[data-e2e="feed-comment-icon"]'),
    metricContainerText(page, '[data-e2e="video-player-share"]'),
  ]);
  const [likeRaw, collectRaw, commentRaw, shareRaw] = await Promise.all([
    semanticLike ? Promise.resolve(semanticLike) : metricText(page, ["点赞", "赞"]),
    semanticCollect ? Promise.resolve(semanticCollect) : metricText(page, ["收藏"]),
    semanticComment ? Promise.resolve(semanticComment) : metricText(page, ["评论"]),
    semanticShare ? Promise.resolve(semanticShare) : metricText(page, ["分享", "转发"]),
  ]);
  return parseVisibleMetricSet(likeRaw, collectRaw, commentRaw, shareRaw);
}

export async function extractVideoMetadata(page: Page) {
  const body = (await page.locator("body").innerText({ timeout: 10_000 })).slice(0, 20_000);
  const publishedText = body.match(
    /发布时间[:：]\s*20\d{2}[-/.年]\d{1,2}[-/.月]\d{1,2}日?(?:\s+\d{1,2}:\d{2})?/,
  )?.[0];
  const publishedAt = publishedText ? parsePublishedDate(publishedText) : null;
  const titleCandidates = [page.locator("h1"), page.locator('[data-e2e="video-desc"]')];
  let title: string | null = null;
  for (const locator of titleCandidates) {
    const value = (
      await locator
        .first()
        .innerText({ timeout: 1_000 })
        .catch(() => "")
    ).trim();
    if (value && value.length <= 300) {
      title = value;
      break;
    }
  }
  return { publishedAt, title };
}
