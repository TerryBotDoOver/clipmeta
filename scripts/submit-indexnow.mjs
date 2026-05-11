#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APP_DIR = path.resolve(__dirname, '..');

const DEFAULT_SITE_URL = 'https://clipmeta.app';
const DEFAULT_ENDPOINT = 'https://api.indexnow.org/indexnow';
const DEFAULT_KEY = '0d6ff7a516024804a9ba423f4150cb24';
const MAX_URLS_PER_POST = 10000;

function parseArgs(argv) {
  const options = {
    siteUrl: process.env.INDEXNOW_SITE_URL || DEFAULT_SITE_URL,
    endpoint: process.env.INDEXNOW_ENDPOINT || DEFAULT_ENDPOINT,
    key: process.env.INDEXNOW_KEY || DEFAULT_KEY,
    sitemap: false,
    dryRun: process.env.INDEXNOW_DRY_RUN === '1',
    file: null,
    urls: [],
  };

  for (const arg of argv) {
    if (arg === '--sitemap') {
      options.sitemap = true;
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg.startsWith('--site=')) {
      options.siteUrl = arg.slice('--site='.length);
    } else if (arg.startsWith('--endpoint=')) {
      options.endpoint = arg.slice('--endpoint='.length);
    } else if (arg.startsWith('--key=')) {
      options.key = arg.slice('--key='.length);
    } else if (arg.startsWith('--file=')) {
      options.file = arg.slice('--file='.length);
    } else if (arg.startsWith('--url=')) {
      options.urls.push(arg.slice('--url='.length));
    } else if (arg.startsWith('--urls=')) {
      options.urls.push(...arg.slice('--urls='.length).split(','));
    } else if (arg.startsWith('-')) {
      throw new Error(`Unknown option: ${arg}`);
    } else {
      options.urls.push(arg);
    }
  }

  if (!options.sitemap && !options.file && options.urls.length === 0) {
    options.sitemap = true;
  }

  return options;
}

function normalizeSiteUrl(siteUrl) {
  const parsed = new URL(siteUrl);
  parsed.pathname = '/';
  parsed.search = '';
  parsed.hash = '';
  return parsed.toString().replace(/\/$/, '');
}

function readUrlsFromFile(filePath) {
  const resolved = path.resolve(APP_DIR, filePath);
  return fs
    .readFileSync(resolved, 'utf8')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'));
}

async function readUrlsFromSitemap(siteUrl) {
  const sitemapUrl = `${siteUrl}/sitemap.xml`;
  const response = await fetch(sitemapUrl, {
    headers: {
      accept: 'application/xml,text/xml,text/plain;q=0.9,*/*;q=0.8',
      'user-agent': 'ClipMeta IndexNow Submitter',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to read sitemap: ${sitemapUrl} returned ${response.status}`);
  }

  const xml = await response.text();
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => decodeXml(match[1].trim()));
}

function decodeXml(value) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function getValidUrls(urls, siteUrl) {
  const site = new URL(siteUrl);
  const seen = new Set();
  const valid = [];
  const rejected = [];

  for (const rawUrl of urls) {
    const value = String(rawUrl || '').trim();
    if (!value) continue;

    try {
      const parsed = new URL(value);
      parsed.hash = '';

      if (!['http:', 'https:'].includes(parsed.protocol) || parsed.hostname !== site.hostname) {
        rejected.push(value);
        continue;
      }

      const normalized = parsed.toString();
      if (!seen.has(normalized)) {
        seen.add(normalized);
        valid.push(normalized);
      }
    } catch {
      rejected.push(value);
    }
  }

  return { valid, rejected };
}

function batchUrls(urls) {
  const batches = [];
  for (let i = 0; i < urls.length; i += MAX_URLS_PER_POST) {
    batches.push(urls.slice(i, i + MAX_URLS_PER_POST));
  }
  return batches;
}

async function submitBatch({ endpoint, host, key, keyLocation, urls, dryRun }) {
  const body = {
    host,
    key,
    keyLocation,
    urlList: urls,
  };

  if (dryRun) {
    console.log(`[IndexNow] Dry run: would submit ${urls.length} URL(s) to ${endpoint}`);
    console.log(JSON.stringify(body, null, 2));
    return { status: 0, ok: true, text: 'dry-run' };
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'user-agent': 'ClipMeta IndexNow Submitter',
    },
    body: JSON.stringify(body),
  });

  const text = await response.text();
  const ok = response.status === 200 || response.status === 202;
  if (!ok) {
    throw new Error(`IndexNow submission failed: HTTP ${response.status} ${text}`.trim());
  }

  return { status: response.status, ok, text };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const siteUrl = normalizeSiteUrl(options.siteUrl);
  const site = new URL(siteUrl);
  const keyLocation = `${siteUrl}/${options.key}.txt`;

  let urls = [...options.urls];
  if (options.file) urls.push(...readUrlsFromFile(options.file));
  if (options.sitemap) urls.push(...await readUrlsFromSitemap(siteUrl));

  const { valid, rejected } = getValidUrls(urls, siteUrl);
  if (rejected.length > 0) {
    console.warn(`[IndexNow] Skipped ${rejected.length} URL(s) that do not belong to ${site.hostname} or are invalid.`);
  }
  if (valid.length === 0) {
    console.log('[IndexNow] No valid URLs to submit.');
    return;
  }

  console.log(`[IndexNow] Submitting ${valid.length} URL(s) for ${site.hostname}`);
  for (const batch of batchUrls(valid)) {
    const result = await submitBatch({
      endpoint: options.endpoint,
      host: site.hostname,
      key: options.key,
      keyLocation,
      urls: batch,
      dryRun: options.dryRun,
    });
    console.log(`[IndexNow] Submitted ${batch.length} URL(s): ${options.dryRun ? 'dry-run' : `HTTP ${result.status}`}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
