"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Live metadata output preview — shows a sample drone clip on the left,
 * AI-generated metadata typewriter-animating on the right.
 *
 * Interactive bits:
 *   - Keyword chips can be clicked to remove (proves they're real)
 *   - Editorial submission checkbox auto-checks when generation finishes,
 *     then self-fills city/state/country/date + a news-style caption
 *
 * Plays once when scrolled into view.
 */

const SAMPLE = {
  filename: "DJI_0982.MP4",
  thumbnail: {
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
  editorial: {
    city: "Big Sur",
    state: "California",
    country: "United States",
    date: "2026-04-15",
    caption:
      "Big Sur, USA — April 15, 2026: Aerial drone footage captures dramatic coastal cliffs along the Pacific shoreline during golden hour, with ocean waves crashing against rocky outcroppings below.",
  },
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
  const [deletedKeywords, setDeletedKeywords] = useState<Set<number>>(new Set());
  const [editorialOn, setEditorialOn] = useState(false);
  const [editorialFields, setEditorialFields] = useState({
    city: false,
    state: false,
    country: false,
    date: false,
    caption: "",
  });
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

  // Main animation sequence (frames → title → desc → keywords)
  useEffect(() => {
    if (!active) return;
    const timers: ReturnType<typeof setTimeout>[] = [];

    timers.push(setTimeout(() => setStep(1), 300));

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

  // Auto-check editorial once keywords finish
  useEffect(() => {
    if (step !== 5) return;
    const t = setTimeout(() => setEditorialOn(true), 650);
    return () => clearTimeout(t);
  }, [step]);

  // When editorial is turned on, cascade-fill the fields + typewriter the caption
  useEffect(() => {
    if (!editorialOn) {
      setEditorialFields({ city: false, state: false, country: false, date: false, caption: "" });
      return;
    }
    const timers: ReturnType<typeof setTimeout>[] = [];
    timers.push(setTimeout(() => setEditorialFields((f) => ({ ...f, city: true })), 180));
    timers.push(setTimeout(() => setEditorialFields((f) => ({ ...f, state: true })), 340));
    timers.push(setTimeout(() => setEditorialFields((f) => ({ ...f, country: true })), 500));
    timers.push(setTimeout(() => setEditorialFields((f) => ({ ...f, date: true })), 660));
    timers.push(
      setTimeout(() => {
        let i = 0;
        const caption = SAMPLE.editorial.caption;
        const iv = setInterval(() => {
          i += 3;
          setEditorialFields((f) => ({ ...f, caption: caption.slice(0, i) }));
          if (i >= caption.length) clearInterval(iv);
        }, 18);
      }, 850)
    );
    return () => timers.forEach(clearTimeout);
  }, [editorialOn]);

  const visibleKeywordCount = revealedKeywords - deletedKeywords.size;
  const handleDeleteKeyword = (idx: number) => {
    setDeletedKeywords((prev) => {
      const next = new Set(prev);
      next.add(idx);
      return next;
    });
  };
  const handleResetKeywords = () => setDeletedKeywords(new Set());

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
            <svg
              className="absolute inset-0 h-full w-full opacity-35"
              viewBox="0 0 400 225"
              preserveAspectRatio="none"
            >
              <path d="M0,180 L30,150 L60,170 L95,130 L140,160 L180,120 L220,150 L270,110 L320,140 L360,100 L400,130 L400,225 L0,225 Z" fill="#0f172a" />
              <path d="M0,200 L50,185 L100,195 L160,180 L220,195 L290,185 L360,200 L400,190 L400,225 L0,225 Z" fill="#020617" />
            </svg>
            <div className="absolute left-0 right-0 top-0 h-4 bg-black/60" />
            <div className="absolute bottom-0 left-0 right-0 h-4 bg-black/60" />
            <div
              className="absolute bottom-5 left-3 font-mono text-[10px] tracking-wider text-white/90"
              style={{ textShadow: "0 1px 2px rgba(0,0,0,0.7)" }}
            >
              {SAMPLE.thumbnail.timecode}
            </div>
            <div className="absolute right-3 top-6 flex items-center gap-1 font-mono text-[10px] tracking-widest text-red-400">
              <span className="h-1.5 w-1.5 rounded-full bg-red-400 animate-pulse" />
              REC
            </div>
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

          {/* File metadata */}
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

          {/* Editorial submission toggle */}
          <button
            type="button"
            onClick={() => setEditorialOn((v) => !v)}
            disabled={step < 5}
            className={`mt-5 flex w-full items-start gap-3 rounded-xl border p-3 text-left transition ${
              editorialOn
                ? "border-emerald-400/40 bg-emerald-500/[0.06]"
                : step < 5
                ? "border-white/5 bg-white/[0.02] opacity-50"
                : "border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]"
            }`}
          >
            <span
              className={`mt-0.5 flex h-4 w-4 flex-none items-center justify-center rounded border transition ${
                editorialOn
                  ? "border-emerald-400/80 bg-emerald-500/80"
                  : "border-white/25 bg-transparent"
              }`}
            >
              {editorialOn && (
                <svg viewBox="0 0 12 12" className="h-3 w-3 text-black" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M2.5 6.5l2.5 2.5 4.5-5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </span>
            <span>
              <span className="block text-[12px] font-medium text-white/90">
                Editorial submission
              </span>
              <span className="mt-0.5 block text-[11px] leading-snug text-white/45">
                {step < 5
                  ? "Enables after generation finishes"
                  : editorialOn
                  ? "Auto-filled city, country, date + news-style caption"
                  : "Click to add editorial-format fields"}
              </span>
            </span>
          </button>
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
                  Keywords · {visibleKeywordCount}/{SAMPLE.keywords.length}
                </span>
                <span className="flex items-center gap-2">
                  {deletedKeywords.size > 0 && (
                    <button
                      type="button"
                      onClick={handleResetKeywords}
                      className="font-mono text-[9px] uppercase tracking-wider text-white/40 transition hover:text-violet-300"
                    >
                      ↺ reset
                    </button>
                  )}
                  {step === 5 && deletedKeywords.size === 0 && (
                    <span className="font-mono text-[9px] uppercase tracking-wider text-emerald-300">
                      all unique
                    </span>
                  )}
                  {step === 5 && deletedKeywords.size > 0 && (
                    <span className="font-mono text-[9px] uppercase tracking-wider text-white/40">
                      −{deletedKeywords.size} removed
                    </span>
                  )}
                </span>
              </div>
              <div className="flex min-h-[80px] flex-wrap gap-1.5 rounded-lg border border-white/5 bg-black/30 p-3">
                {SAMPLE.keywords.slice(0, revealedKeywords).map((kw, i) => {
                  if (deletedKeywords.has(i)) return null;
                  return (
                    <button
                      key={kw}
                      type="button"
                      onClick={() => handleDeleteKeyword(i)}
                      className="group relative inline-flex items-center gap-1 rounded-full border border-violet-400/25 bg-violet-500/10 px-2 py-0.5 font-mono text-[10px] text-violet-100 transition hover:border-rose-400/50 hover:bg-rose-500/15 hover:text-rose-100"
                      style={{
                        animation: "kw-pop 0.4s cubic-bezier(0.22, 1, 0.36, 1)",
                        animationDelay: `${Math.min(i * 10, 200)}ms`,
                      }}
                      title="Click to remove"
                    >
                      <span>{kw}</span>
                      <span className="text-[9px] text-violet-300/0 transition group-hover:text-rose-200">
                        ×
                      </span>
                    </button>
                  );
                })}
                {step < 4 && <span className="text-xs text-white/20">—</span>}
              </div>
              {step === 5 && deletedKeywords.size === 0 && (
                <p className="mt-1.5 font-mono text-[9px] uppercase tracking-wider text-white/25">
                  tip: click any keyword to remove it
                </p>
              )}
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

      {/* Editorial metadata band — full width, slides in when checkbox toggles on */}
      <div
        className={`relative grid overflow-hidden transition-all duration-500 ease-out ${
          editorialOn ? "mt-6 grid-rows-[1fr] opacity-100" : "mt-0 grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="min-h-0">
          <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/[0.04] p-5">
            <div className="mb-3 flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-emerald-300/80">
                Editorial Metadata · auto-filled
              </span>
              <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-white/35">
                detected from frames + EXIF
              </span>
            </div>
            <div className="grid gap-3 sm:grid-cols-4">
              <EditorialField label="City" value={SAMPLE.editorial.city} show={editorialFields.city} />
              <EditorialField label="State / Region" value={SAMPLE.editorial.state} show={editorialFields.state} />
              <EditorialField label="Country" value={SAMPLE.editorial.country} show={editorialFields.country} />
              <EditorialField label="Capture Date" value={SAMPLE.editorial.date} show={editorialFields.date} mono />
            </div>
            <div className="mt-3">
              <div className="mb-1 font-mono text-[9px] uppercase tracking-[0.2em] text-white/30">
                Editorial Caption
              </div>
              <div className="min-h-[56px] rounded-lg border border-white/5 bg-black/30 p-3 text-xs leading-relaxed text-white/85">
                {editorialFields.caption || <span className="text-white/20">—</span>}
                {editorialFields.caption && editorialFields.caption.length < SAMPLE.editorial.caption.length && (
                  <span className="inline-block h-3 w-1 -mb-0.5 bg-emerald-300 animate-pulse" />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function EditorialField({
  label,
  value,
  show,
  mono = false,
}: {
  label: string;
  value: string;
  show: boolean;
  mono?: boolean;
}) {
  return (
    <div>
      <div className="mb-1 font-mono text-[9px] uppercase tracking-[0.2em] text-white/30">
        {label}
      </div>
      <div
        className={`rounded-lg border border-white/5 bg-black/30 px-3 py-2 text-xs text-white/85 transition-all duration-300 ${
          mono ? "font-mono" : ""
        } ${show ? "opacity-100" : "opacity-0"}`}
        style={{ transform: show ? "translateY(0)" : "translateY(4px)" }}
      >
        {show ? value : "—"}
      </div>
    </div>
  );
}
