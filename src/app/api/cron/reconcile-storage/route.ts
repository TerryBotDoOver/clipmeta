import { NextRequest, NextResponse } from "next/server";
import { ListObjectsV2Command, type ListObjectsV2CommandOutput } from "@aws-sdk/client-s3";
import { r2, R2_BUCKET } from "@/lib/r2";
import { supabaseAdmin } from "@/lib/supabase-admin";

/**
 * GET/POST /api/cron/reconcile-storage
 *
 * Walks the R2 bucket once, then flips any DB clip whose storage_path is
 * missing from R2 to upload_status="source_deleted". This is what makes the
 * UI show the proper "Source video archived" placeholder instead of silently
 * 404ing on a stale signed URL.
 *
 * Auth: Vercel cron sends `Authorization: Bearer <CRON_SECRET>` automatically
 * when configured in vercel.json. Manual invocation: same header.
 *
 * Why list-and-diff instead of HEAD-per-clip:
 *   ~1500 clips × HEAD = 1500 round trips. List is paginated 1000/page, so
 *   the whole bucket is 2-3 calls. Way cheaper.
 *
 * Idempotent: re-runs are safe; clips already flagged source_deleted are
 * skipped on the next pass.
 */

export const maxDuration = 300; // up to 5 minutes for full bucket scans

const dryRunFromUrl = (url: URL) => url.searchParams.get("dry_run") === "1";

async function listAllR2Keys(): Promise<Set<string>> {
  const keys = new Set<string>();
  let continuationToken: string | undefined = undefined;
  let pages = 0;
  do {
    const out: ListObjectsV2CommandOutput = await r2.send(new ListObjectsV2Command({
      Bucket: R2_BUCKET,
      MaxKeys: 1000,
      ContinuationToken: continuationToken,
    }));
    for (const o of out.Contents ?? []) {
      if (o.Key) keys.add(o.Key);
    }
    continuationToken = out.IsTruncated ? out.NextContinuationToken : undefined;
    pages += 1;
    // Safety stop — bucket should never have more than ~50k objects at our scale
    if (pages > 200) break;
  } while (continuationToken);
  return keys;
}

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
  const dryRun = dryRunFromUrl(url);

  // ── List every key currently in R2 ────────────────────────────────────────
  let r2Keys: Set<string>;
  try {
    r2Keys = await listAllR2Keys();
  } catch (err) {
    return NextResponse.json(
      { message: "R2 list failed.", error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }

  // ── Pull every clip that COULD have an archived source ────────────────────
  // Skip clips we already flagged as source_deleted. Page through to handle
  // tables larger than the default 1000-row supabase limit.
  type ClipRow = { id: string; storage_path: string | null; created_at: string };
  const clips: ClipRow[] = [];
  const PAGE = 1000;
  let from = 0;
  for (;;) {
    const { data, error } = await supabaseAdmin
      .from("clips")
      .select("id, storage_path, created_at")
      .not("storage_path", "is", null)
      .neq("upload_status", "source_deleted")
      .range(from, from + PAGE - 1);
    if (error) {
      return NextResponse.json({ message: "Supabase query failed.", error: error.message }, { status: 500 });
    }
    if (!data || data.length === 0) break;
    clips.push(...(data as ClipRow[]));
    if (data.length < PAGE) break;
    from += PAGE;
  }

  // ── Diff: clips whose storage_path is NOT present in R2 ───────────────────
  const missingIds: string[] = [];
  for (const c of clips) {
    if (!c.storage_path) continue;
    if (!r2Keys.has(c.storage_path)) missingIds.push(c.id);
  }

  // ── Flip them in batches (Supabase IN clause is fine up to a few thousand) ─
  let updated = 0;
  if (!dryRun && missingIds.length > 0) {
    const BATCH = 500;
    for (let i = 0; i < missingIds.length; i += BATCH) {
      const slice = missingIds.slice(i, i + BATCH);
      const { error } = await supabaseAdmin
        .from("clips")
        .update({ upload_status: "source_deleted" })
        .in("id", slice);
      if (error) {
        return NextResponse.json(
          {
            message: "Update failed mid-batch.",
            error: error.message,
            scanned: clips.length,
            r2_objects: r2Keys.size,
            updated_so_far: updated,
            remaining_missing: missingIds.length - updated,
          },
          { status: 500 }
        );
      }
      updated += slice.length;
    }
  }

  return NextResponse.json({
    ok: true,
    dry_run: dryRun,
    r2_objects: r2Keys.size,
    db_clips_scanned: clips.length,
    missing_in_r2: missingIds.length,
    updated,
  });
}

export async function GET(req: NextRequest) {
  return handle(req);
}

export async function POST(req: NextRequest) {
  return handle(req);
}
