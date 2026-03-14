"use client";

import { useRef, useState, useCallback } from "react";
import { extractFrames } from "@/lib/extractFrames";

type UploadFormProps = {
  projectId: string;
  projectSlug: string;
};

type FileStatus = "queued" | "extracting" | "uploading" | "generating" | "done" | "error";

type QueuedFile = {
  id: string;
  file: File;
  status: FileStatus;
  progress: number;
  error?: string;
};

export function UploadForm({ projectId, projectSlug }: UploadFormProps) {
  const [queue, setQueue] = useState<QueuedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function updateFile(id: string, patch: Partial<QueuedFile>) {
    setQueue((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  }

  function addFiles(files: FileList | File[]) {
    const videoFiles = Array.from(files).filter((f) => f.type.startsWith("video/"));
    if (videoFiles.length === 0) return;
    const newItems: QueuedFile[] = videoFiles.map((file) => ({
      id: `${Date.now()}-${Math.random()}`,
      file,
      status: "queued",
      progress: 0,
    }));
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

  async function processQueue() {
    const toProcess = queue.filter((f) => f.status === "queued");
    if (toProcess.length === 0) return;
    setIsRunning(true);

    for (const item of toProcess) {
      try {
        // 1. Extract frames
        updateFile(item.id, { status: "extracting" });
        const frames = await extractFrames(item.file, 4);

        // 2. Get signed URL
        updateFile(item.id, { status: "uploading", progress: 0 });
        const urlRes = await fetch("/api/clips/upload-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            project_id: projectId,
            filename: item.file.name,
            content_type: item.file.type || "video/mp4",
          }),
        });
        if (!urlRes.ok) {
          const err = await urlRes.json();
          throw new Error(err.message || "Failed to get upload URL.");
        }
        const { signedUrl, storagePath } = await urlRes.json();

        // 3. Upload to storage
        await uploadWithProgress(signedUrl, item.file, (pct) =>
          updateFile(item.id, { progress: pct })
        );

        // 4. Create clip record
        const clipRes = await fetch("/api/clips", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            project_id: projectId,
            original_filename: item.file.name,
            storage_path: storagePath,
            file_size_bytes: item.file.size,
          }),
        });
        if (!clipRes.ok) {
          const err = await clipRes.json();
          throw new Error(err.message || "Failed to save clip record.");
        }
        const { clip_id } = await clipRes.json();

        // 5. Auto-generate metadata
        if (clip_id && frames.length > 0) {
          updateFile(item.id, { status: "generating" });
          await fetch("/api/metadata/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ clip_id, frames: frames.map((f) => f.dataUrl) }),
          });
        }

        updateFile(item.id, { status: "done", progress: 100 });
      } catch (err) {
        updateFile(item.id, {
          status: "error",
          error: err instanceof Error ? err.message : "Upload failed.",
        });
      }
    }

    setIsRunning(false);
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

      {/* Drop zone */}
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-10 text-center transition ${
          isDragging
            ? "border-slate-900 bg-muted dark:border-white dark:bg-slate-800"
            : "border-slate-300 bg-muted/50 hover:border-slate-400 hover:bg-muted dark:border-slate-700 dark:bg-slate-900 dark:hover:border-slate-500"
        }`}
      >
        <div className="text-3xl mb-3">🎬</div>
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
          {isDragging ? "Drop clips here" : "Drag & drop clips here"}
        </p>
        <p className="mt-1 text-xs text-slate-500 dark:text-muted-foreground">
          or click to browse — multiple files supported
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

      {/* Queue */}
      {hasQueue && (
        <div className="space-y-2">
          {queue.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 rounded-xl border border-slate-200 bg-card px-4 py-3 dark:border-slate-700 dark:bg-slate-800"
            >
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium text-slate-900 dark:text-white">
                  {item.file.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {(item.file.size / 1024 / 1024).toFixed(1)} MB
                </p>
                {item.status === "uploading" && (
                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                    <div
                      className="h-full rounded-full bg-slate-900 transition-all dark:bg-white"
                      style={{ width: `${item.progress}%` }}
                    />
                  </div>
                )}
                {item.error && (
                  <p className="mt-1 text-xs text-red-500">{item.error}</p>
                )}
              </div>
              <StatusBadge status={item.status} progress={item.progress} />
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      {hasQueue && (
        <div className="flex items-center gap-3">
          <button
            onClick={processQueue}
            disabled={isRunning || queuedCount === 0}
            className="rounded-lg bg-slate-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-40 dark:bg-white dark:text-slate-900 dark:hover:bg-muted"
          >
            {isRunning
              ? `Uploading… (${doneCount}/${queue.length})`
              : `Upload ${queuedCount} clip${queuedCount !== 1 ? "s" : ""}`}
          </button>
          {!isRunning && (
            <button
              onClick={() => setQueue([])}
              className="text-sm text-slate-500 underline hover:text-slate-700 dark:text-muted-foreground"
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
    queued:     { label: "queued",     cls: "bg-muted text-slate-600 dark:bg-slate-700 dark:text-muted-foreground" },
    extracting: { label: "extracting…", cls: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" },
    uploading:  { label: `${progress}%`, cls: "bg-amber-100 text-amber-400 dark:bg-amber-900 dark:text-amber-300" },
    generating: { label: "AI…",        cls: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300" },
    done:       { label: "✓ done",     cls: "bg-green-100 text-green-500 dark:bg-green-900 dark:text-green-300" },
    error:      { label: "error",      cls: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300" },
  };
  const { label, cls } = map[status];
  return (
    <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${cls}`}>
      {label}
    </span>
  );
}

function uploadWithProgress(
  signedUrl: string,
  file: File,
  onProgress: (pct: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    });
    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress(100);
        resolve();
      } else {
        reject(new Error(`Storage upload failed with status ${xhr.status}. Response: ${xhr.responseText}`));
      }
    });
    xhr.addEventListener("error", () => reject(new Error("Network error during upload.")));
    xhr.addEventListener("abort", () => reject(new Error("Upload cancelled.")));

    xhr.open("PUT", signedUrl);
    xhr.setRequestHeader("Content-Type", file.type || "video/mp4");
    xhr.send(file);
  });
}
