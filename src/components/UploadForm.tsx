"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { extractFrames } from "@/lib/extractFrames";
import { LimitReachedModal } from "@/components/LimitReachedModal";
import { trackClarityEvent } from "@/lib/clarity-events";
import { getPlanDisplayName, normalizePlan } from "@/lib/plans";

// Codecs the browser cannot decode — need server-side worker processing
const WORKER_CODEC_EXTENSIONS = new Set(['.mov', '.mxf', '.mts', '.m2ts']);
const PREVIEW_WARNING_EXTENSIONS = new Set(['.mov', '.mxf', '.mts', '.m2ts']);

async function needsServerWorker(file: File): Promise<boolean> {
  const ext = file.name.toLowerCase().match(/\.[^.]+$/)?.[0];
  if (!ext || !WORKER_CODEC_EXTENSIONS.has(ext)) return false;

  // Try loading video briefly to see if browser can decode it
  return new Promise((resolve) => {
    const video = document.createElement('video');
    const url = URL.createObjectURL(file);
    const timeout = setTimeout(() => {
      URL.revokeObjectURL(url);
      resolve(true); // Timed out — assume incompatible
    }, 8000);

    video.onloadedmetadata = () => {
      clearTimeout(timeout);
      URL.revokeObjectURL(url);
      resolve(false); // Browser can handle it
    };
    video.onerror = () => {
      clearTimeout(timeout);
      URL.revokeObjectURL(url);
      resolve(true); // Browser can't handle it — needs worker
    };
    video.src = url;
    video.load();
  });
}

/**
 * Smooth progress bar with CSS transition for polish.
 * Now receives near-continuous progress data from XHR upload events,
 * CSS transition adds a slight smoothing effect on top.
 */
function SmoothProgressBar({ rawProgress }: { rawProgress: number }) {
  return (
    <div className="mt-2 space-y-1">
      <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{
            width: `${rawProgress}%`,
            background: "linear-gradient(90deg, #6d28d9 0%, #db2777 50%, #f59e0b 100%)",
            boxShadow: "0 0 12px rgba(219, 39, 119, 0.6), 0 0 24px rgba(245, 158, 11, 0.4)",
            transition: rawProgress === 0 ? "none" : "width 0.3s ease-out",
          }}
        />
        {/* Animated shimmer overlay sliding across the filled portion */}
        {rawProgress > 0 && rawProgress < 100 && (
          <div
            className="absolute inset-y-0 left-0 overflow-hidden rounded-full"
            style={{
              width: `${rawProgress}%`,
              transition: "width 0.3s ease-out",
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: 0,
                background:
                  "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.5) 50%, transparent 100%)",
                animation: "upload-shimmer 1.4s linear infinite",
              }}
            />
          </div>
        )}
      </div>
      <p className="text-[10px] font-mono font-semibold text-muted-foreground">
        {rawProgress}%
      </p>
      <style jsx>{`
        @keyframes upload-shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
      `}</style>
    </div>
  );
}

type UploadFormProps = {
  projectId: string;
  projectSlug: string;
  maxFileSizeBytes?: number;
  userPlan?: string;
};

type FileStatus = "queued" | "extracting" | "uploading" | "generating" | "done" | "error";
const ACTIVE_STATUSES = new Set<FileStatus>(["queued", "extracting", "uploading", "generating"]);
const UPLOAD_NAV_WARNING =
  "Your upload is still running. Please wait for the queue to finish, or press Cancel All before leaving this page.";

type QueuedFile = {
  id: string;
  file: File;
  status: FileStatus;
  progress: number;
  error?: string;
  cancelled?: boolean;
  tooLarge?: boolean;
  limitReached?: boolean;
};

