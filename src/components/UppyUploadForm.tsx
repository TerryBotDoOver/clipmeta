"use client";

import Uppy, { type Body, type Meta, type UppyFile } from "@uppy/core";
import AwsS3, { type AwsS3Part, type AwsS3UploadParameters } from "@uppy/aws-s3";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { trackClarityEvent } from "@/lib/clarity-events";
import { getPlanDisplayName, normalizePlan } from "@/lib/plans";

type UppyUploadFormProps = {
  projectId: string;
  projectSlug: string;
  maxFileSizeBytes?: number;
  userPlan?: string | null;
};

type UppyMeta = Meta & {
  originalFileName?: string;
  storagePath?: string;
};

type UppyBody = Body & {
  location?: string;
};

type ClipCreationState = {
  status: "finalizing" | "done" | "error";
  error?: string;
};

const WORKER_CODEC_EXTENSIONS = new Set([".mov", ".mxf", ".mts", ".m2ts"]);
const MULTIPART_THRESHOLD = 50 * 1024 * 1024;
const MULTIPART_CHUNK_SIZE = 32 * 1024 * 1024;
const UPPY_UPLOAD_LIMIT = 4;
const UPLOAD_NAV_WARNING =
  "ClipMeta is still uploading or creating clip records. Please leave this page open until the queue finishes.";

async function needsServerWorker(file: File): Promise<boolean> {
  const ext = file.name.toLowerCase().match(/\.[^.]+$/)?.[0];
  if (!ext || !WORKER_CODEC_EXTENSIONS.has(ext)) return false;

  return new Promise((resolve) => {
    const video = document.createElement("video");
    const url = URL.createObjectURL(file);
    const timeout = window.setTimeout(() => {
      URL.revokeObjectURL(url);
      resolve(true);
    }, 8000);

    video.onloadedmetadata = () => {
      window.clearTimeout(timeout);
      URL.revokeObjectURL(url);
      resolve(false);
    };

    video.onerror = () => {
      window.clearTimeout(timeout);
      URL.revokeObjectURL(url);
      resolve(true);
    };

    video.src = url;
    video.load();
  });
}

function logUploadFailure(payload: Record<string, unknown>) {
  try {
    fetch("/api/clips/upload-failure", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {});
  } catch {
    // best-effort telemetry only
  }
}

function queueMetadataAutostart(clipIds: string[], source: string) {
  if (clipIds.length === 0) return;

  try {
    fetch("/api/metadata/autostart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clip_ids: clipIds, source }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    // The recovery cron can pick up not_started clips.
  }
}

function formatBytes(bytes: number) {
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isVideoFile(file: File) {
  if (file.type.startsWith("video/")) return true;
  return /\.(mp4|mov|m4v|avi|mxf|mts|m2ts|webm)$/i.test(file.name);
}

async function readJsonOrThrow(response: Response) {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      typeof body?.message === "string"
        ? body.message
        : typeof body?.error === "string"
          ? body.error
          : "Upload request failed.";
    throw new Error(message);
  }
  return body;
}

function getUppyProgress(file: UppyFile<UppyMeta, UppyBody>) {
  const progress = file.progress;
  if (!progress?.uploadStarted) return 0;
  if (progress.uploadComplete) return 100;
  const bytesTotal = progress.bytesTotal ?? file.size ?? 0;
  if (!bytesTotal) return 0;
  return Math.min(99, Math.round(((progress.bytesUploaded ?? 0) / bytesTotal) * 100));
}

function SmoothProgressBar({ progress }: { progress: number }) {
  return (
    <div className="mt-2 space-y-1">
      <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{
            width: `${progress}%`,
            background: "linear-gradient(90deg, #6d28d9 0%, #db2777 50%, #f59e0b 100%)",
            boxShadow: "0 0 12px rgba(219, 39, 119, 0.6), 0 0 24px rgba(245, 158, 11, 0.4)",
            transition: progress === 0 ? "none" : "width 0.3s ease-out",
          }}
        />
      </div>
      <p className="text-[10px] font-mono font-semibold text-muted-foreground">{progress}%</p>
    </div>
  );
}

