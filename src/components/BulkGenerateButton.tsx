"use client";

import { useState } from "react";
import { extractFrames } from "@/lib/extractFrames";
import { trackClarityEvent } from "@/lib/clarity-events";

type PendingClip = {
  id: string;
  filename: string;
  storageUrl: string;
  fileSize?: number;
};

type ClipStatus = "queued" | "extracting" | "generating" | "done" | "error";

type ClipProgress = {
  id: string;
  filename: string;
  status: ClipStatus;
  error?: string;
};

type Props = {
  clips: PendingClip[];
  failedClips?: PendingClip[];
};

async function runGenerate(
  targetClips: PendingClip[],
  onClipUpdate: (id: string, status: ClipStatus, error?: string) => void,
  setDone: (errors: string[]) => void
) {
  const errs: string[] = [];

  for (const clip of targetClips) {
    try {
      onClipUpdate(clip.id, "extracting");

      let frames: { dataUrl: string; timestampSeconds: number }[] = [];

      // Try server-side frame extraction FIRST (reads from R2 via ffmpeg, no browser download)
      try {
        const serverRes = await fetch("/api/frames/extract", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ clip_id: clip.id }),
        });
        if (serverRes.ok) {
          const { frames: serverFrames } = await serverRes.json();
          if (Array.isArray(serverFrames) && serverFrames.length > 0) {
            frames = serverFrames.map((dataUrl: string) => ({ dataUrl, timestampSeconds: 0 }));
          }
        }
      } catch (serverErr) {
        console.warn("Server-side frame extraction failed for", clip.filename, serverErr);
      }

      // Fall back to client-side extraction only if server-side returned nothing
      if (frames.length === 0) {
        const ext = (clip.filename.match(/\.[^.]+$/) || [''])[0].toLowerCase();
        const unsupportedExts = ['.mov', '.mxf', '.avi', '.r3d', '.braw', '.dng'];
        const skipFrames = (clip.fileSize ?? 0) > 500 * 1024 * 1024 || unsupportedExts.includes(ext);

        if (!skipFrames) {
          const res = await fetch(clip.storageUrl);
          if (!res.ok) throw new Error(`Could not load video`);
          const blob = await res.blob();
          const file = new File([blob], clip.filename, { type: blob.type || "video/mp4" });
          frames = await extractFrames(file, 4);
        }
      }

      onClipUpdate(clip.id, "generating");

      const body = JSON.stringify({
        clip_id: clip.id,
        frames: frames.map((f) => f.dataUrl),
      });

      const metaRes = await fetch("/api/metadata/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      });

      if (metaRes.status === 429) {
        const limitData = await metaRes.json();
        if (limitData.limit_reached) {
          onClipUpdate(clip.id, "error", limitData.message);
          errs.push(`${clip.filename}: ${limitData.message}`);
          if (confirm((limitData.upgrade_message || limitData.message) + "\n\nUpgrade your plan?")) {
            window.location.href = limitData.upgrade_url || "/pricing";
          }
          break;
        }
      }

      if (!metaRes.ok) {
        const err = await metaRes.json();
        throw new Error(err.message || "Generation failed");
      }

      onClipUpdate(clip.id, "done");
      trackClarityEvent("MetadataGenerated");
      // Notify ReviewQueue that a clip just finished
      window.dispatchEvent(new CustomEvent("clipmeta:generation-progress", { detail: { clipId: clip.id } }));
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed";
      onClipUpdate(clip.id, "error", msg);
      errs.push(`${clip.filename}: ${msg}`);
    }
  }

  setDone(errs);
}