export function UploadForm({ projectId, projectSlug, maxFileSizeBytes, userPlan }: UploadFormProps) {
  const basePlan = normalizePlan(userPlan);
  const planLabel = getPlanDisplayName(userPlan);
  const effectiveLimit = maxFileSizeBytes ?? 500 * 1024 * 1024; // default 500MB
  const limitLabel = effectiveLimit >= 1024 * 1024 * 1024
    ? `${(effectiveLimit / (1024 * 1024 * 1024)).toFixed(0)}GB`
    : `${(effectiveLimit / (1024 * 1024)).toFixed(0)}MB`;
  const [queue, setQueue] = useState<QueuedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [limitModal, setLimitModal] = useState<{ message: string; upgradeMessage?: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const cancelledRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const abortControllersRef = useRef<Set<AbortController>>(new Set());
  // Mirrors `queue` state so processQueue can read the freshest list even when
  // called immediately after a setQueue (e.g. from a retry button).
  const queueRef = useRef<QueuedFile[]>([]);
  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);

  // Warn user if they try to navigate away during an active upload
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isRunning) {
        e.preventDefault();
        e.returnValue = UPLOAD_NAV_WARNING;
        return;
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isRunning]);

  // Next.js client-side links do not always trigger beforeunload, so block any
  // in-app link click while the upload/generation queue is still active.
  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      if (!isRunning || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
        return;
      }

      const target = e.target instanceof Element ? e.target : null;
      const anchor = target?.closest("a[href]") as HTMLAnchorElement | null;
      if (!anchor || anchor.target || anchor.hasAttribute("download")) return;

      const href = anchor.getAttribute("href") ?? "";
      if (href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return;

      e.preventDefault();
      e.stopPropagation();
      window.alert(UPLOAD_NAV_WARNING);
    };

    document.addEventListener("click", handleDocumentClick, true);
    return () => document.removeEventListener("click", handleDocumentClick, true);
  }, [isRunning]);

  function updateFile(id: string, patch: Partial<QueuedFile>) {
    setQueue((prev) => {
      const next = prev.map((f) => (f.id === id ? { ...f, ...patch } : f));
      queueRef.current = next;
      return next;
    });
  }

  function addFiles(files: FileList | File[]) {
    const videoFiles = Array.from(files).filter((f) => f.type.startsWith("video/"));
    if (videoFiles.length === 0) return;
    const newItems: QueuedFile[] = videoFiles.map((file) => {
      if (file.size > effectiveLimit) {
        const nextPlan = basePlan === "free" ? "Starter" : basePlan === "starter" ? "Pro" : basePlan === "pro" ? "Studio" : null;
        const nextPlanLimit = basePlan === "free" ? "2GB" : basePlan === "starter" ? "5GB" : basePlan === "pro" ? "10GB" : null;
        const upgradeMsg = nextPlan && nextPlanLimit
          ? `${planLabel} plan supports up to ${limitLabel}. Upgrade to ${nextPlan} for ${nextPlanLimit} files.`
          : `${planLabel} plan supports up to ${limitLabel}.`;
        return {
          id: `${Date.now()}-${Math.random()}`,
          file,
          status: "error" as FileStatus,
          progress: 0,
          error: `This file is ${(file.size / (1024 * 1024)).toFixed(0)}MB — ${upgradeMsg}`,
          tooLarge: true,
        };
      }
      return {
        id: `${Date.now()}-${Math.random()}`,
        file,
        status: "queued" as FileStatus,
        progress: 0,
      };
    });
    setQueue((prev) => [...prev, ...newItems]);
  }

  // Drag & drop handlers
  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);
  const onDragLeave = useCallback(() => setIsDragging(false), []);
  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    addFiles(e.dataTransfer.files);
  }, []);

  function handleCancelAll() {
    cancelledRef.current = true;
    abortControllerRef.current?.abort();
    abortControllersRef.current.forEach((controller) => controller.abort());
  }

  function handleCancelOne(id: string) {
    const item = queue.find((f) => f.id === id);
    if (!item) return;
    if (item.status === "queued") {
      setQueue((prev) => prev.filter((f) => f.id !== id));
    } else {
      cancelledRef.current = true;
      abortControllerRef.current?.abort();
      abortControllersRef.current.forEach((controller) => controller.abort());
    }
  }

  function handleRetryOne(id: string) {
    if (isRunning) return;
    const item = queueRef.current.find((f) => f.id === id);
    if (!item || item.tooLarge || item.limitReached) return;
    // Reset to queued and sync the ref synchronously so processQueue sees it
    // on the next line, before React's re-render flushes.
    const updated = queueRef.current.map((f) =>
      f.id === id
        ? { ...f, status: "queued" as FileStatus, progress: 0, error: undefined }
        : f
    );
    queueRef.current = updated;
    setQueue(updated);
    processQueueConcurrent();
  }

  async function processQueueConcurrent() {
    cancelledRef.current = false;
    const toProcess = queueRef.current.filter((f) => f.status === "queued");
    if (toProcess.length === 0) return;
    setIsRunning(true);

    const uploadLimiter = createAsyncLimiter(TOTAL_UPLOAD_PUT_SLOTS);
    const metadataLimiter = createAsyncLimiter(METADATA_CONCURRENCY);
    const metadataTasks: Promise<void>[] = [];
    let nextUploadIndex = 0;
    let stopQueue = false;

    const markQueuedCancelled = () => {
      setQueue((prev) =>
        prev.map((f) =>
          f.status === "queued" ? { ...f, status: "error" as FileStatus, error: "Cancelled" } : f
        )
      );
    };

    const showLimitModal = (limitData: { message: string; upgrade_message?: string }) => {
      stopQueue = true;
      setQueue((prev) =>
        prev.map((f) =>
          f.status === "queued"
            ? { ...f, status: "error" as FileStatus, error: "Clip limit reached", limitReached: true }
            : f
        )
      );
      setLimitModal({
        message: limitData.message,
        upgradeMessage: limitData.upgrade_message,
      });
    };

    const logTerminalUploadFailure = (item: QueuedFile, msg: string) => {
      if (cancelledRef.current || /cancel|abort/i.test(msg)) return;

      const mpMatch = msg.match(/Part (\d+) failed after (\d+) attempts/);
      const spMatch = msg.match(/^Upload failed after (\d+) attempts/);
      if (!mpMatch && !spMatch) return;

      logUploadFailure({
        project_id: projectId,
        filename: item.file.name,
        file_size_bytes: item.file.size,
        file_type: item.file.type || null,
        upload_method: mpMatch ? "multipart" : "single-put",
        error_message: msg,
        attempts_tried: mpMatch ? parseInt(mpMatch[2], 10) : parseInt(spMatch![1], 10),
        failed_at_part: mpMatch ? parseInt(mpMatch[1], 10) : null,
      });
    };

    async function runMetadata(item: QueuedFile, clipId: string) {
      await metadataLimiter.run(async () => {
        if (cancelledRef.current) {
          updateFile(item.id, { status: "error", error: "Cancelled" });
          return;
        }

        updateFile(item.id, { status: "extracting" });
        let frameDataUrls: string[] = [];

        try {
          const frameRes = await fetch("/api/frames/extract", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ clip_id: clipId }),
          });
          if (frameRes.ok) {
            const frameData = await frameRes.json();
            frameDataUrls = Array.isArray(frameData.frames) ? frameData.frames : [];
          } else {
            console.warn("Server-side frame extraction failed for", item.file.name);
          }
        } catch (serverErr) {
          console.warn("Server-side frame extraction failed for", item.file.name, serverErr);
        }

        if (frameDataUrls.length === 0) {
          const clientFrames = await extractFrames(item.file, 4);
          frameDataUrls = clientFrames.map((frame) => frame.dataUrl);
        }

        if (cancelledRef.current) {
          updateFile(item.id, { status: "error", error: "Cancelled" });
          return;
        }

        updateFile(item.id, { status: "generating" });
        const genRes = await fetch("/api/metadata/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ clip_id: clipId, frames: frameDataUrls }),
        });
        if (genRes.status === 429) {
          const genData = await genRes.json();
          if (genData.limit_reached) {
            updateFile(item.id, { status: "error", error: genData.message, limitReached: true });
            showLimitModal(genData);
            return;
          }
        }
        if (!genRes.ok) {
          const genData = await genRes.json().catch(() => ({}));
          throw new Error(genData.message || "Metadata generation failed.");
        }
        trackClarityEvent("MetadataGenerated");
        updateFile(item.id, { status: "done", progress: 100, error: undefined });
      });
    }

    function scheduleMetadata(item: QueuedFile, clipId: string) {
      const task = runMetadata(item, clipId).catch((err) => {
        const msg = err instanceof Error ? err.message : "Metadata generation failed.";
        updateFile(item.id, { status: "error", error: msg });
      });
      metadataTasks.push(task);
    }

    async function processUploadItem(item: QueuedFile) {
      if (cancelledRef.current) {
        markQueuedCancelled();
        return;
      }

      try {
        updateFile(item.id, { status: "uploading", progress: 0 });
        const urlRes = await fetch("/api/clips/upload-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            project_id: projectId,
            filename: item.file.name,
            content_type: item.file.type || "video/mp4",
            file_size_bytes: item.file.size,
          }),
        });
        if (urlRes.status === 429) {
          const limitData = await urlRes.json();
          updateFile(item.id, { status: "error", error: limitData.message, limitReached: true });
          showLimitModal(limitData);
          return;
        }
        if (!urlRes.ok) {
          const err = await urlRes.json();
          throw new Error(err.message || "Failed to get upload URL.");
        }

        const { signedUrl, storagePath } = await urlRes.json();
        const isWorkerCodec = await needsServerWorker(item.file);

        const ac = new AbortController();
        abortControllersRef.current.add(ac);
        try {
          await uploadWithProgress(signedUrl, item.file, storagePath, (pct) =>
            updateFile(item.id, { progress: pct }),
            ac.signal,
            uploadLimiter
          );
        } finally {
          abortControllersRef.current.delete(ac);
        }

        if (cancelledRef.current) {
          updateFile(item.id, { status: "error", error: "Cancelled" });
          markQueuedCancelled();
          return;
        }

        const clipRes = await fetch("/api/clips", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            project_id: projectId,
            original_filename: item.file.name,
            storage_path: storagePath,
            file_size_bytes: item.file.size,
            needs_worker: isWorkerCodec,
          }),
        });
        if (!clipRes.ok) {
          const err = await clipRes.json();
          throw new Error(err.message || "Failed to save clip record.");
        }

        const { clip_id } = await clipRes.json();
        if (clip_id) {
          trackClarityEvent("ClipUploaded");
          updateFile(item.id, { status: "generating" });
          scheduleMetadata(item, clip_id);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Upload failed.";
        updateFile(item.id, { status: "error", error: msg });
        logTerminalUploadFailure(item, msg);
        if (cancelledRef.current) markQueuedCancelled();
      }
    }

    async function uploadWorker() {
      while (!cancelledRef.current && !stopQueue) {
        const item = toProcess[nextUploadIndex++];
        if (!item) return;
        await processUploadItem(item);
      }
    }

    const uploadWorkers = Array.from(
      { length: Math.min(ACTIVE_FILE_UPLOADS, toProcess.length) },
      () => uploadWorker()
    );

    await Promise.all(uploadWorkers);
    await Promise.all(metadataTasks);

    setIsRunning(false);
    abortControllersRef.current.clear();
    const finalQueue = queueRef.current;
    if (finalQueue.length > 0 && finalQueue.every((f) => f.status === "done")) {
      setTimeout(() => window.location.reload(), 1500);
    }
  }

  const queuedCount = queue.filter((f) => f.status === "queued").length;
  const doneCount = queue.filter((f) => f.status === "done").length;
  const hasQueue = queue.length > 0;
  const activeWorkCount = queue.filter((f) => ACTIVE_STATUSES.has(f.status) && !f.tooLarge && !f.limitReached).length;
  const hasPotentialPreviewIssue = queue.some((item) => {
    const ext = item.file.name.toLowerCase().match(/\.[^.]+$/)?.[0];
    return !!ext && PREVIEW_WARNING_EXTENSIONS.has(ext);
  });

  return (
    <div className="space-y-5">
      <LimitReachedModal
        open={!!limitModal}
        title="Daily Clip Limit Reached"
        message={limitModal?.message || ""}
        upgradeMessage={limitModal?.upgradeMessage}
        onClose={() => setLimitModal(null)}
      />

      {/* Drop zone */}
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-10 text-center transition ${
          isDragging
            ? "border-primary bg-muted"
            : "border-border bg-muted/30 hover:border-primary/50 hover:bg-muted"
        }`}
      >
        <div className="text-3xl mb-3">🎬</div>
        <p className="text-sm font-semibold text-foreground">
          {isDragging ? "Drop clips here" : "Drag & drop clips here"}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          or click to browse — multiple files supported
        </p>
        <p className="mt-1 text-xs text-muted-foreground/60">
          Max {limitLabel} per file ({planLabel} plan)
        </p>
        <input
          ref={inputRef}
          type="file"
          accept="video/*"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && addFiles(e.target.files)}
        />
      </div>

      <div
        className={`rounded-xl border px-4 py-3 text-xs ${
          hasPotentialPreviewIssue
            ? "border-amber-500/40 bg-amber-500/10 text-amber-200"
            : "border-border bg-muted/20 text-muted-foreground"
        }`}
      >
        <p className="font-semibold text-foreground">ProRes preview note</p>
        <p className="mt-1 leading-relaxed">
          Apple ProRes 422 / 422 HQ files can upload, generate metadata, export CSVs, and transfer by FTP,
          but Chrome may not play their in-browser preview. If previewing in ClipMeta matters, upload an H.264/MP4 version.
        </p>
      </div>

      {isRunning && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          <p className="font-semibold text-amber-50">Keep this page open while ClipMeta finishes.</p>
          <p className="mt-1 text-xs leading-relaxed text-amber-100/80">
            {activeWorkCount} item{activeWorkCount === 1 ? "" : "s"} still need upload or metadata work.
            Review and other navigation will unlock when the queue finishes.
          </p>
        </div>
      )}

      {/* Queue with top upload button */}
      {hasQueue && (
        <div className="flex flex-wrap items-center gap-3 mb-3">
          <button
            onClick={processQueueConcurrent}
            disabled={isRunning || queuedCount === 0}
            className="w-full rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-40 sm:w-auto"
          >
            {isRunning
              ? `Uploading… (${doneCount}/${queue.length})`
              : `Upload ${queuedCount} clip${queuedCount !== 1 ? "s" : ""}`}
          </button>
          {isRunning && (
            <button
              onClick={handleCancelAll}
              className="rounded-lg border border-border px-4 py-3 text-sm font-medium text-foreground hover:bg-muted transition"
            >
              Cancel All
            </button>
          )}
        </div>
      )}
      {hasQueue && (
        <div className="space-y-2">
          {queue.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3"
            >
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium text-foreground">
                  {item.file.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {(item.file.size / 1024 / 1024).toFixed(1)} MB
                </p>
                {item.status === "uploading" && (
                  <SmoothProgressBar rawProgress={item.progress} />
                )}
                {(item.tooLarge || item.limitReached) ? (
                  <div className="mt-2 flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2">
                    <span className="shrink-0 text-sm">{item.limitReached ? '⚡' : '🔒'}</span>
                    <p className="flex-1 text-xs text-amber-400">{item.error}</p>
                    <a
                      href="/pricing"
                      className="shrink-0 rounded-md bg-violet-600 px-2.5 py-1 text-xs font-semibold text-white transition hover:bg-violet-700 whitespace-nowrap animate-pulse hover:animate-none"
                    >
                      Get More Clips →
                    </a>
                  </div>
                ) : item.error && (
                  <div className="mt-1 flex items-center gap-2">
                    <p className="text-xs text-red-500">{item.error}</p>
                    {item.status === "error" && !isRunning && (
                      <button
                        onClick={() => handleRetryOne(item.id)}
                        className="shrink-0 rounded-md border border-violet-500/40 bg-violet-500/10 px-2 py-0.5 text-xs font-medium text-violet-300 transition hover:bg-violet-500/20 hover:text-violet-200"
                        title="Retry upload for this file"
                      >
                        ↻ Retry
                      </button>
                    )}
                  </div>
                )}
              </div>
              <StatusBadge status={item.status} progress={item.progress} />
              {item.status === "queued" && !isRunning && (
                <button
                  onClick={() => handleCancelOne(item.id)}
                  className="text-xs text-muted-foreground hover:text-red-500 transition"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      {hasQueue && (
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={processQueueConcurrent}
            disabled={isRunning || queuedCount === 0}
            className="w-full rounded-lg bg-primary px-5 py-3 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-40 sm:w-auto"
          >
            {isRunning
              ? `Uploading… (${doneCount}/${queue.length})`
              : `Upload ${queuedCount} clip${queuedCount !== 1 ? "s" : ""}`}
          </button>
          {isRunning && (
            <button
              onClick={handleCancelAll}
              className="rounded-lg border border-border px-4 py-3 text-sm font-medium text-foreground hover:bg-muted transition"
            >
              Cancel All
            </button>
          )}
          {!isRunning && (
            <button
              onClick={() => setQueue([])}
              className="text-sm text-muted-foreground underline hover:text-foreground transition"
            >
              Clear
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status, progress }: { status: FileStatus; progress: number }) {
  const map: Record<FileStatus, { label: string; cls: string }> = {
    queued:     { label: "queued",      cls: "bg-muted text-muted-foreground" },
    extracting: { label: "extracting…", cls: "bg-blue-100 text-blue-700" },
    uploading:  { label: `${progress}%`, cls: "bg-amber-100 text-amber-700" },
    generating: { label: "AI…",         cls: "bg-purple-100 text-purple-700" },
    done:       { label: "✓ done",      cls: "bg-green-100 text-green-700" },
    error:      { label: "error",       cls: "bg-red-100 text-red-700" },
  };
  const { label, cls } = map[status];
  return (
    <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${cls}`}>
      {label}
    </span>
  );
}

