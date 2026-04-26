"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { VideoPlayer } from "@/components/VideoPlayer";
import { MetadataEditor } from "@/components/MetadataEditor";
import { GenerateMetadataButton } from "@/components/GenerateMetadataButton";
import { LimitReachedModal } from "@/components/LimitReachedModal";
import { extractFrames } from "@/lib/extractFrames";
import { BULK_REGEN_PLANS } from "@/lib/plans";

type MetadataResults = {
  title: string;
  description: string;
  keywords: string[];
  category: string;
  location: string | null;
  confidence: string;
  thumbnail_url?: string | null;
};

type Clip = {
  id: string;
  original_filename: string;
  file_size_bytes: number | null;
  metadata_status: string;
  upload_status: string | null;
  is_reviewed: boolean;
  metadata_results: MetadataResults | null;
  is_editorial?: boolean | null;
  editorial_text?: string | null;
  editorial_city?: string | null;
  editorial_state?: string | null;
  editorial_country?: string | null;
  editorial_date?: string | null;
};

type Props = {
  clips: Clip[];
  clipUrls: Record<string, string>;
  pendingClips: { id: string; filename: string; storageUrl: string }[];
  projectId: string;
  plan?: string;
  projectLocation?: string | null;
  projectShootingDate?: string | null;
  pinnedKeywords?: string | null;
  pinnedKeywordsPosition?: string | null;
  projectIsEditorial?: boolean;
  projectEditorialText?: string | null;
  projectEditorialCity?: string | null;
  projectEditorialState?: string | null;
  projectEditorialCountry?: string | null;
  projectEditorialDate?: string | null;
  clipsWithHistory?: string[];
};

type Filter = "all" | "pending" | "ready" | "reviewed";