export function BulkGenerateButton({ clips, failedClips = [] }: Props) {
  const [running, setRunning] = useState<"pending" | "failed" | null>(null);
  const [clipStatuses, setClipStatuses] = useState<ClipProgress[]>([]);
  const [isDone, setIsDone] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const isRunning = running !== null;

  const doneCount = clipStatuses.filter(c => c.status === "done").length;
  const totalCount = clipStatuses.length;
  const currentClip = clipStatuses.find(c => c.status === "extracting" || c.status === "generating");
  const progressPct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  if (clips.length === 0 && failedClips.length === 0) return null;

  async function handleGenerate(type: "pending" | "failed") {
    const target = type === "pending" ? clips : failedClips;

    // Initialize all clip statuses as queued
    setClipStatuses(target.map(c => ({ id: c.id, filename: c.filename, status: "queued" })));
    setRunning(type);
    setIsDone(false);
    setErrors([]);

    // Notify ReviewQueue that generation has started (triggers polling)
    window.dispatchEvent(new CustomEvent("clipmeta:generation-started"));

    await runGenerate(
      target,
      (id, status, error) => {
        setClipStatuses(prev => prev.map(c => c.id === id ? { ...c, status, error } : c));
      },
      (errs) => {
        setErrors(errs);
        setRunning(null);
        setIsDone(true);
        // Notify ReviewQueue that generation is complete (stops forced polling)
        window.dispatchEvent(new CustomEvent("clipmeta:generation-done"));
      }
    );
  }

  if (isDone) {
    return (
      <div className="text-sm font-medium text-green-500">
        ✓ Done — {totalCount - errors.length}/{totalCount} generated. Refreshing…
      </div>
    );
  }

  if (isRunning) {
    return (
      <div className="w-full space-y-3">
        {/* Overall progress bar */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-2 rounded-full bg-primary transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <span className="text-sm font-medium text-foreground shrink-0">
            {doneCount}/{totalCount}
          </span>
        </div>

        {/* Current clip status */}
        {currentClip && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <svg className="h-3 w-3 animate-spin text-primary shrink-0" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8V4z"/>
            </svg>
            <span className="truncate max-w-[240px]">
              {currentClip.status === "extracting" ? "Extracting frames:" : "Generating metadata:"}
              {" "}<span className="text-foreground font-medium">{currentClip.filename}</span>
            </span>
          </div>
        )}

        {/* Per-clip status list — scrollable, max 6 visible */}
        <div className="max-h-[140px] overflow-y-auto rounded-xl border border-border bg-muted/20 divide-y divide-border/50">
          {clipStatuses.map((clip) => (
            <div key={clip.id} className="flex items-center gap-2.5 px-3 py-2">
              {/* Status icon */}
              {clip.status === "queued" && (
                <span className="h-2 w-2 shrink-0 rounded-full bg-muted-foreground/30" />
              )}
              {clip.status === "extracting" && (
                <svg className="h-3 w-3 shrink-0 animate-spin text-blue-400" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8V4z"/>
                </svg>
              )}
              {clip.status === "generating" && (
                <svg className="h-3 w-3 shrink-0 animate-spin text-primary" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8V4z"/>
                </svg>
              )}
              {clip.status === "done" && (
                <svg className="h-3 w-3 shrink-0 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              )}
              {clip.status === "error" && (
                <span className="h-2 w-2 shrink-0 rounded-full bg-red-500" />
              )}

              {/* Filename */}
              <span className={`text-xs truncate flex-1 ${
                clip.status === "done" ? "text-muted-foreground line-through" :
                clip.status === "error" ? "text-red-400" :
                clip.status === "queued" ? "text-muted-foreground/50" :
                "text-foreground"
              }`}>
                {clip.filename}
              </span>

              {/* Stage label */}
              <span className={`text-[10px] shrink-0 font-medium ${
                clip.status === "extracting" ? "text-blue-400" :
                clip.status === "generating" ? "text-primary" :
                clip.status === "done" ? "text-green-500" :
                clip.status === "error" ? "text-red-400" :
                "text-muted-foreground/30"
              }`}>
                {clip.status === "queued" ? "queued" :
                 clip.status === "extracting" ? "frames" :
                 clip.status === "generating" ? "AI" :
                 clip.status === "done" ? "done" : "error"}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 flex-wrap">
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
          ↺ Retry Metadata ({failedClips.length})
        </button>
      )}
    </div>
  );
}
