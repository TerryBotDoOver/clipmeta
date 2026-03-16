"use client";

import { useState } from "react";
import { extractFrames } from "@/lib/extractFrames";

type PendingClip = {
  id: string;
  filename: string;
  storageUrl: string;
};

type Props = {
  clips: PendingClip[];
  failedClips?: PendingClip[];
};

async function runGenerate(
  targetClips: PendingClip[],
  setProgress: (fn: (p: number) => number) => void,
  setErrors: (e: string[]) => void,
  setDone: () => void
) {
  setProgress(() => 0);
  setErrors([]);
  const errs: string[] = [];

  for (const clip of targetClips) {
    try {
      const res = await fetch(clip.storageUrl);
      if (!res.ok) throw new Error(`Failed to fetch ${clip.filename}`);
      const blob = await res.blob();
      const file = new File([blob], clip.filename, { type: blob.type || "video/mp4" });

      const frames = await extractFrames(file, 4);

      const metaRes = await fetch("/api/metadata/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clip_id: clip.id,
          frames: frames.map((f) => f.dataUrl),
        }),
      });

      if (!metaRes.ok) {
        const err = await metaRes.json();
        throw new Error(err.message || "Generation failed");
      }
    } catch (err) {
      errs.push(`${clip.filename}: ${err instanceof Error ? err.message : "failed"}`);
    }

    setProgress((prev) => prev + 1);
  }

  setErrors(errs);
  setDone();
  setTimeout(() => window.location.reload(), 1500);
}

export function BulkGenerateButton({ clips, failedClips = [] }: Props) {
  const [running, setRunning] = useState<"pending" | "failed" | null>(null);
  const [progress, setProgress] = useState(0);
  const [activeTotal, setActiveTotal] = useState(0);
  const [done, setDone] = useState<"pending" | "failed" | null>(null);
  const [errors, setErrors] = useState<string[]>([]);

  const isRunning = running !== null;

  if (clips.length === 0 && failedClips.length === 0) return null;

  async function handleGenerate(type: "pending" | "failed") {
    const target = type === "pending" ? clips : failedClips;
    setActiveTotal(target.length);
    setRunning(type);
    await runGenerate(
      target,
      setProgress,
      setErrors,
      () => {
        setRunning(null);
        setDone(type);
      }
    );
  }

  if (done) {
    const total = done === "pending" ? clips.length : failedClips.length;
    return (
      <div className="text-sm font-medium text-green-500">
        ✓ Done — {total - errors.length}/{total} generated. Refreshing…
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {isRunning ? (
        <div className="flex items-center gap-3">
          <div className="h-2 w-32 overflow-hidden rounded-full bg-muted">
            <div
              className="h-2 rounded-full bg-primary transition-all"
              style={{ width: `${(progress / activeTotal) * 100}%` }}
            />
          </div>
          <span className="text-sm text-muted-foreground">
            {progress}/{activeTotal} {running === "failed" ? "retrying" : "generating"}…
          </span>
        </div>
      ) : (
        <>
          {clips.length > 0 && (
            <button
              onClick={() => handleGenerate("pending")}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
            >
              ⚡ Generate All ({clips.length})
            </button>
          )}
          {failedClips.length > 0 && (
            <button
              onClick={() => handleGenerate("failed")}
              className="inline-flex items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-sm font-medium text-amber-400 transition hover:bg-amber-500/20"
            >
              ↺ Retry Failed ({failedClips.length})
            </button>
          )}
        </>
      )}
    </div>
  );
}