export function ReviewQueue({ clips: initialClips, clipUrls, projectId, plan = 'free', projectLocation, projectShootingDate, pinnedKeywords: initialPinnedKeywords, pinnedKeywordsPosition: initialPinnedPosition, projectIsEditorial: initialProjectIsEditorial = false, projectEditorialText: initialProjectEditorialText, projectEditorialCity: initialProjectEditorialCity, projectEditorialState: initialProjectEditorialState, projectEditorialCountry: initialProjectEditorialCountry, projectEditorialDate: initialProjectEditorialDate, clipsWithHistory: initialClipsWithHistory = [] }: Props) {
  // Track which clips currently have a previous version available to revert to.
  // Server seeds this from the metadata_history table; client mutates as users
  // regenerate (history appears) or revert (history is consumed by the swap,
  // but the OLD current becomes the new history -- so the toggle stays valid).
  const [clipsWithHistory, setClipsWithHistory] = useState<Set<string>>(() => new Set(initialClipsWithHistory));
  const [revertingIds, setRevertingIds] = useState<Set<string>>(new Set());
  const [liveClips, setLiveClips] = useState<Clip[]>(initialClips);
  const [pinnedKeywords, setPinnedKeywords] = useState(initialPinnedKeywords);
  const [pinnedKeywordsPosition, setPinnedKeywordsPosition] = useState(initialPinnedPosition);
  const [projectIsEditorial, setProjectIsEditorial] = useState(initialProjectIsEditorial);
  const [projectEditorialText, setProjectEditorialText] = useState(initialProjectEditorialText);
  const [projectEditorialCity, setProjectEditorialCity] = useState(initialProjectEditorialCity);
  const [projectEditorialState, setProjectEditorialState] = useState(initialProjectEditorialState);
  const [projectEditorialCountry, setProjectEditorialCountry] = useState(initialProjectEditorialCountry);
  const [projectEditorialDate, setProjectEditorialDate] = useState(initialProjectEditorialDate);

  // Listen for settings changes from ProjectMetaCard
  useEffect(() => {
    function handleSettingsSaved(e: Event) {
      const detail = (e as CustomEvent).detail;
      if (detail.pinnedKeywords !== undefined) setPinnedKeywords(detail.pinnedKeywords);
      if (detail.pinnedKeywordsPosition !== undefined) setPinnedKeywordsPosition(detail.pinnedKeywordsPosition);
      if (detail.isEditorial !== undefined) setProjectIsEditorial(detail.isEditorial);
      if (detail.editorialCity !== undefined) setProjectEditorialCity(detail.editorialCity);
      if (detail.editorialState !== undefined) setProjectEditorialState(detail.editorialState);
      if (detail.editorialCountry !== undefined) setProjectEditorialCountry(detail.editorialCountry);
      if (detail.editorialDate !== undefined) setProjectEditorialDate(detail.editorialDate);

      // Mirror the server-side propagation: update ALL local clips to match
      // the new editorial settings so the UI reflects changes immediately
      // without a page reload. Each clip keeps its own editorial_text (caption).
      if (detail.isEditorial !== undefined) {
        setLiveClips(prev => prev.map(clip => ({
          ...clip,
          is_editorial: detail.isEditorial,
          editorial_city: detail.editorialCity ?? clip.editorial_city,
          editorial_state: detail.editorialState ?? clip.editorial_state,
          editorial_country: detail.editorialCountry ?? clip.editorial_country,
          editorial_date: detail.editorialDate ?? clip.editorial_date,
        })));
        // Also clear per-clip editorial overrides so they re-read from the updated clips
        setClipEditorial({});
      }
    }
    window.addEventListener("clipmeta:settings-saved", handleSettingsSaved);
    return () => window.removeEventListener("clipmeta:settings-saved", handleSettingsSaved);
  }, []);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [reviewedIds, setReviewedIds] = useState<Set<string>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<Filter>("all");
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [bulkApproving, setBulkApproving] = useState(false);
  const [bulkRejecting, setBulkRejecting] = useState(false);
  const [editingFilename, setEditingFilename] = useState<string | null>(null);
  const [editFilenameValue, setEditFilenameValue] = useState("");
  const [savingFilename, setSavingFilename] = useState(false);
  const [renamedFiles, setRenamedFiles] = useState<Record<string, string>>({});
  // Local metadata overrides — updated in-place after regeneration (no page reload)
  const [metadataOverrides, setMetadataOverrides] = useState<Record<string, Partial<MetadataResults>>>({});
  const [bulkRegenerating, setBulkRegenerating] = useState(false);
  const [regenProgress, setRegenProgress] = useState<{ current: number; total: number; filename: string } | null>(null);
  const [regenDone, setRegenDone] = useState<{ count: number; errors: number } | null>(null);
  const [limitModal, setLimitModal] = useState<{ message: string; upgradeMessage?: string } | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Per-clip editorial overrides (local state before saving)
  const [clipEditorial, setClipEditorial] = useState<Record<string, {
    is_editorial: boolean;
    editorial_text: string;
    editorial_city: string;
    editorial_state: string;
    editorial_country: string;
    editorial_date: string;
  }>>({});
  const [savingEditorial, setSavingEditorial] = useState<Set<string>>(new Set());

  // Track whether bulk generation is actively running (signaled via custom events)
  const [generationActive, setGenerationActive] = useState(false);

  // Poll for clip status updates when there are pending/processing clips OR generation is active
  const hasPending = useMemo(() => liveClips.some(c =>
    c.metadata_status === 'not_started' || c.metadata_status === 'processing' || c.metadata_status === 'worker_pending'
  ), [liveClips]);

  const shouldPoll = hasPending || generationActive;

  const refreshClips = useCallback(async () => {
    if (!projectId) return;
    try {
      const res = await fetch(`/api/clips/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: projectId, action: 'list' }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.clips && Array.isArray(data.clips) && data.clips.length > 0) {
          setLiveClips(data.clips);
        }
      }
    } catch { /* silent */ }
  }, [projectId]);

  // Listen for generation events from BulkGenerateButton
  useEffect(() => {
    function handleGenerationStarted() {
      setGenerationActive(true);
      refreshClips(); // Immediate refresh when generation starts
    }
    function handleGenerationProgress() {
      refreshClips(); // Refresh on each clip completion
    }
    function handleGenerationDone() {
      setGenerationActive(false);
      refreshClips(); // Final refresh
    }
    window.addEventListener("clipmeta:generation-started", handleGenerationStarted);
    window.addEventListener("clipmeta:generation-progress", handleGenerationProgress);
    window.addEventListener("clipmeta:generation-done", handleGenerationDone);
    return () => {
      window.removeEventListener("clipmeta:generation-started", handleGenerationStarted);
      window.removeEventListener("clipmeta:generation-progress", handleGenerationProgress);
      window.removeEventListener("clipmeta:generation-done", handleGenerationDone);
    };
  }, [refreshClips]);

  useEffect(() => {
    if (shouldPoll && !pollRef.current) {
      pollRef.current = setInterval(refreshClips, 5000);
    }
    if (!shouldPoll && pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [shouldPoll, refreshClips]);

  const canBulkRegen = (BULK_REGEN_PLANS as readonly string[]).includes(plan);

  function getClipEditorial(clip: Clip) {
    if (clipEditorial[clip.id]) return clipEditorial[clip.id];
    return {
      is_editorial: clip.is_editorial ?? projectIsEditorial,
      editorial_text: clip.editorial_text ?? projectEditorialText ?? "",
      editorial_city: clip.editorial_city ?? projectEditorialCity ?? "",
      editorial_state: clip.editorial_state ?? projectEditorialState ?? "",
      editorial_country: clip.editorial_country ?? projectEditorialCountry ?? "",
      editorial_date: clip.editorial_date ?? projectEditorialDate ?? "",
    };
  }

  function updateClipEditorial(clipId: string, field: string, value: string | boolean) {
    setClipEditorial((prev) => ({
      ...prev,
      [clipId]: { ...getClipEditorial(liveClips.find(c => c.id === clipId)!), [field]: value },
    }));
  }

  async function saveClipEditorial(clipId: string) {
    const ed = clipEditorial[clipId];
    if (!ed) return;
    setSavingEditorial((prev) => new Set(prev).add(clipId));
    try {
      const res = await fetch("/api/clips/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_editorial",
          clip_id: clipId,
          is_editorial: ed.is_editorial,
          editorial_text: ed.editorial_text || null,
          editorial_city: ed.editorial_city || null,
          editorial_state: ed.editorial_state || null,
          editorial_country: ed.editorial_country || null,
          editorial_date: ed.editorial_date || null,
        }),
      });
      if (!res.ok) throw new Error("Failed to save editorial");
      setLiveClips((prev) => prev.map((c) => c.id === clipId ? {
        ...c,
        is_editorial: ed.is_editorial,
        editorial_text: ed.editorial_text || null,
        editorial_city: ed.editorial_city || null,
        editorial_state: ed.editorial_state || null,
        editorial_country: ed.editorial_country || null,
        editorial_date: ed.editorial_date || null,
      } : c));
    } catch {
      alert("Failed to save editorial settings.");
    } finally {
      setSavingEditorial((prev) => { const next = new Set(prev); next.delete(clipId); return next; });
    }
  }

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

  // Two-position toggle: swap current metadata with the one history row.
  // After a successful revert the OLD current becomes the new history, so the
  // button stays valid and the user can flip back. Does not consume regen quota.
  async function handleRevert(clipId: string) {
    if (revertingIds.has(clipId)) return;
    setRevertingIds((prev) => new Set(prev).add(clipId));
    try {
      const res = await fetch("/api/metadata/revert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clip_id: clipId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data?.message || "Could not revert to previous version.");
        return;
      }
      const m = data.metadata;
      if (m) {
        setMetadataOverrides((prev) => ({
          ...prev,
          [clipId]: {
            title: m.title,
            description: m.description,
            keywords: m.keywords,
            category: m.category,
            location: m.location,
            confidence: m.confidence,
            thumbnail_url: m.thumbnail_url,
          },
        }));
      }
      // History row still exists (the OLD current got snapshotted into it),
      // so keep clipId in the set -- toggle remains valid for re-revert.
      setClipsWithHistory((prev) => new Set(prev).add(clipId));
    } catch {
      alert("Could not revert to previous version.");
    } finally {
      setRevertingIds((prev) => { const next = new Set(prev); next.delete(clipId); return next; });
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

  async function handleBulkApprove() {
    if (selectedIds.size === 0) return;
    setBulkApproving(true);
    const ids = Array.from(selectedIds);
    try {
      await Promise.all(
        ids.map((id) =>
          fetch("/api/clips/review", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ clip_id: id, is_reviewed: true }),
          })
        )
      );
      setReviewedIds((prev) => {
        const next = new Set(prev);
        ids.forEach((id) => next.add(id));
        return next;
      });
      setSelectedIds(new Set());
    } catch {
      alert("Failed to approve some clips.");
    } finally {
      setBulkApproving(false);
    }
  }

  async function handleBulkReject() {
    if (selectedIds.size === 0) return;
    setBulkRejecting(true);
    const ids = Array.from(selectedIds);
    try {
      await Promise.all(
        ids.map((id) =>
          fetch("/api/clips/review", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ clip_id: id, is_reviewed: false }),
          })
        )
      );
      setReviewedIds((prev) => {
        const next = new Set(prev);
        ids.forEach((id) => next.delete(id));
        return next;
      });
      setSelectedIds(new Set());
    } catch {
      alert("Failed to reject some clips.");
    } finally {
      setBulkRejecting(false);
    }
  }

  async function handleBulkRegenerate() {
    if (selectedIds.size === 0 || !canBulkRegen) return;
    const ids = Array.from(selectedIds);
    const total = ids.length;
    setBulkRegenerating(true);
    setRegenDone(null);
    let errCount = 0;

    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      const clip = liveClips.find((c) => c.id === id);
      if (!clip) continue;
      const storageUrl = clipUrls[id];
      if (!storageUrl) { errCount++; continue; }
      const filename = renamedFiles[id] ?? clip.original_filename;
      setRegenProgress({ current: i + 1, total, filename });

      try {
        let frames: { dataUrl: string; timestampSeconds: number }[] = [];

        // Try server-side frame extraction FIRST (reads from R2 via ffmpeg, no browser download)
        // This is faster and more reliable than downloading 100-200MB files through the browser
        try {
          const serverRes = await fetch("/api/frames/extract", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ clip_id: id }),
          });
          if (serverRes.ok) {
            const { frames: serverFrames } = await serverRes.json();
            if (Array.isArray(serverFrames) && serverFrames.length > 0) {
              frames = serverFrames.map((dataUrl: string) => ({ dataUrl, timestampSeconds: 0 }));
            }
          }
        } catch (serverErr) {
          console.warn("Server-side frame extraction failed for", filename, serverErr);
        }

        // Fall back to client-side extraction only if server-side returned nothing
        if (frames.length === 0) {
          const ext = (filename.match(/\.[^.]+$/) || [''])[0].toLowerCase();
          const unsupportedExts = ['.mov', '.mxf', '.avi', '.r3d', '.braw', '.dng'];
          const skipFrames = (clip.file_size_bytes ?? 0) > 500 * 1024 * 1024 || unsupportedExts.includes(ext);

          if (!skipFrames) {
            const res = await fetch(storageUrl);
            if (!res.ok) throw new Error("Could not load video");
            const blob = await res.blob();
            const file = new File([blob], filename, { type: blob.type || "video/mp4" });
            frames = await extractFrames(file, 4);
          }
        }

        const metaRes = await fetch("/api/metadata/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ clip_id: id, frames: frames.map((f) => f.dataUrl) }),
        });

        if (metaRes.status === 429) {
          const limitData = await metaRes.json();
          setBulkRegenerating(false);
          setRegenProgress(null);
          setRegenDone({ count: i, errors: errCount + (total - i) });
          setLimitModal({
            message: limitData.message,
            upgradeMessage: limitData.upgrade_message,
          });
          return;
        }

        if (!metaRes.ok) throw new Error("Generation failed");
        const { metadata } = await metaRes.json();
        setMetadataOverrides((prev) => ({ ...prev, [id]: metadata }));
      } catch {
        errCount++;
      }
    }

    setBulkRegenerating(false);
    setRegenProgress(null);
    setRegenDone({ count: total - errCount, errors: errCount });
    setSelectedIds(new Set());
  }

  const counts = {
    all: liveClips.length,
    pending: liveClips.filter((c) => !c.metadata_results).length,
    ready: liveClips.filter((c) => c.metadata_results && !(reviewedIds.has(c.id) || c.is_reviewed)).length,
    reviewed: liveClips.filter((c) => reviewedIds.has(c.id) || c.is_reviewed).length,
  };

  const filteredClips = liveClips.filter((clip) => {
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
      <LimitReachedModal
        open={!!limitModal}
        title="Regeneration Limit Reached"
        message={limitModal?.message || ""}
        upgradeMessage={limitModal?.upgradeMessage}
        onClose={() => setLimitModal(null)}
      />
      {(selectedIds.size > 0 || regenDone) && (
        <div className="rounded-xl border border-primary/30 bg-primary/5 px-4 py-2.5 mb-4">
          {bulkRegenerating && regenProgress ? (
            <div className="flex items-center gap-3">
              <svg className="h-4 w-4 shrink-0 animate-spin text-purple-400" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8V4z" />
              </svg>
              <span className="text-sm text-foreground">
                Regenerating {regenProgress.current} of {regenProgress.total}
                <span className="ml-1.5 max-w-[200px] truncate text-muted-foreground inline-block align-bottom">
                  — {regenProgress.filename}
                </span>
              </span>
              <div className="ml-auto flex-1 max-w-[120px] h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-1.5 rounded-full bg-purple-500 transition-all duration-300"
                  style={{ width: `${Math.round((regenProgress.current / regenProgress.total) * 100)}%` }}
                />
              </div>
            </div>
          ) : regenDone ? (
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-sm font-medium text-green-400">
                ✓ Done! {regenDone.count} clip{regenDone.count !== 1 ? "s" : ""} regenerated
                {regenDone.errors > 0 && <span className="ml-1 text-amber-400">({regenDone.errors} failed)</span>}
              </span>
              <button
                onClick={() => { setRegenDone(null); window.location.reload(); }}
                className="rounded-lg border border-border px-3 py-1 text-xs font-medium text-foreground transition hover:bg-muted"
              >
                Refresh
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-sm font-medium text-foreground">
                {selectedIds.size} clip{selectedIds.size > 1 ? "s" : ""} selected
              </span>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => setSelectedIds(new Set())}
                  className="text-xs text-muted-foreground hover:text-foreground transition px-2"
                >
                  Clear
                </button>
                <button
                  onClick={handleBulkApprove}
                  disabled={bulkApproving}
                  className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-green-700 disabled:opacity-50"
                >
                  {bulkApproving ? "Approving…" : `✓ Approve ${selectedIds.size}`}
                </button>
                <button
                  onClick={handleBulkReject}
                  disabled={bulkRejecting}
                  className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-amber-600 disabled:opacity-50"
                >
                  {bulkRejecting ? "Rejecting…" : `✕ Reject ${selectedIds.size}`}
                </button>
                <button
                  onClick={handleBulkDelete}
                  disabled={bulkDeleting}
                  className="rounded-lg bg-red-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-red-600 disabled:opacity-50"
                >
                  {bulkDeleting ? "Deleting…" : `🗑 Delete ${selectedIds.size}`}
                </button>
                {canBulkRegen ? (
                  <button
                    onClick={handleBulkRegenerate}
                    disabled={bulkRegenerating}
                    className="rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-purple-700 disabled:opacity-50"
                  >
                    ↺ Regenerate {selectedIds.size}
                  </button>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => { window.location.href = "/pricing"; }}
                      className="flex items-center gap-1 rounded-lg bg-purple-600/30 px-3 py-1.5 text-xs font-semibold text-white/40 transition hover:bg-purple-600/45"
                      title="Pro feature — Upgrade to unlock"
                    >
                      🔒 Regenerate {selectedIds.size}
                    </button>
                    <a
                      href="/pricing"
                      className="text-xs font-semibold text-violet-400 hover:text-violet-300 whitespace-nowrap transition"
                    >
                      Upgrade →
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-1 rounded-xl bg-muted p-1 mb-4">
        {(["all", "pending", "ready", "reviewed"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`flex-1 min-w-[60px] rounded-lg px-2 py-1.5 text-xs font-semibold capitalize transition sm:px-3 ${
              filter === tab
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab} <span className="ml-0.5 opacity-60 sm:ml-1">{counts[tab]}</span>
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
            // Merge any in-place regeneration overrides on top of server data
            const effectiveMeta = clip.metadata_results
              ? { ...clip.metadata_results, ...(metadataOverrides[clip.id] ?? {}) }
              : (metadataOverrides[clip.id] ? { ...metadataOverrides[clip.id] } as MetadataResults : null);
            const hasMetadata = !!effectiveMeta;
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

                  {/* Thumbnail preview */}
                  <div className="shrink-0 w-20 h-[60px] rounded-lg overflow-hidden bg-muted border border-border flex items-center justify-center">
                    {effectiveMeta?.thumbnail_url ? (
                      <img
                        src={effectiveMeta.thumbnail_url}
                        alt={clip.original_filename}
                        className="w-full h-full object-cover"
                      />
                    ) : clipUrls[clip.id] ? (
                      <video
                        src={clipUrls[clip.id]}
                        preload="metadata"
                        muted
                        playsInline
                        className="w-full h-full object-cover"
                        onLoadedMetadata={(e) => {
                          const vid = e.currentTarget;
                          vid.currentTime = Math.min(1, vid.duration * 0.1);
                        }}
                      />
                    ) : (
                      <svg className="h-7 w-7 text-muted-foreground/40" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                        <path d="M8 21h8M12 17v4" />
                      </svg>
                    )}
                  </div>

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
                      <span className="hidden text-xs text-muted-foreground tabular-nums sm:inline">
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
                    {clipUrls[clip.id] ? (
                      <VideoPlayer src={clipUrls[clip.id]} />
                    ) : clip.upload_status === "source_deleted" ? (
                      <div className="mt-3 flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-xs">
                        <span aria-hidden className="mt-0.5 text-base leading-none">📦</span>
                        <div className="space-y-1">
                          <p className="font-semibold text-amber-300">Source video no longer available</p>
                          <p className="text-muted-foreground leading-relaxed">
                            Your metadata and thumbnail are saved. Re-upload the clip if you want to regenerate.
                          </p>
                        </div>
                      </div>
                    ) : null}

                    {hasMetadata ? (
                      <>
                        <MetadataEditor
                          key={`${clip.id}-${metadataOverrides[clip.id] ? 'regen' : 'orig'}`}
                          clipId={clip.id}
                          initial={{
                            title: effectiveMeta!.title ?? "",
                            description: effectiveMeta!.description ?? "",
                            keywords: effectiveMeta!.keywords ?? [],
                            category: effectiveMeta!.category ?? "",
                            location: effectiveMeta!.location || projectLocation || null,
                            confidence: effectiveMeta!.confidence ?? "medium",
                          }}
                          pinnedKeywords={pinnedKeywords}
                          pinnedKeywordsPosition={pinnedKeywordsPosition}
                        />

                        {/* Per-clip editorial override */}
                        <div className="mt-2 rounded-lg border border-border bg-muted/30 p-3">
                          <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground cursor-pointer">
                            <input
                              type="checkbox"
                              checked={getClipEditorial(clip).is_editorial}
                              onChange={(e) => {
                                updateClipEditorial(clip.id, "is_editorial", e.target.checked);
                                // Auto-save the editorial toggle immediately
                                const ed = { ...getClipEditorial(clip), is_editorial: e.target.checked };
                                fetch("/api/clips/review", {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({
                                    action: "update_editorial",
                                    clip_id: clip.id,
                                    is_editorial: e.target.checked,
                                    editorial_text: ed.editorial_text || null,
                                    editorial_city: ed.editorial_city || null,
                                    editorial_state: ed.editorial_state || null,
                                    editorial_country: ed.editorial_country || null,
                                    editorial_date: ed.editorial_date || null,
                                  }),
                                }).catch(() => {});
                              }}
                              className="h-3.5 w-3.5 rounded border-border accent-primary"
                            />
                            Editorial clip
                          </label>
                          {getClipEditorial(clip).is_editorial && (
                            <div className="mt-2 space-y-2">
                              <div>
                                <label className="block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-0.5">Editorial Caption</label>
                                <textarea
                                  value={getClipEditorial(clip).editorial_text}
                                  onChange={(e) => updateClipEditorial(clip.id, "editorial_text", e.target.value)}
                                  rows={2}
                                  className="w-full rounded border border-border bg-background px-2 py-1 text-xs text-foreground placeholder:text-muted-foreground/50 outline-none focus:ring-1 focus:ring-primary resize-none"
                                  placeholder="Editorial caption..."
                                />
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-0.5">City</label>
                                  <input
                                    type="text"
                                    value={getClipEditorial(clip).editorial_city}
                                    onChange={(e) => updateClipEditorial(clip.id, "editorial_city", e.target.value)}
                                    className="w-full rounded border border-border bg-background px-2 py-1 text-xs text-foreground outline-none focus:ring-1 focus:ring-primary"
                                    placeholder="City"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-0.5">State</label>
                                  <input
                                    type="text"
                                    value={getClipEditorial(clip).editorial_state}
                                    onChange={(e) => updateClipEditorial(clip.id, "editorial_state", e.target.value)}
                                    className="w-full rounded border border-border bg-background px-2 py-1 text-xs text-foreground outline-none focus:ring-1 focus:ring-primary"
                                    placeholder="State"
                                  />
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-0.5">Country</label>
                                  <input
                                    type="text"
                                    value={getClipEditorial(clip).editorial_country}
                                    onChange={(e) => updateClipEditorial(clip.id, "editorial_country", e.target.value)}
                                    className="w-full rounded border border-border bg-background px-2 py-1 text-xs text-foreground outline-none focus:ring-1 focus:ring-primary"
                                    placeholder="Country"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-0.5">Date</label>
                                  <input
                                    type="date"
                                    value={getClipEditorial(clip).editorial_date}
                                    onChange={(e) => updateClipEditorial(clip.id, "editorial_date", e.target.value)}
                                    className="w-full rounded border border-border bg-background px-2 py-1 text-xs text-foreground outline-none focus:ring-1 focus:ring-primary"
                                  />
                                </div>
                              </div>
                              <div className="flex justify-end">
                                <button
                                  onClick={() => saveClipEditorial(clip.id)}
                                  disabled={savingEditorial.has(clip.id)}
                                  className="rounded-lg bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
                                >
                                  {savingEditorial.has(clip.id) ? "Saving..." : "Save Editorial"}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-border">
                          <p className="text-xs text-muted-foreground">
                            {isReviewed
                              ? "Marked as reviewed."
                              : "Mark this clip as reviewed when you're done editing."}
                          </p>
                          <div className="flex items-center gap-2">
                            {clipsWithHistory.has(clip.id) && (
                              <button
                                onClick={() => handleRevert(clip.id)}
                                disabled={revertingIds.has(clip.id)}
                                title="Swap back to the previous metadata version. Free -- doesn't use a regeneration."
                                className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:border-primary/50 hover:text-primary disabled:opacity-50"
                              >
                                {revertingIds.has(clip.id) ? "Reverting..." : "↺ Previous version"}
                              </button>
                            )}
                            {clipUrls[clip.id] ? (
                              <GenerateMetadataButton
                                clipId={clip.id}
                                filename={clip.original_filename}
                                storageUrl={clipUrls[clip.id]}
                                fileSize={clip.file_size_bytes ?? 0}
                                label="Regenerate"
                                variant="subtle"
                                onSuccess={(meta) => {
                                  setMetadataOverrides(prev => ({ ...prev, [clip.id]: meta }));
                                  // Generate route snapshots prior metadata into history,
                                  // so this clip now has a previous version to revert to.
                                  setClipsWithHistory(prev => new Set(prev).add(clip.id));
                                }}
                              />
                            ) : (
                              <span
                                title="Source video was archived after generation. Re-upload the clip to regenerate."
                                className="cursor-help rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground opacity-40"
                              >
                                Regenerate
                              </span>
                            )}
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
                        </div>
                      </>
                    ) : (
                      <div className="flex items-center justify-between">
                        <p className="text-sm italic text-muted-foreground">
                          {clip.metadata_status === "processing"
                            ? "Generating metadata..."
                            : clip.metadata_status === "worker_pending"
                            ? "Processing server-side (ProRes/large file)..."
                            : "No metadata yet."}
                        </p>
                        {clipUrls[clip.id] && clip.metadata_status !== "processing" && clip.metadata_status !== "worker_pending" && (
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