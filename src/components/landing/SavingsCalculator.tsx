"use client";

import { useMemo, useState } from "react";

/**
 * Interactive ROI calculator — user slides clip count, sees time + money saved.
 * Self-justifies the price vs. doing metadata manually.
 */

const MINUTES_PER_CLIP_MANUAL = 8; // conservative industry average
const MINUTES_PER_CLIP_CLIPMETA = 0.5; // AI generate + quick review
const HOURLY_RATE = 30; // freelance editor avg

function pickPlan(clipsPerMonth: number) {
  if (clipsPerMonth <= 90) return { name: "Free", price: 0, clips: "3/day" };
  if (clipsPerMonth <= 100) return { name: "Starter", price: 9, clips: "100/mo" };
  if (clipsPerMonth <= 300) return { name: "Pro", price: 19, clips: "300/mo" };
  return { name: "Studio", price: 49, clips: "1000/mo" };
}

export function SavingsCalculator() {
  const [clips, setClips] = useState(150);

  const { hoursSaved, dollarsSaved, plan, roiMultiple } = useMemo(() => {
    const minutesManual = clips * MINUTES_PER_CLIP_MANUAL;
    const minutesClip = clips * MINUTES_PER_CLIP_CLIPMETA;
    const minutesSaved = minutesManual - minutesClip;
    const hours = minutesSaved / 60;
    const dollars = hours * HOURLY_RATE;
    const plan = pickPlan(clips);
    const roi = plan.price > 0 ? dollars / plan.price : Infinity;
    return { hoursSaved: hours, dollarsSaved: dollars, plan, roiMultiple: roi };
  }, [clips]);

  return (
    <div className="glass-card relative overflow-hidden p-6 md:p-10">
      {/* ambient glow */}
      <div className="pointer-events-none absolute -left-40 -top-40 h-80 w-80 rounded-full bg-cyan-500/15 blur-3xl" />
      <div className="pointer-events-none absolute -right-32 -bottom-32 h-72 w-72 rounded-full bg-violet-500/20 blur-3xl" />

      <div className="relative">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <p className="hud-chip mb-2 inline-flex">ROI CALCULATOR</p>
            <h3 className="text-2xl font-bold text-white sm:text-3xl">
              Math that <span className="gradient-text">pays for itself.</span>
            </h3>
          </div>
        </div>

        {/* Slider */}
        <div className="mb-8">
          <div className="mb-3 flex items-baseline justify-between">
            <label htmlFor="clips-slider" className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/50">
              Clips per month
            </label>
            <span className="font-mono text-3xl font-bold text-white">
              {clips}
            </span>
          </div>
          <input
            id="clips-slider"
            type="range"
            min={10}
            max={1000}
            step={10}
            value={clips}
            onChange={(e) => setClips(parseInt(e.target.value, 10))}
            className="clip-slider w-full"
          />
          <div className="mt-2 flex justify-between font-mono text-[10px] text-white/30">
            <span>10</span>
            <span>250</span>
            <span>500</span>
            <span>750</span>
            <span>1000</span>
          </div>
          <style jsx>{`
            .clip-slider {
              -webkit-appearance: none;
              appearance: none;
              height: 6px;
              background: linear-gradient(
                90deg,
                #8b5cf6 0%,
                #8b5cf6 ${((clips - 10) / 990) * 100}%,
                rgba(255, 255, 255, 0.08) ${((clips - 10) / 990) * 100}%,
                rgba(255, 255, 255, 0.08) 100%
              );
              border-radius: 9999px;
              outline: none;
              cursor: pointer;
            }
            .clip-slider::-webkit-slider-thumb {
              -webkit-appearance: none;
              appearance: none;
              width: 22px;
              height: 22px;
              border-radius: 9999px;
              background: linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%);
              border: 2px solid #fff;
              box-shadow: 0 0 0 4px rgba(139, 92, 246, 0.2), 0 8px 20px rgba(139, 92, 246, 0.4);
              cursor: grab;
              transition: transform 0.15s ease;
            }
            .clip-slider::-webkit-slider-thumb:active {
              cursor: grabbing;
              transform: scale(1.1);
            }
            .clip-slider::-moz-range-thumb {
              width: 22px;
              height: 22px;
              border-radius: 9999px;
              background: linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%);
              border: 2px solid #fff;
              box-shadow: 0 0 0 4px rgba(139, 92, 246, 0.2);
              cursor: grab;
            }
          `}</style>
        </div>

        {/* Results grid */}
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-white/5 bg-black/30 p-5">
            <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.2em] text-white/40">
              Time saved
            </div>
            <div className="text-3xl font-bold text-white">
              {hoursSaved.toFixed(1)}
              <span className="ml-1 text-base font-normal text-white/50">hrs/mo</span>
            </div>
            <div className="mt-1 text-xs text-white/50">vs. {MINUTES_PER_CLIP_MANUAL} min/clip manual</div>
          </div>

          <div className="rounded-xl border border-white/5 bg-black/30 p-5">
            <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.2em] text-white/40">
              Value of that time
            </div>
            <div className="text-3xl font-bold text-white">
              <span className="gradient-text">${Math.round(dollarsSaved).toLocaleString()}</span>
              <span className="ml-1 text-base font-normal text-white/50">/mo</span>
            </div>
            <div className="mt-1 text-xs text-white/50">at ${HOURLY_RATE}/hr freelance rate</div>
          </div>

          <div className="rounded-xl border border-violet-400/30 bg-gradient-to-br from-violet-500/15 to-transparent p-5">
            <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.2em] text-violet-300/80">
              Your plan
            </div>
            <div className="text-3xl font-bold text-white">
              {plan.name}
              {plan.price > 0 && (
                <span className="ml-1 text-base font-normal text-white/50">· ${plan.price}/mo</span>
              )}
            </div>
            <div className="mt-1 text-xs text-white/60">
              {plan.price === 0 ? (
                <>Free tier covers this volume</>
              ) : roiMultiple === Infinity ? (
                <>Saves real time</>
              ) : (
                <>
                  ROI: <span className="font-semibold text-emerald-300">{Math.round(roiMultiple)}×</span> the cost
                </>
              )}
            </div>
          </div>
        </div>

        <p className="mt-5 text-center font-mono text-[11px] text-white/40">
          // estimates based on typical stock footage metadata workflow
        </p>
      </div>
    </div>
  );
}
