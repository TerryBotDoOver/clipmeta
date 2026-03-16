"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const SKIP_KEY = "clipmeta_skip_complete_warning";

type Props = {
  projectId: string;
  isComplete: boolean;
};

export function MarkCompleteButton({ projectId, isComplete }: Props) {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [skipFuture, setSkipFuture] = useState(false);
  const [loading, setLoading] = useState(false);

  if (isComplete) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-green-500/15 px-3 py-1.5 text-xs font-semibold text-green-400">
        ✓ Complete
      </span>
    );
  }

  function handleClick() {
    const skip = typeof window !== "undefined" && localStorage.getItem(SKIP_KEY) === "true";
    if (skip) {
      runComplete();
    } else {
      setShowModal(true);
    }
  }

  async function runComplete() {
    setLoading(true);
    setShowModal(false);
    try {
      await fetch("/api/projects/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_id: projectId }),
      });
      router.refresh();
    } catch (e) {
      console.error("Failed to mark complete", e);
    } finally {
      setLoading(false);
    }
  }

  function handleConfirm() {
    if (skipFuture) {
      localStorage.setItem(SKIP_KEY, "true");
    }
    runComplete();
  }

  return (
    <>
      <button
        onClick={handleClick}
        disabled={loading}
        className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition hover:border-green-500/50 hover:text-green-400 disabled:opacity-40"
      >
        {loading ? "Completing…" : "Mark as Complete"}
      </button>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-foreground">Mark project as complete?</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              This will permanently delete the original source video files from storage to free up space.
              Your metadata — titles, keywords, descriptions, and categories — is kept forever and can still be exported at any time.
            </p>

            <label className="mt-4 flex cursor-pointer items-start gap-2.5">
              <input
                type="checkbox"
                checked={skipFuture}
                onChange={(e) => setSkipFuture(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded accent-violet-500"
              />
              <span className="text-sm text-muted-foreground">
                Don&apos;t show this warning again for future batches
              </span>
            </label>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition hover:bg-muted"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
              >
                Mark Complete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
