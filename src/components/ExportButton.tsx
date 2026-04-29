"use client";

import { useState, useRef, useEffect } from "react";
import { PLATFORM_LABELS, type ExportPlatform } from "@/lib/csvExport";
import { normalizePlan } from "@/lib/plans";

const PLATFORMS: ExportPlatform[] = ["blackbox", "shutterstock", "adobe", "pond5", "generic"];

// These platforms require a Pro plan or higher
const PRO_PLATFORMS: ExportPlatform[] = ["shutterstock", "adobe", "pond5"];

function isPlanGated(platform: ExportPlatform, plan: string): boolean {
  if (!PRO_PLATFORMS.includes(platform)) return false;
  const basePlan = normalizePlan(plan);
  return basePlan === "free" || basePlan === "starter";
}

type ClipPreview = {
  filename: string;
  title: string;
  keywords: string[];
  description: string;
};

type ExportButtonProps = {
  projectId: string;
  clipCount: number;
  clips?: ClipPreview[];
  plan?: string;
};

export function ExportButton({ projectId, clipCount, clips = [], plan = "free" }: ExportButtonProps) {
  const [open, setOpen] = useState(false);
  const [previewPlatform, setPreviewPlatform] = useState<ExportPlatform | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const basePlan = normalizePlan(plan);

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

  const totalKeywords = clips.reduce((sum, c) => sum + (c.keywords?.length ?? 0), 0);
  const avgKeywords = clips.length > 0 ? Math.round(totalKeywords / clips.length) : 0;
  const lowKeywordClips = clips.filter(c => (c.keywords?.length ?? 0) < 10);
  const missingMetaClips = clips.filter(c => !c.title || !c.description);

  return (
    <>
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
            {PLATFORMS.map((platform) => {
              const gated = isPlanGated(platform, plan);
              return (
                <div key={platform}>
                  {gated ? (
                    <button
                      onClick={() => { window.location.href = "/pricing"; }}
                      className="flex w-full items-center justify-between px-3 py-2.5 text-sm text-muted-foreground/50 hover:bg-muted/50 transition text-left cursor-pointer"
                      title="Pro feature — Upgrade to unlock"
                    >
                      <span className="flex items-center gap-1.5">
                        <span>🔒</span>
                        {PLATFORM_LABELS[platform]}
                      </span>
                      <span className="text-xs text-violet-400 font-medium">Pro →</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => { setPreviewPlatform(platform); setOpen(false); }}
                      className="flex w-full items-center justify-between px-3 py-2.5 text-sm text-foreground hover:bg-muted transition text-left"
                    >
                      <span>{PLATFORM_LABELS[platform]}</span>
                      {platform === "blackbox" && (
                        <span className="rounded-full bg-indigo-500/20 px-2 py-0.5 text-xs text-indigo-400 font-medium">recommended</span>
                      )}
                    </button>
                  )}
                  {platform === "pond5" && !gated && (
                    <div className="mx-3 mb-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-2">
                      <p className="text-xs text-amber-400 leading-relaxed">
                        ⚠️ Pond5 matches by filename. Check <strong>Tech Data</strong> on each clip in Pond5 and rename clips in ClipMeta to match exactly before exporting.
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
            <div className="border-t border-border px-3 py-2">
              {(basePlan === "free" || basePlan === "starter") ? (
                <p className="text-xs text-muted-foreground leading-relaxed">
                  🔒 Shutterstock, Adobe Stock & Pond5 exports are available on{' '}
                  <a href="/pricing" className="text-violet-400 hover:underline font-medium">Pro plan →</a>
                </p>
              ) : (
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Each format is optimized for that platform's requirements — keyword limits, column names, and field order.
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* CSV Preview Modal */}
      {previewPlatform && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-border bg-card shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <div>
                <h2 className="text-base font-semibold text-foreground">CSV Preview — {PLATFORM_LABELS[previewPlatform]}</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {clips.length} clips · {totalKeywords} total keywords · {avgKeywords} avg per clip
                </p>
              </div>
              <button onClick={() => setPreviewPlatform(null)} className="text-muted-foreground hover:text-foreground transition text-xl leading-none">×</button>
            </div>

            {/* Warnings */}
            {(lowKeywordClips.length > 0 || missingMetaClips.length > 0) && (
              <div className="px-6 pt-4 space-y-2">
                {missingMetaClips.length > 0 && (
                  <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2.5">
                    <span className="text-red-400 text-sm">⚠</span>
                    <p className="text-xs text-red-400">
                      <strong>{missingMetaClips.length} clip{missingMetaClips.length > 1 ? 's' : ''}</strong> missing title or description. These may be rejected by the platform.
                    </p>
                  </div>
                )}
                {lowKeywordClips.length > 0 && (
                  <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2.5">
                    <span className="text-amber-400 text-sm">⚠</span>
                    <p className="text-xs text-amber-400">
                      <strong>{lowKeywordClips.length} clip{lowKeywordClips.length > 1 ? 's' : ''}</strong> have fewer than 10 keywords. Consider adding more for better discoverability.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Preview table */}
            <div className="px-6 pt-4 pb-2 overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border">
                    <th className="pb-2 text-left font-semibold text-muted-foreground w-1/3">Filename</th>
                    <th className="pb-2 text-left font-semibold text-muted-foreground w-1/2">Title</th>
                    <th className="pb-2 text-right font-semibold text-muted-foreground">Keywords</th>
                  </tr>
                </thead>
                <tbody>
                  {clips.slice(0, 10).map((clip, i) => (
                    <tr key={i} className="border-b border-border/50 last:border-0">
                      <td className="py-2 pr-3 text-muted-foreground truncate max-w-[140px]">{clip.filename || '—'}</td>
                      <td className="py-2 pr-3 text-foreground truncate max-w-[200px]">
                        {!clip.title ? <span className="text-red-400 italic">missing</span> : clip.title}
                      </td>
                      <td className="py-2 text-right">
                        <span className={`font-medium ${(clip.keywords?.length ?? 0) < 10 ? 'text-amber-400' : 'text-foreground'}`}>
                          {clip.keywords?.length ?? 0}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {clips.length > 10 && (
                <p className="mt-2 text-xs text-muted-foreground text-center">+ {clips.length - 10} more clips not shown</p>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 border-t border-border px-6 py-4">
              <button
                onClick={() => setPreviewPlatform(null)}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition hover:bg-muted"
              >
                Cancel
              </button>
              <a
                href={`/api/export/csv?project_id=${projectId}&platform=${previewPlatform}`}
                download
                onClick={() => setPreviewPlatform(null)}
                className="rounded-lg bg-foreground px-4 py-2 text-sm font-semibold text-background transition hover:opacity-80"
              >
                Download CSV
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
