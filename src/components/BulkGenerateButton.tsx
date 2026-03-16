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
};

export function BulkGenerateButton({ clips }: Props) {
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [total] = useState(clips.length);
  const [done, setDone] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  if (clips.length === 0) return null;

  async function handleBulkGenerate() {
    setRunning(true);
    setProgress(0);
    setErrors([]);
    const errs: string[] = [];

    for (const clip of clips) {
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
    setRunning(false);
    setDone(true);
    setTimeout(() => window.location.reload(), 1500);
  }

  if (done) {
    return (
      <div className="text-sm font-medium text-green-500">
        ✓ Done — {total - errors.length}/{total} generated. Refreshing…
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      {running ? (
        <div className="flex items-center gap-3">
          <div className="h-2 w-32 overflow-hidden rounded-full bg-muted">
            <div
              className="h-2 rounded-full bg-primary transition-all"
              style={{ width: `${(progress / total) * 100}%` }}
            />
          </div>
          <span className="text-sm text-muted-foreground">
            {progress}/{total} generating…
          </span>
        </div>
      ) : (
        <button
          onClick={handleBulkGenerate}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
        >
          ⚡ Generate All ({clips.length})
        </button>
      )}
    </div>
  );
}
