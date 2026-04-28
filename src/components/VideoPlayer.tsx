"use client";

import { useState } from "react";

export function VideoPlayer({ src }: { src: string }) {
  const [failed, setFailed] = useState(false);

  // If the source 404s (e.g., the file was archived from storage but the DB
  // row hasn't been reconciled yet), show a visible explanation rather than
  // silently disappearing. The reconciliation cron will eventually flip the
  // clip's upload_status to "source_deleted" and the parent will render the
  // proper "archived" placeholder instead.
  if (failed) {
    return (
      <div className="mt-3 flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-xs">
        <span aria-hidden className="mt-0.5 text-base leading-none">!</span>
        <div className="space-y-1">
          <p className="font-semibold text-amber-300">Preview unavailable</p>
          <p className="text-muted-foreground leading-relaxed">
            This browser could not play the source file. ProRes or QuickTime MOV clips may still export normally even when the preview cannot load.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-3 overflow-hidden rounded-xl border border-border bg-black">
      <video
        src={src}
        controls
        preload="none"
        onError={() => setFailed(true)}
        className="max-h-52 w-full object-contain"
      />
    </div>
  );
}
