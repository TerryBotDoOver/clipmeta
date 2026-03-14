"use client";

import { useState, useRef, useEffect } from "react";
import { PLATFORM_LABELS, type ExportPlatform } from "@/lib/csvExport";

const PLATFORMS: ExportPlatform[] = ["blackbox", "shutterstock", "adobe", "pond5", "generic"];

type ExportButtonProps = {
  projectId: string;
  clipCount: number;
};

export function ExportButton({ projectId, clipCount }: ExportButtonProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  if (clipCount === 0) {
    return (
      <button disabled className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground opacity-40 cursor-not-allowed">
        Export CSV ↓
      </button>
    );
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-lg bg-foreground px-4 py-2 text-sm font-semibold text-background transition hover:opacity-80"
      >
        Export CSV
        <span className="text-xs opacity-70">▾</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-52 rounded-xl border border-border bg-card shadow-xl">
          <p className="px-3 pt-3 pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Export format
          </p>
          {PLATFORMS.map((platform) => (
            <a
              key={platform}
              href={`/api/export/csv?project_id=${projectId}&platform=${platform}`}
              download
              onClick={() => setOpen(false)}
              className="flex items-center justify-between px-3 py-2.5 text-sm text-foreground hover:bg-muted transition first-of-type:rounded-t-xl last-of-type:rounded-b-xl"
            >
              <span>{PLATFORM_LABELS[platform]}</span>
              {platform === "blackbox" && (
                <span className="rounded-full bg-indigo-500/20 px-2 py-0.5 text-xs text-indigo-400 font-medium">recommended</span>
              )}
            </a>
          ))}
          <div className="border-t border-border px-3 py-2">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Each format is optimized for that platform&apos;s requirements — keyword limits, column names, and field order.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
