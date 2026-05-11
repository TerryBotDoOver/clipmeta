import { NextRequest, NextResponse } from "next/server";
import { DISCORD_CHANNELS, sendDiscordMessage } from "@/lib/discord";

export const maxDuration = 300;

const SITE_URL = "https://clipmeta.app";
const SITEMAP_URL = `${SITE_URL}/sitemap.xml`;
const ROBOTS_URL = `${SITE_URL}/robots.txt`;
const LLMS_URL = `${SITE_URL}/llms.txt`;
const INDEXNOW_KEY = "0d6ff7a516024804a9ba423f4150cb24";
const INDEXNOW_KEY_URL = `${SITE_URL}/${INDEXNOW_KEY}.txt`;
const FETCH_TIMEOUT_MS = 15000;
const CONCURRENCY = 6;

type PageAudit = {
  url: string;
  status: number | null;
  ok: boolean;
  finalUrl?: string;
  canonical?: string;
  canonicalOk: boolean;
  hasOgTitle: boolean;
  hasOgDescription: boolean;
  hasOgImage: boolean;
  hasSchema: boolean;
  noindex: boolean;
  errors: string[];
};

type AssetAudit = {
  name: string;
  url: string;
  status: number | null;
  ok: boolean;
  errors: string[];
};

function authOk(req: NextRequest) {
  const expected = process.env.CRON_SECRET?.trim();
  if (!expected) return false;
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
  return token === expected;
}

function decodeXml(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function getAttribute(tag: string, name: string) {
  const match = tag.match(new RegExp(`${name}\\s*=\\s*["']([^"']+)["']`, "i"));
  return match?.[1]?.trim();
}

function firstTag(html: string, pattern: RegExp) {
  return html.match(pattern)?.[0] ?? "";
}

function getCanonical(html: string) {
  const tag = firstTag(html, /<link\b[^>]*rel=["'][^"']*\bcanonical\b[^"']*["'][^>]*>/i);
  return tag ? getAttribute(tag, "href") : undefined;
}

function hasMetaProperty(html: string, property: string) {
  const tags = html.match(/<meta\b[^>]*>/gi) ?? [];
  return tags.some((tag) => {
    const prop = getAttribute(tag, "property") || getAttribute(tag, "name");
    const content = getAttribute(tag, "content");
    return prop?.toLowerCase() === property.toLowerCase() && !!content;
  });
}

function hasNoindex(html: string) {
  const tags = html.match(/<meta\b[^>]*>/gi) ?? [];
  return tags.some((tag) => {
    const name = getAttribute(tag, "name");
    const content = getAttribute(tag, "content");
    return name?.toLowerCase() === "robots" && !!content?.toLowerCase().includes("noindex");
  });
}

async function fetchText(url: string) {
  const response = await fetch(url, {
    redirect: "follow",
    headers: { "user-agent": "ClipMeta SEO Audit" },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });

  const text = await response.text();
  return { response, text };
}

async function getSitemapUrls() {
  const { response, text } = await fetchText(SITEMAP_URL);
  if (!response.ok) {
    throw new Error(`Sitemap returned HTTP ${response.status}`);
  }

  return [...text.matchAll(/<loc>([^<]+)<\/loc>/g)]
    .map((match) => decodeXml(match[1].trim()))
    .filter((url) => url.startsWith(SITE_URL));
}

async function auditAsset(name: string, url: string, expectedBody?: string): Promise<AssetAudit> {
  try {
    const { response, text } = await fetchText(url);
    const errors: string[] = [];
    if (!response.ok) errors.push(`HTTP ${response.status}`);
    if (expectedBody && text.trim() !== expectedBody) errors.push("unexpected body");
    return { name, url, status: response.status, ok: errors.length === 0, errors };
  } catch (error) {
    return {
      name,
      url,
      status: null,
      ok: false,
      errors: [error instanceof Error ? error.message : "fetch failed"],
    };
  }
}

async function auditPage(url: string): Promise<PageAudit> {
  const errors: string[] = [];
  try {
    const { response, text } = await fetchText(url);
    const finalUrl = response.url;
    if (!response.ok) errors.push(`HTTP ${response.status}`);
    if (finalUrl.replace(/\/$/, "") !== url.replace(/\/$/, "")) errors.push(`redirects to ${finalUrl}`);

    const canonical = getCanonical(text);
    const canonicalOk = canonical?.replace(/\/$/, "") === url.replace(/\/$/, "");
    const noindex = hasNoindex(text);
    const hasOgTitle = hasMetaProperty(text, "og:title");
    const hasOgDescription = hasMetaProperty(text, "og:description");
    const hasOgImage = hasMetaProperty(text, "og:image");
    const hasSchema = text.includes('type="application/ld+json"') || text.includes("type='application/ld+json'");

    if (!canonical) errors.push("missing canonical");
    else if (!canonicalOk) errors.push(`canonical mismatch: ${canonical}`);
    if (noindex) errors.push("has noindex");
    if (!hasOgTitle) errors.push("missing og:title");
    if (!hasOgDescription) errors.push("missing og:description");
    if (!hasOgImage) errors.push("missing og:image");
    if (!hasSchema) errors.push("missing JSON-LD schema");

    return {
      url,
      status: response.status,
      ok: errors.length === 0,
      finalUrl,
      canonical,
      canonicalOk,
      hasOgTitle,
      hasOgDescription,
      hasOgImage,
      hasSchema,
      noindex,
      errors,
    };
  } catch (error) {
    return {
      url,
      status: null,
      ok: false,
      canonicalOk: false,
      hasOgTitle: false,
      hasOgDescription: false,
      hasOgImage: false,
      hasSchema: false,
      noindex: false,
      errors: [error instanceof Error ? error.message : "fetch failed"],
    };
  }
}

async function mapConcurrent<T, R>(items: T[], worker: (item: T) => Promise<R>) {
  const results: R[] = [];
  let index = 0;

  async function runWorker() {
    while (index < items.length) {
      const current = index;
      index += 1;
      results[current] = await worker(items[current]);
    }
  }

  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, items.length) }, runWorker));
  return results;
}

