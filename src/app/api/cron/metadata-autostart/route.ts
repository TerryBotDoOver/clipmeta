import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { startMetadataGenerationForClip } from "@/lib/metadata-autostart";

export const runtime = "nodejs";
export const maxDuration = 300;

const DEFAULT_BATCH_SIZE = 1;

function authOk(req: NextRequest) {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  return req.headers.get("authorization") === `Bearer ${expected}`;
}

function batchSizeFromUrl(url: URL) {
  const raw = Number(url.searchParams.get("limit"));
  if (!Number.isFinite(raw) || raw <= 0) return DEFAULT_BATCH_SIZE;
  return Math.min(Math.floor(raw), 10);
}

async function handle(req: NextRequest) {
  if (!authOk(req)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const limit = batchSizeFromUrl(url);
  const origin = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;

  const { data: clips, error } = await supabaseAdmin
    .from("clips")
    .select("id, created_at")
    .eq("metadata_status", "not_started")
    .eq("upload_status", "uploaded")
    .not("storage_path", "is", null)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  const started: string[] = [];
  for (const clip of clips ?? []) {
    if (typeof clip.id !== "string") continue;
    await startMetadataGenerationForClip({
      clipId: clip.id,
      origin,
      source: "cron",
    });
    started.push(clip.id);
  }

  return NextResponse.json({
    ok: true,
    checked: clips?.length ?? 0,
    started: started.length,
  });
}

export async function GET(req: NextRequest) {
  return handle(req);
}

export async function POST(req: NextRequest) {
  return handle(req);
}
