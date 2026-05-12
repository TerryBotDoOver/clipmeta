import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { startMetadataGenerationForClip } from "@/lib/metadata-autostart";

export const runtime = "nodejs";
export const maxDuration = 300;

function normalizeClipIds(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const clipIds = Array.from(
    new Set([
      ...normalizeClipIds(body.clip_id),
      ...normalizeClipIds(body.clip_ids),
    ])
  ).slice(0, 1);

  if (clipIds.length === 0) {
    return NextResponse.json({ message: "clip_id or clip_ids required." }, { status: 400 });
  }

  const { data: clips, error } = await supabaseAdmin
    .from("clips")
    .select("id, projects!inner(user_id)")
    .in("id", clipIds)
    .eq("projects.user_id", user.id);

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  const origin = req.nextUrl.origin;
  const source = typeof body.source === "string" ? body.source : "client";
  const authorizedIds = (clips ?? [])
    .map((clip: { id?: string }) => clip.id)
    .filter((id): id is string => typeof id === "string");

  for (const clipId of authorizedIds) {
    await startMetadataGenerationForClip({
      clipId,
      origin,
      source: `autostart-${source}`,
    });
  }

  return NextResponse.json({
    ok: true,
    requested: clipIds.length,
    started: authorizedIds.length,
  });
}
