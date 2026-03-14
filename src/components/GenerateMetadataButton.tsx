"use client";

import { useState } from "react";
import { extractFrames } from "@/lib/extractFrames";

type Props = {
  clipId: string;
  filename: string;
  storageUrl: string; // public URL to fetch the video
};

export function GenerateMetadataButton({ clipId, filename, storageUrl }: Props) {
  const [status, setStatus] = useState<"idle" | "extracting" | "generating" | "done" | "error">("idle");
  const [error, setError] = useState("");

  async function handleGenerate() {
    setStatus("extracting");
    setError("");

    try {
      // Fetch the video file from Supabase Storage
      const res = await fetch(storageUrl);
      if (!res.ok) throw new Error("Failed to fetch video from storage.");
      const blob = await res.blob();
      const file = new File([blob], filename, { type: blob.type || "video/mp4" });

      // Extract frames
      const frames = await extractFrames(file, 4);

      // Generate metadata
      setStatus("generating");
      const metaRes = await fetch("/api/metadata/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clip_id: clipId,
          frames: frames.map((f) => f.dataUrl),
        }),
      });

      if (!metaRes.ok) {
        const err = await metaRes.json();
        throw new Error(err.message || "Metadata generation failed.");
      }

      setStatus("done");
      setTimeout(() => window.location.reload(), 1200);
    } catch (err: unknown) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  if (status === "done") {
    return (
      <span className="text-xs font-medium text-green-500">✓ Generated — refreshing…</span>
    );
  }

  if (status === "error") {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-red-600">{error}</span>
        <button
          onClick={() => setStatus("idle")}
          className="text-xs text-slate-500 underline"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handleGenerate}
      disabled={status !== "idle"}
      className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-slate-800 disabled:opacity-40"
    >
      {status === "extracting" ? (
        <>
          <Spinner /> Extracting frames…
        </>
      ) : status === "generating" ? (
        <>
          <Spinner /> Generating…
        </>
      ) : (
        "Generate Metadata"
      )}
    </button>
  );
}

function Spinner() {
  return (
    <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  );
}
