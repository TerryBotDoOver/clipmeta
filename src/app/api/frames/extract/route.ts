import { NextRequest, NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";
import { readFile, unlink } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getR2ReadUrl } from "@/lib/r2";

export const runtime = "nodejs";
export const maxDuration = 300;

const execFileAsync = promisify(execFile);

// eslint-disable-next-line @typescript-eslint/no-require-imports
const ffmpegPath: string = require("@ffmpeg-installer/ffmpeg").path;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const ffprobePath: string = require("@ffprobe-installer/ffprobe").path;

const FRAME_COUNT = 4;
const MAX_FRAME_PX = 768;

async function getVideoDuration(url: string): Promise<number | null> {
  try {
    const { stdout } = await execFileAsync(
      ffprobePath,
      [
        "-v", "error",
        "-show_entries", "format=duration",
        "-of", "csv=p=0",
        url,
      ],
      { timeout: 30_000 }
    );
    const d = parseFloat(stdout.trim());
    return isFinite(d) && d > 0 ? d : null;
  } catch {
    return null;
  }
}

async function extractFrame(
  url: string,
  timestamp: number,
  outPath: string
): Promise<void> {
  await execFileAsync(
    ffmpegPath,
    [
      "-ss", String(timestamp),
      "-i", url,
      "-vframes", "1",
      "-vf", `scale=${MAX_FRAME_PX}:-1:force_original_aspect_ratio=decrease`,
      "-q:v", "3",
      "-y",
      outPath,
    ],
    { timeout: 60_000 }
  );
}

export async function POST(req: NextRequest) {
  let tmpFiles: string[] = [];

  try {
    const { clip_id } = await req.json();
    if (!clip_id) {
      return NextResponse.json({ error: "clip_id required" }, { status: 400 });
    }

    // Look up clip to get storage_path
    const { data: clip, error: clipErr } = await supabaseAdmin
      .from("clips")
      .select("storage_path")
      .eq("id", clip_id)
      .single();

    if (clipErr || !clip?.storage_path) {
      return NextResponse.json({ error: "Clip not found" }, { status: 404 });
    }

    // Generate presigned R2 URL (ffmpeg reads directly from it)
    const presignedUrl = await getR2ReadUrl(clip.storage_path, 3600);

    // Get video duration via ffprobe
    let duration = await getVideoDuration(presignedUrl);

    if (!duration) {
      // Fallback: try seeking a bit into the file to let ffprobe find the moov atom
      duration = 60; // assume at least 60s; we'll seek proportionally anyway
    }

    // Compute evenly-spaced timestamps, skip first/last 5%
    const margin = duration * 0.05;
    const usable = duration - margin * 2;
    const timestamps = Array.from({ length: FRAME_COUNT }, (_, i) =>
      margin + (usable / (FRAME_COUNT - 1)) * i
    );

    // Extract frames in parallel
    const tmp = tmpdir();
    const framePromises = timestamps.map(async (ts, i) => {
      const outPath = join(tmp, `clipmeta_frame_${clip_id}_${i}_${Date.now()}.jpg`);
      tmpFiles.push(outPath);
      await extractFrame(presignedUrl, ts, outPath);
      const buf = await readFile(outPath);
      return `data:image/jpeg;base64,${buf.toString("base64")}`;
    });

    const frames = await Promise.all(framePromises);

    return NextResponse.json({ frames });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Frame extraction failed";
    console.error("[frames/extract] error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  } finally {
    // Clean up temp files
    await Promise.allSettled(tmpFiles.map((f) => unlink(f)));
  }
}
