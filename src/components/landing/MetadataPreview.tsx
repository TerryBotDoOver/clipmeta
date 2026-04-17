"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Live metadata output preview — shows a sample drone clip on the left,
 * AI-generated metadata typewriter-animating on the right.
 *
 * Plays once when scrolled into view, loops on hover.
 */

const SAMPLE = {
  filename: "DJI_0982.MP4",
  thumbnail: {
    // We render a procedural "drone footage" gradient as a placeholder.
    gradient:
      "linear-gradient(165deg, #0f172a 0%, #1e3a8a 25%, #f97316 60%, #fcd34d 80%, #fef3c7 100%)",
    timecode: "00:00:12:08",
    aspectRatio: "16 / 9",
  },
  title:
    "Golden hour aerial drone shot of coastal cliffs with crashing ocean waves",
  description:
    "Cinematic 4K aerial drone footage captures dramatic coastal cliffs bathed in warm golden hour light. Ocean waves crash rhythmically against the rocky shoreline below, creating white foam patterns. Perfect establishing shot for travel, documentary, or nature content.",
  keywords: [
    "aerial", "drone", "4K", "coastal", "cliffs", "ocean", "waves", "golden hour",
    "sunset", "cinematic", "nature", "landscape", "scenic", "dramatic", "coastline",
    "rocky shore", "seascape", "establishing shot", "travel", "documentary",
    "b-roll", "slow motion", "warm light", "pacific", "atlantic", "wilderness",
    "rugged", "wild coast", "breaking waves", "foam", "tide", "horizon", "dawn",
    "dusk", "magic hour", "wide shot", "epic", "majestic", "peaceful", "remote",
    "untouched", "pristine", "marine", "tidal", "spray", "mist", "surf",
    "wanderlust", "adventure", "exploration", "earth",
  ],
  category: "Nature",
  location: "Big Sur, California",
};

const PLATFORMS = ["Blackbox.global", "Shutterstock", "Adobe Stock", "Pond5"] as const;
type Platform = (typeof PLATFORMS)[number];

