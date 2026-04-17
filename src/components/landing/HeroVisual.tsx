"use client";

import { useEffect, useState } from "react";

const KEYWORDS = [
  "cinematic", "aerial", "sunset", "drone", "4K", "establishing",
  "landscape", "mountain", "coastal", "wildlife", "slow-motion",
  "b-roll", "nature", "timelapse", "dawn", "horizon",
];

type Token = {
  id: number;
  word: string;
  dx: number;
  dy: number;
  duration: number;
  delay: number;
  size: number;
};

/**
 * Hero visual: a stylized video "frame" with metadata keywords
 * drifting outward. Pre-generates animation values to avoid
 * hydration mismatches.
 */
export function HeroVisual() {
  const [tokens, setTokens] = useState<Token[]>([]);

  useEffect(() => {
    // Regenerate a new batch every 4s so the effect is continuous
    const build = (): Token[] =>
      Array.from({ length: 8 }, (_, i) => {
        const word = KEYWORDS[Math.floor(Math.random() * KEYWORDS.length)];
        const angle = (Math.PI * 2 * i) / 8 + (Math.random() - 0.5) * 0.6;
        const dist = 140 + Math.random() * 80;
        return {
          id: Date.now() + i,
          word,
          dx: Math.cos(angle) * dist,
          dy: Math.sin(angle) * dist,
          duration: 3 + Math.random() * 1.5,
          delay: Math.random() * 0.8,
          size: 11 + Math.random() * 3,
        };
      });

    setTokens(build());
    const interval = setInterval(() => setTokens(build()), 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative mx-auto flex h-[340px] w-full max-w-[520px] items-center justify-center">
      {/* Outer rings */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="h-[300px] w-[300px] rounded-full border border-violet-500/15" />
      </div>
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="h-[380px] w-[380px] rounded-full border border-cyan-500/10 animate-pulse-slow" />
      </div>

      {/* Center video frame */}
      <div
        className="relative gradient-border gradient-border-animated"
        style={{ width: 220, height: 140 }}
      >
        <div className="relative h-full w-full overflow-hidden rounded-[20px] bg-gradient-to-br from-slate-800 via-slate-900 to-black">
          {/* Faux video gradient */}
          <div
            className="absolute inset-0 opacity-80"
            style={{
              background:
                "linear-gradient(135deg, #1e293b 0%, #334155 40%, #f59e0b 70%, #ef4444 100%)",
            }}
          />
          {/* Letterbox bars */}
          <div className="absolute left-0 right-0 top-0 h-3 bg-black/60" />
          <div className="absolute bottom-0 left-0 right-0 h-3 bg-black/60" />
          {/* Timecode */}
          <div
            className="absolute bottom-4 left-3 font-mono text-[9px] tracking-wider text-white/80"
            style={{ textShadow: "0 1px 2px rgba(0,0,0,0.6)" }}
          >
            00:12:34:08
          </div>
          {/* REC dot */}
          <div className="absolute right-3 top-5 flex items-center gap-1 font-mono text-[9px] tracking-widest text-red-400">
            <span className="h-1.5 w-1.5 rounded-full bg-red-400 animate-pulse" />
            REC
          </div>
          {/* Scan sweep */}
          <div className="scan-line" />
        </div>
      </div>

      {/* Keyword tokens drifting outward */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        {tokens.map((t) => (
          <span
            key={t.id}
            className="keyword-token absolute whitespace-nowrap rounded-full border border-violet-400/30 bg-black/50 px-2.5 py-1 font-mono text-violet-200 backdrop-blur-sm"
            style={
              {
                fontSize: `${t.size}px`,
                animationDuration: `${t.duration}s`,
                animationDelay: `${t.delay}s`,
                "--kw-end": `translate(${t.dx}px, ${t.dy}px)`,
              } as React.CSSProperties
            }
          >
            {t.word}
          </span>
        ))}
      </div>

      {/* Orbiting mini nodes */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="absolute"
            style={{
              animation: `orbit ${14 + i * 4}s linear infinite`,
              animationDelay: `${i * -4}s`,
              // @ts-expect-error css var
              "--orbit-r": `${150 + i * 20}px`,
            }}
          >
            <div
              className="h-2 w-2 rounded-full"
              style={{
                background:
                  i === 0 ? "#8b5cf6" : i === 1 ? "#06b6d4" : "#ec4899",
                boxShadow: `0 0 10px currentColor`,
                color: i === 0 ? "#8b5cf6" : i === 1 ? "#06b6d4" : "#ec4899",
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
