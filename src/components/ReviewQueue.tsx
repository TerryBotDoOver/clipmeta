"use client";

import { useMemo, useState } from "react";
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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<Filter>("all");
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [editingFilename, setEditingFilename] = useState<string | null>(null);
  const [editFilenameValue, setEditFilenameValue] = useState("");
  const [savingFilename, setSavingFilename] = useState(false);
  const [renamedFiles, setRenamedFiles] = useState<Record<string, string>>({});

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

  function startEditFilename(clipId: string, currentName: string, e: React.MouseEvent) {
    e.stopPropagation();
    setEditingFilename(clipId);
    setEditFilenameValue(currentName);
  }

  async function saveFilename(clipId: string) {
    const trimmed = editFilenameValue.trim();
    if (!trimmed) {
      setEditingFilename(null);
      return;
    }
    setSavingFilename(true);
    try {
      const res = await fetch("/api/clips/rename", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clip_id: clipId, filename: trimmed }),
      });
      if (!res.ok) throw new Error("Rename failed");
      setRenamedFiles((prev) => ({ ...prev, [clipId]: trimmed }));
    } catch {
      alert("Failed to rename clip.");
    } finally {
      setSavingFilename(false);
      setEditingFilename(null);
    }
  }

  function toggleSelected(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function deleteClips(ids: string[]) {
    if (ids.length === 0) return;
    const confirmed = window.confirm(
      `Delete ${ids.length} clip${ids.length > 1 ? "s" : ""}? This removes the file from storage and cannot be undone.`
    );
    if (!confirmed) return;

    setDeletingIds(new Set(ids));
    try {
      const res = await fetch("/api/clips/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clip_ids: ids }),
      });
      if (!res.ok) throw new Error("Delete failed");
      window.location.reload();
    } catch {
      alert("Failed to delete clips. Please try again.");
      setDeletingIds(new Set());
    }
  }

  async function handleBulkDelete() {
    setBulkDeleting(true);
    await deleteClips(Array.from(selectedIds));
    setBulkDeleting(false);
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
    return true;
  });

  const allFilteredSelected = useMemo(
    () =>
      filteredClips.length > 0 &&
      filteredClips.every((clip) => selectedIds.has(clip.id)),
    [filteredClips, selectedIds]
  );

  function toggleSelectAll(checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        filteredClips.forEach((clip) => next.add(clip.id));
      } else {
        filteredClips.forEach((clip) => next.delete(clip.id));
      }
      return next;
    });
  }

  return (
    <div>
      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 mb-4">
          <span className="text-sm font-medium text-foreground">
            {selectedIds.size} clip{selectedIds.size > 1 ? "s" : ""} selected
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSelectedIds(new Set())}
              className="text-xs text-muted-foreground hover:text-foreground transition"
            >
              Clear selection
            </button>
            <button
              onClick={handleBulkDelete}
              disabled={bulkDeleting}
              className="rounded-lg bg-red-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-red-600 disabled:opacity-50"
            >
              {bulkDeleting ? "Deleting…" : `Delete ${selectedIds.size} clip${selectedIds.size > 1 ? "s" : ""}`}
            </button>
          </div>
        </div>
      )}

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

      {filteredClips.length > 0 && (
        <div className="mb-4 flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3">
          <label className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={allFilteredSelected}
              onChange={(e) => toggleSelectAll(e.target.checked)}
              className="h-4 w-4 rounded border-border accent-primary cursor-pointer"
            />
            <span>Select All</span>
          </label>
          <span className="text-xs text-muted-foreground">
            {filteredClips.length} clip{filteredClips.length > 1 ? "s" : ""}
          </span>
        </div>
      )}

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
                className={`group rounded-xl border px-4 py-3 transition ${
                  isReviewed
                    ? "border-primary/20 bg-primary/5"
                    : hasMetadata
                    ? "border-green-500/20 bg-muted/20"
                    : "border-dashed border-border"
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(clip.id)}
                    onChange={(e) => toggleSelected(clip.id, e as unknown as React.MouseEvent)}
                    onClick={(e) => e.stopPropagation()}
                    className="h-4 w-4 shrink-0 rounded border-border accent-primary cursor-pointer"
                  />

                  <div
                    className="flex flex-1 items-center gap-3 cursor-pointer min-w-0"
                    onClick={() => toggleExpand(clip.id)}
                  >
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

                    {editingFilename === clip.id ? (
                      <input
                        autoFocus
                        value={editFilenameValue}
                        onChange={(e) => setEditFilenameValue(e.target.value)}
                        onBlur={() => saveFilename(clip.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveFilename(clip.id);
                          if (e.key === "Escape") setEditingFilename(null);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        disabled={savingFilename}
                        className="flex-1 min-w-0 rounded border border-primary bg-muted px-2 py-0.5 text-sm font-medium text-foreground outline-none focus:ring-1 focus:ring-primary"
                      />
                    ) : (
                      <p
                        className="flex-1 truncate text-sm font-medium text-foreground hover:text-primary cursor-text transition"
                        onClick={(e) => startEditFilename(clip.id, renamedFiles[clip.id] ?? clip.original_filename, e)}
                        title="Click to rename"
                      >
                        {renamedFiles[clip.id] ?? clip.original_filename}
                      </p>
                    )}

                    {clip.file_size_bytes && (
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {(clip.file_size_bytes / 1024 / 1024).toFixed(1)} MB
                      </span>
                    )}

                    {isReviewed && (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                        reviewed
                      </span>
                    )}

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

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteClips([clip.id]);
                    }}
                    disabled={deletingIds.has(clip.id)}
                    className="shrink-0 rounded-lg p-1.5 text-muted-foreground opacity-0 transition hover:bg-red-500/15 hover:text-red-400 group-hover:opacity-100 focus:opacity-100"
                    title="Delete clip"
                  >
                    {deletingIds.has(clip.id) ? (
                      <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8V4z" />
                      </svg>
                    ) : (
                      <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    )}
                  </button>
                </div>

                {expanded && (
                  <div className="mt-3 border-t border-border pt-3 space-y-3">
                    {clipUrls[clip.id] && <VideoPlayer src={clipUrls[clip.id]} />}

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