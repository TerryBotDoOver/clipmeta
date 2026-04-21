"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { extractFrames } from "@/lib/extractFrames";
import { LimitReachedModal } from "@/components/LimitReachedModal";

// Codecs the browser cannot decode — need server-side worker processing
const WORKER_CODEC_EXTENSIONS = new Set(['.mov', '.mxf', '.mts', '.m2ts']);

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
        e.returnValue = "Upload in progress — leaving now will cancel it. Are you sure?";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isRunning]);

  function updateFile(id: string, patch: Partial<QueuedFile>) {
    setQueue((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  }

  function addFiles(files: FileList | File[]) {
    const videoFiles = Array.from(files).filter((f) => f.type.startsWith("video/"));
    if (videoFiles.length === 0) return;
    const newItems: QueuedFile[] = videoFiles.map((file) => {
      if (file.size > effectiveLimit) {
        const planName = userPlan ? userPlan.charAt(0).toUpperCase() + userPlan.slice(1) : "Free";
        const nextPlan = userPlan === "free" ? "Starter" : userPlan === "starter" ? "Pro" : userPlan === "pro" ? "Studio" : null;
        const nextPlanLimit = userPlan === "free" ? "2GB" : userPlan === "starter" ? "5GB" : userPlan === "pro" ? "10GB" : null;
        const upgradeMsg = nextPlan && nextPlanLimit
          ? `${planName} plan supports up to ${limitLabel}. Upgrade to ${nextPlan} for ${nextPlanLimit} files.`
          : `${planName} plan supports up to ${limitLabel}.`;
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
  }

  function handleCancelOne(id: string) {
    const item = queue.find((f) => f.id === id);
    if (!item) return;
    if (item.status === "queued") {
      setQueue((prev) => prev.filter((f) => f.id !== id));
    } else {
      cancelledRef.current = true;
      abortControllerRef.current?.abort();
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
    processQueue();
  }

  async function processQueue() {
    cancelledRef.current = false;
    // Use the ref so a retry that set state a tick ago is still seen.
    const toProcess = queueRef.current.filter((f) => f.status === "queued");
    if (toProcess.length === 0) return;
    setIsRunning(true);

    for (const item of toProcess) {
      // Check cancellation at start of each iteration
      if (cancelledRef.current) {
        setQueue((prev) =>
          prev.map((f) =>
            f.status === "queued" ? { ...f, status: "error" as FileStatus, error: "Cancelled" } : f
          )
        );
        break;
      }

      try {
        // 1. Check limits + get signed URL FIRST (before any heavy work)
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
          // Mark remaining queued files as blocked
          setQueue((prev) =>
            prev.map((f) =>
              f.status === "queued" ? { ...f, status: "error" as FileStatus, error: "Clip limit reached", limitReached: true } : f
            )
          );
          setIsRunning(false);
          // Show the centered modal
          setLimitModal({
            message: limitData.message,
            upgradeMessage: limitData.upgrade_message,
          });
          return;
        }
        if (!urlRes.ok) {
          const err = await urlRes.json();
          throw new Error(err.message || "Failed to get upload URL.");
        }
        const { signedUrl, storagePath } = await urlRes.json();

        // 2. Detect ProRes / browser-incompatible codecs before extraction
        // These need server-side processing — skip client extraction, upload anyway
        const isWorkerCodec = await needsServerWorker(item.file);
        let frames: { dataUrl: string }[] = [];

        if (!isWorkerCodec) {
          // Standard browser-compatible codec — extract frames client-side
          updateFile(item.id, { status: "extracting" });
          frames = await extractFrames(item.file, 4);

          if (cancelledRef.current) {
            updateFile(item.id, { status: "error", error: "Cancelled" });
            setQueue((prev) =>
              prev.map((f) =>
                f.status === "queued" ? { ...f, status: "error" as FileStatus, error: "Cancelled" } : f
              )
            );
            break;
          }
        }
        // ProRes/incompatible: skip frame extraction, worker handles it after upload

        // 3. Upload to storage with abort support
        updateFile(item.id, { status: "uploading", progress: 0 });
        const ac = new AbortController();
        abortControllerRef.current = ac;
        await uploadWithProgress(signedUrl, item.file, storagePath, (pct) =>
          updateFile(item.id, { progress: pct }),
          ac.signal
        );
        abortControllerRef.current = null;

        if (cancelledRef.current) {
          setQueue((prev) =>
            prev.map((f) =>
              f.status === "queued" ? { ...f, status: "error" as FileStatus, error: "Cancelled" } : f
            )
          );
          break;
        }

        // 4. Create clip record
        const clipRes = await fetch("/api/clips", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            project_id: projectId,
            original_filename: item.file.name,
            storage_path: storagePath,
            file_size_bytes: item.file.size,
            needs_worker: isWorkerCodec, // Flag for server-side processing
          }),
        });
        if (!clipRes.ok) {
          const err = await clipRes.json();
          throw new Error(err.message || "Failed to save clip record.");
        }
        const { clip_id } = await clipRes.json();

        // 5. Auto-generate metadata
        if (clip_id) {
          updateFile(item.id, { status: "generating" });
          if (frames.length > 0 && !isWorkerCodec) {
            // Standard codec — send frames directly
            const genRes = await fetch("/api/metadata/generate", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ clip_id, frames: frames.map((f) => f.dataUrl) }),
            });
            if (genRes.status === 429) {
              const genData = await genRes.json();
              if (genData.limit_reached) {
                updateFile(item.id, { status: "error", error: genData.message, limitReached: true });
                setIsRunning(false);
                setLimitModal({
                  message: genData.message,
                  upgradeMessage: genData.upgrade_message,
                });
                return;
              }
            }
          } else {
            // Worker codec (ProRes, etc.) — extract frames server-side, then generate
            updateFile(item.id, { status: "extracting" });
            const frameRes = await fetch("/api/frames/extract", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ clip_id }),
            });
            if (frameRes.ok) {
              const { frames: serverFrames } = await frameRes.json();
              if (serverFrames && serverFrames.length > 0) {
                updateFile(item.id, { status: "generating" });
                const genRes = await fetch("/api/metadata/generate", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ clip_id, frames: serverFrames }),
                });
                if (genRes.status === 429) {
                  const genData = await genRes.json();
                  if (genData.limit_reached) {
                    updateFile(item.id, { status: "error", error: genData.message, limitReached: true });
                    setIsRunning(false);
                    setLimitModal({
                      message: genData.message,
                      upgradeMessage: genData.upgrade_message,
                    });
                    return;
                  }
                }
              }
            } else {
              console.warn("Server-side frame extraction failed for", item.file.name);
            }
          }
        }

        updateFile(item.id, {
          status: "done",
          progress: 100,
          // Show a note for worker-processed files
          ...(isWorkerCodec ? { error: undefined } : {}),
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Upload failed.";
        updateFile(item.id, {
          status: "error",
          error: msg,
        });
        if (cancelledRef.current) {
          setQueue((prev) =>
            prev.map((f) =>
              f.status === "queued" ? { ...f, status: "error" as FileStatus, error: "Cancelled" } : f
            )
          );
          break;
        }
      }
    }

    setIsRunning(false);
    abortControllerRef.current = null;
    // If all done, reload after a beat
    const final = queue.filter((f) => f.status === "queued");
    if (final.length === 0) {
      setTimeout(() => window.location.reload(), 1500);
    }
  }

  const queuedCount = queue.filter((f) => f.status === "queued").length;
  const doneCount = queue.filter((f) => f.status === "done").length;
  const hasQueue = queue.length > 0;

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
          Max {limitLabel} per file ({userPlan ? userPlan.charAt(0).toUpperCase() + userPlan.slice(1) : "Free"} plan)
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

      {/* Queue with top upload button */}
      {hasQueue && (
        <div className="flex flex-wrap items-center gap-3 mb-3">
          <button
            onClick={processQueue}
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
            onClick={processQueue}
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

// 5 MB chunks. Smaller than the S3/R2 recommended minimum for bulk performance,
// but dramatically more resilient on flaky residential/VPN connections --
// short PUTs mean fewer midway TCP resets from home routers and middleboxes.
const CHUNK_SIZE = 5 * 1024 * 1024;
const MULTIPART_THRESHOLD = 50 * 1024 * 1024; // Use multipart for files > 50 MB

// Hard timeout per chunk. 3 minutes is enough for a 5MB chunk on a 250 Kbps uplink
// (which is below almost every real connection). Without this, a stuck chunk would
// wait indefinitely for TCP to finally give up -- blocking the retry loop.
const CHUNK_TIMEOUT_MS = 3 * 60 * 1000;

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

async function uploadChunkWithRetry(
  url: string,
  blob: Blob,
  signal?: AbortSignal,
  maxRetries = 4
): Promise<string> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await uploadChunkXHR(url, blob, signal);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("cancelled") || msg.includes("abort") || signal?.aborted) throw err;
      if (msg.includes("status 4")) throw err;
      if (attempt < maxRetries) {
        const delay = 1500 * Math.pow(2, attempt - 1);
        console.warn(`Chunk upload attempt ${attempt} failed (${msg}), retrying in ${delay}ms...`);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      throw new Error(`Chunk upload failed after ${maxRetries} attempts: ${msg}`);
    }
  }
  throw new Error("Unexpected retry exit");
}