function StatusBadge({
  file,
  clipState,
}: {
  file: UppyFile<UppyMeta, UppyBody>;
  clipState?: ClipCreationState;
}) {
  if (file.error || clipState?.status === "error") {
    return <span className="shrink-0 rounded-full bg-red-100 px-2.5 py-1 text-xs font-medium text-red-700">error</span>;
  }

  if (clipState?.status === "finalizing") {
    return (
      <span className="shrink-0 rounded-full bg-purple-100 px-2.5 py-1 text-xs font-medium text-purple-700">
        finalizing...
      </span>
    );
  }

  if (clipState?.status === "done") {
    return (
      <span className="shrink-0 rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700">
        done
      </span>
    );
  }

  const progress = getUppyProgress(file);
  if (progress > 0) {
    return (
      <span className="shrink-0 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700">
        {progress}%
      </span>
    );
  }

  return <span className="shrink-0 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">queued</span>;
}

export function UppyUploadForm({ projectId, projectSlug, maxFileSizeBytes, userPlan }: UppyUploadFormProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const clipCreationByFileIdRef = useRef(new Map<string, ClipCreationState>());

  const [files, setFiles] = useState<Array<UppyFile<UppyMeta, UppyBody>>>([]);
  const [clipCreationByFileId, setClipCreationByFileId] = useState(new Map<string, ClipCreationState>());
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const basePlan = normalizePlan(userPlan ?? "free");
  const planLabel = getPlanDisplayName(userPlan ?? basePlan);
  const effectiveLimit = maxFileSizeBytes ?? 500 * 1024 * 1024;
  const limitLabel = formatBytes(effectiveLimit);

  const uppy = useMemo(() => {
    const instance = new Uppy<UppyMeta, UppyBody>({
      autoProceed: false,
      allowMultipleUploadBatches: true,
      restrictions: {
        maxFileSize: effectiveLimit,
      },
    });

    async function requestUploadUrl(file: UppyFile<UppyMeta, UppyBody>, signal?: AbortSignal) {
      const response = await fetch("/api/clips/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: projectId,
          filename: file.name,
          content_type: file.type || "video/mp4",
          file_size_bytes: file.size,
        }),
        signal,
      });
      const body = await readJsonOrThrow(response);
      if (typeof body?.signedUrl !== "string" || typeof body?.storagePath !== "string") {
        throw new Error("Upload URL response was incomplete.");
      }
      instance.setFileMeta(file.id, { storagePath: body.storagePath });
      return body as { signedUrl: string; storagePath: string };
    }

    instance.use(AwsS3<UppyMeta, UppyBody>, {
      limit: UPPY_UPLOAD_LIMIT,
      retryDelays: [0, 1500, 3000, 6000, 8000, 8000],
      shouldUseMultipart: (file) => (file.size ?? 0) > MULTIPART_THRESHOLD,
      getChunkSize: () => MULTIPART_CHUNK_SIZE,
      getUploadParameters: async (file, options): Promise<AwsS3UploadParameters> => {
        const { signedUrl } = await requestUploadUrl(file, options.signal);
        return {
          method: "PUT",
          url: signedUrl,
          headers: file.type ? { "Content-Type": file.type } : undefined,
        };
      },
      createMultipartUpload: async (file) => {
        const { storagePath } = await requestUploadUrl(file);
        const response = await fetch("/api/clips/multipart/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            storage_path: storagePath,
            content_type: file.type || "video/mp4",
            file_size_bytes: file.size,
          }),
        });
        const body = await readJsonOrThrow(response);
        if (typeof body?.uploadId !== "string") throw new Error("Multipart start response was incomplete.");
        return { key: storagePath, uploadId: body.uploadId };
      },
      signPart: async (_file, { key, uploadId, partNumber, signal }): Promise<AwsS3UploadParameters> => {
        const response = await fetch("/api/clips/multipart/part-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            storage_path: key,
            upload_id: uploadId,
            part_number: partNumber,
          }),
          signal,
        });
        const body = await readJsonOrThrow(response);
        if (typeof body?.signedUrl !== "string") throw new Error("Part URL response was incomplete.");
        return { method: "PUT", url: body.signedUrl };
      },
      listParts: async () => [],
      abortMultipartUpload: async (_file, { key, uploadId, signal }) => {
        if (!key || !uploadId) return;
        await fetch("/api/clips/multipart/abort", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ storage_path: key, upload_id: uploadId }),
          signal,
        }).catch(() => {});
      },
      completeMultipartUpload: async (_file, { key, uploadId, parts, signal }) => {
        const normalizedParts = parts.map((part: AwsS3Part) => ({
          partNumber: part.PartNumber,
          etag: part.ETag,
        }));
        await readJsonOrThrow(
          await fetch("/api/clips/multipart/complete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              storage_path: key,
              upload_id: uploadId,
              parts: normalizedParts,
            }),
            signal,
          }),
        );
        return { location: key };
      },
    });

    return instance;
  }, [effectiveLimit, projectId]);

  const syncFiles = useCallback(() => {
    setFiles(uppy.getFiles());
  }, [uppy]);

  const setClipCreationState = useCallback((fileId: string, state: ClipCreationState) => {
    const next = new Map(clipCreationByFileIdRef.current);
    next.set(fileId, state);
    clipCreationByFileIdRef.current = next;
    setClipCreationByFileId(next);
  }, []);

  const createClipRecordForFile = useCallback(async (file: UppyFile<UppyMeta, UppyBody>) => {
    const latestFile = uppy.getFile(file.id);
    const storagePath = latestFile?.meta.storagePath ?? file.meta.storagePath;
    if (!storagePath) {
      setClipCreationState(file.id, {
        status: "error",
        error: "Upload finished, but ClipMeta lost the storage path. Please retry this file.",
      });
      return;
    }

    setClipCreationState(file.id, { status: "finalizing" });

    try {
      const sourceFile = file.data instanceof File ? file.data : null;
      const needsWorker = sourceFile ? await needsServerWorker(sourceFile) : false;
      const response = await fetch("/api/clips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: projectId,
          original_filename: file.name,
          storage_path: storagePath,
          file_size_bytes: file.size,
          needs_worker: needsWorker,
        }),
      });
      const body = await readJsonOrThrow(response);
      const clipId = typeof body?.clip_id === "string" ? body.clip_id : null;
      if (clipId) {
        trackClarityEvent("ClipUploaded");
        queueMetadataAutostart([clipId], "uppy-upload");
      }
      setClipCreationState(file.id, { status: "done" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create clip record.";
      setClipCreationState(file.id, { status: "error", error: message });
    }
  }, [projectId, setClipCreationState, uppy]);

  useEffect(() => {
    const onUpload = () => setIsUploading(true);
    const onComplete = () => setIsUploading(false);
    const onError = () => setIsUploading(false);
    const onUploadError = (file: UppyFile<UppyMeta, UppyBody> | undefined, error: Error) => {
      if (!file) return;
      logUploadFailure({
        project_id: projectId,
        filename: file.name,
        file_size_bytes: file.size ?? null,
        file_type: file.type || null,
        upload_method: (file.size ?? 0) > MULTIPART_THRESHOLD ? "uppy-multipart" : "uppy-single-put",
        error_message: error.message,
      });
    };

    const onUploadSuccess = async (file: UppyFile<UppyMeta, UppyBody> | undefined) => {
      if (!file) return;
      await createClipRecordForFile(file);
    };

    uppy.on("state-update", syncFiles);
    uppy.on("upload", onUpload);
    uppy.on("complete", onComplete);
    uppy.on("error", onError);
    uppy.on("upload-error", onUploadError);
    uppy.on("upload-success", onUploadSuccess);

    return () => {
      uppy.off("state-update", syncFiles);
      uppy.off("upload", onUpload);
      uppy.off("complete", onComplete);
      uppy.off("error", onError);
      uppy.off("upload-error", onUploadError);
      uppy.off("upload-success", onUploadSuccess);
    };
  }, [createClipRecordForFile, projectId, syncFiles, uppy]);

  const hasActiveWork = useMemo(() => {
    if (isUploading) return true;
    return Array.from(clipCreationByFileId.values()).some((state) => state.status === "finalizing");
  }, [clipCreationByFileId, isUploading]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!hasActiveWork) return;
      event.preventDefault();
      event.returnValue = UPLOAD_NAV_WARNING;
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasActiveWork]);

  useEffect(() => {
    const handleDocumentClick = (event: MouseEvent) => {
      if (!hasActiveWork || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }

      const target = event.target instanceof Element ? event.target : null;
      const anchor = target?.closest("a[href]") as HTMLAnchorElement | null;
      if (!anchor || anchor.target || anchor.hasAttribute("download")) return;

      const href = anchor.getAttribute("href") ?? "";
      if (href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return;

      event.preventDefault();
      event.stopPropagation();
      window.alert(UPLOAD_NAV_WARNING);
    };

    document.addEventListener("click", handleDocumentClick, true);
    return () => document.removeEventListener("click", handleDocumentClick, true);
  }, [hasActiveWork]);

  useEffect(() => {
    return () => uppy.destroy();
  }, [uppy]);

  const addFiles = useCallback((fileList: FileList | File[]) => {
    setAddError(null);
    const videoFiles = Array.from(fileList).filter(isVideoFile);
    if (videoFiles.length === 0) {
      setAddError("Choose video files to upload.");
      return;
    }

    for (const file of videoFiles) {
      try {
        uppy.addFile({
          name: file.name,
          type: file.type,
          data: file,
          meta: { originalFileName: file.name },
        });
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : `Could not add ${file.name}. ${planLabel} allows files up to ${limitLabel}.`;
        setAddError(message);
      }
    }
    syncFiles();
  }, [limitLabel, planLabel, syncFiles, uppy]);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      setIsDragging(false);
      addFiles(event.dataTransfer.files);
    },
    [addFiles],
  );

  const doneCount = files.filter((file) => clipCreationByFileId.get(file.id)?.status === "done").length;
  const remainingCount = files.filter((file) => clipCreationByFileId.get(file.id)?.status !== "done").length;
  const hasFiles = files.length > 0;

  async function handleUpload() {
    setAddError(null);
    try {
      await uppy.upload();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Upload failed.";
      setAddError(message);
    }
  }

  function handleCancelAll() {
    uppy.cancelAll();
    setIsUploading(false);
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-primary/40 bg-primary/10 px-4 py-3 text-sm text-primary">
        Uppy upload experiment is enabled for this account only. Everyone else still uses the current uploader.
      </div>

      <div
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={`cursor-pointer rounded-xl border-2 border-dashed p-10 text-center transition ${
          isDragging ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"
        }`}
      >
        <div className="text-4xl font-semibold text-primary">Video</div>
        <p className="mt-3 text-sm font-semibold text-foreground">
          {isDragging ? "Drop clips here" : "Drag & drop clips here"}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Uppy test upload path - multiple files supported
        </p>
        <p className="mt-1 text-[11px] text-muted-foreground">
          Max {limitLabel} per file ({planLabel} plan)
        </p>
        <input
          ref={inputRef}
          type="file"
          accept="video/*"
          multiple
          hidden
          onChange={(event) => {
            if (event.target.files) addFiles(event.target.files);
            event.currentTarget.value = "";
          }}
        />
      </div>

      {addError && (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {addError}
        </div>
      )}

      {hasActiveWork && (
        <div className="rounded-xl border border-amber-500/60 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          <p className="font-semibold">Keep this page open while ClipMeta finishes.</p>
          <p className="mt-1">
            {remainingCount} item{remainingCount === 1 ? "" : "s"} still need upload or clip setup. Metadata starts automatically after each file finishes.
          </p>
        </div>
      )}

      {hasFiles && (
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleUpload}
            disabled={isUploading || files.every((file) => file.progress.uploadComplete)}
            className="rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isUploading ? `Uploading... (${doneCount}/${files.length})` : "Upload clips"}
          </button>
          <button
            onClick={handleCancelAll}
            disabled={!hasActiveWork}
            className="rounded-xl border border-border px-5 py-3 text-sm font-semibold text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancel All
          </button>
        </div>
      )}

      {hasFiles && (
        <div className="space-y-3">
          {files.map((file) => {
            const progress = getUppyProgress(file);
            const clipState = clipCreationByFileId.get(file.id);
            const errorMessage = file.error ?? clipState?.error;
            const canRetry = Boolean(errorMessage);
            const retryClipSetup = clipState?.status === "error" && file.progress.uploadComplete && Boolean(file.meta.storagePath);

            return (
              <div key={file.id} className="rounded-xl border border-border p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">{file.name}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {typeof file.size === "number" ? formatBytes(file.size) : "-"}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <StatusBadge file={file} clipState={clipState} />
                    {canRetry && (
                      <button
                        onClick={() => {
                          if (retryClipSetup) {
                            void createClipRecordForFile(file);
                          } else {
                            void uppy.retryUpload(file.id);
                          }
                        }}
                        className="rounded-full border border-primary/60 px-3 py-1 text-xs font-semibold text-primary transition hover:bg-primary/10"
                      >
                        Retry
                      </button>
                    )}
                  </div>
                </div>
                {progress > 0 && <SmoothProgressBar progress={progress} />}
                {errorMessage && <p className="mt-3 text-xs font-semibold text-red-400">{errorMessage}</p>}
              </div>
            );
          })}
        </div>
      )}

      {hasFiles && doneCount === files.length && (
        <div className="rounded-xl border border-green-500/40 bg-green-500/10 px-4 py-3 text-sm text-green-200">
          Upload batch complete.{" "}
          <a href={`/projects/${projectSlug}/review`} className="font-semibold underline">
            Review metadata -&gt;
          </a>
        </div>
      )}
    </div>
  );
}
