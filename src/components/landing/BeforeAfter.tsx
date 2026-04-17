"use client";

import { useEffect, useState } from "react";

/**
 * Before/After workflow comparison.
 * Two stacked timelines: manual workflow (painful) vs ClipMeta (fast).
 * Animates on scroll-in with staggered progress bars.
 */

const MANUAL = [
  { label: "Watch clip, identify subject", time: "2 min" },
  { label: "Think up a good title", time: "1 min" },
  { label: "Write 2-sentence description", time: "2 min" },
  { label: "Brainstorm 40+ keywords (no repeats)", time: "2 min" },
  { label: "Paste into platform CSV template", time: "1 min" },
];

const CLIPMETA = [
  { label: "Drag clip into ClipMeta", time: "5 sec" },
  { label: "AI reads frames + writes everything", time: "12 sec" },
  { label: "Review inline, tweak a word", time: "10 sec" },
  { label: "Export platform-ready CSV", time: "3 sec" },
];

const MANUAL_TOTAL_MIN = MANUAL.reduce((a) => a + 1, 0); // placeholder
// Real totals
const MANUAL_SECONDS = 8 * 60;
const CLIPMETA_SECONDS = 30;

export function BeforeAfter() {
  const [active, setActive] = useState(false);

  useEffect(() => {
    const el = document.getElementById("before-after-anchor");
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            setActive(true);
            observer.unobserve(e.target);
          }
        });
      },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div id="before-after-anchor">
      <div className="grid gap-4 lg:grid-cols-2">
        {/* BEFORE — manual */}
        <div className="glass-card relative overflow-hidden p-6 md:p-8">
          <div className="absolute right-4 top-4 font-mono text-[9px] uppercase tracking-[0.2em] text-red-300/60">
            Status · Painful
          </div>
          <div className="mb-6">
            <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-white/40 mb-2">
              Before — Manual workflow
            </p>
            <h3 className="text-2xl font-bold text-white">Per clip.</h3>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-5xl font-bold text-red-300">8</span>
              <span className="text-lg text-white/50">min</span>
              <span className="font-mono text-[11px] text-white/30">// × 100 clips = 13 hours</span>
            </div>
          </div>

          <ol className="relative space-y-3">
            {MANUAL.map((s, i) => (
              <li key={s.label} className="flex items-center gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-500/15 font-mono text-[10px] text-red-300">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="flex-1 text-sm text-white/70">{s.label}</span>
                <span className="font-mono text-[10px] uppercase tracking-wider text-white/30">
                  {s.time}
                </span>
                <div className="ml-1 h-1.5 w-10 overflow-hidden rounded-full bg-white/5">
                  <div
                    className="h-full bg-gradient-to-r from-red-500/70 to-red-500/40"
                    style={{
                      width: active ? "100%" : "0%",
                      transition: `width 0.8s ease-out ${i * 180}ms`,
                    }}
                  />
                </div>
              </li>
            ))}
          </ol>
        </div>

        {/* AFTER — ClipMeta */}
        <div className="glass-card relative overflow-hidden p-6 md:p-8">
          <div className="pointer-events-none absolute -right-20 -top-20 h-60 w-60 rounded-full bg-violet-500/20 blur-3xl" />
          <div className="absolute right-4 top-4 font-mono text-[9px] uppercase tracking-[0.2em] text-emerald-300">
            Status · Shipping
          </div>
          <div className="relative mb-6">
            <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-violet-300 mb-2">
              After — ClipMeta
            </p>
            <h3 className="text-2xl font-bold text-white">Per clip.</h3>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="gradient-text text-5xl font-bold">30</span>
              <span className="text-lg text-white/50">sec</span>
              <span className="font-mono text-[11px] text-emerald-300">// 16× faster</span>
            </div>
          </div>

          <ol className="relative space-y-3">
            {CLIPMETA.map((s, i) => (
              <li key={s.label} className="flex items-center gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-500/20 font-mono text-[10px] text-violet-200">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="flex-1 text-sm text-white/85">{s.label}</span>
                <span className="font-mono text-[10px] uppercase tracking-wider text-violet-300">
                  {s.time}
                </span>
                <div className="ml-1 h-1.5 w-10 overflow-hidden rounded-full bg-white/5">
                  <div
                    className="h-full bg-gradient-to-r from-violet-500 via-cyan-400 to-pink-400"
                    style={{
                      width: active ? "25%" : "0%",
                      transition: `width 0.4s ease-out ${i * 120}ms`,
                    }}
                  />
                </div>
              </li>
            ))}
          </ol>

          {/* Big delta */}
          <div className="mt-6 flex items-center justify-between rounded-xl border border-violet-400/20 bg-violet-500/5 p-4">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-violet-300/80">
                Time reclaimed
              </div>
              <div className="text-xl font-bold text-white">
                <span className="gradient-text">{Math.round((MANUAL_SECONDS - CLIPMETA_SECONDS) / 60)}</span> min / clip
              </div>
            </div>
            <div className="text-right">
              <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/40">
                On 100 clips
              </div>
              <div className="text-xl font-bold text-white">
                ≈ <span className="gradient-text">13 hours</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Small helper to silence unused constant */}
      <span className="hidden">{MANUAL_TOTAL_MIN}</span>
    </div>
  );
}