// Fire-and-forget telemetry: record terminal upload failures so we can tell
// a real site-wide outage from one user's flaky WiFi. Any error here is
// swallowed -- we never want the logger itself to surface to a user who's
// already in an error state.
function logUploadFailure(payload: Record<string, unknown>) {
  try {
    fetch("/api/clips/upload-failure", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {});
  } catch {
    // ignore
  }
}

type AsyncLimiter = {
  run<T>(task: () => Promise<T>): Promise<T>;
};

function createAsyncLimiter(maxConcurrent: number): AsyncLimiter {
  let active = 0;
  const pending: Array<() => void> = [];

  async function acquire() {
    if (active < maxConcurrent) {
      active += 1;
      return;
    }

    await new Promise<void>((resolve) => pending.push(resolve));
    active += 1;
  }

  function release() {
    active = Math.max(0, active - 1);
    const next = pending.shift();
    if (next) next();
  }

  return {
    async run<T>(task: () => Promise<T>) {
      await acquire();
      try {
        return await task();
      } finally {
        release();
      }
    },
  };
}

const ACTIVE_FILE_UPLOADS = 2;
const METADATA_CONCURRENCY = 2;
const TOTAL_UPLOAD_PUT_SLOTS = 8;

// 32 MB parts with a small parallel worker pool. This lets fast connections
// move large ProRes batches much closer to line speed without creating hundreds
// of tiny R2 part uploads per file.
const CHUNK_SIZE = 32 * 1024 * 1024;
const MULTIPART_CONCURRENCY = 4;
const MULTIPART_THRESHOLD = 50 * 1024 * 1024; // Use multipart for files > 50 MB

