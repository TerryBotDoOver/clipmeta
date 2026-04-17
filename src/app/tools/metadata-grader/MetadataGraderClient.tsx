"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  gradeStockFootageMetadata,
  type GraderPlatform,
  PLATFORM_DISPLAY_NAMES,
} from "@/lib/stockFootageMetadataGrader";

const PLATFORMS: GraderPlatform[] = ["blackbox", "shutterstock", "adobe_stock", "pond5"];

const sampleInput = {
  title: "Drone footage of beach ocean view",
  description:
    "Aerial footage of a beach with waves. Good for travel videos and background use.",
  keywords:
    "drone, aerial, beach, ocean, water, waves, coastline, tropical, nature, beautiful, scenic, view, footage, video, clip, travel, tourism, summer, blue water, seascape",
};

function gradeColor(grade: string) {
  switch (grade) {
    case "A":
      return "text-emerald-400";
    case "B":
      return "text-sky-400";
    case "C":
      return "text-amber-400";
    case "D":
      return "text-orange-400";
    default:
      return "text-red-400";
  }
}

function scoreColor(score: number) {
  if (score >= 85) return "text-emerald-400";
  if (score >= 70) return "text-sky-400";
  if (score >= 55) return "text-amber-400";
  if (score >= 40) return "text-orange-400";
  return "text-red-400";
}

function scoreBarColor(score: number) {
  if (score >= 85) return "from-emerald-500 to-emerald-400";
  if (score >= 70) return "from-sky-500 to-cyan-400";
  if (score >= 55) return "from-amber-500 to-amber-400";
  if (score >= 40) return "from-orange-500 to-orange-400";
  return "from-red-600 to-red-500";
}

function issueIcon(level: string) {
  switch (level) {
    case "error":
      return (
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-red-500/20 text-xs font-bold text-red-300">
          !
        </span>
      );
    case "warning":
      return (
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-500/20 text-xs font-bold text-amber-300">
          ▲
        </span>
      );
    default:
      return (
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-sky-500/20 text-xs font-bold text-sky-300">
          i
        </span>
      );
  }
}

function areaLabel(area: string) {
  const map: Record<string, string> = {
    title: "Title",
    description: "Description",
    keywords: "Keyword Count",
    uniqueness: "Keyword Uniqueness",
    specificity: "Keyword Specificity",
    seo: "SEO / Ordering",
    overall: "Overall",
  };
  return map[area] ?? area;
}

type CategoryMeterProps = {
  label: string;
  score: number;
  max?: number;
};

function CategoryMeter({ label, score, max = 100 }: CategoryMeterProps) {
  const pct = Math.max(0, Math.min(100, (score / max) * 100));
  return (
    <div className="glass-card p-4">
      <div className="flex items-baseline justify-between">
        <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/50">
          {label}
        </div>
        <div className={`font-mono text-lg font-semibold ${scoreColor(score)}`}>
          {score}
        </div>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/5">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${scoreBarColor(score)} transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: string | number; accent?: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 backdrop-blur">
      <div className={`font-mono text-2xl font-semibold ${accent ?? "text-white"}`}>{value}</div>
      <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-white/50">
        {label}
      </div>
    </div>
  );
}

