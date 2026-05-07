"use client";

import { useState } from "react";
import { extractFrames } from "@/lib/extractFrames";
import { LimitReachedModal } from "@/components/LimitReachedModal";
import { trackClarityEvent } from "@/lib/clarity-events";

type Props = {
  clipId: string;
  filename: string;
  storageUrl: string;
  fileSize?: number; // bytes - used to skip frame extraction for large files
  label?: string;
  variant?: "primary" | "subtle";
  onSuccess?: (metadata: {
    title: string;
    description: string;
    keywords: string[];
    category: string;
    location: string | null;
    confidence: string;
    thumbnail_url?: string;
  }) => void;
};

export function GenerateMetadataButton({
  clipId,
  filename,
  storageUrl,
  fileSize = 0,
  label = "Generate Metadata",
  variant = "primary",
  onSuccess,
}: Props) {
  const [status, setStatus] = useState<"idle" | "extracting" | "generating" | "done" | "error">("idle");
  const [error, setError] = useState("");
  const [limitModal, setLimitModal] = useState<{ message: string; upgradeMessage?: string } | null>(null);

  async function handleGenerate() {
    setStatus("extracting");
    setError("");

    try {
      let frames: { dataUrl: string; timestampSeconds: number }[] = [];

      // Try server-side frame extraction FIRST (reads from R2 via ffmpeg, no browser download)
      // This is faster and more reliable than downloading 100-200MB files through the browser
      try {
        const serverRes = await fetch("/api/frames/extract", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ clip_id: clipId }),
        });
        if (serverRes.ok) {
          const { frames: serverFrames } = await serverRes.json();
          if (Array.isArray(serverFrames) && serverFrames.length > 0) {
            frames = serverFrames.map((dataUrl: string) => ({ dataUrl, timestampSeconds: 0 }));
          }
        }
      } catch (serverErr) {
        console.warn("Server-side frame extraction failed, trying client-side:", serverErr);
      }

      // Fall back to client-side extraction only if server-side returned nothing
      if (frames.length === 0) {
        const ext = (filename.match(/\.[^.]+$/) || [''])[0].toLowerCase();
        const unsupportedExts = ['.mov', '.mxf', '.avi', '.r3d', '.braw', '.dng'];
        const skipFrames = fileSize > 500 * 1024 * 1024 || unsupportedExts.includes(ext);

        if (!skipFrames) {
          const res = await fetch(storageUrl);
          if (!res.ok) {
            if (res.status === 403 || res.status === 401) {
              throw new Error("Video link expired - refresh the page and try again.");
            }
            throw new Error(`Could not load video (${res.status}). Try refreshing the page.`);
          }
          const blob = await res.blob();
          const file = new File([blob], filename, { type: blob.type || "video/mp4" });
          frames = await extractFrames(file, 4);
        }
      }

      setStatus("generating");
      const body = JSON.stringify({
        clip_id: clipId,
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
          setStatus("idle");
          setError("");
          setLimitModal({
            message: limitData.message,
            upgradeMessage: limitData.upgrade_message,
          });
          return;
        }
      }

      if (!metaRes.ok) {
        const err = await metaRes.json();
        throw new Error(err.message || "Metadata generation failed.");
      }

      const data = await metaRes.json();
      trackClarityEvent("MetadataGenerated");
      setStatus("done");

      if (onSuccess && data.metadata) {
        // Update the clip in-place without reloading the page
        onSuccess({
          title: data.metadata.title,
          description: data.metadata.description,
          keywords: data.metadata.keywords,
          category: data.metadata.category,
          location: data.metadata.location,
          confidence: data.metadata.confidence,
          thumbnail_url: frames[0]?.dataUrl,
        });
        setTimeout(() => setStatus("idle"), 1500);
      } else {
        // Fallback: reload if no callback provided
        setTimeout(() => window.location.reload(), 1200);
      }
    } catch (err: unknown) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  const modal = (
    <LimitReachedModal
      open={!!limitModal}
      title="Regeneration Limit Reached"
      message={limitModal?.message || ""}
      upgradeMessage={limitModal?.upgradeMessage}
      onClose={() => setLimitModal(null)}
    />
  );

  if (status === "done") {
    return (
      <>
        <span className="text-xs font-medium text-green-500">✓ Updated</span>
        {modal}
      </>
    );
  }

  if (status === "error") {
    return (
      <>
        <div className="flex items-center gap-2">
          <span className="text-xs text-red-500">{error}</span>
          <button
            onClick={handleGenerate}
            className="text-xs text-muted-foreground underline hover:text-foreground transition"
          >
            Retry
          </button>
        </div>
        {modal}
      </>
    );
  }

  const btnClass = variant === "subtle"
    ? "inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:border-primary/50 hover:text-primary disabled:opacity-40"
    : "inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-40";

  return (
    <>
      <button
        onClick={handleGenerate}
        disabled={status !== "idle"}
        className={btnClass}
      >
        {status === "extracting" ? (
          <><Spinner /> Extracting frames…</>
        ) : status === "generating" ? (
          <><Spinner /> Generating…</>
        ) : (
          label
        )}
      </button>
      {modal}
    </>
  );
}

function Spinner() {
  return (
    <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8V4z" />
    </svg>
  );
}