// Hard timeout per chunk. 6 minutes is enough for a 32MB chunk on a slow uplink.
// (which is below almost every real connection). Without this, a stuck chunk would
// wait indefinitely for TCP to finally give up -- blocking the retry loop.
const CHUNK_TIMEOUT_MS = 6 * 60 * 1000;

function uploadChunkXHR(
  url: string,
  blob: Blob,
  signal?: AbortSignal,
  onChunkProgress?: (loaded: number, total: number) => void
): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.timeout = CHUNK_TIMEOUT_MS;
    if (onChunkProgress) {
      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) onChunkProgress(e.loaded, e.total);
      });
    }
    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const etag = xhr.getResponseHeader("ETag") || "";
        resolve(etag);
      } else {
        reject(new Error(`Chunk upload failed with status ${xhr.status}`));
      }
    });
    xhr.addEventListener("error", () => reject(new Error("Network error during chunk upload.")));
    xhr.addEventListener("timeout", () => reject(new Error("Chunk upload timed out (connection stuck).")));
    xhr.addEventListener("abort", () => reject(new Error("Upload cancelled.")));
    if (signal) signal.addEventListener("abort", () => xhr.abort());
    xhr.open("PUT", url);
    xhr.send(blob);
  });
}

async function multipartUpload(
  file: File,
  storagePath: string,
  contentType: string,
  onProgress: (pct: number) => void,
  signal?: AbortSignal,
  uploadLimiter?: AsyncLimiter
): Promise<void> {
  // 1. Start multipart upload
  const startRes = await fetch("/api/clips/multipart/start", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ storage_path: storagePath, content_type: contentType }),
  });
  if (!startRes.ok) throw new Error("Failed to start multipart upload.");
  const { uploadId } = await startRes.json();

  const totalSize = file.size;
  const totalChunks = Math.ceil(totalSize / CHUNK_SIZE);
  const parts: Array<{ partNumber: number; etag: string } | undefined> = new Array(totalChunks);
  const inFlightLoaded = new Map<number, number>();
  let completedBytes = 0;
  let nextChunkIndex = 0;

  // 2. Upload chunks in parallel. Each retry fetches a fresh presigned URL.
  function reportProgress() {
    const activeBytes = Array.from(inFlightLoaded.values()).reduce((sum, value) => sum + value, 0);
    onProgress(Math.min(99, Math.round(((completedBytes + activeBytes) / totalSize) * 100)));
  }

  async function uploadPart(partIndex: number): Promise<void> {
    if (signal?.aborted) throw new Error("Upload cancelled.");

    const start = partIndex * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, totalSize);
    const chunk = file.slice(start, end);
    const partNumber = partIndex + 1;

    // Retry loop: get a FRESH presigned URL on each attempt
    const maxRetries = 8;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      if (signal?.aborted) throw new Error("Upload cancelled.");
      try {
        // Fresh URL every attempt
        const partRes = await fetch("/api/clips/multipart/part-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            storage_path: storagePath,
            upload_id: uploadId,
            part_number: partNumber,
          }),
        });
        if (!partRes.ok) throw new Error(`Failed to get URL for part ${partNumber}.`);
        const { signedUrl } = await partRes.json();

        const uploadChunk = () =>
          uploadChunkXHR(signedUrl, chunk, signal, (loaded) => {
            inFlightLoaded.set(partNumber, loaded);
            reportProgress();
          });
        const etag = uploadLimiter
          ? await uploadLimiter.run(uploadChunk)
          : await uploadChunk();
        inFlightLoaded.delete(partNumber);
        parts[partIndex] = { partNumber, etag };
        completedBytes += chunk.size;
        reportProgress();
        return;
      } catch (err) {
        inFlightLoaded.delete(partNumber);
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes("cancelled") || msg.includes("abort") || signal?.aborted) throw err;
        if (attempt < maxRetries) {
          const delay = 2000 * Math.pow(2, attempt - 1); // 2s, 4s, 8s, 16s
          console.warn(`Part ${partNumber} attempt ${attempt} failed (${msg}), retrying in ${delay}ms…`);
          await new Promise((r) => setTimeout(r, delay));
        } else {
          throw new Error(`Part ${partNumber} failed after ${maxRetries} attempts: ${msg}`);
        }
      }
    }

  }

  async function uploadWorker(): Promise<void> {
    while (nextChunkIndex < totalChunks) {
      if (signal?.aborted) throw new Error("Upload cancelled.");
      const partIndex = nextChunkIndex++;
      await uploadPart(partIndex);
    }
  }

  const workers = Array.from(
    { length: Math.min(MULTIPART_CONCURRENCY, totalChunks) },
    () => uploadWorker()
  );
  await Promise.all(workers);

  // 3. Complete multipart upload
  const completeRes = await fetch("/api/clips/multipart/complete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      storage_path: storagePath,
      upload_id: uploadId,
      parts: parts
        .filter((part): part is { partNumber: number; etag: string } => Boolean(part))
        .sort((a, b) => a.partNumber - b.partNumber),
    }),
  });
  if (!completeRes.ok) throw new Error("Failed to complete multipart upload.");
  onProgress(100);
}

