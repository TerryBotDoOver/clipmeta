"use client";

import { useState } from "react";
import { scoreMetadata, type QualityScore } from "@/lib/metadataQuality";

type QualityBadgeProps = {
  title: string;
  description: string;
  keywords: string[];
  category: string;
  location: string | null;
};

const GRADE_COLORS: Record<QualityScore["grade"], string> = {
  A: "bg-green-500/15 text-green-400 border-green-500/30",
  B: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  C: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  D: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  F: "bg-red-500/15 text-red-400 border-red-500/30",
};

const LEVEL_ICONS = { error: "✗", warning: "⚠", tip: "💡" };
const LEVEL_COLORS = {
  error: "text-red-400",
  warning: "text-amber-400",
  tip: "text-blue-400",
};

export function QualityBadge({ title, description, keywords, category, location }: QualityBadgeProps) {
  const [open, setOpen] = useState(false);
  const quality = scoreMetadata({ title, description, keywords, category, location });

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setOpen((o) => !o)}
        className={`rounded-full border px-2.5 py-0.5 text-xs font-bold transition hover:opacity-80 ${GRADE_COLORS[quality.grade]}`}
        title={`Metadata quality: ${quality.score}/100`}
      >
        {quality.grade} · {quality.score}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full z-50 mt-1 w-80 rounded-xl border border-border bg-card shadow-xl">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-foreground">Metadata Quality</p>
                <p className="text-xs text-muted-foreground">{quality.score}/100 · Grade {quality.grade}</p>
              </div>
              <span className={`rounded-full border px-3 py-1 text-lg font-black ${GRADE_COLORS[quality.grade]}`}>
                {quality.grade}
              </span>
            </div>

            <div className="max-h-72 overflow-y-auto px-4 py-3 space-y-2">
              {quality.warnings.length === 0 ? (
                <p className="text-sm text-green-400">✓ Excellent metadata — no issues found.</p>
              ) : (
                quality.warnings.map((w, i) => (
                  <div key={i} className="flex gap-2 text-xs">
                    <span className={`mt-0.5 shrink-0 font-bold ${LEVEL_COLORS[w.level]}`}>
                      {LEVEL_ICONS[w.level]}
                    </span>
                    <span className="text-foreground leading-relaxed">{w.message}</span>
                  </div>
                ))
              )}
            </div>

            <div className="border-t border-border px-4 py-2">
              <p className="text-xs text-muted-foreground">Scores A (90+) · B (75+) · C (60+) · D (45+) · F</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
