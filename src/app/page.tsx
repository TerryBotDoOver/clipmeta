import Link from "next/link";
import EmailCapture from "@/components/EmailCapture";
import { ArcadeDemo } from "@/components/ArcadeDemo";
import { RevealOnScroll } from "@/components/landing/RevealOnScroll";
import { HeroVisual } from "@/components/landing/HeroVisual";
import { MetadataPreview } from "@/components/landing/MetadataPreview";
import { BeforeAfter } from "@/components/landing/BeforeAfter";
import { SavingsCalculator } from "@/components/landing/SavingsCalculator";
import { StatsBar } from "@/components/landing/StatsBar";
import { FlightDeckShell } from "@/components/landing/FlightDeckShell";

/** Cell renderer for the comparison table */
function Cell({ value, highlight = false }: { value: string; highlight?: boolean }) {
  const iconFor = (v: string) => {
    if (v === "yes")
      return (
        <svg viewBox="0 0 20 20" className="mx-auto h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2">
          <path d="M4 10l4 4 8-8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    if (v === "no")
      return (
        <svg viewBox="0 0 20 20" className="mx-auto h-5 w-5 opacity-50" fill="none" stroke="currentColor" strokeWidth="2.2">
          <path d="M5 5l10 10M15 5L5 15" strokeLinecap="round" />
        </svg>
      );
    if (v === "partial")
      return <span className="mx-auto inline-block h-2.5 w-2.5 rounded-full bg-amber-300" />;
    return null;
  };

  const textColor = highlight
    ? "text-violet-300"
    : value === "yes"
    ? "text-emerald-300"
    : value === "no"
    ? "text-white/35"
    : "text-white/55";

  const bg = highlight ? "bg-violet-500/[0.04]" : "";

  // Icon or text?
  const isIcon = value === "yes" || value === "no" || value === "partial";

  return (
    <td className={`px-3 py-3.5 text-center sm:px-5 ${textColor} ${bg}`}>
      {isIcon ? iconFor(value) : <span className="font-mono text-xs">{value}</span>}
    </td>
  );
}

export default function HomePage() {
  return (
    <FlightDeckShell>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* HERO — Flight Deck                                                   */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden">
        {/* Aurora mesh */}
        <div className="aurora-bg">
          <span />
        </div>
        {/* Grid overlay */}
        <div className="grid-overlay" />

        <div className="relative mx-auto max-w-6xl px-6 py-20 md:py-32">
          {/* HUD strip */}
          <div className="mb-8 flex justify-center">
            <div className="hud-chip">
              <span>SYSTEM · ONLINE</span>
              <span className="text-white/30">|</span>
              <span className="text-white/60">METADATA PIPELINE</span>
              <span className="text-white/30">|</span>
              <span className="text-emerald-400">READY</span>
            </div>
          </div>

          <div className="grid gap-10 lg:grid-cols-[1.1fr_1fr] lg:items-center">
            {/* Left: headline + CTAs */}
            <div>
              <h1 className="text-5xl font-bold leading-[1.05] tracking-tight text-white sm:text-6xl lg:text-7xl">
                Stop spending hours
                <br />
                <span className="inline-block">
                  on metadata.
                </span>
                <br />
                <span className="gradient-text inline-block">
                  Start selling.
                </span>
              </h1>

              <p className="mt-7 max-w-xl text-lg leading-relaxed text-white/60">
                Upload your clips. AI reads actual video frames — not filenames — and writes titles, descriptions, and keywords. You review, export the platform CSV, ship.
              </p>

              <div className="mt-9 flex flex-wrap items-center gap-4">
                <Link
                  href="/auth?mode=signup"
                  className="group relative overflow-hidden rounded-xl bg-gradient-to-r from-violet-600 to-violet-500 px-7 py-3.5 text-sm font-semibold text-white shadow-xl shadow-violet-500/30 transition hover:shadow-2xl hover:shadow-violet-500/50"
                >
                  <span className="relative z-10 flex items-center gap-2">
                    Start Free — No Credit Card
                    <span className="inline-block transition-transform group-hover:translate-x-1">→</span>
                  </span>
                  <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
                </Link>
                <Link
                  href="/pricing"
                  className="rounded-xl border border-white/15 bg-white/5 px-7 py-3.5 text-sm font-semibold text-white backdrop-blur-md transition hover:border-white/30 hover:bg-white/10"
                >
                  See Pricing
                </Link>
              </div>

              {/* Platform chips */}
              <div className="mt-10">
                <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.25em] text-white/40">
                  // Compatible Export Targets
                </p>
                <div className="flex flex-wrap gap-2">
                  {[
                    { name: "Blackbox.global", exclusive: true },
                    { name: "Shutterstock" },
                    { name: "Adobe Stock" },
                    { name: "Pond5" },
                  ].map((p) => (
                    <span
                      key={p.name}
                      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium backdrop-blur-md ${
                        p.exclusive
                          ? "border-violet-400/40 bg-violet-500/10 text-violet-200"
                          : "border-white/10 bg-white/5 text-white/70"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          p.exclusive ? "bg-violet-400" : "bg-emerald-400"
                        }`}
                        style={{ boxShadow: `0 0 6px currentColor` }}
                      />
                      {p.name}
                      {p.exclusive && (
                        <span className="font-mono text-[9px] uppercase tracking-wider text-violet-300">
                          · Native
                        </span>
                      )}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Right: hero visual */}
            <div className="relative">
              <HeroVisual />
            </div>
          </div>

          {/* Stats bar */}
          <div className="mt-14">
            <StatsBar />
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* LIVE METADATA PREVIEW                                                */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <section className="relative border-t border-white/5 py-24">
        <div className="mx-auto max-w-6xl px-6">
          <RevealOnScroll className="mb-12 text-center">
            <p className="hud-chip mx-auto mb-4 inline-flex">LIVE OUTPUT</p>
            <h2 className="text-4xl font-bold tracking-tight sm:text-5xl">
              This is what you get. <span className="gradient-text">Watch it happen.</span>
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-white/55">
              Drop a clip, GPT-4o reads the frames, writes the full package. Title, description, 50 unique keywords, category, location. You review. You ship.
            </p>
          </RevealOnScroll>
          <RevealOnScroll>
            <MetadataPreview />
          </RevealOnScroll>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* BEFORE / AFTER                                                       */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <section className="relative border-t border-white/5 py-24">
        <div className="mx-auto max-w-6xl px-6">
          <RevealOnScroll className="mb-12 text-center">
            <p className="hud-chip mx-auto mb-4 inline-flex">TIME MATH</p>
            <h2 className="text-4xl font-bold tracking-tight sm:text-5xl">
              From <span className="text-red-300">8 minutes</span> → <span className="gradient-text">30 seconds.</span>
            </h2>
            <p className="mt-4 text-white/55">Same clip. Same output quality. 16× faster.</p>
          </RevealOnScroll>
          <BeforeAfter />
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* PIPELINE — How it works                                              */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <section className="relative border-t border-white/5 py-24">
        <div className="mx-auto max-w-6xl px-6">
          <RevealOnScroll className="mb-16 text-center">
            <p className="hud-chip mx-auto mb-4 inline-flex">THE PIPELINE</p>
            <h2 className="text-4xl font-bold tracking-tight sm:text-5xl">
              Three stages. <span className="gradient-text">Minutes, not hours.</span>
            </h2>
          </RevealOnScroll>

          <div className="relative grid gap-6 md:grid-cols-3">
            {/* Connector line (desktop only) */}
            <div
              className="absolute left-[16.7%] right-[16.7%] top-[80px] hidden h-px md:block"
              style={{
                background:
                  "linear-gradient(90deg, transparent, rgba(139,92,246,0.4) 20%, rgba(6,182,212,0.4) 50%, rgba(236,72,153,0.4) 80%, transparent)",
              }}
            />

            {[
              {
                num: "01",
                label: "INGEST",
                title: "Upload",
                desc: "Any size. Single clip or 200-file batch. Drag and drop — we handle ProRes, MOV, MP4, everything.",
                color: "violet",
                icon: (
                  <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" stroke="currentColor" strokeWidth="1.5">
                    <path d="M12 3v12m0-12l-4 4m4-4l4 4M3 17v2a2 2 0 002 2h14a2 2 0 002-2v-2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ),
              },
              {
                num: "02",
                label: "ANALYZE",
                title: "AI Reads Frames",
                desc: "GPT-4o watches the actual footage. Writes contextual titles, descriptions, keywords, locations — not filename guesses.",
                color: "cyan",
                icon: (
                  <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" stroke="currentColor" strokeWidth="1.5">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M12 3v3m0 12v3M3 12h3m12 0h3M5.6 5.6l2.1 2.1m8.6 8.6l2.1 2.1M5.6 18.4l2.1-2.1m8.6-8.6l2.1-2.1" strokeLinecap="round" />
                  </svg>
                ),
              },
              {
                num: "03",
                label: "DELIVER",
                title: "Export CSV",
                desc: "Review inline. Fix anything. Download the exact CSV format for your platform — or FTP direct to Blackbox.",
                color: "pink",
                icon: (
                  <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" stroke="currentColor" strokeWidth="1.5">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4m4-5l5 5 5-5M12 15V3" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ),
              },
            ].map((s, i) => (
              <RevealOnScroll key={s.num} delay={i * 120}>
                <div className="glass-card group relative h-full p-8">
                  {/* Status chip */}
                  <div className="mb-6 flex items-center justify-between">
                    <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-white/40">
                      Stage {s.num}
                    </span>
                    <span
                      className={`font-mono text-[10px] uppercase tracking-[0.2em] ${
                        s.color === "violet" ? "text-violet-300" : s.color === "cyan" ? "text-cyan-300" : "text-pink-300"
                      }`}
                    >
                      {s.label}
                    </span>
                  </div>

                  {/* Icon */}
                  <div
                    className={`mb-5 flex h-14 w-14 items-center justify-center rounded-2xl ${
                      s.color === "violet"
                        ? "bg-violet-500/10 text-violet-300"
                        : s.color === "cyan"
                        ? "bg-cyan-500/10 text-cyan-300"
                        : "bg-pink-500/10 text-pink-300"
                    }`}
                  >
                    {s.icon}
                  </div>

                  <h3 className="mb-2 text-xl font-semibold text-white">{s.title}</h3>
                  <p className="text-sm leading-relaxed text-white/60">{s.desc}</p>
                </div>
              </RevealOnScroll>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* DEMO                                                                 */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <section className="relative border-t border-white/5 py-24">
        <div className="mx-auto max-w-5xl px-6">
          <RevealOnScroll className="mb-10 text-center">
            <p className="hud-chip mx-auto mb-4 inline-flex">LIVE DEMO</p>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">See ClipMeta in action</h2>
            <p className="mt-3 text-white/50">Raw clips → platform-ready metadata, in real time.</p>
          </RevealOnScroll>
          <RevealOnScroll>
            <div className="gradient-border gradient-border-animated overflow-hidden">
              <div className="rounded-[20px] bg-black/40 p-4">
                <ArcadeDemo />
              </div>
            </div>
          </RevealOnScroll>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* FEATURES — Bento grid                                                */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <section className="relative border-t border-white/5 py-24">
        <div className="mx-auto max-w-6xl px-6">
          <RevealOnScroll className="mb-16 text-center">
            <p className="hud-chip mx-auto mb-4 inline-flex">CAPABILITIES</p>
            <h2 className="text-4xl font-bold tracking-tight sm:text-5xl">
              Built for contributors.
              <br />
              <span className="gradient-text">Not just anyone.</span>
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-white/50">
              Generic AI tools don&apos;t know your platforms. They don&apos;t know Blackbox categories. They don&apos;t export Pond5 CSV. We do.
            </p>
          </RevealOnScroll>

          <div className="grid auto-rows-[200px] grid-cols-1 gap-4 md:grid-cols-3 md:auto-rows-[180px]">
            {/* BIG card: FTP exclusive */}
            <RevealOnScroll className="md:col-span-2 md:row-span-2">
              <div className="glass-card group relative flex h-full flex-col justify-between overflow-hidden p-8">
                <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-violet-500/20 blur-3xl transition-opacity group-hover:opacity-60" />
                <div>
                  <div className="mb-4 flex items-center gap-3">
                    <span className="hud-chip">EXCLUSIVE</span>
                    <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-violet-300">
                      · FTP · Blackbox
                    </span>
                  </div>
                  <h3 className="text-3xl font-bold text-white sm:text-4xl">
                    Upload once. <span className="gradient-text">Send everywhere.</span>
                  </h3>
                  <p className="mt-4 max-w-md text-sm leading-relaxed text-white/60">
                    ClipMeta is the only metadata tool that pushes clips directly to Blackbox.global via FTP. No FileZilla. No manual transfers. One button, done.
                  </p>
                </div>
                <div className="relative mt-6 flex items-center gap-6">
                  {["Upload", "AI writes meta", "Send to Blackbox"].map((step, i) => (
                    <div key={step} className="flex items-center gap-3">
                      <div className={`flex h-8 w-8 items-center justify-center rounded-full font-mono text-[11px] ${i === 0 ? "bg-violet-500/20 text-violet-200 ring-1 ring-violet-400/40" : i === 1 ? "bg-cyan-500/20 text-cyan-200 ring-1 ring-cyan-400/40" : "bg-pink-500/20 text-pink-200 ring-1 ring-pink-400/40"}`}>
                        {i + 1}
                      </div>
                      <span className="text-xs font-medium text-white/70">{step}</span>
                      {i < 2 && <span className="text-white/20">→</span>}
                    </div>
                  ))}
                </div>
              </div>
            </RevealOnScroll>

            {/* Video-first */}
            <RevealOnScroll delay={80}>
              <div className="glass-card h-full p-6">
                <div className="mb-4 text-2xl">🎬</div>
                <h3 className="mb-2 text-base font-semibold text-white">Video-first AI</h3>
                <p className="text-sm leading-relaxed text-white/55">GPT-4o analyzes real frames. Not filenames. Context-aware everything.</p>
              </div>
            </RevealOnScroll>

            {/* Rollover */}
            <RevealOnScroll delay={160}>
              <div className="glass-card h-full p-6">
                <div className="mb-4 text-2xl">📦</div>
                <h3 className="mb-2 text-base font-semibold text-white">Clips roll over</h3>
                <p className="text-sm leading-relaxed text-white/55">Unused clips carry to next month. Up to 2 months. No wasted budget.</p>
              </div>
            </RevealOnScroll>

            {/* Review */}
            <RevealOnScroll delay={80}>
              <div className="glass-card h-full p-6">
                <div className="mb-4 text-2xl">🔍</div>
                <h3 className="mb-2 text-base font-semibold text-white">Review before export</h3>
                <p className="text-sm leading-relaxed text-white/55">Thumbnails, inline editing, dedup finder, quality score. You ship what you approve.</p>
              </div>
            </RevealOnScroll>

            {/* Free tier */}
            <RevealOnScroll delay={160}>
              <div className="glass-card h-full p-6">
                <div className="mb-4 text-2xl">🆓</div>
                <h3 className="mb-2 text-base font-semibold text-white">Free to start</h3>
                <p className="text-sm leading-relaxed text-white/55">3 clips/day. No credit card. Test on real footage before you spend anything.</p>
              </div>
            </RevealOnScroll>

            {/* Refer */}
            <RevealOnScroll delay={240}>
              <div className="glass-card h-full p-6">
                <div className="mb-4 text-2xl">🤝</div>
                <h3 className="mb-2 text-base font-semibold text-white">Refer and earn</h3>
                <p className="text-sm leading-relaxed text-white/55">Share with contributors, unlock free months. Refer 20 → 1 year of Pro.</p>
              </div>
            </RevealOnScroll>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* PLATFORM BAR                                                         */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <section className="relative border-t border-white/5 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <RevealOnScroll className="text-center">
            <p className="hud-chip mx-auto mb-4 inline-flex">EXPORT TARGETS</p>
            <h2 className="mb-12 text-3xl font-bold tracking-tight">Ready for every marketplace</h2>
          </RevealOnScroll>

          <RevealOnScroll>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { name: "Blackbox.global", note: "Native CSV + FTP", primary: true },
                { name: "Shutterstock", note: "Platform CSV" },
                { name: "Adobe Stock", note: "Platform CSV" },
                { name: "Pond5", note: "Platform CSV" },
              ].map((p) => (
                <div
                  key={p.name}
                  className={`glass-card flex flex-col gap-1 p-5 ${
                    p.primary ? "ring-1 ring-violet-400/40" : ""
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-white">{p.name}</span>
                    <span className="flex h-2 w-2 items-center justify-center">
                      <span className={`h-full w-full rounded-full ${p.primary ? "bg-violet-400" : "bg-emerald-400"} animate-pulse`} style={{ boxShadow: "0 0 8px currentColor" }} />
                    </span>
                  </div>
                  <span className="font-mono text-[10px] uppercase tracking-wider text-white/50">{p.note}</span>
                </div>
              ))}
            </div>
          </RevealOnScroll>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* COMPARISON TABLE                                                     */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <section className="relative border-t border-white/5 py-24">
        <div className="mx-auto max-w-6xl px-6">
          <RevealOnScroll className="mb-12 text-center">
            <p className="hud-chip mx-auto mb-4 inline-flex">HEAD TO HEAD</p>
            <h2 className="text-4xl font-bold tracking-tight sm:text-5xl">
              How ClipMeta stacks up.
            </h2>
            <p className="mt-4 text-white/55">The honest comparison. No marketing fluff.</p>
          </RevealOnScroll>

          <RevealOnScroll>
            <div className="glass-card overflow-hidden p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10 bg-white/[0.02]">
                      <th className="px-4 py-4 text-left font-mono text-[10px] uppercase tracking-[0.2em] text-white/40 sm:px-6">
                        Feature
                      </th>
                      <th className="px-3 py-4 text-center sm:px-5">
                        <div className="flex flex-col items-center gap-1">
                          <span className="font-bold text-white">ClipMeta</span>
                          <span className="font-mono text-[9px] uppercase tracking-wider text-violet-300">
                            · Native
                          </span>
                        </div>
                      </th>
                      <th className="px-3 py-4 text-center text-white/60 sm:px-5">
                        <span className="block font-semibold">TagMyClip</span>
                      </th>
                      <th className="px-3 py-4 text-center text-white/60 sm:px-5">
                        <span className="block font-semibold">FreeMetadata</span>
                      </th>
                      <th className="px-3 py-4 text-center text-white/60 sm:px-5">
                        <span className="block font-semibold">Manual</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      {
                        feature: "Reads actual video frames (GPT-4o vision)",
                        clipmeta: "yes",
                        tagmyclip: "partial",
                        freemeta: "no",
                        manual: "no",
                      },
                      {
                        feature: "Native Blackbox.global CSV",
                        clipmeta: "yes",
                        tagmyclip: "yes",
                        freemeta: "no",
                        manual: "manual",
                      },
                      {
                        feature: "Direct FTP to Blackbox (one-click)",
                        clipmeta: "yes",
                        tagmyclip: "yes",
                        freemeta: "no",
                        manual: "no",
                      },
                      {
                        feature: "Shutterstock + Adobe + Pond5 CSV",
                        clipmeta: "yes",
                        tagmyclip: "partial",
                        freemeta: "partial",
                        manual: "manual",
                      },
                      {
                        feature: "Review + edit before export",
                        clipmeta: "yes",
                        tagmyclip: "yes",
                        freemeta: "partial",
                        manual: "yes",
                      },
                      {
                        feature: "Keyword dedup + quality score",
                        clipmeta: "yes",
                        tagmyclip: "no",
                        freemeta: "no",
                        manual: "no",
                      },
                      {
                        feature: "Unused clips roll over",
                        clipmeta: "yes",
                        tagmyclip: "no",
                        freemeta: "n/a",
                        manual: "n/a",
                      },
                      {
                        feature: "Free tier (no credit card)",
                        clipmeta: "3/day",
                        tagmyclip: "trial only",
                        freemeta: "unlimited",
                        manual: "yes",
                      },
                      {
                        feature: "Starting price",
                        clipmeta: "$9/mo",
                        tagmyclip: "$15/mo",
                        freemeta: "free",
                        manual: "your time",
                      },
                    ].map((row, i) => (
                      <tr
                        key={row.feature}
                        className={`border-b border-white/5 last:border-b-0 ${
                          i % 2 === 0 ? "" : "bg-white/[0.01]"
                        }`}
                      >
                        <td className="px-4 py-3.5 text-white/85 sm:px-6">{row.feature}</td>
                        <Cell value={row.clipmeta} highlight />
                        <Cell value={row.tagmyclip} />
                        <Cell value={row.freemeta} />
                        <Cell value={row.manual} />
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </RevealOnScroll>

          <RevealOnScroll className="mt-6 text-center">
            <p className="font-mono text-[11px] text-white/35">
              // competitor feature sets based on public product pages · updated 2026-04
            </p>
          </RevealOnScroll>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* SAVINGS CALCULATOR                                                   */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <section className="relative border-t border-white/5 py-24">
        <div className="mx-auto max-w-4xl px-6">
          <RevealOnScroll>
            <SavingsCalculator />
          </RevealOnScroll>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* PRICING TEASER                                                       */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <section className="relative border-t border-white/5 py-24">
        <div className="mx-auto max-w-5xl px-6 text-center">
          <RevealOnScroll>
            <p className="hud-chip mx-auto mb-4 inline-flex">PRICING</p>
            <h2 className="text-4xl font-bold tracking-tight">
              Simple. <span className="gradient-text">Honest.</span>
            </h2>
            <p className="mt-3 text-white/50">
              Start free.{" "}
              <Link href="/pricing" className="text-violet-300 underline-offset-4 hover:underline">
                Full pricing →
              </Link>
            </p>
          </RevealOnScroll>

          <div className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { name: "Free", price: "3/day", sub: "No card" },
              { name: "Starter", price: "$9", sub: "100/mo" },
              { name: "Pro", price: "$19", sub: "300/mo", highlight: true },
              { name: "Studio", price: "$49", sub: "1000/mo" },
            ].map((p, i) => (
              <RevealOnScroll key={p.name} delay={i * 80}>
                <div
                  className={`glass-card relative h-full p-6 ${
                    p.highlight ? "glow-ring" : ""
                  }`}
                >
                  {p.highlight && (
                    <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                      <span className="rounded-full bg-gradient-to-r from-violet-600 to-violet-500 px-2.5 py-0.5 font-mono text-[9px] uppercase tracking-widest text-white">
                        Popular
                      </span>
                    </div>
                  )}
                  <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/50">{p.name}</div>
                  <div className={`mt-2 text-3xl font-bold ${p.highlight ? "gradient-text" : "text-white"}`}>
                    {p.price}
                  </div>
                  <div className="mt-1 text-xs text-white/40">{p.sub}</div>
                </div>
              </RevealOnScroll>
            ))}
          </div>

          <RevealOnScroll className="mt-10">
            <Link
              href="/auth?mode=signup"
              className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-violet-500 px-8 py-3.5 text-sm font-semibold text-white shadow-xl shadow-violet-500/30 transition hover:shadow-2xl hover:shadow-violet-500/50"
            >
              Start Free — No Credit Card
              <span className="inline-block transition-transform group-hover:translate-x-1">→</span>
            </Link>
          </RevealOnScroll>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* FAQ                                                                  */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <section className="relative border-t border-white/5 py-24">
        <div className="mx-auto max-w-4xl px-6">
          <RevealOnScroll className="mb-12 text-center">
            <p className="hud-chip mx-auto mb-4 inline-flex">FAQ</p>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Frequently asked questions</h2>
          </RevealOnScroll>
          <div className="space-y-3">
            {[
              { q: "What is ClipMeta?", a: "ClipMeta is an AI-powered metadata workflow tool for stock footage contributors. You upload video clips, our AI analyzes actual video frames using GPT-4o, and generates titles, descriptions, keywords, and categories. You review, edit inline, and export a platform-ready CSV." },
              { q: "Which stock footage platforms does ClipMeta support?", a: "ClipMeta supports Blackbox.global, Shutterstock, Adobe Stock, and Pond5 with platform-specific CSV export formats. Each export matches the exact column names, keyword counts, and formatting required by each platform." },
              { q: "How accurate is the AI-generated metadata?", a: "ClipMeta uses GPT-4o to analyze actual video frames from your clips — not just the filename. This produces highly contextual metadata. You always review and edit before exporting, so you stay in control of quality." },
              { q: "Is there a free plan?", a: "Yes. The free plan includes 3 clips per day with no credit card required. Paid plans start at $9/month for Starter (100 clips/month), $19/month for Pro (300 clips/month), and $49/month for Studio (1000 clips/month). All paid plans include a 7-day free trial." },
              { q: "Do unused clips roll over?", a: "Yes, on paid plans unused clips carry forward up to 2 months. If you have a slow week, you don't lose your budget." },
              { q: "Does ClipMeta support Blackbox.global?", a: "Yes — ClipMeta is the only metadata tool with native Blackbox.global CSV support. The export matches Blackbox's exact import template including the correct category taxonomy, column order, and formatting." },
              { q: "How does ClipMeta handle my video files?", a: "Your video clips are uploaded to secure Cloudflare R2 storage. After metadata generation, the source video is automatically deleted to protect your content and minimize storage costs. Only metadata and thumbnails are retained." },
              { q: "Can I edit the metadata before exporting?", a: "Yes. ClipMeta has a full review interface where you can edit titles, descriptions, and keywords inline, add or remove keywords, check for duplicates, and see quality scores before you export anything." },
            ].map(({ q, a }, i) => (
              <RevealOnScroll key={q} delay={i * 40}>
                <details className="glass-card group p-6 [&_summary]:cursor-pointer">
                  <summary className="flex items-center justify-between gap-4 list-none font-semibold text-white">
                    <span className="flex items-center gap-3">
                      <span className="font-mono text-[10px] text-white/30">Q{String(i + 1).padStart(2, "0")}</span>
                      {q}
                    </span>
                    <span className="ml-4 text-white/40 transition-transform duration-200 group-open:rotate-180">▾</span>
                  </summary>
                  <p className="mt-4 border-t border-white/5 pt-4 text-sm leading-7 text-white/65">{a}</p>
                </details>
              </RevealOnScroll>
            ))}
          </div>
        </div>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "FAQPage",
              mainEntity: [
                { "@type": "Question", name: "What is ClipMeta?", acceptedAnswer: { "@type": "Answer", text: "ClipMeta is an AI-powered metadata workflow tool for stock footage contributors. You upload video clips, our AI analyzes actual video frames using GPT-4o, and generates titles, descriptions, keywords, and categories. You review, edit inline, and export a platform-ready CSV." } },
                { "@type": "Question", name: "Which stock footage platforms does ClipMeta support?", acceptedAnswer: { "@type": "Answer", text: "ClipMeta supports Blackbox.global, Shutterstock, Adobe Stock, and Pond5 with platform-specific CSV export formats. Each export matches the exact column names, keyword counts, and formatting required by each platform." } },
                { "@type": "Question", name: "How accurate is the AI-generated metadata?", acceptedAnswer: { "@type": "Answer", text: "ClipMeta uses GPT-4o to analyze actual video frames from your clips — not just the filename. This produces highly contextual metadata. You always review and edit before exporting, so you stay in control of quality." } },
                { "@type": "Question", name: "Is there a free plan?", acceptedAnswer: { "@type": "Answer", text: "Yes. The free plan includes 3 clips per day with no credit card required. Paid plans start at $9/month for Starter (100 clips/month), $19/month for Pro (300 clips/month), and $49/month for Studio (1000 clips/month). All paid plans include a 7-day free trial." } },
                { "@type": "Question", name: "Do unused clips roll over?", acceptedAnswer: { "@type": "Answer", text: "Yes, on paid plans unused clips carry forward up to 2 months. If you have a slow week, you don't lose your budget." } },
                { "@type": "Question", name: "Does ClipMeta support Blackbox.global?", acceptedAnswer: { "@type": "Answer", text: "Yes — ClipMeta is the only metadata tool with native Blackbox.global CSV support. The export matches Blackbox's exact import template including the correct category taxonomy, column order, and formatting." } },
                { "@type": "Question", name: "How does ClipMeta handle my video files?", acceptedAnswer: { "@type": "Answer", text: "Your video clips are uploaded to secure Cloudflare R2 storage. After metadata generation, the source video is automatically deleted to protect your content and minimize storage costs. Only metadata and thumbnails are retained." } },
                { "@type": "Question", name: "Can I edit the metadata before exporting?", acceptedAnswer: { "@type": "Answer", text: "Yes. ClipMeta has a full review interface where you can edit titles, descriptions, and keywords inline, add or remove keywords, check for duplicates, and see quality scores before you export anything." } },
              ],
            }),
          }}
        />
      </section>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* FINAL CTA                                                            */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <section className="relative border-t border-white/5 overflow-hidden">
        <div className="aurora-bg">
          <span />
        </div>
        <div className="relative mx-auto max-w-4xl px-6 py-24 text-center">
          <RevealOnScroll>
            <p className="hud-chip mx-auto mb-6 inline-flex">READY FOR LAUNCH</p>
            <h2 className="text-5xl font-bold leading-tight tracking-tight sm:text-6xl">
              Ship metadata.
              <br />
              <span className="gradient-text">Not spreadsheets.</span>
            </h2>
            <p className="mx-auto mt-6 max-w-xl text-lg text-white/60">
              Join contributors saving hours on every batch.
            </p>
            <div className="mt-10 flex flex-wrap justify-center gap-4">
              <Link
                href="/auth?mode=signup"
                className="group relative overflow-hidden rounded-xl bg-gradient-to-r from-violet-600 to-violet-500 px-9 py-4 text-base font-semibold text-white shadow-xl shadow-violet-500/40 transition hover:shadow-2xl hover:shadow-violet-500/60"
              >
                <span className="relative z-10 flex items-center gap-2">
                  Start Free Now
                  <span className="inline-block transition-transform group-hover:translate-x-1">→</span>
                </span>
                <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
              </Link>
              <Link
                href="/pricing"
                className="rounded-xl border border-white/15 bg-white/5 px-9 py-4 text-base font-semibold text-white backdrop-blur-md transition hover:border-white/30 hover:bg-white/10"
              >
                View Pricing
              </Link>
            </div>
          </RevealOnScroll>
        </div>
      </section>

      {/* Email capture */}
      <div className="border-t border-white/5">
        <EmailCapture source="homepage" headline="Stay in the loop" />
      </div>

      {/* SEO schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@graph": [
              {
                "@type": "SoftwareApplication",
                name: "ClipMeta",
                applicationCategory: "BusinessApplication",
                operatingSystem: "Web",
                url: "https://clipmeta.app",
                description:
                  "AI-powered metadata workflow tool for stock footage contributors. Generate titles, descriptions, and keywords from video frames. Export platform-ready CSVs for Blackbox.global, Shutterstock, Adobe Stock, and Pond5.",
                offers: [
                  { "@type": "Offer", price: "0", priceCurrency: "USD", name: "Free Plan — 3 clips/day" },
                  { "@type": "Offer", price: "9", priceCurrency: "USD", billingIncrement: "monthly", name: "Starter — 100 clips/month" },
                  { "@type": "Offer", price: "19", priceCurrency: "USD", billingIncrement: "monthly", name: "Pro — 300 clips/month" },
                  { "@type": "Offer", price: "49", priceCurrency: "USD", billingIncrement: "monthly", name: "Studio — 1000 clips/month" },
                ],
              },
              {
                "@type": "Organization",
                name: "ClipMeta",
                url: "https://clipmeta.app",
                logo: "https://clipmeta.app/logo-full.png",
                contactPoint: { "@type": "ContactPoint", email: "hello@clipmeta.app", contactType: "customer support" },
              },
              { "@type": "WebSite", name: "ClipMeta", url: "https://clipmeta.app" },
            ],
          }),
        }}
      />
    </FlightDeckShell>
  );
}