// 5 minutes is enough for a 50MB file at ~170 KB/s -- any connection slower than
// that can't realistically finish anyway. Without this, XHR waits indefinitely
// for TCP to give up, burning retry time on a single stuck attempt.
const SINGLE_PUT_TIMEOUT_MS = 5 * 60 * 1000;

function singleUploadAttempt(
  signedUrl: string,
  file: File,
  onProgress: (pct: number) => void,
  signal?: AbortSignal
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.timeout = SINGLE_PUT_TIMEOUT_MS;
    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    });
    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress(100);
        resolve();
      } else {
        reject(new Error(`Storage upload failed with status ${xhr.status}`));
      }
    });
    xhr.addEventListener("error", () => reject(new Error("Network error during upload.")));
    xhr.addEventListener("timeout", () => reject(new Error("Upload timed out (connection stuck).")));
    xhr.addEventListener("abort", () => reject(new Error("Upload cancelled.")));
    if (signal) signal.addEventListener("abort", () => xhr.abort());
    xhr.open("PUT", signedUrl);
    xhr.setRequestHeader("Content-Type", file.type || "video/mp4");
    xhr.send(file);
  });
}

async function uploadWithProgress(
  signedUrl: string,
  file: File,
  storagePath: string,
  onProgress: (pct: number) => void,
  signal?: AbortSignal,
  uploadLimiter?: AsyncLimiter
): Promise<void> {
  // Use multipart for large files
  if (file.size > MULTIPART_THRESHOLD) {
    return multipartUpload(file, storagePath, file.type || "video/mp4", onProgress, signal, uploadLimiter);
  }

  // Small files: single PUT with retry. 5 attempts with exponential backoff
  // (2s, 4s, 8s, 16s = ~30s total across the gaps) gives flaky connections
  // room to recover without making the user wait forever on a truly dead link.
  const maxRetries = 5;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      onProgress(0);
      const uploadSmallFile = () => singleUploadAttempt(signedUrl, file, onProgress, signal);
      if (uploadLimiter) {
        await uploadLimiter.run(uploadSmallFile);
      } else {
        await uploadSmallFile();
      }
      return;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("cancelled") || msg.includes("abort") || signal?.aborted) throw err;
      if (msg.includes("status 4")) throw err;
      if (attempt < maxRetries) {
        const delay = 2000 * Math.pow(2, attempt - 1);
        console.warn(`Upload attempt ${attempt} failed (${msg}), retrying in ${delay}ms...`);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      throw new Error(`Upload failed after ${maxRetries} attempts: ${msg}`);
    }
  }
}
