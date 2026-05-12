import { supabaseAdmin } from "@/lib/supabase-admin";

type StartMetadataOptions = {
  clipId: string;
  origin: string;
  source?: string;
};

const FRAME_EXTRACT_TIMEOUT_MS = 240_000;
const METADATA_GENERATE_TIMEOUT_MS = 75_000;

async function responseMessage(res: Response, fallback: string) {
  try {
    const body = await res.json();
    return typeof body?.message === "string"
      ? body.message
      : typeof body?.error === "string"
        ? body.error
        : fallback;
  } catch {
    return fallback;
  }
}

async function markMetadataFailed(clipId: string, message: string) {
  await supabaseAdmin
    .from("clips")
    .update({
      metadata_status: "failed",
      metadata_status_detail: message.slice(0, 1000),
      worker_error: message.slice(0, 1000),
    })
    .eq("id", clipId);
}

async function claimMetadataGeneration(clipId: string) {
  const { data, error } = await supabaseAdmin
    .from("clips")
    .update({
      metadata_status: "processing",
      metadata_status_detail: null,
      worker_error: null,
    })
    .eq("id", clipId)
    .eq("metadata_status", "not_started")
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("[metadata-autostart] claim failed:", error.message);
    return false;
  }

  return Boolean(data?.id);
}

export async function startMetadataGenerationForClip({
  clipId,
  origin,
  source = "unknown",
}: StartMetadataOptions) {
  const claimed = await claimMetadataGeneration(clipId);
  if (!claimed) return;

  try {
    const frameRes = await fetch(new URL("/api/frames/extract", origin), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clip_id: clipId }),
      cache: "no-store",
      signal: AbortSignal.timeout(FRAME_EXTRACT_TIMEOUT_MS),
    });

    if (!frameRes.ok) {
      const message = await responseMessage(frameRes, "Frame extraction failed.");
      await markMetadataFailed(clipId, message);
      console.error(`[metadata-autostart] frame extraction failed from ${source}:`, message);
      return;
    }

    const frameData = await frameRes.json();
    const frames = Array.isArray(frameData.frames) ? frameData.frames : [];

    if (frames.length === 0) {
      const message = "ClipMeta could not extract usable video frames for this clip.";
      await markMetadataFailed(clipId, message);
      console.error(`[metadata-autostart] no frames extracted from ${source}`);
      return;
    }

    const metadataRes = await fetch(new URL("/api/metadata/generate", origin), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clip_id: clipId, frames }),
      cache: "no-store",
      signal: AbortSignal.timeout(METADATA_GENERATE_TIMEOUT_MS),
    });

    if (!metadataRes.ok) {
      const message = await responseMessage(metadataRes, "Metadata generation failed.");
      await markMetadataFailed(clipId, message);
      console.error(`[metadata-autostart] generation failed from ${source}:`, message);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Metadata generation failed.";
    await markMetadataFailed(clipId, message);
    console.error(`[metadata-autostart] unexpected failure from ${source}:`, message);
  }
}