export function MetadataGraderClient() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [keywords, setKeywords] = useState("");
  const [platform, setPlatform] = useState<GraderPlatform>("blackbox");
  const [hasGraded, setHasGraded] = useState(false);

  const result = useMemo(() => {
    if (!hasGraded) return null;
    return gradeStockFootageMetadata({ title, description, keywords, platform });
  }, [title, description, keywords, platform, hasGraded]);

  const titleChars = title.length;
  const descChars = description.length;
  const keywordPreview = useMemo(() => {
    return keywords
      .split(/[\n,]+/)
      .map((k) => k.trim())
      .filter(Boolean);
  }, [keywords]);

  function loadSample() {
    setTitle(sampleInput.title);
    setDescription(sampleInput.description);
    setKeywords(sampleInput.keywords);
    setHasGraded(true);
    // Scroll to results on mobile
    setTimeout(() => {
      const el = document.getElementById("grader-results");
      if (el && window.innerWidth < 1024) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 100);
  }

  function handleGrade() {
    setHasGraded(true);
    setTimeout(() => {
      const el = document.getElementById("grader-results");
      if (el && window.innerWidth < 1024) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 100);
  }

  function handleReset() {
    setTitle("");
    setDescription("");
    setKeywords("");
    setHasGraded(false);
  }

  return (
    <section className="relative mx-auto max-w-7xl px-6 pb-24 pt-12 md:pt-16">
      {/* HUD chip */}
      <div className="flex justify-center">
        <div className="hud-chip">
          <span>METADATA GRADER</span>
          <span className="text-white/30">|</span>
          <span className="text-white/60">CLIENT-SIDE</span>
          <span className="text-white/30">|</span>
          <span className="text-emerald-400">BETA</span>
        </div>
      </div>

      {/* Headline */}
      <div className="mx-auto mt-8 max-w-4xl text-center">
        <h1 className="text-4xl font-bold leading-[1.08] tracking-tight text-white sm:text-5xl lg:text-6xl">
          Grade your metadata.
          <br />
          <span className="gradient-text">Find the weak spots.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-white/60">
          Paste one title, description, and keyword list. Score it against stock-footage best practices
          for Blackbox, Shutterstock, Adobe Stock, and Pond5. No signup, runs in your browser.
        </p>
      </div>

      {/* Two-column layout: form left, results right */}
      <div className="mt-14 grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        {/* ═══════ LEFT: INPUT FORM ═══════ */}
        <div className="glass-card p-6 md:p-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-violet-300/80">
                // Input
              </div>
              <h2 className="mt-1 text-xl font-semibold text-white">
                Paste metadata
              </h2>
            </div>
            <button
              type="button"
              onClick={loadSample}
              className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/70 transition hover:border-white/20 hover:bg-white/10 hover:text-white"
            >
              Load sample
            </button>
          </div>

          {/* Platform selector */}
          <div className="mt-6">
            <label className="mb-2 block font-mono text-[10px] uppercase tracking-[0.18em] text-white/50">
              Target platform
            </label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {PLATFORMS.map((p) => {
                const active = platform === p;
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPlatform(p)}
                    className={`rounded-xl border px-3 py-2.5 text-xs font-semibold transition ${
                      active
                        ? "border-violet-400/60 bg-violet-500/15 text-violet-200 shadow-lg shadow-violet-500/10"
                        : "border-white/10 bg-white/[0.02] text-white/60 hover:border-white/20 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    {PLATFORM_DISPLAY_NAMES[p]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Title input */}
          <div className="mt-6">
            <div className="mb-2 flex items-center justify-between">
              <label className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/50">
                Title
              </label>
              <span
                className={`font-mono text-[10px] ${
                  titleChars === 0
                    ? "text-white/30"
                    : titleChars < 60
                    ? "text-amber-400/70"
                    : titleChars <= 120
                    ? "text-emerald-400/80"
                    : titleChars <= 200
                    ? "text-amber-400/70"
                    : "text-red-400/80"
                }`}
              >
                {titleChars}/200 · target 60-120
              </span>
            </div>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={250}
              placeholder="e.g. golden hour light over tropical coastline from drone"
              className="w-full rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-sm text-white placeholder:text-white/30 backdrop-blur transition focus:border-violet-400/60 focus:bg-white/[0.04] focus:outline-none focus:ring-2 focus:ring-violet-500/20"
            />
          </div>

          {/* Description input */}
          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between">
              <label className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/50">
                Description
              </label>
              <span
                className={`font-mono text-[10px] ${
                  descChars === 0
                    ? "text-white/30"
                    : descChars < 150
                    ? "text-amber-400/70"
                    : descChars <= 400
                    ? "text-emerald-400/80"
                    : "text-amber-400/70"
                }`}
              >
                {descChars} chars · target 150-400 · 2+ sentences
              </span>
            </div>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the subject, motion, and best buyer use case. Two sentences minimum."
              className="h-28 w-full resize-y rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-sm text-white placeholder:text-white/30 backdrop-blur transition focus:border-violet-400/60 focus:bg-white/[0.04] focus:outline-none focus:ring-2 focus:ring-violet-500/20"
            />
          </div>

          {/* Keywords input */}
          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between">
              <label className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/50">
                Keywords
              </label>
              <span
                className={`font-mono text-[10px] ${
                  keywordPreview.length === 0
                    ? "text-white/30"
                    : keywordPreview.length >= 30
                    ? "text-emerald-400/80"
                    : "text-amber-400/70"
                }`}
              >
                {keywordPreview.length} keywords · comma or newline separated
              </span>
            </div>
            <textarea
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder="coastline, tropical, aerial, golden hour, sunset, drone, waves, palm trees, cinematic..."
              className="h-36 w-full resize-y rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 font-mono text-xs text-white placeholder:text-white/30 backdrop-blur transition focus:border-violet-400/60 focus:bg-white/[0.04] focus:outline-none focus:ring-2 focus:ring-violet-500/20"
            />
            {/* Keyword chips preview */}
            {keywordPreview.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {keywordPreview.slice(0, 20).map((k, i) => (
                  <span
                    key={`${k}-${i}`}
                    className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[11px] text-white/70"
                  >
                    {k}
                  </span>
                ))}
                {keywordPreview.length > 20 && (
                  <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[11px] text-white/40">
                    +{keywordPreview.length - 20} more
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="mt-7 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleGrade}
              className="group relative overflow-hidden rounded-xl bg-gradient-to-r from-violet-600 to-violet-500 px-6 py-3 text-sm font-semibold text-white shadow-xl shadow-violet-500/30 transition hover:shadow-2xl hover:shadow-violet-500/50"
            >
              <span className="relative z-10 flex items-center gap-2">
                Grade My Metadata
                <span className="inline-block transition-transform group-hover:translate-x-1">→</span>
              </span>
              <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="rounded-xl border border-white/10 bg-white/[0.02] px-5 py-3 text-sm font-semibold text-white/70 transition hover:border-white/20 hover:bg-white/5 hover:text-white"
            >
              Reset
            </button>
          </div>
        </div>

        {/* ═══════ RIGHT: RESULTS PANEL ═══════ */}
        <div id="grader-results">
          {!result ? (
            <div className="glass-card flex h-full min-h-[480px] flex-col items-center justify-center p-10 text-center lg:sticky lg:top-24">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-gradient-to-br from-violet-500/20 to-cyan-500/10 text-2xl">
                <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7 stroke-violet-300" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 11l3 3L22 4" />
                  <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
                </svg>
              </div>
              <h2 className="text-2xl font-semibold text-white">Paste metadata to see your grade.</h2>
              <p className="mt-3 max-w-sm text-sm leading-6 text-white/50">
                You&apos;ll get an overall 0-100 score, 6-category breakdown, specific weak spots,
                and suggestions — all runs client-side.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-white/40">
                <span>// title</span>
                <span>// description</span>
                <span>// keyword count</span>
                <span>// uniqueness</span>
                <span>// specificity</span>
                <span>// seo</span>
              </div>
            </div>
          ) : (
            <div className="space-y-6 lg:sticky lg:top-24">
              {/* Big score + grade */}
              <div className="glass-card p-6 md:p-7">
                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <div
                      className={`text-7xl font-bold leading-none ${
                        ["A", "B"].includes(result.breakdown.grade)
                          ? "gradient-text"
                          : gradeColor(result.breakdown.grade)
                      }`}
                    >
                      {result.breakdown.grade}
                    </div>
                    <div className="mt-2 font-mono text-xs uppercase tracking-[0.2em] text-white/50">
                      Overall
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className={`text-5xl font-bold ${scoreColor(result.breakdown.overall)}`}>
                        {result.breakdown.overall}
                      </span>
                      <span className="text-xl font-semibold text-white/40">/100</span>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/5">
                      <div
                        className={`h-full rounded-full bg-gradient-to-r ${scoreBarColor(result.breakdown.overall)} transition-all duration-700`}
                        style={{ width: `${result.breakdown.overall}%` }}
                      />
                    </div>
                    <div className="mt-2 font-mono text-[10px] uppercase tracking-[0.18em] text-white/50">
                      Platform: {PLATFORM_DISPLAY_NAMES[result.platform]}
                    </div>
                  </div>
                </div>

                {/* Category meters — 6 categories */}
                <div className="mt-7 grid grid-cols-2 gap-3 md:grid-cols-3">
                  <CategoryMeter label="Title" score={result.breakdown.title} />
                  <CategoryMeter label="Description" score={result.breakdown.description} />
                  <CategoryMeter label="Kw Count" score={result.breakdown.keywords} />
                  <CategoryMeter label="Uniqueness" score={result.breakdown.uniqueness} />
                  <CategoryMeter label="Specificity" score={result.breakdown.specificity} />
                  <CategoryMeter label="SEO / Order" score={result.breakdown.seo} />
                </div>
              </div>

              {/* Stats row */}
              <div className="glass-card p-6">
                <div className="mb-4 font-mono text-[10px] uppercase tracking-[0.22em] text-violet-300/80">
                  // Stats
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <StatCard label="title chars" value={result.stats.titleChars} />
                  <StatCard label="desc chars" value={result.stats.descriptionChars} />
                  <StatCard label="keywords" value={result.stats.keywordCount} />
                  <StatCard
                    label="filler"
                    value={result.stats.fillerKeywords}
                    accent={result.stats.fillerKeywords > 0 ? "text-red-300" : "text-emerald-300"}
                  />
                  <StatCard
                    label="duplicates"
                    value={result.stats.duplicateKeywords}
                    accent={result.stats.duplicateKeywords > 0 ? "text-red-300" : "text-emerald-300"}
                  />
                  <StatCard
                    label="near-dupes"
                    value={result.stats.nearDuplicateKeywords}
                    accent={result.stats.nearDuplicateKeywords > 0 ? "text-amber-300" : "text-emerald-300"}
                  />
                </div>
              </div>

              {/* Issues */}
              {result.issues.length > 0 && (
                <div className="glass-card p-6">
                  <div className="mb-4 flex items-baseline justify-between">
                    <h3 className="text-lg font-semibold text-white">What&apos;s weak</h3>
                    <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/40">
                      {result.issues.length} issues
                    </span>
                  </div>
                  <div className="space-y-3">
                    {result.issues.map((issue, index) => (
                      <div
                        key={`${issue.area}-${index}`}
                        className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 transition hover:border-white/15"
                      >
                        <div className="flex items-start gap-3">
                          {issueIcon(issue.level)}
                          <div className="min-w-0 flex-1">
                            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/50">
                              {areaLabel(issue.area)}
                            </div>
                            <p className="mt-1 text-sm leading-6 text-white/85">{issue.message}</p>
                            {issue.examples && issue.examples.length > 0 && (
                              <div className="mt-3 flex flex-wrap gap-1.5">
                                {issue.examples.slice(0, 6).map((example) => (
                                  <span
                                    key={example}
                                    className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[11px] text-white/70"
                                  >
                                    {example}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Suggestions */}
              {result.suggestions.length > 0 && (
                <div className="glass-card p-6">
                  <h3 className="text-lg font-semibold text-white">Suggestions</h3>
                  <ul className="mt-4 space-y-3">
                    {result.suggestions.map((s) => (
                      <li key={s} className="flex items-start gap-3 text-sm leading-6 text-white/80">
                        <span className="mt-1 flex h-5 w-5 flex-none items-center justify-center rounded-full bg-violet-500/15 text-[10px] font-bold text-violet-300">
                          →
                        </span>
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Strengths */}
              {result.strengths.length > 0 && (
                <div className="glass-card p-6">
                  <h3 className="text-lg font-semibold text-white">What&apos;s already working</h3>
                  <ul className="mt-4 space-y-3">
                    {result.strengths.map((s) => (
                      <li key={s} className="flex items-start gap-3 text-sm leading-6 text-white/80">
                        <span className="mt-1 flex h-5 w-5 flex-none items-center justify-center rounded-full bg-emerald-500/15 text-[10px] font-bold text-emerald-300">
                          ✓
                        </span>
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Upsell CTA */}
              <div className="relative overflow-hidden rounded-3xl border border-violet-400/30 bg-gradient-to-br from-violet-600/15 via-violet-500/5 to-cyan-500/10 p-7 backdrop-blur">
                <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-violet-500/20 blur-3xl" />
                <div className="relative">
                  <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-violet-300/80">
                    // Next step
                  </div>
                  <h3 className="mt-2 text-2xl font-bold text-white">
                    Unlock full AI-rewritten metadata.
                  </h3>
                  <p className="mt-3 max-w-md text-sm leading-6 text-white/70">
                    ClipMeta reads your actual video frames and writes stronger titles, descriptions,
                    and 40+ keywords — tuned per platform. Free to try.
                  </p>
                  <div className="mt-5 flex flex-wrap gap-3">
                    <Link
                      href="/auth?mode=signup&ref=grader"
                      className="group relative overflow-hidden rounded-xl bg-gradient-to-r from-violet-600 to-violet-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-500/30 transition hover:shadow-xl hover:shadow-violet-500/50"
                    >
                      <span className="relative z-10 flex items-center gap-2">
                        Try ClipMeta free
                        <span className="inline-block transition-transform group-hover:translate-x-1">→</span>
                      </span>
                    </Link>
                    <Link
                      href="/pricing"
                      className="rounded-xl border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white/80 backdrop-blur transition hover:border-white/25 hover:bg-white/10 hover:text-white"
                    >
                      View pricing
                    </Link>
                  </div>
                </div>
              </div>

              {/* Benchmarks */}
              <div className="glass-card p-6">
                <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.22em] text-violet-300/80">
                  // Benchmark context
                </div>
                <p className="text-sm leading-6 text-white/75">{result.benchmarks.keyFinding}</p>
                <div className="mt-5 grid gap-5 sm:grid-cols-2">
                  <div>
                    <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-emerald-400/70">
                      Strong patterns
                    </div>
                    <ul className="mt-2 space-y-1.5 text-sm text-white/75">
                      {result.benchmarks.bestExamples.map((example) => (
                        <li key={example} className="leading-6">
                          <span className="mr-2 text-emerald-400">·</span>
                          {example}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-red-400/70">
                      Weak patterns
                    </div>
                    <ul className="mt-2 space-y-1.5 text-sm text-white/75">
                      {result.benchmarks.worstExamples.map((example) => (
                        <li key={example} className="leading-6">
                          <span className="mr-2 text-red-400">·</span>
                          {example}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
