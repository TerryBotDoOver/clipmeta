"use client";

import { useState } from "react";
import { VideoPlayer } from "@/components/VideoPlayer";
import { MetadataEditor } from "@/components/MetadataEditor";
import { GenerateMetadataButton } from "@/components/GenerateMetadataButton";

type MetadataResults = {
  title: string;
  description: string;
  keywords: string[];
  category: string;
  location: string | null;
  confidence: string;
};

type Clip = {
  id: string;
  original_filename: string;
  file_size_bytes: number | null;
  metadata_status: string;
  upload_status: string | null;
  is_reviewed: boolean;
  metadata_results: MetadataResults | null;
};

type Props = {
  clips: Clip[];
  clipUrls: Record<string, string>;
  pendingClips: { id: string; filename: string; storageUrl: string }[];
};

type Filter = "all" | "pending" | "ready" | "reviewed";

export function ReviewQueue({ clips, clipUrls }: Props) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [reviewedIds, setReviewedIds] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<Filter>("all");
  const [togglingId, setTogglingId] = useState<string | null>(null);

  function toggleExpand(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function toggleReviewed(clip: Clip) {
    const currentlyReviewed = reviewedIds.has(clip.id) || clip.is_reviewed;
    const newValue = !currentlyReviewed;

    // Optimistic update
    setReviewedIds((prev) => {
      const next = new Set(prev);
      if (newValue) next.add(clip.id);
      else next.delete(clip.id);
      return next;
    });

    setTogglingId(clip.id);
    try {
      const res = await fetch("/api/clips/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clip_id: clip.id, is_reviewed: newValue }),
      });
      if (!res.ok) throw new Error("Failed to update review status");
    } catch {
      // Revert optimistic update on error
      setReviewedIds((prev) => {
        const next = new Set(prev);
        if (currentlyReviewed) next.add(clip.id);
        else next.delete(clip.id);
        return next;
      });
    } finally {
      setTogglingId(null);
    }
  }

  const counts = {
    all: clips.length,
    pending: clips.filter((c) => !c.metadata_results).length,
    ready: clips.filter((c) => c.metadata_results && !(reviewedIds.has(c.id) || c.is_reviewed)).length,
    reviewed: clips.filter((c) => reviewedIds.has(c.id) || c.is_reviewed).length,
  };

  const filteredClips = clips.filter((clip) => {
    const hasMetadata = !!clip.metadata_results;
    const isReviewed = reviewedIds.has(clip.id) || clip.is_reviewed;

    if (filter === "pending") return !hasMetadata;
    if (filter === "ready") return hasMetadata && !isReviewed;
    if (filter === "reviewed") return isReviewed;
    return true; // "all"
  });

  return (
    <div>
      {/* Filter tabs */}
      <div className="flex gap-1 rounded-xl bg-muted p-1 mb-4">
        {(["all", "pending", "ready", "reviewed"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition ${
              filter === tab
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab} <span className="ml-1 opacity-60">{counts[tab]}</span>
          </button>
        ))}
      </div>

      {/* Clip list */}
      <div className="space-y-2">
        {filteredClips.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No clips in this filter.</p>
        ) : (
          filteredClips.map((clip) => {
            const expanded = expandedIds.has(clip.id);
            const hasMetadata = !!clip.metadata_results;
            const isReviewed = reviewedIds.has(clip.id) || clip.is_reviewed;

            return (
              <div
                key={clip.id}
                className={`rounded-xl border px-4 py-3 transition ${
                  isReviewed
                    ? "border-primary/20 bg-primary/5"
                    : hasMetadata
                    ? "border-green-500/20 bg-muted/20"
                    : "border-dashed border-border"
                }`}
              >
                {/* Compact header row — always visible */}
                <div
                  className="flex items-center gap-3 cursor-pointer"
                  onClick={() => toggleExpand(clip.id)}
                >
                  {/* Expand chevron */}
                  <svg
                    className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${
                      expanded ? "rotate-90" : ""
                    }`}
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="9 18 15 12 9 6" />
                  </svg>

                  {/* Filename */}
                  <p className="flex-1 truncate text-sm font-medium text-foreground">
                    {clip.original_filename}
                  </p>

                  {/* File size */}
                  {clip.file_size_bytes && (
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {(clip.file_size_bytes / 1024 / 1024).toFixed(1)} MB
                    </span>
                  )}

                  {/* Reviewed badge */}
                  {isReviewed && (
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                      reviewed
                    </span>
                  )}

                  {/* Status badge */}
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      hasMetadata
                        ? "bg-green-500/15 text-green-400"
                        : clip.metadata_status === "processing"
                        ? "bg-blue-500/15 text-blue-400"
                        : clip.metadata_status === "failed"
                        ? "bg-red-500/15 text-red-400"
                        : "bg-amber-500/15 text-amber-400"
                    }`}
                  >
                    {hasMetadata ? "ready" : clip.metadata_status}
                  </span>
                </div>

                {/* Expanded content */}
                {expanded && (
                  <div className="mt-3 border-t border-border pt-3 space-y-3">
                    {/* Video player if available */}
                    {clipUrls[clip.id] && <VideoPlayer src={clipUrls[clip.id]} />}

                    {/* Metadata editor or generate button */}
                    {hasMetadata ? (
                      <>
                        <MetadataEditor
                          clipId={clip.id}
                          initial={{
                            title: clip.metadata_results!.title ?? "",
                            description: clip.metadata_results!.description ?? "",
                            keywords: clip.metadata_results!.keywords ?? [],
                            category: clip.metadata_results!.category ?? "",
                            location: clip.metadata_results!.location ?? null,
                            confidence: clip.metadata_results!.confidence ?? "medium",
                          }}
                        />

                        {/* Mark as Reviewed button */}
                        <div className="flex items-center justify-between pt-2 border-t border-border">
                          <p className="text-xs text-muted-foreground">
                            {isReviewed
                              ? "Marked as reviewed."
                              : "Mark this clip as reviewed when you're done editing."}
                          </p>
                          <button
                            onClick={() => toggleReviewed(clip)}
                            disabled={togglingId === clip.id}
                            className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                              isReviewed
                                ? "border-primary bg-primary/10 text-primary hover:bg-primary/20"
                                : "border-border text-muted-foreground hover:border-green-500/50 hover:text-green-400"
                            }`}
                          >
                            {togglingId === clip.id
                              ? "Saving..."
                              : isReviewed
                              ? "✓ Reviewed"
                              : "Mark as Reviewed"}
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="flex items-center justify-between">
                        <p className="text-sm italic text-muted-foreground">
                          {clip.metadata_status === "processing"
                            ? "Generating metadata..."
                            : "No metadata yet."}
                        </p>
                        {clipUrls[clip.id] && clip.metadata_status !== "processing" && (
                          <GenerateMetadataButton
                            clipId={clip.id}
                            filename={clip.original_filename}
                            storageUrl={clipUrls[clip.id]}
                          />
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