async function multipartUpload(
  file: File,
  storagePath: string,
  contentType: string,
  onProgress: (pct: number) => void,
  signal?: AbortSignal
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
  const parts: { partNumber: number; etag: string }[] = [];
  let uploaded = 0;

  // 2. Upload each chunk — fetch fresh presigned URL on every retry
  for (let i = 0; i < totalChunks; i++) {
    if (signal?.aborted) throw new Error("Upload cancelled.");

    const start = i * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, totalSize);
    const chunk = file.slice(start, end);
    const partNumber = i + 1;

    // Retry loop: get a FRESH presigned URL on each attempt
    let etag = '';
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

        etag = await uploadChunkXHR(signedUrl, chunk, signal, (loaded) => {
          // Report continuous progress: bytes already uploaded + current chunk progress
          const totalUploaded = uploaded + loaded;
          onProgress(Math.round((totalUploaded / totalSize) * 100));
        });
        break; // success
      } catch (err) {
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

    parts.push({ partNumber, etag });
    uploaded += (end - start);
    onProgress(Math.round((uploaded / totalSize) * 100));
  }

  // 3. Complete multipart upload
  const completeRes = await fetch("/api/clips/multipart/complete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      storage_path: storagePath,
      upload_id: uploadId,
      parts,
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
  signal?: AbortSignal
): Promise<void> {
  // Use multipart for large files
  if (file.size > MULTIPART_THRESHOLD) {
    return multipartUpload(file, storagePath, file.type || "video/mp4", onProgress, signal);
  }

  // Small files: single PUT with retry. 5 attempts with exponential backoff
  // (2s, 4s, 8s, 16s = ~30s total across the gaps) gives flaky connections
  // room to recover without making the user wait forever on a truly dead link.
  const maxRetries = 5;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      onProgress(0);
      await singleUploadAttempt(signedUrl, file, onProgress, signal);
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
