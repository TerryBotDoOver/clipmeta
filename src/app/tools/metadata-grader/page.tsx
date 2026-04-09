"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { gradeStockFootageMetadata } from "@/lib/stockFootageMetadataGrader";

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

function issueIcon(level: string) {
  switch (level) {
    case "error":
      return "🔴";
    case "warning":
      return "🟡";
    default:
      return "💡";
  }
}

const sampleInput = {
  title: "Drone footage of beach ocean view",
  description:
    "Aerial footage of a beach with waves. Good for travel videos and background use.",
  keywords:
    "drone, aerial, beach, ocean, water, waves, coastline, tropical, nature, beautiful, scenic, view, footage, video, clip, travel, tourism, summer, blue water, seascape",
};

export default function MetadataGraderPage() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [keywords, setKeywords] = useState("");
  const [hasGraded, setHasGraded] = useState(false);
  const [email, setEmail] = useState("");
  const [emailStatus, setEmailStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  const result = useMemo(() => {
    if (!hasGraded) return null;
    return gradeStockFootageMetadata({ title, description, keywords });
  }, [description, hasGraded, keywords, title]);

  async function handleCaptureEmail(e: React.FormEvent) {
    e.preventDefault();
    setEmailStatus("loading");
    try {
      const res = await fetch("/api/capture-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source: "metadata-grader-rewrite-gate" }),
      });
      const data = await res.json();
      setEmailStatus(data.ok ? "success" : "error");
    } catch {
      setEmailStatus("error");
    }
  }

  return (
    <main className="min-h-screen bg-[#09090b] text-zinc-100">
      <nav className="border-b border-zinc-800 bg-[#09090b]/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2 text-lg font-bold text-white">
            <img src="/logo-icon.svg" className="h-7 w-7" alt="ClipMeta" />
            ClipMeta
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/lp/stock-footage-metadata"
              className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 transition hover:bg-zinc-900"
            >
              Landing Page
            </Link>
            <Link
              href="/auth?mode=signup"
              className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-500"
            >
              Start ClipMeta Free
            </Link>
          </div>
        </div>
      </nav>

      <section className="mx-auto grid max-w-6xl gap-10 px-6 py-14 lg:grid-cols-[1.05fr_0.95fr] lg:py-20">
        <div>
          <div className="inline-flex rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-violet-300">
            Free stock footage metadata grader
          </div>
          <h1 className="mt-6 text-4xl font-bold tracking-tight text-white sm:text-5xl">
            Score one title, description, and keyword set against 1,000 real stock-footage patterns.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-zinc-400">
            Built for Blackbox, Adobe Stock, Pond5, and Shutterstock contributors. Paste one clip’s metadata and get an instant grade, weak spots, and an upsell path into ClipMeta.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
              <div className="text-2xl font-bold text-white">1,000</div>
              <div className="mt-1 text-sm text-zinc-400">real stock titles benchmarked</div>
            </div>
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
              <div className="text-2xl font-bold text-white">30%</div>
              <div className="mt-1 text-sm text-zinc-400">still use generic filler terms</div>
            </div>
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
              <div className="text-2xl font-bold text-white">35–50</div>
              <div className="mt-1 text-sm text-zinc-400">keywords is the healthy target range</div>
            </div>
          </div>

          <div className="mt-10 rounded-3xl border border-zinc-800 bg-zinc-950/80 p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-white">Paste your metadata</h2>
                <p className="mt-1 text-sm text-zinc-400">
                  One form, one result screen, and a lead-capture gate for the rewrite CTA.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setTitle(sampleInput.title);
                  setDescription(sampleInput.description);
                  setKeywords(sampleInput.keywords);
                  setHasGraded(true);
                }}
                className="rounded-lg border border-zinc-700 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-zinc-300 transition hover:bg-zinc-900"
              >
                Load sample
              </button>
            </div>

            <div className="mt-6 space-y-5">
              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-300">Title</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Golden sunlight over tropical coastline from drone"
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-white placeholder:text-zinc-500 focus:border-violet-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-300">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the subject, action, setting, and best buyer use case."
                  className="h-28 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-white placeholder:text-zinc-500 focus:border-violet-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-300">Keywords</label>
                <textarea
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value)}
                  placeholder="Comma or newline separated keywords"
                  className="h-36 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-white placeholder:text-zinc-500 focus:border-violet-500 focus:outline-none"
                />
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setHasGraded(true)}
                  className="rounded-xl bg-violet-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-violet-500"
                >
                  Grade my metadata
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTitle("");
                    setDescription("");
                    setKeywords("");
                    setHasGraded(false);
                    setEmail("");
                    setEmailStatus("idle");
                  }}
                  className="rounded-xl border border-zinc-700 px-6 py-3 text-sm font-semibold text-zinc-300 transition hover:bg-zinc-900"
                >
                  Reset
                </button>
              </div>
            </div>
          </div>
        </div>

        <div>
          {!result ? (
            <div className="rounded-3xl border border-dashed border-zinc-800 bg-zinc-950/60 p-8 text-center text-zinc-400 lg:sticky lg:top-24">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-violet-500/15 text-2xl">
                📊
              </div>
              <h2 className="text-2xl font-semibold text-white">Result screen</h2>
              <p className="mt-3 text-sm leading-6">
                You’ll get an overall grade, title/description/keyword breakdowns, benchmark context, and an email gate for the full rewrite CTA.
              </p>
            </div>
          ) : (
            <div className="space-y-6 lg:sticky lg:top-24">
              <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl shadow-black/20">
                <div className="flex items-center gap-5">
                  <div className="text-center">
                    <div className={`text-6xl font-bold ${gradeColor(result.breakdown.grade)}`}>
                      {result.breakdown.grade}
                    </div>
                    <div className="mt-1 text-sm text-zinc-500">{result.breakdown.overall}/100 overall</div>
                  </div>
                  <div className="grid flex-1 grid-cols-3 gap-3 text-center">
                    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 px-3 py-4">
                      <div className="text-2xl font-semibold text-white">{result.breakdown.title}</div>
                      <div className="mt-1 text-xs uppercase tracking-wide text-zinc-500">Title</div>
                    </div>
                    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 px-3 py-4">
                      <div className="text-2xl font-semibold text-white">{result.breakdown.description}</div>
                      <div className="mt-1 text-xs uppercase tracking-wide text-zinc-500">Description</div>
                    </div>
                    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 px-3 py-4">
                      <div className="text-2xl font-semibold text-white">{result.breakdown.keywords}</div>
                      <div className="mt-1 text-xs uppercase tracking-wide text-zinc-500">Keywords</div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
                    <div className="text-xl font-semibold text-white">{result.stats.titleWords}</div>
                    <div className="mt-1 text-xs text-zinc-500">title words</div>
                  </div>
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
                    <div className="text-xl font-semibold text-white">{result.stats.descriptionChars}</div>
                    <div className="mt-1 text-xs text-zinc-500">description chars</div>
                  </div>
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
                    <div className="text-xl font-semibold text-white">{result.stats.keywordCount}</div>
                    <div className="mt-1 text-xs text-zinc-500">keywords</div>
                  </div>
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
                    <div className="text-xl font-semibold text-red-300">{result.stats.fillerKeywords}</div>
                    <div className="mt-1 text-xs text-zinc-500">filler terms</div>
                  </div>
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
                    <div className="text-xl font-semibold text-red-300">{result.stats.duplicateKeywords}</div>
                    <div className="mt-1 text-xs text-zinc-500">duplicates</div>
                  </div>
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
                    <div className="text-xl font-semibold text-amber-300">{result.stats.nearDuplicateKeywords}</div>
                    <div className="mt-1 text-xs text-zinc-500">near-dupes</div>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-6">
                <h3 className="text-lg font-semibold text-white">What’s weak</h3>
                <div className="mt-4 space-y-4">
                  {result.issues.map((issue, index) => (
                    <div key={`${issue.area}-${index}`} className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4">
                      <div className="flex items-start gap-3">
                        <div className="text-lg">{issueIcon(issue.level)}</div>
                        <div>
                          <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                            {issue.area}
                          </div>
                          <p className="mt-1 text-sm leading-6 text-zinc-200">{issue.message}</p>
                          {issue.examples && issue.examples.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-2">
                              {issue.examples.map((example) => (
                                <span
                                  key={example}
                                  className="rounded-full border border-zinc-700 bg-zinc-950 px-2.5 py-1 text-xs text-zinc-300"
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

              <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-6">
                <h3 className="text-lg font-semibold text-white">What’s already working</h3>
                <ul className="mt-4 space-y-3 text-sm leading-6 text-zinc-300">
                  {result.strengths.map((strength) => (
                    <li key={strength} className="flex items-start gap-3">
                      <span className="mt-1 text-emerald-400">✓</span>
                      <span>{strength}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-3xl border border-violet-500/30 bg-violet-500/8 p-6">
                <h3 className="text-lg font-semibold text-white">Unlock the full rewrite</h3>
                <p className="mt-2 text-sm leading-6 text-zinc-300">
                  Enter your email to get on the rewrite waitlist, then jump into ClipMeta’s free trial to generate stronger metadata automatically.
                </p>

                {emailStatus === "success" ? (
                  <div className="mt-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-200">
                    You’re on the list. Next step: try ClipMeta free and generate a stronger version inside the app.
                  </div>
                ) : (
                  <form onSubmit={handleCaptureEmail} className="mt-5 flex flex-col gap-3 sm:flex-row">
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="flex-1 rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-white placeholder:text-zinc-500 focus:border-violet-500 focus:outline-none"
                    />
                    <button
                      type="submit"
                      disabled={emailStatus === "loading"}
                      className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-zinc-900 transition hover:bg-zinc-200 disabled:opacity-70"
                    >
                      {emailStatus === "loading" ? "Saving…" : "Unlock rewrite"}
                    </button>
                  </form>
                )}

                {emailStatus === "error" && (
                  <p className="mt-3 text-sm text-red-300">Couldn’t save your email. Try again.</p>
                )}

                <div className="mt-5 flex flex-wrap gap-3">
                  <Link
                    href="/auth?mode=signup"
                    className="rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-violet-500"
                  >
                    Start ClipMeta free
                  </Link>
                  <Link
                    href="/pricing"
                    className="rounded-xl border border-zinc-700 px-5 py-3 text-sm font-semibold text-zinc-200 transition hover:bg-zinc-900"
                  >
                    View plans
                  </Link>
                </div>
              </div>

              <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-6">
                <h3 className="text-lg font-semibold text-white">Benchmark notes</h3>
                <p className="mt-2 text-sm leading-6 text-zinc-300">{result.benchmarks.keyFinding}</p>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Best real-title patterns</div>
                    <ul className="mt-2 space-y-2 text-sm text-zinc-300">
                      {result.benchmarks.bestExamples.map((example) => (
                        <li key={example}>• {example}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Weak real-title patterns</div>
                    <ul className="mt-2 space-y-2 text-sm text-zinc-300">
                      {result.benchmarks.worstExamples.map((example) => (
                        <li key={example}>• {example}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