function summarizeIssues(pageAudits: PageAudit[], assetAudits: AssetAudit[]) {
  const pageIssues = pageAudits.filter((audit) => !audit.ok);
  const assetIssues = assetAudits.filter((audit) => !audit.ok);
  const lines: string[] = [];

  for (const audit of pageIssues.slice(0, 12)) {
    lines.push(`- ${audit.url.replace(SITE_URL, "") || "/"}: ${audit.errors.join("; ")}`);
  }
  for (const audit of assetIssues.slice(0, 6)) {
    lines.push(`- ${audit.name}: ${audit.errors.join("; ")}`);
  }

  const hidden = pageIssues.length + assetIssues.length - lines.length;
  if (hidden > 0) lines.push(`- plus ${hidden} more issue(s)`);
  return lines;
}

function buildDiscordReport(pageAudits: PageAudit[], assetAudits: AssetAudit[], startedAt: Date) {
  const pageIssues = pageAudits.filter((audit) => !audit.ok);
  const assetIssues = assetAudits.filter((audit) => !audit.ok);
  const missingCanonical = pageAudits.filter((audit) => !audit.canonicalOk).length;
  const missingOg = pageAudits.filter((audit) => !audit.hasOgTitle || !audit.hasOgDescription || !audit.hasOgImage).length;
  const missingSchema = pageAudits.filter((audit) => !audit.hasSchema).length;
  const noindex = pageAudits.filter((audit) => audit.noindex).length;
  const ok = pageIssues.length === 0 && assetIssues.length === 0;
  const issueLines = summarizeIssues(pageAudits, assetAudits);
  const durationMs = Date.now() - startedAt.getTime();

  return [
    ok ? "**ClipMeta SEO audit: clean**" : "**ClipMeta SEO audit: issues found**",
    `Checked: ${pageAudits.length} sitemap URLs + ${assetAudits.length} technical files`,
    `Broken/problem pages: ${pageIssues.length}`,
    `Technical file issues: ${assetIssues.length}`,
    `Canonical issues: ${missingCanonical}`,
    `OG preview issues: ${missingOg}`,
    `Missing JSON-LD schema: ${missingSchema}`,
    `Noindex pages: ${noindex}`,
    "Search Console/Bing index counts: not connected yet",
    `Duration: ${Math.round(durationMs / 1000)}s`,
    issueLines.length > 0 ? "\nTop issues:\n" + issueLines.join("\n") : "",
  ].filter(Boolean).join("\n");
}

async function handle(req: NextRequest) {
  if (!authOk(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startedAt = new Date();
  const url = new URL(req.url);
  const dryRun = url.searchParams.get("dry_run") === "1";

  const sitemapUrls = await getSitemapUrls();
  const [pageAudits, assetAudits] = await Promise.all([
    mapConcurrent(sitemapUrls, auditPage),
    Promise.all([
      auditAsset("robots.txt", ROBOTS_URL),
      auditAsset("llms.txt", LLMS_URL),
      auditAsset("IndexNow key", INDEXNOW_KEY_URL, INDEXNOW_KEY),
    ]),
  ]);

  const report = buildDiscordReport(pageAudits, assetAudits, startedAt);
  let discord: Awaited<ReturnType<typeof sendDiscordMessage>> | null = null;
  if (!dryRun) {
    discord = await sendDiscordMessage({
      channelId: DISCORD_CHANNELS.ops,
      content: report,
    });
  }

  return NextResponse.json({
    ok: pageAudits.every((audit) => audit.ok) && assetAudits.every((audit) => audit.ok),
    dry_run: dryRun,
    report,
    pages_checked: pageAudits.length,
    assets_checked: assetAudits.length,
    page_issues: pageAudits.filter((audit) => !audit.ok).length,
    asset_issues: assetAudits.filter((audit) => !audit.ok).length,
    discord,
  });
}

export async function GET(req: NextRequest) {
  return handle(req);
}

export async function POST(req: NextRequest) {
  return handle(req);
}
