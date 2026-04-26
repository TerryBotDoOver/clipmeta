import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getResend } from "@/lib/resend";
import { idleProjectEmail } from "@/lib/emails";

/**
 * GET/POST /api/cron/idle-projects
 *
 * Daily cron. Identifies projects that have gone quiet -- no clip uploads
 * or regenerations in 30+ days -- and emails the owner once per project.
 * Helps users wrap things up before their source files auto-archive.
 *
 * "Idle" means: project's most recent clip was created 30-60 days ago AND
 * the project still has at least one clip AND we haven't already nudged
 * about this project (idle_warning_sent_at IS NULL).
 *
 * Bounded upper window (60 days) so we don't spam users about ancient
 * projects on the very first run -- only projects that have JUST become
 * idle catch a notice.
 *
 * Auth: same shared CRON_SECRET as the other cron routes.
 */

export const maxDuration = 300;

const FROM = process.env.RESEND_FROM || "ClipMeta <hello@clipmeta.app>";
const IDLE_MIN_DAYS = 30;
const IDLE_MAX_DAYS = 60;
const ARCHIVE_DAYS = 21;

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

  // ── Pull all candidate projects ──────────────────────────────────────────
  // Filter in code rather than via SQL: the user count is small enough that
  // pulling every active project is fine, and it keeps the query simple.
  const { data: projects, error: projErr } = await supabaseAdmin
    .from("projects")
    .select("id, name, slug, user_id, idle_warning_sent_at, deleted_at")
    .is("deleted_at", null)
    .is("idle_warning_sent_at", null)
    .limit(5000);

  if (projErr) {
    return NextResponse.json({ message: "Project query failed.", error: projErr.message }, { status: 500 });
  }

  type ProjectRow = { id: string; name: string; slug: string; user_id: string };
  const projList = (projects ?? []) as ProjectRow[];
  if (projList.length === 0) {
    return NextResponse.json({ ok: true, dry_run: dryRun, scanned: 0, sent: 0, results: [] });
  }

  // ── Pull clip stats per project in one go ─────────────────────────────────
  // We need: latest clip created_at, total count, count with metadata, count
  // expiring soon. Doing one query and bucketing in code is cheaper than N+1.
  const projIds = projList.map((p) => p.id);

  const { data: clips, error: clipErr } = await supabaseAdmin
    .from("clips")
    .select("id, project_id, created_at, upload_status, metadata_results(id)")
    .in("project_id", projIds)
    .limit(20000);

  if (clipErr) {
    return NextResponse.json({ message: "Clip query failed.", error: clipErr.message }, { status: 500 });
  }

  type ClipRow = {
    id: string;
    project_id: string;
    created_at: string;
    upload_status: string | null;
    metadata_results: { id: string }[] | { id: string } | null;
  };

  type ProjectStats = {
    latestActivityMs: number; // 0 if no clips
    totalClips: number;
    clipsWithMetadata: number;
    clipsExpiringSoon: number; // active source within 7 days of archive
  };

  const stats = new Map<string, ProjectStats>();
  for (const id of projIds) {
    stats.set(id, { latestActivityMs: 0, totalClips: 0, clipsWithMetadata: 0, clipsExpiringSoon: 0 });
  }

  const now = Date.now();
  for (const raw of (clips ?? []) as unknown as ClipRow[]) {
    const s = stats.get(raw.project_id);
    if (!s) continue;
    const createdMs = new Date(raw.created_at).getTime();
    if (createdMs > s.latestActivityMs) s.latestActivityMs = createdMs;
    s.totalClips += 1;
    const meta = Array.isArray(raw.metadata_results) ? raw.metadata_results[0] : raw.metadata_results;
    if (meta?.id) s.clipsWithMetadata += 1;
    if (raw.upload_status !== "source_deleted") {
      const ageDays = (now - createdMs) / 86_400_000;
      const daysLeft = ARCHIVE_DAYS - ageDays;
      if (daysLeft > 0 && daysLeft <= 7) s.clipsExpiringSoon += 1;
    }
  }

  // ── Pick projects in the idle window ──────────────────────────────────────
  type Candidate = { project: ProjectRow; stats: ProjectStats; daysIdle: number };
  const candidates: Candidate[] = [];
  for (const project of projList) {
    const s = stats.get(project.id);
    if (!s) continue;
    if (s.totalClips === 0) continue; // empty project, nothing to nudge about
    const daysIdle = Math.floor((now - s.latestActivityMs) / 86_400_000);
    if (daysIdle < IDLE_MIN_DAYS || daysIdle > IDLE_MAX_DAYS) continue;
    candidates.push({ project, stats: s, daysIdle });
  }

  // ── Send + mark ───────────────────────────────────────────────────────────
  const results: { projectId: string; userId: string; email: string; daysIdle: number; sent: boolean; error?: string }[] = [];
  let totalSent = 0;

  // Cache per-user email lookups since one user may own multiple idle projects
  const userCache = new Map<string, { email: string; name: string } | null>();

  for (const { project, stats: s, daysIdle } of candidates) {
    let userInfo = userCache.get(project.user_id);
    if (userInfo === undefined) {
      const { data: userRes } = await supabaseAdmin.auth.admin.getUserById(project.user_id);
      const u = userRes?.user;
      userInfo = u?.email
        ? {
            email: u.email,
            name: (
              (u.user_metadata?.full_name as string | undefined) ||
              (u.user_metadata?.name as string | undefined) ||
              u.email.split("@")[0]
            ),
          }
        : null;
      userCache.set(project.user_id, userInfo);
    }
    if (!userInfo) {
      results.push({ projectId: project.id, userId: project.user_id, email: "(missing)", daysIdle, sent: false, error: "no email" });
      continue;
    }

    const { subject, html } = idleProjectEmail(userInfo.name, {
      projectName: project.name,
      projectSlug: project.slug,
      daysIdle,
      totalClips: s.totalClips,
      clipsWithMetadata: s.clipsWithMetadata,
      clipsExpiringSoon: s.clipsExpiringSoon,
    });

    if (dryRun) {
      results.push({ projectId: project.id, userId: project.user_id, email: userInfo.email, daysIdle, sent: false });
      continue;
    }

    let sentOk = false;
    let errMsg: string | undefined;
    try {
      const { error: sendErr } = await getResend().emails.send({
        from: FROM,
        to: userInfo.email,
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
      await supabaseAdmin
        .from("projects")
        .update({ idle_warning_sent_at: new Date().toISOString() })
        .eq("id", project.id);
    }

    results.push({
      projectId: project.id,
      userId: project.user_id,
      email: userInfo.email,
      daysIdle,
      sent: sentOk,
      error: errMsg,
    });
  }

  return NextResponse.json({
    ok: true,
    dry_run: dryRun,
    scanned_projects: projList.length,
    eligible_projects: candidates.length,
    emails_sent: totalSent,
    results,
  });
}

export async function GET(req: NextRequest) { return handle(req); }
export async function POST(req: NextRequest) { return handle(req); }