export function MetadataPreview() {
  const [platform, setPlatform] = useState<Platform>("Blackbox.global");
  const [active, setActive] = useState(false);
  const [step, setStep] = useState(0); // 0: idle, 1: analyzing, 2: title, 3: desc, 4: kws, 5: done
  const [typedTitle, setTypedTitle] = useState("");
  const [typedDesc, setTypedDesc] = useState("");
  const [revealedKeywords, setRevealedKeywords] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Trigger once on scroll into view
  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting && !active) {
            setActive(true);
            observer.unobserve(e.target);
          }
        });
      },
      { threshold: 0.35 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [active]);

  // Animation sequence
  useEffect(() => {
    if (!active) return;
    const timers: ReturnType<typeof setTimeout>[] = [];

    // Stage 1: analyzing indicator
    timers.push(setTimeout(() => setStep(1), 300));

    // Stage 2: typewriter title
    timers.push(
      setTimeout(() => {
        setStep(2);
        let i = 0;
        const iv = setInterval(() => {
          i += 2;
          setTypedTitle(SAMPLE.title.slice(0, i));
          if (i >= SAMPLE.title.length) clearInterval(iv);
        }, 18);
      }, 1200)
    );

    // Stage 3: typewriter description
    timers.push(
      setTimeout(() => {
        setStep(3);
        let i = 0;
        const iv = setInterval(() => {
          i += 4;
          setTypedDesc(SAMPLE.description.slice(0, i));
          if (i >= SAMPLE.description.length) clearInterval(iv);
        }, 14);
      }, 3500)
    );

    // Stage 4: keywords reveal one by one
    timers.push(
      setTimeout(() => {
        setStep(4);
        let i = 0;
        const iv = setInterval(() => {
          i++;
          setRevealedKeywords(i);
          if (i >= SAMPLE.keywords.length) {
            clearInterval(iv);
            setStep(5);
          }
        }, 45);
      }, 6500)
    );

    return () => {
      timers.forEach(clearTimeout);
    };
  }, [active]);

  return (
    <div ref={containerRef} className="glass-card relative overflow-hidden p-6 md:p-8">
      {/* Aurora glow corner */}
      <div className="pointer-events-none absolute -right-32 -top-32 h-72 w-72 rounded-full bg-violet-500/25 blur-3xl" />

      <div className="relative grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
        {/* LEFT: video frame */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-white/40">
              Input · Raw Clip
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/30">
              {SAMPLE.filename}
            </span>
          </div>
          <div
            className="relative overflow-hidden rounded-2xl border border-white/10"
            style={{ aspectRatio: SAMPLE.thumbnail.aspectRatio, background: SAMPLE.thumbnail.gradient }}
          >
            {/* Faux silhouettes — simple shapes hinting at cliffs/ocean */}
            <svg
              className="absolute inset-0 h-full w-full opacity-35"
              viewBox="0 0 400 225"
              preserveAspectRatio="none"
            >
              <path d="M0,180 L30,150 L60,170 L95,130 L140,160 L180,120 L220,150 L270,110 L320,140 L360,100 L400,130 L400,225 L0,225 Z" fill="#0f172a" />
              <path d="M0,200 L50,185 L100,195 L160,180 L220,195 L290,185 L360,200 L400,190 L400,225 L0,225 Z" fill="#020617" />
            </svg>
            {/* Letterbox */}
            <div className="absolute left-0 right-0 top-0 h-4 bg-black/60" />
            <div className="absolute bottom-0 left-0 right-0 h-4 bg-black/60" />
            {/* Timecode */}
            <div
              className="absolute bottom-5 left-3 font-mono text-[10px] tracking-wider text-white/90"
              style={{ textShadow: "0 1px 2px rgba(0,0,0,0.7)" }}
            >
              {SAMPLE.thumbnail.timecode}
            </div>
            {/* REC */}
            <div className="absolute right-3 top-6 flex items-center gap-1 font-mono text-[10px] tracking-widest text-red-400">
              <span className="h-1.5 w-1.5 rounded-full bg-red-400 animate-pulse" />
              REC
            </div>
            {/* Scan analyzing overlay */}
            {step === 1 && (
              <div
                className="absolute inset-x-0 top-0 h-full pointer-events-none"
                style={{
                  background:
                    "linear-gradient(180deg, transparent 0%, rgba(139,92,246,0.35) 50%, transparent 100%)",
                  animation: "analyze-sweep 1.2s ease-in-out 2",
                }}
              />
            )}
            <style jsx>{`
              @keyframes analyze-sweep {
                0% { transform: translateY(-100%); opacity: 0; }
                20% { opacity: 1; }
                100% { transform: translateY(100%); opacity: 0; }
              }
            `}</style>
          </div>

          {/* Metadata about the input */}
          <div className="mt-4 space-y-1.5 font-mono text-[11px] text-white/50">
            <div className="flex justify-between">
              <span className="text-white/30">Format:</span>
              <span>MP4 · H.264 · 4K UHD</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/30">Duration:</span>
              <span>12.3 seconds</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/30">Size:</span>
              <span>184 MB</span>
            </div>
          </div>
        </div>

        {/* RIGHT: generated metadata */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-white/40">
              Output · AI-Generated Metadata
            </span>
            <span
              className={`font-mono text-[10px] uppercase tracking-[0.2em] ${
                step < 5 ? "text-violet-300" : "text-emerald-300"
              }`}
            >
              {step === 0 && "· ready"}
              {step === 1 && "· analyzing frames..."}
              {step > 1 && step < 5 && "· generating..."}
              {step === 5 && "✓ complete · 12.4s"}
            </span>
          </div>

          {/* Platform tabs */}
          <div className="mb-4 flex flex-wrap gap-1.5">
            {PLATFORMS.map((p) => (
              <button
                key={p}
                onClick={() => setPlatform(p)}
                className={`rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-wider transition ${
                  platform === p
                    ? "border-violet-400/50 bg-violet-500/15 text-violet-200"
                    : "border-white/10 bg-white/[0.02] text-white/45 hover:text-white/70"
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          {/* Fields */}
          <div className="space-y-4">
            {/* Title */}
            <div>
              <div className="mb-1 font-mono text-[9px] uppercase tracking-[0.2em] text-white/30">
                Title
              </div>
              <div className="min-h-[48px] rounded-lg border border-white/5 bg-black/30 p-3 text-sm leading-snug text-white">
                {typedTitle || <span className="text-white/20">—</span>}
                {step === 2 && <span className="inline-block h-3 w-1 -mb-0.5 bg-violet-400 animate-pulse" />}
              </div>
            </div>

            {/* Description */}
            <div>
              <div className="mb-1 font-mono text-[9px] uppercase tracking-[0.2em] text-white/30">
                Description
              </div>
              <div className="min-h-[92px] rounded-lg border border-white/5 bg-black/30 p-3 text-xs leading-relaxed text-white/80">
                {typedDesc || <span className="text-white/20">—</span>}
                {step === 3 && <span className="inline-block h-3 w-1 -mb-0.5 bg-violet-400 animate-pulse" />}
              </div>
            </div>

            {/* Category + Location row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="mb-1 font-mono text-[9px] uppercase tracking-[0.2em] text-white/30">Category</div>
                <div className="rounded-lg border border-white/5 bg-black/30 px-3 py-2 text-xs text-white/80">
                  {step >= 4 ? SAMPLE.category : <span className="text-white/20">—</span>}
                </div>
              </div>
              <div>
                <div className="mb-1 font-mono text-[9px] uppercase tracking-[0.2em] text-white/30">Location</div>
                <div className="rounded-lg border border-white/5 bg-black/30 px-3 py-2 text-xs text-white/80">
                  {step >= 4 ? SAMPLE.location : <span className="text-white/20">—</span>}
                </div>
              </div>
            </div>

            {/* Keywords */}
            <div>
              <div className="mb-1 flex items-center justify-between">
                <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-white/30">
                  Keywords · {revealedKeywords}/{SAMPLE.keywords.length}
                </span>
                {step === 5 && (
                  <span className="font-mono text-[9px] uppercase tracking-wider text-emerald-300">
                    all unique
                  </span>
                )}
              </div>
              <div className="flex min-h-[80px] flex-wrap gap-1.5 rounded-lg border border-white/5 bg-black/30 p-3">
                {SAMPLE.keywords.slice(0, revealedKeywords).map((kw, i) => (
                  <span
                    key={kw}
                    className="rounded-full border border-violet-400/25 bg-violet-500/10 px-2 py-0.5 font-mono text-[10px] text-violet-100"
                    style={{
                      animation: "kw-pop 0.4s cubic-bezier(0.22, 1, 0.36, 1)",
                      animationDelay: `${Math.min(i * 10, 200)}ms`,
                    }}
                  >
                    {kw}
                  </span>
                ))}
                {step < 4 && <span className="text-xs text-white/20">—</span>}
              </div>
              <style jsx>{`
                @keyframes kw-pop {
                  0% { opacity: 0; transform: scale(0.8) translateY(4px); }
                  100% { opacity: 1; transform: scale(1) translateY(0); }
                }
              `}</style>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
