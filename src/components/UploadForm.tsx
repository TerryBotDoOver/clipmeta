"use client";

import { useRef, useState } from "react";
import { extractFrames, type ExtractedFrame } from "@/lib/extractFrames";

type UploadFormProps = {
  projectId: string;
  projectSlug: string;
};

type UploadStatus = "idle" | "extracting" | "uploading" | "generating" | "success" | "error";

export function UploadForm({ projectId, projectSlug }: UploadFormProps) {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");
  const [lastUploaded, setLastUploaded] = useState<string | null>(null);
  const [frames, setFrames] = useState<ExtractedFrame[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  function reset() {
    setFile(null);
    setStatus("idle");
    setProgress(0);
    setErrorMessage("");
    if (inputRef.current) inputRef.current.value = "";
  }

  async function handleUpload() {
    if (!file) return;

    setStatus("extracting");
    setProgress(0);
    setErrorMessage("");

    try {
      // Step 1: Extract frames client-side while file is local
      const extracted = await extractFrames(file, 4);
      setFrames(extracted);

      setStatus("uploading");

      // Step 2: Get a signed upload URL from the server
      const urlRes = await fetch("/api/clips/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: projectId,
          filename: file.name,
        }),
      });

      if (!urlRes.ok) {
        const err = await urlRes.json();
        throw new Error(err.message || "Failed to get upload URL.");
      }

      const { signedUrl, storagePath } = await urlRes.json();

      // Step 3: Upload directly from browser to Supabase Storage with progress
      await uploadWithProgress(signedUrl, file, (pct) => setProgress(pct));

      // Step 4: Create the clip record
      const clipRes = await fetch("/api/clips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: projectId,
          original_filename: file.name,
          storage_path: storagePath,
          file_size_bytes: file.size,
        }),
      });

      if (!clipRes.ok) {
        const err = await clipRes.json();
        throw new Error(err.message || "Upload succeeded but failed to save clip record.");
      }

      const { clip_id } = await clipRes.json();

      // Step 5: Auto-generate metadata using extracted frames
      if (clip_id && extracted.length > 0) {
        setStatus("generating");
        const metaRes = await fetch("/api/metadata/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            clip_id,
            frames: extracted.map((f) => f.dataUrl),
          }),
        });
        // Don't block on metadata failure — clip is already saved
        if (!metaRes.ok) {
          console.warn("Metadata generation failed — clip saved, metadata pending.");
        }
      }

      setLastUploaded(file.name);
      setStatus("success");
      reset();

      // Reload page data to show new clip + metadata
      setTimeout(() => window.location.reload(), 1500);
    } catch (err: unknown) {
      setStatus("error");
      setErrorMessage(
        err instanceof Error ? err.message : "An unexpected error occurred."
      );
    }
  }

  return (
    <div className="space-y-5">
      {/* File picker */}
      <div>
        <label
          htmlFor="clip_file"
          className="block text-sm font-medium text-slate-900"
        >
          Clip file
        </label>
        <input
          ref={inputRef}
          id="clip_file"
          type="file"
          accept="video/*"
          disabled={status === "uploading"}
          onChange={(e) => {
            setFile(e.target.files?.[0] ?? null);
            setStatus("idle");
            setErrorMessage("");
          }}
          className="mt-2 block w-full cursor-pointer rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 file:mr-4 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>

      {/* File info */}
      {file && status !== "uploading" && (
        <div className="rounded-xl bg-slate-100 px-4 py-3 text-sm">
          <p className="font-medium text-slate-900">{file.name}</p>
          <p className="mt-0.5 text-slate-500">
            {(file.size / 1024 / 1024).toFixed(1)} MB
          </p>
        </div>
      )}

      {/* Extracting frames state */}
      {status === "extracting" && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          <div className="flex items-center gap-2">
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Extracting frames for metadata generation…
          </div>
        </div>
      )}

      {/* Progress bar */}
      {status === "uploading" && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Uploading {file?.name}…</span>
            <span>{progress}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-slate-900 transition-all duration-150"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-slate-400">
            {file ? (file.size / 1024 / 1024).toFixed(1) : 0} MB — uploading
            directly to storage
          </p>
        </div>
      )}

      {/* Generating metadata state */}
      {status === "generating" && (
        <div className="rounded-xl border border-purple-200 bg-purple-50 px-4 py-3 text-sm text-purple-800">
          <div className="flex items-center gap-2">
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Generating metadata with AI…
          </div>
        </div>
      )}

      {/* Success message */}
      {status === "success" && lastUploaded && (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          ✓ <span className="font-medium">{lastUploaded}</span> uploaded
          successfully. Refreshing…
        </div>
      )}

      {/* Error message */}
      {status === "error" && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <p className="font-medium">Upload failed</p>
          <p className="mt-0.5">{errorMessage}</p>
          <button
            onClick={() => setStatus("idle")}
            className="mt-2 text-xs underline hover:no-underline"
          >
            Try again
          </button>
        </div>
      )}

      {/* Upload button */}
      <button
        type="button"
        disabled={!file || status === "uploading"}
        onClick={handleUpload}
        className="inline-flex items-center rounded-lg bg-slate-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {status === "uploading" ? (
          <>
            <svg
              className="mr-2 h-4 w-4 animate-spin"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v8H4z"
              />
            </svg>
            Uploading…
          </>
        ) : (
          "Upload clip"
        )}
      </button>
    </div>
  );
}

// XHR-based upload for real progress tracking
function uploadWithProgress(
  signedUrl: string,
  file: File,
  onProgress: (pct: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    });

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress(100);
        resolve();
      } else {
        reject(new Error(`Storage upload failed with status ${xhr.status}.`));
      }
    });

    xhr.addEventListener("error", () =>
      reject(new Error("Network error during upload."))
    );
    xhr.addEventListener("abort", () =>
      reject(new Error("Upload was cancelled."))
    );

    xhr.open("PUT", signedUrl);
    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
    xhr.send(file);
  });
}
