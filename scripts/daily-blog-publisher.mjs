#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APP_DIR = path.resolve(__dirname, '..');
const WORKSPACE_DIR = '/mnt/c/Users/levic/.openclaw/workspace';
const CALENDAR_PATH = path.join(WORKSPACE_DIR, 'dashboard', 'data', 'blog-calendar.json');
const BLOG_DIR = path.join(APP_DIR, 'src', 'content', 'blog');
const ENV_PATH = path.join(APP_DIR, '.env.local');
function getEnvValue(name) {
  if (process.env[name]) return process.env[name];
  if (!fs.existsSync(ENV_PATH)) return null;
  const env = fs.readFileSync(ENV_PATH, 'utf8');
  const match = env.match(new RegExp(`^${name}=(.+)$`, 'm'));
  return match ? match[1].trim().replace(/^['"]|['"]$/g, '') : null;
}

const VERCEL_TOKEN = getEnvValue('VERCEL_TOKEN');

const TOPIC_POOL = [
  { slug: 'metadata-review-checklist-stock-footage', title: 'The Stock Footage Metadata Review Checklist Before You Upload', focus: 'metadata checklist, stock footage upload, keyword review' },
  { slug: 'blackbox-keywording-mistakes-stock-footage', title: 'Common Blackbox Keywording Mistakes That Make Footage Harder to Find', focus: 'Blackbox, keywording mistakes, stock footage discoverability' },
  { slug: 'drone-footage-keyword-workflow', title: 'A Practical Keyword Workflow for Drone Footage Contributors', focus: 'drone footage, aerial metadata, stock footage keywords' },
  { slug: 'pond5-adobe-shutterstock-metadata-differences', title: 'Pond5 vs Adobe Stock vs Shutterstock Metadata: What Actually Changes', focus: 'Pond5, Adobe Stock, Shutterstock, metadata differences, CSV export' },
  { slug: 'stock-footage-metadata-template', title: 'A Stock Footage Metadata Template You Can Reuse Before Every Upload', focus: 'stock footage metadata template, reusable upload checklist, title description keywords' },
  { slug: 'shutterstock-video-keywording-guide', title: 'Shutterstock Video Keywording Guide for Stock Footage Contributors', focus: 'Shutterstock video keywords, stock footage keywording, upload metadata' },
  { slug: 'adobe-stock-video-title-description-guide', title: 'Adobe Stock Video Titles and Descriptions: What Contributors Should Write', focus: 'Adobe Stock video titles, stock footage descriptions, contributor metadata' },
  { slug: 'pond5-keyword-count-strategy', title: 'How Many Keywords Should You Use on Pond5?', focus: 'Pond5 keywords, keyword count, stock footage metadata strategy' },
  { slug: 'blackbox-editorial-metadata-guide', title: 'Blackbox Editorial Metadata: Dates, Locations, Captions, and Keywords', focus: 'Blackbox editorial metadata, editorial date, location, caption, stock footage' },
  { slug: 'stock-footage-csv-export-errors', title: 'Common Stock Footage CSV Export Errors and How to Catch Them', focus: 'CSV export errors, stock footage upload, metadata validation' },
  { slug: 'buyer-search-intent-stock-footage', title: 'How Buyer Search Intent Should Shape Your Stock Footage Keywords', focus: 'buyer search intent, stock footage keywords, metadata strategy' },
  { slug: 'metadata-for-travel-stock-footage', title: 'Metadata Tips for Travel Stock Footage Contributors', focus: 'travel stock footage, destination keywords, stock video metadata' },
  { slug: 'metadata-for-business-stock-footage', title: 'Metadata Tips for Business and Office Stock Footage', focus: 'business stock footage, office video keywords, commercial buyer search' },
  { slug: 'metadata-for-seasonal-stock-footage', title: 'How to Keyword Seasonal Stock Footage for Year Round Search', focus: 'seasonal stock footage, holiday video keywords, evergreen metadata' },
  { slug: 'avoid-spammy-stock-footage-keywords', title: 'How to Avoid Spammy Keywords in Stock Footage Metadata', focus: 'spammy keywords, stock footage metadata quality, keyword relevance' },
  { slug: 'batch-keywording-stock-footage', title: 'Batch Keywording Stock Footage Without Making Every Clip Sound the Same', focus: 'batch keywording, stock footage metadata variation, similar clips' },
  { slug: 'stock-footage-title-formulas', title: 'Stock Footage Title Formulas That Stay Clear and Searchable', focus: 'stock footage titles, searchable video titles, metadata formulas' },
  { slug: 'description-writing-stock-footage', title: 'How to Write Better Stock Footage Descriptions Without Overdoing It', focus: 'stock footage descriptions, metadata writing, buyer clarity' },
  { slug: 'blackbox-vs-direct-upload-metadata', title: 'Blackbox vs Direct Upload Metadata: What Contributors Should Change', focus: 'Blackbox, direct upload, Shutterstock, Adobe Stock, Pond5 metadata' },
  { slug: 'stock-footage-keyword-audit', title: 'How to Audit Keywords Before Submitting Stock Footage', focus: 'keyword audit, stock footage submission, metadata checklist' },
  { slug: 'clipmeta-vs-manual-keywording', title: 'AI Metadata vs Manual Keywording for Stock Footage: Where Each Works Best', focus: 'AI metadata, manual keywording, stock footage workflow' },
  { slug: 'metadata-for-drone-real-estate-footage', title: 'How to Keyword Drone Real Estate and Property Footage', focus: 'drone real estate footage, property video keywords, stock footage metadata' },
  { slug: 'metadata-for-nature-wildlife-footage', title: 'How to Keyword Nature and Wildlife Footage for Stock Sites', focus: 'nature footage, wildlife footage, stock video keywords' },
  { slug: 'stock-footage-upload-workflow', title: 'A Cleaner Stock Footage Upload Workflow from File Names to CSV', focus: 'stock footage upload workflow, file naming, CSV export, metadata' },
];

function todayLocalISO() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function getApiKey() {
  const env = fs.readFileSync(ENV_PATH, 'utf8');
  const match = env.match(/^OPENAI_API_KEY=(.+)$/m);
  return match ? match[1].trim().replace(/^['"]|['"]$/g, '') : process.env.OPENAI_API_KEY;
}

function slugify(title) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
}

function keywordsFrom(post) {
  if (Array.isArray(post.keywords) && post.keywords.length) return post.keywords;
  const source = `${post.title || ''} ${post.focus || ''}`.toLowerCase();
  const candidates = ['stock footage metadata', 'stock footage keywords', 'video metadata', 'Blackbox', 'Shutterstock', 'Adobe Stock', 'Pond5', 'CSV upload', 'AI keywording', 'drone footage', 'footage workflow'];
  const picked = candidates.filter(k => source.includes(k.toLowerCase().split(' ')[0]));
  return [...new Set([...picked, 'stock footage metadata', 'stock footage keywords'])].slice(0, 6);
}

function enrichPost(post, today) {
  const title = post.title || 'Stock Footage Metadata Best Practices for Contributors';
  const focus = post.focus || title;
  return {
    ...post,
    title,
    slug: post.slug || slugify(title),
    scheduledFor: post.scheduledFor || today,
    description: post.description || `A practical guide to ${focus} for stock footage contributors who want cleaner uploads and better buyer search visibility.`,
    keywords: keywordsFrom({ ...post, title, focus }),
    wordCount: post.wordCount || 1200,
    focus,
  };
}

function choosePost(calendar, today) {
  // Include posts left in written state. A failed build/deploy used to leave posts
  // as written, which made the scheduler skip them forever on future runs.
  const publishable = calendar.calendar.filter(p => p.status === 'scheduled' || p.status === 'written');
  const exactToday = publishable.find(p => p.scheduledFor === today);
  if (exactToday) return exactToday;

  const due = publishable.filter(p => p.scheduledFor <= today).sort((a, b) => String(b.scheduledFor).localeCompare(String(a.scheduledFor)))[0];
  if (due) return due;

  const usedSlugs = new Set(calendar.calendar.map(p => p.slug).filter(Boolean));
  const topic = TOPIC_POOL.find(t => !usedSlugs.has(t.slug)) || {
    slug: `stock-footage-metadata-tips-${today}`,
    title: `Stock Footage Metadata Tips for ${today}`,
    focus: 'stock footage metadata, daily contributor workflow, upload quality checks',
  };
  const newPost = { id: Math.max(0, ...calendar.calendar.map(p => Number(p.id) || 0)) + 1, ...topic, scheduledFor: today, status: 'scheduled' };
  calendar.calendar.push(newPost);
  return newPost;
}

async function generatePost(post) {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error('No OPENAI_API_KEY found');

  const systemPrompt = `You are a blog writer for ClipMeta, an AI metadata tool for stock footage contributors. Write SEO-optimized blog posts.

STYLE RULES:
- Conversational but authoritative tone
- No em dashes or en dashes anywhere. Use commas, periods, "but", and "and" instead.
- Use H2 and H3 headers for clear structure
- Include bullet points and numbered lists where useful
- Naturally mention ClipMeta 2 or 3 times, factual and not salesy
- End with this exact soft CTA: "Ready to try it? Start free at clipmeta.app, 3 clips/day, no credit card."
- Include an FAQ section at the bottom with 4 or 5 Q and A pairs
- Target word count: ${post.wordCount} words
- Write markdown with YAML frontmatter only, no code fence

FRONTMATTER FORMAT:
---
title: "${post.title}"
description: "${post.description}"
date: "${post.scheduledFor}"
author: "ClipMeta Team"
tags: ${JSON.stringify(post.keywords)}
---

AEO OPTIMIZATION:
- Answer the main question in the first 2 or 3 sentences
- Use clear, factual language in answer sections
- Structure H2s and H3s around common search queries
- FAQ section uses Q: and A: format under ## Frequently Asked Questions`;

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Write a blog post titled "${post.title}". Description: ${post.description}. Focus: ${post.focus}. Target keywords: ${post.keywords.join(', ')}. Word count: about ${post.wordCount} words.` },
      ],
      max_tokens: 4500,
      temperature: 0.65,
    }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(`OpenAI error ${res.status}: ${JSON.stringify(data).slice(0, 500)}`);
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error(`OpenAI returned no content: ${JSON.stringify(data).slice(0, 500)}`);
  return content.replace(/[—–]/g, ',');
}

function run(command, args, cwd) {
  const result = spawnSync(command, args, { cwd, stdio: 'pipe', shell: true, encoding: 'utf8' });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  return result;
}

function verifyLiveUrl(url) {
  const result = spawnSync('curl', ['-I', '-L', '-s', '-o', '/dev/null', '-w', '%{http_code}', url], {
    cwd: APP_DIR,
    stdio: 'pipe',
    shell: true,
    encoding: 'utf8',
  });
  const status = String(result.stdout || '').trim();
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.status !== 0 || status !== '200') {
    throw new Error(`Live URL verification failed for ${url}. curl_status=${result.status}, http_status=${status || 'none'}`);
  }
  console.log(`HTTP verification returned 200 for ${url}`);
}

function submitIndexNow(url) {
  console.log(`Submitting to IndexNow: ${url}`);
  const result = run('npm', ['run', 'seo:indexnow', '--', url], APP_DIR);
  if (result.status !== 0) {
    throw new Error(`IndexNow submission failed with status ${result.status}. Rerun npm run seo:indexnow -- ${url} to retry.`);
  }
  console.log(`IndexNow submission succeeded for ${url}`);
}

async function main() {
  fs.mkdirSync(BLOG_DIR, { recursive: true });
  const today = todayLocalISO();
  const calendar = fs.existsSync(CALENDAR_PATH) ? JSON.parse(fs.readFileSync(CALENDAR_PATH, 'utf8')) : { calendar: [], published: [] };

  const duePostRaw = choosePost(calendar, today);
  const duePost = enrichPost(duePostRaw, today);
  Object.assign(duePostRaw, duePost);

  const filePath = path.join(BLOG_DIR, `${duePost.slug}.md`);
  if (fs.existsSync(filePath)) {
    console.log(`Blog file already exists, deploying existing post: ${filePath}`);
  } else {
    console.log(`Writing: "${duePost.title}" (${duePost.slug})`);
    const content = await generatePost(duePost);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Saved: ${filePath}`);
  }

  duePostRaw.status = 'written';
  duePostRaw.writtenAt = duePostRaw.writtenAt || new Date().toISOString();
  fs.writeFileSync(CALENDAR_PATH, JSON.stringify(calendar, null, 2));

  console.log('Building...');
  const buildResult = run('npm', ['run', 'build'], APP_DIR);
  if (buildResult.status !== 0) throw new Error(`Build failed with status ${buildResult.status}`);

  console.log('Deploying to production...');
  const deployArgs = ['vercel', 'deploy', '--prod', '--yes'];
  if (VERCEL_TOKEN) deployArgs.push('--token', VERCEL_TOKEN);
  const deployResult = run('npx', deployArgs, APP_DIR);
  if (deployResult.status !== 0) throw new Error(`Deploy failed with status ${deployResult.status}`);

  const url = `https://clipmeta.app/blog/${duePost.slug}`;
  verifyLiveUrl(url);
  submitIndexNow(url);

  duePostRaw.status = 'published';
  duePostRaw.publishedAt = duePostRaw.publishedAt || new Date().toISOString();
  calendar.published = Array.isArray(calendar.published) ? calendar.published : [];
  if (!calendar.published.some(p => p.slug === duePost.slug)) {
    calendar.published.push({ id: duePost.id, title: duePost.title, slug: duePost.slug, publishedAt: duePostRaw.publishedAt, status: 'published' });
  }
  fs.writeFileSync(CALENDAR_PATH, JSON.stringify(calendar, null, 2));

  console.log(`Published! Live at: ${url}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
