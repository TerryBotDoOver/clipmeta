import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getResend } from "@/lib/resend";
import { archiveWarningEmail } from "@/lib/emails";

/**
 * GET/POST /api/cron/archive-warnings
 *
 * Daily cron. Finds clips whose source file is ~7 days from auto-archive
 * (R2 lifecycle = 21 days), groups them per user, sends a single digest
 * email per user, and marks each clip as warned so we don't double-send.
 *
 * "Warning window": clips between 14 and 19 days old that haven't been
 * warned yet. The wide window catches clips that would have been warned
 * yesterday if the cron had a hiccup, while still leaving 2+ days of
 * lead time before archive. Once warned, archive_warning_sent_at is set
 * and the clip is never warned again.
 *
 * Auth: same shared CRON_SECRET as the storage reconciler.
 */

export const maxDuration = 300;

const FROM = process.env.RESEND_FROM || "ClipMeta <hello@clipmeta.app>";
const ARCHIVE_DAYS = 21;
const WARN_AT_AGE_MIN_DAYS = 14; // 7 days before archive
const WARN_AT_AGE_MAX_DAYS = 19; // still has 2 days to act

type ClipRow = {
  id: string;
  project_id: string;
  created_at: string;
  projects: { id: string; name: string; slug: string; user_id: string } | null;
};

async function handle(req: NextRequest) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const auth = req.headers.get("authorization") || "";
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return NextResponse.json({ message: "CRON_SECRET not configured." }, { status: 500 });
  }
  if (auth !== `Bearer ${expected}`) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const dryRun = url.searchParams.get("dry_run") === "1";

  // ── Find candidate clips ──────────────────────────────────────────────────
  const now = Date.now();
  const minCreated = new Date(now - WARN_AT_AGE_MAX_DAYS * 86_400_000).toISOString();
  const maxCreated = new Date(now - WARN_AT_AGE_MIN_DAYS * 86_400_000).toISOString();

  const { data: candidates, error: queryErr } = await supabaseAdmin
    .from("clips")
    .select("id, project_id, created_at, projects(id, name, slug, user_id)")
    .gte("created_at", minCreated)
    .lte("created_at", maxCreated)
    .neq("upload_status", "source_deleted")
    .is("archive_warning_sent_at", null)
    .not("storage_path", "is", null)
    .limit(5000);

  if (queryErr) {
    return NextResponse.json({ message: "Query failed.", error: queryErr.message }, { status: 500 });
  }

  // ── Group by user ─────────────────────────────────────────────────────────
  type UserBucket = {
    userId: string;
    clipIds: string[];
    projects: Map<string, { name: string; slug: string; clipsAtRisk: number }>;
    soonestDaysLeft: number;
  };
  const byUser = new Map<string, UserBucket>();

  for (const raw of (candidates ?? []) as unknown as ClipRow[]) {
    const proj = Array.isArray(raw.projects) ? raw.projects[0] : raw.projects;
    if (!proj || !proj.user_id) continue;
    const ageDays = (now - new Date(raw.created_at).getTime()) / 86_400_000;
    const daysLeft = Math.max(1, Math.ceil(ARCHIVE_DAYS - ageDays));

    let bucket = byUser.get(proj.user_id);
    if (!bucket) {
      bucket = { userId: proj.user_id, clipIds: [], projects: new Map(), soonestDaysLeft: daysLeft };
      byUser.set(proj.user_id, bucket);
    }
    bucket.clipIds.push(raw.id);
    if (daysLeft < bucket.soonestDaysLeft) bucket.soonestDaysLeft = daysLeft;
    const existing = bucket.projects.get(proj.id);
    if (existing) existing.clipsAtRisk += 1;
    else bucket.projects.set(proj.id, { name: proj.name, slug: proj.slug, clipsAtRisk: 1 });
  }

  // ── Send + mark ───────────────────────────────────────────────────────────
  const summary: { userId: string; email: string; clipCount: number; sent: boolean; error?: string }[] = [];
  let totalSent = 0;
  let totalMarked = 0;

  for (const bucket of byUser.values()) {
    // Look up the user's email + display name
    const { data: userRes } = await supabaseAdmin.auth.admin.getUserById(bucket.userId);
    const u = userRes?.user;
    if (!u?.email) {
      summary.push({ userId: bucket.userId, email: "(missing)", clipCount: bucket.clipIds.length, sent: false, error: "no email" });
      continue;
    }

    const name = (
      (u.user_metadata?.full_name as string | undefined) ||
      (u.user_metadata?.name as string | undefined) ||
      u.email.split("@")[0]
    );

    const { subject, html } = archiveWarningEmail(name, {
      clipCount: bucket.clipIds.length,
      daysLeft: bucket.soonestDaysLeft,
      projects: Array.from(bucket.projects.values()).sort((a, b) => b.clipsAtRisk - a.clipsAtRisk),
    });

    if (dryRun) {
      summary.push({ userId: bucket.userId, email: u.email, clipCount: bucket.clipIds.length, sent: false });
      continue;
    }

    let sentOk = false;
    let errMsg: string | undefined;
    try {
      const { error: sendErr } = await getResend().emails.send({
        from: FROM,
        to: u.email,
        subject,
        html,
      });
      if (sendErr) errMsg = sendErr.message ?? String(sendErr);
      else sentOk = true;
    } catch (e) {
      errMsg = e instanceof Error ? e.message : String(e);
    }

    if (sentOk) {
      totalSent += 1;
      // Mark these clips warned so we never double-send
      const { error: markErr } = await supabaseAdmin
        .from("clips")
        .update({ archive_warning_sent_at: new Date().toISOString() })
        .in("id", bucket.clipIds);
      if (!markErr) totalMarked += bucket.clipIds.length;
    }

    summary.push({
      userId: bucket.userId,
      email: u.email,
      clipCount: bucket.clipIds.length,
      sent: sentOk,
      error: errMsg,
    });
  }

  return NextResponse.json({
    ok: true,
    dry_run: dryRun,
    candidate_clips: candidates?.length ?? 0,
    users_with_warnings: byUser.size,
    emails_sent: totalSent,
    clips_marked: totalMarked,
    results: summary,
  });
}

export async function GET(req: NextRequest) { return handle(req); }
export async function POST(req: NextRequest) { return handle(req); }
